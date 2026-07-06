# Querion ⚡ — AI PostgreSQL Query Optimizer Workspace

Querion is a production-grade query optimization workspace for PostgreSQL database administrators and backend engineers. It validates query plans safely within sandbox transactions, streams performance diagnostics via Server-Sent Events (SSE), suggests optimized query rewrites using Google Gemini, validates index recommendations using PostgreSQL's `hypopg` extension, and tracks historical regression runs with interactive charts.

---

## 🌟 Key Features

* **Interactive Application Shell**: Modern workspace layout equipped with a global Command Palette (`⌘K`) for navigating views, switching DB connections, and executing tasks.
* **Safe Sandbox Analysis**: Leverages `sqlglot` to block mutating commands (DDL/DML) and wraps optimization queries in read-only transaction blocks (`SET TRANSACTION READ ONLY`) with a `5000ms` execution timeout.
* **Asynchronous SSE Streaming**: Offloads long-running `EXPLAIN ANALYZE` operations to background worker queues and streams pipeline progress updates in real-time.
* **Multi-Tab Optimization Console**:
  * **Plan Tree**: Toggle between visual D3.js interactive graphs and a side-by-side collapsible tree node comparison (Before vs. After).
  * **AI Insights**: Automatically identifies query execution bottlenecks and flags severity ratings (Low, Medium, High).
  * **Diff Viewer**: Displays side-by-side query syntax improvements side-by-side using the Monaco Editor.
  * **Indexes**: Prompts index suggestions with an inline **Validate with HypoPG** button to measure planner cost reductions without storage writes.
  * **History Trend**: Renders a custom interactive SVG graph showcasing historical performance trend runs.
* **CI Integration**: Staged GitHub Action script linting scans PR diffs for `.sql` changes, executing planner analysis, and posting automated execution reports.

---

## 🛠️ Tech Stack

* **Frontend**: Next.js 16 (App Router), Tailwind CSS, Monaco Editor, D3.js, Tabler Icons.
* **Backend**: FastAPI (Python), SQLAlchemy, SQLite (persistence), `asyncpg` (driver), `sqlglot` (SQL AST engine).
* **AI Engine**: Gemini 1.5 Flash.

---

## ⚙️ Environment Variables

### Backend (`backend/.env`)
```ini
GEMINI_API_KEY=AIzaSy... # Google AI Studio api key
```

### Frontend (`.env.local`)
```ini
NEXT_PUBLIC_API_URL=http://localhost:8000 # FastAPI backend server url
```

---

## 🚀 Local Setup Instructions

### 1. Run the Backend (FastAPI)
1. Navigate to the backend directory:
   ```bash
   cd backend
   ```
2. Create your virtual environment and install dependencies:
   ```bash
   python -m venv venv
   # Activate on Windows:
   .\venv\Scripts\Activate.ps1
   # Activate on Unix:
   source venv/bin/activate

   pip install -r requirements.txt
   ```
3. Configure your `backend/.env` file with your `GEMINI_API_KEY`.
4. Start the development server on port 8000:
   ```bash
   uvicorn main:app --reload --port 8000
   ```

### 2. Run the Frontend (Next.js)
1. Return to the root folder:
   ```bash
   cd ..
   ```
2. Install packages and launch the dev server:
   ```bash
   npm install
   npm run dev
   ```
3. Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 📄 License
Licensed under the MIT License.
