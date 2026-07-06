const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export interface Issue {
  type: string;
  description: string;
  severity: 'low' | 'medium' | 'high';
  node: string;
  confidence: 'low' | 'medium' | 'high';
}

export interface IndexRecommendation {
  sql: string;
  reason: string;
}

export interface AnalyzeResponse {
  issues: Issue[];
  optimized_query: string;
  changes: string[];
  index_recommendations: IndexRecommendation[];
  summary: string;
  fingerprint: string;
  history_id: string;
  original_exec_time_ms: number;
  optimized_exec_time_ms: number;
  improvement_pct: number;
  explain_data?: {
    original?: ExplainPlanDetails;
    optimized?: ExplainPlanDetails;
  };
}

export interface ExplainPlan {
  name: string;
  node_type: string;
  relation_name?: string;
  index_name?: string;
  cost: number;
  startup_cost: number;
  actual_rows: number;
  actual_total_time: number;
  actual_startup_time: number;
  loops: number;
  filter?: string;
  join_type?: string;
  children: ExplainPlan[];
}

export interface ExplainPlanDetails {
  tree: ExplainPlan;
  planning_time: number;
  execution_time: number;
}

export interface ExplainResponse {
  original: ExplainPlanDetails;
  optimized: ExplainPlanDetails;
}

export interface HistoryItem {
  id: string;
  fingerprint_hash: string;
  raw_query: string;
  optimized_query?: string;
  execution_time_ms?: number;
  optimized_exec_time_ms?: number;
  improvement_pct?: number;
  plan_json?: string;
  issues_json?: string;
  index_recommendations_json?: string;
  user_id?: string;
  created_at: string;
}

export interface IndexSimulateResponse {
  success: boolean;
  cost_before: number;
  cost_after: number;
  reduction_pct: number;
  index_sql: string;
  error?: string;
}

export interface TrendRun {
  id: string;
  created_at: string;
  execution_time_ms: number;
  optimized_exec_time_ms: number;
  baseline_ms: number;
  regressed: boolean;
  regression_pct: number;
}

export interface TrendResponse {
  fingerprint: string;
  runs: TrendRun[];
}

export interface BatchItem {
  index: number;
  query: string;
  type: string;
  eligible: boolean;
  cost: number;
  severity: 'info' | 'success' | 'warning' | 'danger';
  message: string;
}

export interface BatchResponse {
  filename: string;
  total_statements: number;
  queries_analyzed: number;
  report: BatchItem[];
}

// Submits query to background analysis queue
export async function submitQueryAnalysis(
  query: string,
  connectionString: string,
  userId: string = "anonymous"
): Promise<{ job_id: string }> {
  const res = await fetch(`${API_BASE_URL}/api/analyze`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, connection_string: connectionString, user_id: userId }),
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.detail || 'An error occurred during query analysis submission');
  }

  return res.json();
}

// Simulates a virtual index with HypoPG
export async function simulateIndex(
  query: string,
  indexSql: string,
  connectionString: string,
  queryHistoryId?: string
): Promise<IndexSimulateResponse> {
  const res = await fetch(`${API_BASE_URL}/api/indexes/simulate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      query,
      index_sql: indexSql,
      connection_string: connectionString,
      query_history_id: queryHistoryId
    }),
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.detail || 'An error occurred during index simulation');
  }

  return res.json();
}

// Fetches historical logs for a user
export async function fetchHistory(userId: string): Promise<HistoryItem[]> {
  const res = await fetch(`${API_BASE_URL}/api/history?user_id=${encodeURIComponent(userId)}`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.detail || 'Failed to fetch history logs');
  }

  return res.json();
}

// Fetches historical trend for a query fingerprint
export async function fetchFingerprintTrend(fingerprint: string): Promise<TrendResponse> {
  const res = await fetch(`${API_BASE_URL}/api/history/${fingerprint}/trend`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.detail || 'Failed to fetch query execution history trend');
  }

  return res.json();
}

// Submits a SQL migration file for batch analysis
export async function submitBatchAnalysis(
  connectionString: string,
  file: File
): Promise<BatchResponse> {
  const formData = new FormData();
  formData.append('connection_string', connectionString);
  formData.append('file', file);

  const res = await fetch(`${API_BASE_URL}/api/batch/analyze`, {
    method: 'POST',
    body: formData
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.detail || 'An error occurred during batch analysis');
  }

  return res.json();
}

// Deletes a query log from history
export async function deleteHistory(id: string): Promise<{ id: string }> {
  const res = await fetch(`${API_BASE_URL}/api/history/${id}`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.detail || 'Failed to delete history item');
  }

  return res.json();
}

export function getSSEStreamUrl(jobId: string): string {
  return `${API_BASE_URL}/api/analyze/stream/${jobId}`;
}
