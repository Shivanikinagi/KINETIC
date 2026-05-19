import { useEffect, useState } from 'react'
import { fetchJson, type Job, type Analytics, type Provider } from '../lib/api'
import StatusBadge from '../components/StatusBadge'

export default function Dashboard() {
  const [jobs, setJobs] = useState<Job[]>([])
  const [analytics, setAnalytics] = useState<Analytics>({})
  const [providers, setProviders] = useState<Provider[]>([])
  const [activeTab, setActiveTab] = useState<'jobs' | 'proofs' | 'network'>('jobs')

  useEffect(() => {
    loadAll()
    const iv = setInterval(loadAll, 30000)
    return () => clearInterval(iv)
  }, [])

  const loadAll = () => {
    Promise.all([
      fetchJson('/analytics').catch(() => ({})),
      fetchJson('/jobs?limit=50').catch(() => []),
      fetchJson('/providers').catch(() => []),
    ]).then(([a, j, p]) => {
      setAnalytics(a)
      setJobs(Array.isArray(j) ? j : [])
      setProviders(Array.isArray(p) ? p : [])
    })
  }

  return (
    <div className="max-w-7xl mx-auto px-6 py-8">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-slate-500 text-sm mt-1">Your jobs, spending, and proofs</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-xs font-mono uppercase tracking-widest text-slate-500">Live</span>
          <button onClick={loadAll} className="glass px-3 py-2 rounded-lg text-cyan-400 text-xs font-bold hover:bg-white/5 transition-all flex items-center gap-1.5">
            <span className="material-symbols-outlined text-sm">refresh</span>
            Refresh
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Total Jobs', value: analytics.total_jobs || 0, color: 'text-cyan-400' },
          { label: 'Completed', value: analytics.completed_jobs || 0, color: 'text-emerald-400' },
          { label: 'ALGO Spent', value: (analytics.total_algo_spent || 0).toFixed(2) + ' A', color: 'text-violet-400' },
          { label: 'Success Rate', value: (analytics.success_rate || 0) + '%', color: 'text-amber-400' },
        ].map(s => (
          <div key={s.label} className="glass rounded-xl p-5">
            <p className="text-[10px] font-mono uppercase tracking-widest text-slate-500 mb-1">{s.label}</p>
            <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="glass rounded-xl border border-white/5 overflow-hidden">
        <div className="flex border-b border-white/5 px-4">
          {(['jobs', 'proofs', 'network'] as const).map(t => (
            <button key={t} onClick={() => setActiveTab(t)}
              className={`tab-btn ${activeTab === t ? 'active' : ''}`}>
              <span className="material-symbols-outlined text-sm mr-1 align-middle">
                {t === 'jobs' ? 'work_history' : t === 'proofs' ? 'verified' : 'hub'}
              </span>
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>

        {activeTab === 'jobs' && (
          <div className="p-4 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-[10px] font-mono uppercase tracking-widest text-slate-500 border-b border-white/5">
                  <th className="text-left px-4 py-3">Job ID</th>
                  <th className="text-left px-4 py-3">Type</th>
                  <th className="text-left px-4 py-3">Tokens</th>
                  <th className="text-left px-4 py-3">Duration</th>
                  <th className="text-left px-4 py-3">Status</th>
                  <th className="text-left px-4 py-3">Hash</th>
                </tr>
              </thead>
              <tbody>
                {jobs.length === 0 ? (
                  <tr><td colSpan={6} className="text-center py-12 text-slate-500">No jobs yet. Deploy a job from Explore.</td></tr>
                ) : (
                  jobs.map(job => (
                    <tr key={job.job_id} className="border-b border-white/5 hover:bg-white/[0.02] transition-colors">
                      <td className="px-4 py-3 font-mono text-xs text-cyan-400">{(job.job_id || '').slice(0, 12)}...</td>
                      <td className="px-4 py-3">{job.task_type || 'compute'}</td>
                      <td className="px-4 py-3 font-mono">{job.tokens || 0}</td>
                      <td className="px-4 py-3 font-mono">{job.duration_ms || 0}ms</td>
                      <td className="px-4 py-3"><StatusBadge status={job.status} /></td>
                      <td className="px-4 py-3 font-mono text-xs text-slate-400">{job.result_hash ? job.result_hash.slice(0, 14) + '...' : '—'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'proofs' && (
          <div className="p-4">
            {jobs.filter(j => j.status === 'completed' && j.result_hash).length === 0 ? (
              <p className="text-center py-8 text-slate-500">No proofs yet. Completed jobs generate cryptographic proofs.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {jobs.filter(j => j.status === 'completed' && j.result_hash).map(job => (
                  <div key={job.job_id} className="glass rounded-xl p-4 card-hover">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="material-symbols-outlined text-emerald-400 text-sm">verified</span>
                      <span className="text-[10px] font-mono uppercase tracking-widest text-emerald-400">Proof</span>
                    </div>
                    <p className="font-mono text-xs text-slate-300 break-all mb-2">{job.result_hash}</p>
                    <div className="flex justify-between text-[10px] text-slate-500">
                      <span>{job.task_type || 'compute'}</span>
                      <span>{job.tokens || 0} tokens</span>
                    </div>
                    {job.explorer_url && (
                      <a href={job.explorer_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 mt-2 text-xs text-cyan-400 hover:text-cyan-200">
                        <span className="material-symbols-outlined text-xs">open_in_new</span>
                        Verify on-chain
                      </a>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'network' && (
          <div className="p-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="glass rounded-xl p-4 text-center">
                <p className="text-[10px] font-mono uppercase tracking-widest text-slate-500 mb-1">Providers</p>
                <p className="text-2xl font-bold text-cyan-400">{providers.length}</p>
              </div>
              <div className="glass rounded-xl p-4 text-center">
                <p className="text-[10px] font-mono uppercase tracking-widest text-slate-500 mb-1">GPUs</p>
                <p className="text-2xl font-bold text-emerald-400">{providers.reduce((s, p) => s + (p.gpu_count || 1), 0)}</p>
              </div>
              <div className="glass rounded-xl p-4 text-center">
                <p className="text-[10px] font-mono uppercase tracking-widest text-slate-500 mb-1">Total VRAM</p>
                <p className="text-2xl font-bold text-violet-400">{providers.reduce((s, p) => s + (p.vram_gb || 0), 0)} GB</p>
              </div>
              <div className="glass rounded-xl p-4 text-center">
                <p className="text-[10px] font-mono uppercase tracking-widest text-slate-500 mb-1">Avg Uptime</p>
                <p className="text-2xl font-bold text-amber-400">
                  {providers.length > 0 ? (providers.reduce((s, p) => s + (p.uptime || 0), 0) / providers.length).toFixed(1) : 0}%
                </p>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {providers.map(p => (
                <div key={p.id} className="glass rounded-xl p-4 flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-sm">{p.name || p.id}</h3>
                    <p className="text-xs text-slate-500">{p.gpu_model} · {p.vram_gb}GB</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-mono text-cyan-400">{typeof p.price_per_hour === 'number' ? p.price_per_hour.toFixed(2) : p.price_per_hour} A/hr</p>
                    <p className="text-[10px] text-slate-500">{p.uptime}% uptime</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
