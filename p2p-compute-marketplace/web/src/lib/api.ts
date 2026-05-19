export async function fetchJson(url: string, opts: RequestInit = {}) {
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json', ...opts.headers },
    ...opts,
  })
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(text || `Request failed (${res.status})`)
  }
  return res.json()
}

export interface Provider {
  id: string
  name?: string
  gpu_model?: string
  gpu_count?: number
  vram_gb?: number
  price_per_hour?: number
  uptime?: number
  status?: string
  region?: string
  payment_address?: string
  verified_member?: boolean
  org_verified?: boolean
  org_name?: string
  logo_url?: string
  endpoint?: string
  trust?: { reputation_score?: number }
}

export interface Job {
  job_id: string
  consumer?: string
  provider?: string
  task_type?: string
  tokens?: number
  amount_microalgo?: number
  result_hash?: string
  status?: string
  duration_ms?: number
  created_at?: number
  completed_at?: number
  tx_id?: string
  explorer_url?: string
}

export interface Template {
  template_id: string
  name: string
  description?: string
  use_case?: string
  required_vram?: number
  base_tokens?: number
}

export interface Analytics {
  total_jobs?: number
  completed_jobs?: number
  failed_jobs?: number
  total_algo_spent?: number
  success_rate?: number
  jobs_last_24h?: number
  avg_duration_ms?: number
}
