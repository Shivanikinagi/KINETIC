export async function fetchJson(url: string, opts: RequestInit = {}) {
  // Debug log so DevTools shows every API call
  console.log(`[API] ${opts.method || 'GET'} ${url}`)
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json', ...opts.headers },
    ...opts,
  })
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    console.error(`[API] ${opts.method || 'GET'} ${url} failed: ${res.status}`, text)
    // Try to extract FastAPI error detail
    try {
      const parsed = JSON.parse(text)
      if (parsed.detail) throw new Error(JSON.stringify(parsed))
    } catch (e: any) {
      if (e.message && e.message.startsWith('{')) throw e
    }
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

// Reputation & Reviews
export interface Review {
  id: string
  reviewer: string
  rating: number
  comment: string
  created_at: number
}

export interface Reputation {
  provider_id: string
  score: number
  total_reviews: number
  avg_rating: number
  recent_reviews: Review[]
}

// Escrow & Wallet
export type EscrowStatus = 'locked' | 'released' | 'refunded' | 'pending'

export interface EscrowRecord {
  id: string
  job_id: string
  amount_algo: number
  status: EscrowStatus
  created_at: string
  updated_at?: string
  tx_id?: string
  explorer_url?: string
}

export interface WalletHistory {
  id: string
  type: 'deposit' | 'withdraw' | 'escrow_lock' | 'escrow_release' | 'provider_payout' | 'refund'
  amount_algo: number
  status: 'confirmed' | 'pending'
  timestamp: string
  tx_id?: string
  explorer_url?: string
  description?: string
}

// Analytics & Charts
export interface AnalyticsChart {
  labels: string[]
  datasets: {
    label: string
    data: number[]
    color?: string
  }[]
}

export interface GPUUsage {
  provider_id: string
  gpu_model: string
  utilization_percent: number
  vram_used_gb: number
  vram_total_gb: number
  jobs_completed_24h: number
  earnings_algo_24h: number
}

// Model Hub
export interface ModelVersion {
  version: string
  created_at: number
  download_url?: string
  changelog?: string
}

export interface ModelBenchmark {
  metric: string
  value: number
  unit: string
  hardware: string
}

export interface ModelCard {
  id: string
  name: string
  description: string
  tags: string[]
  readme: string
  owner: string
  likes: number
  forks: number
  downloads: number
  license: string
  compute_req: string
  created_at: number
  versions?: ModelVersion[]
  benchmarks?: ModelBenchmark[]
  parameters?: string
  precision?: string[]
  category?: string
  similar?: string[]
}

// Dataset Hub
export interface DatasetCard {
  id: string
  name: string
  description: string
  tags: string[]
  owner: string
  license: string
  file_count: number
  size_mb: number
  is_public: boolean
  created_at: number
  train_split?: number
  test_split?: number
  val_split?: number
  sample_data?: Record<string, any>[]
  category?: string
}

// Spaces
export interface SpaceCard {
  id: string
  name: string
  description: string
  space_type: string
  owner: string
  url: string
  status: string
  likes: number
  compute_tokens: number
  created_at: number
  framework?: 'gradio' | 'streamlit' | 'docker' | 'static'
  share_url?: string
  embed_code?: string
  category?: string
}

// Assistant
export interface AssistantAction {
  label: string
  action: string
  payload?: any
}

export interface AssistantCard {
  type: 'provider' | 'cost' | 'model' | 'workflow' | 'routing'
  title: string
  subtitle?: string
  meta?: { label: string; value: string }[]
  badge?: string
  action?: AssistantAction
}

export interface AssistantMessage {
  role: 'user' | 'assistant'
  content: string
  actions?: AssistantAction[]
  cards?: AssistantCard[]
}

// Helper functions
export function buildExplorerUrl(txId: string, network: 'mainnet' | 'testnet' = 'testnet') {
  if (network === 'mainnet') {
    return `https://explorer.perawallet.app/tx/${txId}`
  }
  return `https://testnet.explorer.perawallet.app/tx/${txId}`
}

export function formatAlgo(amount: number): string {
  return `${amount.toFixed(3)} A`
}

export function formatDate(ts?: number | string): string {
  if (!ts) return '—'
  const d = typeof ts === 'number' ? new Date(ts * 1000) : new Date(ts)
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}

export function formatBytes(mb: number): string {
  if (mb > 1_000_000) return `${(mb / 1_000_000).toFixed(1)} TB`
  if (mb > 1000) return `${(mb / 1000).toFixed(1)} GB`
  return `${mb.toFixed(0)} MB`
}

export function formatNumber(n: number): string {
  if (n > 1_000_000_000) return `${(n / 1_000_000_000).toFixed(1)}B`
  if (n > 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n > 1000) return `${(n / 1000).toFixed(1)}K`
  return `${n}`
}

export function estimatePriceFromComputeReq(req: string): { min: number; max: number; currency: string } {
  const lower = req.toLowerCase()
  let min = 0.5
  let max = 2.0

  if (lower.includes('h100')) { min = 4.0; max = 8.0 }
  else if (lower.includes('a100') && lower.includes('80')) { min = 3.0; max = 6.0 }
  else if (lower.includes('a100') && lower.includes('40')) { min = 2.0; max = 4.0 }
  else if (lower.includes('rtx 4090')) { min = 1.2; max = 2.5 }
  else if (lower.includes('rtx 3090')) { min = 0.6; max = 1.5 }
  else if (lower.includes('2×')) { min *= 2; max *= 2 }
  else if (lower.includes('4×')) { min *= 4; max *= 4 }
  else if (lower.includes('8×')) { min *= 8; max *= 8 }

  // Scale by parameter count if present
  const paramMatch = lower.match(/(\d+)b/)
  if (paramMatch) {
    const params = parseInt(paramMatch[1])
    if (params >= 70) { min = Math.max(min, 3); max = Math.max(max, 7) }
    else if (params >= 30) { min = Math.max(min, 2); max = Math.max(max, 5) }
  }

  return { min, max, currency: 'ALGO/hr' }
}
