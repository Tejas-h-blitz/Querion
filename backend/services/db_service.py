import asyncpg
import json
import re
import sqlglot
from sqlglot import exp
from typing import Any, List, Tuple, Dict

def strip_sql_comments(sql: str) -> str:
    """Removes single-line and multi-line comments from SQL, respecting string quotes."""
    sql_no_multiline = re.sub(r'/\*.*?\*/', '', sql, flags=re.DOTALL)
    
    lines = []
    for line in sql_no_multiline.splitlines():
        in_single_quote = False
        in_double_quote = False
        comment_idx = -1
        idx = 0
        while idx < len(line):
            char = line[idx]
            if char == "'" and (idx == 0 or line[idx-1] != "\\"):
                in_single_quote = not in_single_quote
            elif char == '"' and (idx == 0 or line[idx-1] != "\\"):
                in_double_quote = not in_double_quote
            elif char == '-' and idx < len(line) - 1 and line[idx+1] == '-':
                if not in_single_quote and not in_double_quote:
                    comment_idx = idx
                    break
            idx += 1
        if comment_idx != -1:
            line = line[:comment_idx]
        lines.append(line)
        
    return "\n".join(lines).strip()

def validate_query_safety(sql: str) -> Tuple[bool, str]:
    """
    Validates that:
    1. The query is a single SELECT or WITH statement.
    2. No mutating commands exist using a real SQL parser (sqlglot).
    """
    sql_clean = strip_sql_comments(sql).strip()
    if not sql_clean:
        return False, "Query is empty"

    try:
        # Use sqlglot to parse the statements
        expressions = sqlglot.parse(sql_clean, read="postgres")
        if not expressions:
            return False, "Query is empty"
        if len(expressions) > 1:
            return False, "Multiple SQL statements are not allowed"
        
        parsed = expressions[0]
    except Exception as e:
        return False, f"SQL Syntax Error: {str(e)}"

    # Check if the root statement is a SELECT, Union, or standard query node
    if not isinstance(parsed, (exp.Select, exp.Union, exp.Query)):
        return False, "Only SELECT queries are supported"

    # Walk the AST and verify no mutation statements exist
    forbidden_types = (
        exp.Insert, exp.Update, exp.Delete, exp.Create, exp.Drop,
        exp.Alter, exp.TruncateTable, exp.Command, exp.Transaction
    )
    for node in parsed.walk():
        if isinstance(node, forbidden_types):
            return False, f"Mutating SQL command '{type(node).__name__.upper()}' is not allowed"

    return True, ""

async def execute_explain_analyze(query: str, connection_string: str) -> List[Dict[str, Any]]:
    """Connects to user database and runs EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) safely within a rolled-back transaction."""
    if not connection_string.startswith("postgresql://") and not connection_string.startswith("postgres://"):
        raise ValueError("Invalid connection string format. Must start with postgresql:// or postgres://")

    try:
        conn = await asyncpg.connect(connection_string, timeout=10)
    except Exception as e:
        raise ConnectionError(f"Database connection failed: {str(e)}")
        
    try:
        clean_query = strip_sql_comments(query).strip()
        if clean_query.endswith(';'):
            clean_query = clean_query[:-1].strip()
            
        explain_query = f"EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) {clean_query}"
        
        # Enforce sandbox in a transaction that we ALWAYS roll back
        tr = conn.transaction()
        await tr.start()
        try:
            await conn.execute("SET LOCAL transaction_read_only = on")
            await conn.execute("SET LOCAL statement_timeout = 5000")
            result = await conn.fetchval(explain_query)
        finally:
            await tr.rollback()
        
        if isinstance(result, str):
            return json.loads(result)
        return result
    except Exception as e:
        raise RuntimeError(f"Failed to execute EXPLAIN plan on database: {str(e)}")
    finally:
        await conn.close()

async def run_hypopg_simulation(query: str, index_sql: str, connection_string: str) -> Dict[str, Any]:
    """
    Simulates a recommended index on the target database using the hypopg extension.
    1. Runs EXPLAIN (FORMAT JSON) to fetch current query plan cost.
    2. Opens a transaction, installs hypopg extension, registers index via hypopg_create_index.
    3. Runs EXPLAIN (FORMAT JSON) again to fetch cost with virtual index active.
    4. Rolls back the transaction to remove catalog traces and calls hypopg_reset().
    """
    if not connection_string.startswith("postgresql://") and not connection_string.startswith("postgres://"):
        raise ValueError("Invalid connection string format. Must start with postgresql:// or postgres://")

    try:
        conn = await asyncpg.connect(connection_string, timeout=10)
    except Exception as e:
        raise ConnectionError(f"Database connection failed: {str(e)}")

    try:
        clean_query = strip_sql_comments(query).strip()
        if clean_query.endswith(';'):
            clean_query = clean_query[:-1].strip()

        explain_query = f"EXPLAIN (FORMAT JSON) {clean_query}"
        
        # Baseline cost (before index)
        try:
            raw_plan_before = await conn.fetchval(explain_query)
            if isinstance(raw_plan_before, str):
                plan_before = json.loads(raw_plan_before)
            else:
                plan_before = raw_plan_before
            cost_before = plan_before[0]["Plan"]["Total Cost"]
        except Exception as e:
            raise RuntimeError(f"Failed to fetch baseline cost before index: {str(e)}")

        cost_after = cost_before
        tr = conn.transaction()
        await tr.start()
        try:
            await conn.execute("SET LOCAL statement_timeout = 5000")
            
            # Install extension if not exists
            try:
                await conn.execute("CREATE EXTENSION IF NOT EXISTS hypopg")
            except Exception as ext_err:
                raise RuntimeError(
                    f"The database does not support or have the 'hypopg' extension installed. "
                    f"Please install it to use virtual index simulation. Error: {str(ext_err)}"
                )

            # Create hypothetical index
            clean_index_sql = index_sql.strip()
            if clean_index_sql.endswith(';'):
                clean_index_sql = clean_index_sql[:-1].strip()
                
            create_index_query = "SELECT * FROM hypopg_create_index($1)"
            try:
                await conn.fetchrow(create_index_query, clean_index_sql)
            except Exception as idx_err:
                raise RuntimeError(f"HypoPG failed to create virtual index '{clean_index_sql}': {str(idx_err)}")

            # EXPLAIN with the virtual index active (inside same transaction session)
            raw_plan_after = await conn.fetchval(explain_query)
            if isinstance(raw_plan_after, str):
                plan_after = json.loads(raw_plan_after)
            else:
                plan_after = raw_plan_after
            cost_after = plan_after[0]["Plan"]["Total Cost"]
        finally:
            await tr.rollback()
            try:
                await conn.execute("SELECT hypopg_reset()")
            except Exception:
                pass

        reduction_pct = 0.0
        if cost_before > 0:
            reduction_pct = ((cost_before - cost_after) / cost_before) * 100

        return {
            "success": True,
            "cost_before": cost_before,
            "cost_after": cost_after,
            "reduction_pct": max(0.0, reduction_pct),
            "index_sql": index_sql
        }
    except Exception as e:
        return {
            "success": False,
            "error": str(e),
            "cost_before": 0.0,
            "cost_after": 0.0,
            "reduction_pct": 0.0,
            "index_sql": index_sql
        }
    finally:
        await conn.close()
