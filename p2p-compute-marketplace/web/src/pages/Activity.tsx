import { useEffect, useState } from 'react'
import { fetchJson, type Job, type Analytics, type Provider } from '../lib/api'

export default function Activity() {
  const [jobs, setJobs] = useState<Job[]>([])
  const [analytics, setAnalytics] = useState<Analytics>({})
  const [providers, setProviders] = useState<Provider[]>([])

  useEffect(() => {
    loadAll()
    const iv = setInterval(loadAll, 10000)
    return () => clearInterval(iv)
  }, [])

  const loadAll = () => {
    Promise.all([
      fetchJson('/jobs?limit=30').catch(() => []),
      fetchJson('/analytics').catch(() => ({})),
      fetchJson('/providers').catch(() => []),
    ]).then(([j, a, p]) => {
      setJobs(Array.isArray(j) ? j : [])
      setAnalytics(a)
      setProviders(Array.isArray(p) ? p : [])
    })
  }

  const timeAgo = (ts?: number | string) => {
    if (!ts || ts === 0) return 'unknown time'
    // Handle both Unix seconds (number) and ISO strings
    const date = typeof ts === 'number' ? new Date(ts * 1000) : new Date(ts)
    if (isNaN(date.getTime())) return 'unknown time'
    const diff = Date.now() - date.getTime()
    const s = Math.floor(diff / 1000)
    if (s < 5) return 'just now'
    if (s < 60) return `${s}s ago`
    const m = Math.floor(s / 60)
    if (m < 60) return `${m}m ago`
    const h = Math.floor(m / 60)
    if (h < 24) return `${h}h ago`
    const d = Math.floor(h / 24)
    if (d < 30) return `${d}d ago`
    return date.toLocaleDateString()
  }

  return (
    <div className="max-w-7xl mx-auto px-6 py-8">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Activity Feed</h1>
          <p className="text-slate-500 text-sm mt-1">Live events from the compute network</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
          <span className="text-xs font-mono uppercase tracking-widest text-slate-500">Live</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <div className="glass rounded-xl p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold">Recent Events</h2>
              <button onClick={loadAll} className="text-xs text-cyan-400 hover:text-cyan-200 flex items-center gap-1">
                <span className="material-symbols-outlined text-sm">refresh</span> Refresh
              </button>
            </div>
            <div className="space-y-4 relative">
              <div className="absolute left-[19px] top-10 bottom-0 w-0.5 bg-white/5" />
              {jobs.length === 0 ? (
                <p className="text-center py-8 text-slate-500">No activity yet. Submit a job to see events.</p>
              ) : (
                jobs.map((job, i) => (
                  <div key={job.job_id} className="flex items-start gap-4" style={{ animationDelay: `${i * 50}ms` }}>
                    <span className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 z-10 ${
                      job.status === 'completed' ? 'bg-emerald-500/10' : job.status === 'failed' ? 'bg-red-500/10' : 'bg-amber-500/10'
                    }`}>
                      <span className={`material-symbols-outlined ${
                        job.status === 'completed' ? 'text-emerald-400' : job.status === 'failed' ? 'text-red-400' : 'text-amber-400'
                      }`}>
                        {job.status === 'completed' ? 'check_circle' : job.status === 'failed' ? 'error' : 'schedule'}
                      </span>
                    </span>
                    <div className="flex-1 min-w-0 pb-4">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-semibold">{job.task_type || 'Compute'} job {job.status}</p>
                        <span className="text-[10px] text-slate-500 shrink-0">{timeAgo(job.created_at)}</span>
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">ID: <span className="font-mono text-slate-400">{(job.job_id || '').slice(0, 16)}...</span></p>
                      {job.result_hash && (
                        <p className="text-xs text-slate-500 mt-1">Hash: <span className="font-mono text-emerald-400">{job.result_hash.slice(0, 24)}...</span></p>
                      )}
                      {job.explorer_url && (
                        <a href={job.explorer_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 mt-1 text-xs text-cyan-400 hover:text-cyan-200">
                          <span className="material-symbols-outlined text-xs">open_in_new</span> View on-chain
                        </a>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="glass rounded-xl p-6">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500 mb-4">Network Stats</h2>
            <div className="space-y-4">
              <div className="flex justify-between"><span className="text-sm text-slate-400">Jobs Today</span><span className="text-sm font-bold text-cyan-400">{analytics.jobs_last_24h || 0}</span></div>
              <div className="flex justify-between"><span className="text-sm text-slate-400">ALGO Spent</span><span className="text-sm font-bold text-emerald-400">{(analytics.total_algo_spent || 0).toFixed(2)} A</span></div>
              <div className="flex justify-between"><span className="text-sm text-slate-400">Success Rate</span><span className="text-sm font-bold text-violet-400">{analytics.success_rate || 0}%</span></div>
              <div className="flex justify-between"><span className="text-sm text-slate-400">Active Providers</span><span className="text-sm font-bold text-amber-400">{providers.length}</span></div>
            </div>
          </div>

          <div className="glass rounded-xl p-6">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500 mb-4">On-chain Contracts</h2>
            <div className="space-y-3">
              {[
                { name: 'Escrow', desc: 'Payment lock & release', icon: 'deployed_code', color: 'text-cyan-400' },
                { name: 'Provider Registry', desc: 'On-chain provider listings', icon: 'app_registration', color: 'text-emerald-400' },
                { name: 'Badge Minter', desc: 'Verification badges', icon: 'verified', color: 'text-violet-400' },
              ].map(c => (
                <div key={c.name} className="flex items-center gap-3">
                  <span className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center">
                    <span className={`material-symbols-outlined ${c.color} text-sm`}>{c.icon}</span>
                  </span>
                  <div>
                    <p className="text-sm font-semibold">{c.name}</p>
                    <p className="text-[10px] text-slate-500">{c.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
