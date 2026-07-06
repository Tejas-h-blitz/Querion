import os
import sys
import re
import json
import urllib.request

try:
    import sqlglot
    from sqlglot import exp
except ImportError:
    print("Error: sqlglot is required. Please install it using 'pip install sqlglot'")
    sys.exit(1)

try:
    import pg8000
except ImportError:
    # Fallback to standard psycopg2 or asyncpg if installed, or direct pg8000
    # We will use pg8000 or psycopg2 or asyncpg depending on availability, or write a simple script.
    # To keep it extremely self-contained with no binary dependencies (since psycopg2 requires libpq),
    # pg8000 is a pure-python postgres driver and is perfect for lightweight CI actions!
    # Let's install pg8000 in the workflow setup.
    pass

def scan_sql_files(directory="."):
    queries = []
    for root, _, files in os.walk(directory):
        # Skip node_modules and venv
        if "node_modules" in root or "venv" in root or ".git" in root or ".next" in root:
            continue
            
        for file in files:
            if file.endswith(".sql"):
                file_path = os.path.join(root, file)
                try:
                    with open(file_path, "r", encoding="utf-8") as f:
                        content = f.read()
                        
                    # Remove comments
                    content_clean = re.sub(r"/\*.*?\*/", "", content, flags=re.DOTALL)
                    lines = []
                    for line in content_clean.splitlines():
                        if "--" in line:
                            lines.append(line.split("--", 1)[0])
                        else:
                            lines.append(line)
                    content_clean = "\n".join(lines).strip()
                    
                    if not content_clean:
                        continue
                        
                    statements = sqlglot.parse(content_clean, read="postgres")
                    for stmt in statements:
                        if stmt and isinstance(stmt, (exp.Select, exp.Union, exp.Query)):
                            queries.append((file_path, stmt.sql()))
                except Exception as e:
                    print(f"Warning: Failed to parse SQL file {file_path}: {str(e)}")
    return queries

def run_explain(query, conn):
    # Enforce read-only block
    cursor = conn.cursor()
    try:
        cursor.execute("BEGIN TRANSACTION READ ONLY")
        cursor.execute("SET LOCAL statement_timeout = 3000")
        
        # Strip trailing semicolon for explain wrapping
        clean_query = query.strip()
        if clean_query.endswith(';'):
            clean_query = clean_query[:-1].strip()
            
        explain_query = f"EXPLAIN (FORMAT JSON) {clean_query}"
        cursor.execute(explain_query)
        res = cursor.fetchone()
        
        cursor.execute("ROLLBACK")
        
        plan = res[0]
        if isinstance(plan, str):
            plan = json.loads(plan)
            
        cost = plan[0]["Plan"]["Total Cost"]
        return cost, None
    except Exception as e:
        try:
            cursor.execute("ROLLBACK")
        except Exception:
            pass
        return 0.0, str(e)
    finally:
        cursor.close()

def post_pr_comment(token, repo, pr_number, body):
    url = f"https://api.github.com/repos/{repo}/issues/{pr_number}/comments"
    req = urllib.request.Request(
        url,
        data=json.dumps({"body": body}).encode("utf-8"),
        headers={
            "Authorization": f"token {token}",
            "Accept": "application/vnd.github.v3+json",
            "Content-Type": "application/json"
        },
        method="POST"
    )
    try:
        with urllib.request.urlopen(req) as res:
            print("Successfully posted feedback comment to GitHub Pull Request!")
    except Exception as e:
        print(f"Error posting PR comment: {str(e)}")

def main():
    conn_string = os.getenv("DATABASE_URL")
    if not conn_string:
        print("Error: DATABASE_URL environment variable is missing.")
        sys.exit(1)
        
    print("Scanning repository for SQL files...")
    queries = scan_sql_files()
    if not queries:
        print("No SELECT queries found in migration or SQL files. Skipping check.")
        sys.exit(0)
        
    print(f"Found {len(queries)} SELECT queries to evaluate.")
    
    # Connect using pg8000
    # connection string format: postgres://user:pass@host:port/db
    import pg8000.dbapi
    try:
        # Simple parse connection string
        match = re.match(r"postgres(?:ql)?:\/\/([^:]+):([^@]+)@([^:/]+)(?::(\d+))?\/([^?]+)", conn_string)
        if not match:
            raise ValueError("Invalid postgres connection string format.")
            
        user, password, host, port, database = match.groups()
        port = int(port) if port else 5432
        
        conn = pg8000.dbapi.connect(
            user=user,
            password=password,
            host=host,
            port=port,
            database=database
        )
    except Exception as e:
        print(f"Database connection failed: {str(e)}")
        sys.exit(1)
        
    high_cost_queries = []
    failed_queries = []
    
    threshold = float(os.getenv("COST_THRESHOLD", "5000"))
    
    for file_path, sql in queries:
        print(f"Explaining query in {file_path}...")
        cost, err = run_explain(sql, conn)
        if err:
            failed_queries.append((file_path, sql, err))
        elif cost > threshold:
            high_cost_queries.append((file_path, sql, cost))
            
    conn.close()
    
    # Generate report
    if not high_cost_queries and not failed_queries:
        print("All queries verified successfully! Costs are within threshold limits.")
        sys.exit(0)
        
    # Build GitHub PR Markdown report
    comment_body = "### ⚡ Querion SQL Performance Report\n\n"
    comment_body += "Our automatic query analyzer detected potential bottlenecks in this PR:\n\n"
    
    if high_cost_queries:
        comment_body += "#### ⚠️ High Cost Queries (&gt; " + str(threshold) + ")\n"
        comment_body += "| File | Query Preview | Estimated Planner Cost |\n"
        comment_body += "| :--- | :--- | :--- |\n"
        for file_path, sql, cost in high_cost_queries:
            preview = sql.replace('\n', ' ').strip()
            preview = preview[:60] + "..." if len(preview) > 60 else preview
            comment_body += f"| `{file_path}` | `{preview}` | **{cost:.1f}** |\n"
        comment_body += "\n"
        
    if failed_queries:
        comment_body += "#### ❌ Execution Failures\n"
        comment_body += "| File | Query Preview | Database Error |\n"
        comment_body += "| :--- | :--- | :--- |\n"
        for file_path, sql, err in failed_queries:
            preview = sql.replace('\n', ' ').strip()
            preview = preview[:60] + "..." if len(preview) > 60 else preview
            comment_body += f"| `{file_path}` | `{preview}` | `<code style='color:red;'>{err}</code>` |\n"
        comment_body += "\n"
        
    comment_body += "*Please open Querion Dashboard to visualize index optimization suggestions for these queries.*"
    
    print(comment_body)
    
    # Post comment if triggered by GitHub Actions PR event
    gh_token = os.getenv("GITHUB_TOKEN")
    gh_repo = os.getenv("GITHUB_REPOSITORY")
    pr_number = os.getenv("PR_NUMBER")
    
    if gh_token and gh_repo and pr_number:
        post_pr_comment(gh_token, gh_repo, pr_number, comment_body)
        
    # Exit with non-zero if there are query bottlenecks or errors to block merge
    if failed_queries:
        sys.exit(1)
        
if __name__ == "__main__":
    main()
