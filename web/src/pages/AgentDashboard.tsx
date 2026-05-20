import { useEffect, useState } from 'react'
import { fetchJson } from '../lib/api'

interface AgentStatus {
  status: string
  jobs_today: number
  algo_spent_today: number
  verifications_passed: number
  budget_remaining: number
  current_task: { type: string; tokens: number }
}

interface AgentProof {
  kind: string
  label: string
  tx_id: string
  url: string
  round?: number
  timestamp?: string
}

interface AgentLog {
  timestamp: string
  message: string
  task_type: string
  task_tokens: number
}

export default function AgentDashboard() {
  const [status, setStatus] = useState<AgentStatus | null>(null)
  const [proofs, setProofs] = useState<{ apps: any[]; proofs: AgentProof[] } | null>(null)
  const [logs, setLogs] = useState<AgentLog[]>([])
  const [loading, setLoading] = useState(false)
  const [runResult, setRunResult] = useState<any>(null)
  const [form, setForm] = useState({ type: 'inference', tokens: 500, payload: 'compute-job', provider_endpoint: '' })

  const loadAll = async () => {
    try {
      const [s, p, l] = await Promise.all([
        fetchJson('/agent/status'),
        fetchJson('/agent/proofs'),
        fetchJson('/agent/log'),
      ])
      setStatus(s)
      setProofs(p)
      setLogs(l)
    } catch {
      // Agent not configured
    }
  }

  useEffect(() => {
    loadAll()
    const iv = setInterval(loadAll, 5000)
    return () => clearInterval(iv)
  }, [])

  const handleRun = async () => {
    setLoading(true)
    setRunResult(null)
    try {
      const res = await fetchJson('/agent/run', {
        method: 'POST',
        body: JSON.stringify(form)
      })
      setRunResult({ ok: true, ...res })
    } catch (err: any) {
      setRunResult({ ok: false, error: err.message || 'Failed' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-6xl mx-auto px-6 py-8">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Autonomous Agent</h1>
          <p className="text-slate-500 text-sm mt-1">Self-driving compute marketplace with x402 M2M payments</p>
        </div>
        <div className="flex items-center gap-3">
          <span className={`w-2 h-2 rounded-full ${status?.status === 'running' ? 'bg-amber-400 animate-pulse' : 'bg-emerald-400'}`} />
          <span className="text-xs text-slate-500 uppercase tracking-wider">{status?.status || 'idle'}</span>
        </div>
      </div>

      {/* Stats Grid */}
      {status && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="glass rounded-xl p-4 text-center">
            <p className="text-[10px] text-slate-500 uppercase tracking-wider">Jobs Today</p>
            <p className="text-2xl font-bold text-cyan-400">{status.jobs_today}</p>
          </div>
          <div className="glass rounded-xl p-4 text-center">
            <p className="text-[10px] text-slate-500 uppercase tracking-wider">ALGO Spent</p>
            <p className="text-2xl font-bold text-amber-400">{status.algo_spent_today.toFixed(2)}</p>
          </div>
          <div className="glass rounded-xl p-4 text-center">
            <p className="text-[10px] text-slate-500 uppercase tracking-wider">Verifications</p>
            <p className="text-2xl font-bold text-emerald-400">{status.verifications_passed}</p>
          </div>
          <div className="glass rounded-xl p-4 text-center">
            <p className="text-[10px] text-slate-500 uppercase tracking-wider">Budget Left</p>
            <p className="text-2xl font-bold text-violet-400">{status.budget_remaining.toFixed(2)}</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Run Agent */}
        <div className="glass rounded-xl p-6">
          <h2 className="text-lg font-bold mb-4">Dispatch Agent Job</h2>
          <div className="space-y-4">
            <div>
              <label className="text-xs text-slate-500 mb-1 block">Task Type</label>
              <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}
                className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-sm text-slate-300 focus:border-cyan-500/50 outline-none">
                <option value="inference">Inference</option>
                <option value="training">Training</option>
                <option value="fine_tune">Fine-Tune</option>
                <option value="rendering">3D Rendering</option>
                <option value="image_generation">Image Generation</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-slate-500 mb-1 block">Tokens</label>
              <input type="number" min={100} max={2000} value={form.tokens}
                onChange={e => setForm(f => ({ ...f, tokens: parseInt(e.target.value) || 500 }))}
                className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-sm text-slate-300 focus:border-cyan-500/50 outline-none" />
            </div>
            <div>
              <label className="text-xs text-slate-500 mb-1 block">Payload</label>
              <input value={form.payload} onChange={e => setForm(f => ({ ...f, payload: e.target.value }))}
                className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-sm text-slate-300 focus:border-cyan-500/50 outline-none" />
            </div>
            <div>
              <label className="text-xs text-slate-500 mb-1 block">Provider Endpoint (optional)</label>
              <input value={form.provider_endpoint} onChange={e => setForm(f => ({ ...f, provider_endpoint: e.target.value }))}
                placeholder="http://localhost:8000"
                className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-sm text-slate-300 focus:border-cyan-500/50 outline-none" />
            </div>
            <button onClick={handleRun} disabled={loading}
              className="w-full py-3 rounded-xl bg-cyan-500 text-slate-950 font-bold hover:brightness-110 transition-all disabled:opacity-50 flex items-center justify-center gap-2">
              {loading ? (
                <>
                  <span className="animate-spin material-symbols-outlined text-sm">progress_activity</span>
                  Dispatching...
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-sm">smart_toy</span>
                  Run Autonomous Agent
                </>
              )}
            </button>
            {runResult && (
              <div className={`p-3 rounded-lg text-sm ${runResult.ok ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'}`}>
                <p className="font-semibold">{runResult.ok ? 'Agent dispatched!' : `Error: ${runResult.error}`}</p>
                {runResult.pid && <p className="text-xs mt-1">PID: {runResult.pid}</p>}
                {runResult.tokens && <p className="text-xs">Tokens: {runResult.tokens}</p>}
              </div>
            )}
          </div>
        </div>

        {/* Proofs */}
        <div className="space-y-6">
          <div className="glass rounded-xl p-6">
            <h2 className="text-lg font-bold mb-4">On-Chain Proofs</h2>
            {proofs && proofs.proofs.length > 0 ? (
              <div className="space-y-3">
                {proofs.proofs.map((p, i) => (
                  <div key={i} className="bg-black/20 rounded-lg p-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-cyan-400">{p.label}</span>
                      <a href={p.url} target="_blank" rel="noreferrer" className="text-[10px] text-slate-500 hover:text-cyan-400 flex items-center gap-0.5">
                        <span className="material-symbols-outlined text-[10px]">open_in_new</span> View
                      </a>
                    </div>
                    <p className="text-[10px] text-slate-600 font-mono mt-1">{p.tx_id.slice(0, 20)}...</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-500">No proofs yet. Run an agent job to see on-chain transactions.</p>
            )}
          </div>

          {/* Live Logs */}
          <div className="glass rounded-xl p-6">
            <h2 className="text-lg font-bold mb-4">Live Logs</h2>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {logs.length === 0 ? (
                <p className="text-sm text-slate-500">No logs yet.</p>
              ) : (
                logs.map((log, i) => (
                  <div key={i} className="bg-black/20 rounded-lg p-2">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-slate-600">{new Date(log.timestamp).toLocaleTimeString()}</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">{log.task_type}</span>
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5">{log.message}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
