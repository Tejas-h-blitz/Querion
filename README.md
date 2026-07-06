# Querion ⚡ — AI SQL Query Optimizer

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

Querion is a production-ready PostgreSQL performance tuning and query optimization web application. It executes read-only database explain plans safely, provides detailed performance diagnostics, renders interactive horizontal tree visualizations with D3.js, and suggests optimal query rewrites using Google Gemini 1.5 Flash.

---

## 🏗️ Architecture

```text
               +-----------------------------------+
               |        React (Next.js 16)         |
               |  Monaco Editor / D3.js / Supabase |
               +-----------------+-----------------+
                                 |
                                 | HTTP REST / JSON
                                 v
               +-----------------+-----------------+
               |          FastAPI (Python)         |
               +--------+-----------------+--------+
                        |                 |
                        | SQL / EXPLAIN   | HTTP JSON API
                        v                 v
            +-----------+-----------+   +-+-----------------+
            | User's PostgreSQL DB  |   |  Google Gemini    |
            | (Dynamic connection)  |   |   (API Service)   |
            +-----------------------+   +-------------------+
```

---

## 🛠️ Tech Stack

| Component | Technology | Description |
| :--- | :--- | :--- |
| **Frontend Framework** | Next.js 16 (App Router) | Modern React server-side and client rendering architecture. |
| **Styling** | Tailwind CSS | Sleek dark-mode tokens and layout system. |
| **SQL Editor** | Monaco Editor | Custom SQL syntax styling and side-by-side diff view. |
| **Tree Visualizer** | D3.js | Interactive zoomable tree representing Postgres nodes. |
| **Backend API** | FastAPI (Python) | High-performance, async web server routing. |
| **Database Driver** | asyncpg / SQLAlchemy | Safe, non-blocking connection interface. |
| **AI Optimizer** | Gemini 1.5 Flash | LLM performance tuner generating indexes and SQL rewrites. |
| **User Persistence** | Supabase | Simple email/password authentication and logging. |

---

## ⚙️ Environment Variables

### Backend (`backend/.env`)

| Variable | Description |
| :--- | :--- |
| `GEMINI_API_KEY` | Google AI Studio access key for Gemini 1.5 Flash. |
| `SUPABASE_URL` | Your Supabase project URL (e.g. `https://xxx.supabase.co`). |
| `SUPABASE_SERVICE_KEY` | Supabase service role key (used securely by backend for CRUD logs). |

### Frontend (`.env.local`)

| Variable | Description |
| :--- | :--- |
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase project URL. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase public anon key. |
| `NEXT_PUBLIC_API_URL` | FastAPI backend URL (defaults to `http://localhost:8000`). |

---

## 🚀 Local Setup Instructions

### Prerequisites
- Node.js (v18+)
- Python (3.9+)

### 1. Database Setup (Supabase)
Run the following SQL in your Supabase SQL Editor to create the query log table:

```sql
CREATE TABLE query_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL,
  original_query text NOT NULL,
  optimized_query text NOT NULL,
  issues jsonb,
  index_recommendations jsonb,
  original_exec_time_ms float,
  optimized_exec_time_ms float,
  improvement_pct float,
  created_at timestamptz DEFAULT now()
);
```

### 2. Backend Setup
1. Navigate to the `backend/` directory:
   ```bash
   cd backend
   ```
2. Create and configure your `.env` file containing `GEMINI_API_KEY`, `SUPABASE_URL`, and `SUPABASE_SERVICE_KEY`.
3. Create a virtual environment and install dependencies:
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows use: venv\Scripts\activate
   pip install -r requirements.txt
   ```
4. Start the FastAPI server:
   ```bash
   uvicorn main:app --reload
   ```

### 3. Frontend Setup
1. Return to the root folder.
2. Create `.env.local` containing `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and `NEXT_PUBLIC_API_URL`.
3. Install packages and run development server:
   ```bash
   npm.cmd install
   npm.cmd run dev
   ```
4. Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🔌 Connecting your Database
Querion connects to your database dynamically on the client side.
1. Enter your standard PostgreSQL connection string in the top header.
   - Format: `postgresql://username:password@hostname:5432/databasename`
2. This string is stored safely in your browser's local storage (`localStorage`). It is **never** logged, collected, or stored on our servers.
3. The backend uses this string strictly to execute `EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) <query>` to construct your query plan.

---

## 📸 Screenshots

*(Mock-up placeholders to show application layout)*

```text
+--------------------------------------------------------------------------------+
| Querion v1.0   | postgresql://●●●●●●●●●●●●●●●●●●●●●●●●                     [Analyze] |
+----------------+---------------------------------------------------------------+
| HISTORY        | SQL QUERY EDITOR              | OPTIMIZATION REPORT           |
|                |                               |                               |
| SELECT * FROM  | SELECT * FROM orders          | [ AI Analysis ] [ Optimized ] |
|                | JOIN users ON ...             |                               |
| SELECT id FROM | WHERE users.email = 'x@x.com' | Seq Scan cost=14.50 rows=10   |
|                |                               | Index Scan cost=4.20 rows=1   |
|                |                               |                               |
+--------------------------------------------------------------------------------+
```

---

## 📄 License
This project is licensed under the MIT License - see the LICENSE file for details.
