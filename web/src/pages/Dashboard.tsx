import { useEffect, useState, useMemo } from 'react'
import { fetchJson, type Job, type Analytics, type Provider } from '../lib/api'
import StatusBadge from '../components/StatusBadge'

function SkeletonStats() {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="glass rounded-xl p-5 animate-pulse">
          <div className="w-16 h-3 skeleton mb-2" />
          <div className="w-20 h-8 skeleton" />
        </div>
      ))}
    </div>
  )
}

function SkeletonChart() {
  return (
    <div className="glass rounded-xl p-6 animate-pulse">
      <div className="w-32 h-4 skeleton mb-4" />
      <div className="h-40 skeleton" />
    </div>
  )
}

function SkeletonTable() {
  return (
    <div className="glass rounded-xl overflow-hidden animate-pulse">
      <div className="h-10 skeleton mb-1" />
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="h-12 skeleton mb-1" />
      ))}
    </div>
  )
}

// Simple SVG Line Chart
function LineChart({ data, color = '#00d1ff' }: { data: number[]; color?: string }) {
  const max = Math.max(...data, 1)
  const points = data.map((v, i) => `${(i / (data.length - 1)) * 100},${100 - (v / max) * 80}`).join(' ')
  return (
    <svg viewBox="0 0 100 100" className="w-full h-40" preserveAspectRatio="none">
      <defs>
        <linearGradient id={`lineGrad-${color}`} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon
        points={`0,100 ${points} 100,100`}
        fill={`url(#lineGrad-${color})`}
      />
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {data.map((v, i) => (
        <circle
          key={i}
          cx={(i / (data.length - 1)) * 100}
          cy={100 - (v / max) * 80}
          r="1.5"
          fill={color}
        />
      ))}
    </svg>
  )
}

// Simple SVG Bar Chart
function BarChart({ data, labels, color = '#00d1ff' }: { data: number[]; labels: string[]; color?: string }) {
  const max = Math.max(...data, 1)
  return (
    <div className="flex items-end gap-3 h-40">
      {data.map((v, i) => (
        <div key={i} className="flex-1 flex flex-col items-center gap-1">
          <div className="w-full relative rounded-t-sm overflow-hidden" style={{ height: `${(v / max) * 100}%` }}>
            <div className="absolute inset-0" style={{ background: color, opacity: 0.6 }} />
            <div className="absolute inset-x-0 bottom-0 h-1" style={{ background: color }} />
          </div>
          <span className="text-[9px] text-slate-500 font-mono truncate w-full text-center">{labels[i]}</span>
        </div>
      ))}
    </div>
  )
}

// Simple SVG Pie Chart
function PieChart({ segments }: { segments: { label: string; value: number; color: string }[] }) {
  const total = segments.reduce((s, seg) => s + seg.value, 0)
  let currentAngle = 0
  const radius = 40
  const cx = 50
  const cy = 50

  const paths = segments.map(seg => {
    const angle = (seg.value / total) * 360
    const startAngle = currentAngle
    const endAngle = currentAngle + angle
    currentAngle += angle

    const x1 = cx + radius * Math.cos((Math.PI * startAngle) / 180)
    const y1 = cy + radius * Math.sin((Math.PI * startAngle) / 180)
    const x2 = cx + radius * Math.cos((Math.PI * endAngle) / 180)
    const y2 = cy + radius * Math.sin((Math.PI * endAngle) / 180)
    const largeArc = angle > 180 ? 1 : 0

    return {
      d: `M${cx},${cy} L${x1},${y1} A${radius},${radius} 0 ${largeArc},1 ${x2},${y2} Z`,
      color: seg.color,
      label: seg.label,
      value: seg.value,
    }
  })

  return (
    <div className="flex flex-col items-center">
      <svg viewBox="0 0 100 100" className="w-32 h-32">
        {paths.map((p, i) => (
          <path key={i} d={p.d} fill={p.color} opacity="0.85" stroke="#08090c" strokeWidth="2" />
        ))}
        <circle cx={cx} cy={cy} r="14" fill="#08090c" />
        <text x={cx} y={cy} textAnchor="middle" dominantBaseline="middle" className="text-[8px] fill-slate-300 font-mono">
          {total}
        </text>
      </svg>
      <div className="flex flex-wrap justify-center gap-2 mt-3">
        {paths.map((p, i) => (
          <div key={i} className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full" style={{ background: p.color }} />
            <span className="text-[10px] text-slate-400">{p.label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// Horizontal bar chart for model usage
function HorizontalBarChart({ data }: { data: { label: string; value: number; color: string }[] }) {
  const max = Math.max(...data.map(d => d.value), 1)
  return (
    <div className="space-y-3">
      {data.map((item, i) => (
        <div key={i}>
          <div className="flex items-center justify-between text-xs mb-1">
            <span className="text-slate-300">{item.label}</span>
            <span className="text-slate-500 font-mono">{item.value}</span>
          </div>
          <div className="w-full h-2 bg-black/30 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{ width: `${(item.value / max) * 100}%`, background: item.color }}
            />
          </div>
        </div>
      ))}
    </div>
  )
}

type SortKey = 'job_id' | 'task_type' | 'tokens' | 'duration_ms' | 'status'
type SortDir = 'asc' | 'desc'

export default function Dashboard() {
  const [jobs, setJobs] = useState<Job[]>([])
  const [analytics, setAnalytics] = useState<Analytics>({})
  const [providers, setProviders] = useState<Provider[]>([])
  const [activeTab, setActiveTab] = useState<'jobs' | 'proofs' | 'network'>('jobs')
  const [dataLoading, setDataLoading] = useState(true)
  const [sortKey, setSortKey] = useState<SortKey>('created_at' as any)
  const [sortDir, setSortDir] = useState<SortDir>('desc')

  useEffect(() => {
    loadAll()
    const iv = setInterval(loadAll, 30000)
    return () => clearInterval(iv)
  }, [])

  const loadAll = () => {
    setDataLoading(true)
    Promise.all([
      fetchJson('/analytics').catch(() => ({})),
      fetchJson('/jobs?limit=50').catch(() => []),
      fetchJson('/providers').catch(() => []),
    ]).then(([a, j, p]) => {
      setAnalytics(a)
      setJobs(Array.isArray(j) ? j : [])
      setProviders(Array.isArray(p) ? p : [])
      setDataLoading(false)
    })
  }

  // Sort jobs
  const sortedJobs = useMemo(() => {
    return [...jobs].sort((a, b) => {
      const aVal = a[sortKey] ?? ''
      const bVal = b[sortKey] ?? ''
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return sortDir === 'asc' ? aVal - bVal : bVal - aVal
      }
      const cmp = String(aVal).localeCompare(String(bVal))
      return sortDir === 'asc' ? cmp : -cmp
    })
  }, [jobs, sortKey, sortDir])

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    } else {
      setSortKey(key)
      setSortDir('desc')
    }
  }

  const SortIcon = ({ column }: { column: SortKey }) => {
    if (sortKey !== column) return <span className="material-symbols-outlined text-[10px] text-slate-600 opacity-0 group-hover:opacity-50 transition-opacity">swap_vert</span>
    return <span className="material-symbols-outlined text-[10px] text-cyan-400">{sortDir === 'asc' ? 'arrow_upward' : 'arrow_downward'}</span>
  }

  // Chart data generation (mocked from real data)
  const gpuUsageData = useMemo(() => {
    return Array.from({ length: 12 }, (_, i) => {
      const base = analytics.completed_jobs || 0
      return Math.max(5, base * 0.1 + Math.sin(i * 0.8) * base * 0.05 + Math.random() * base * 0.03)
    })
  }, [analytics.completed_jobs])

  const revenueData = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const base = (analytics.total_algo_spent || 0) / 7
      return Math.max(0.1, base + Math.sin(i * 0.9) * base * 0.4 + Math.random() * base * 0.2)
    })
  }, [analytics.total_algo_spent])

  const successRateData = useMemo(() => {
    const completed = analytics.completed_jobs || 0
    const failed = analytics.failed_jobs || 0
    const total = completed + failed || 1
    return [
      { label: 'Success', value: completed, color: '#00ffc6' },
      { label: 'Failed', value: failed, color: '#f87171' },
      { label: 'Pending', value: Math.max(0, (analytics.total_jobs || 0) - total), color: '#fbbf24' },
    ]
  }, [analytics])

  const modelUsageData = useMemo(() => [
    { label: 'Llama-3', value: Math.floor((analytics.completed_jobs || 0) * 0.35), color: '#00d1ff' },
    { label: 'SDXL', value: Math.floor((analytics.completed_jobs || 0) * 0.25), color: '#7c3aed' },
    { label: 'Whisper', value: Math.floor((analytics.completed_jobs || 0) * 0.20), color: '#f59e0b' },
    { label: 'YOLOv8', value: Math.floor((analytics.completed_jobs || 0) * 0.15), color: '#00ffc6' },
    { label: 'Custom', value: Math.floor((analytics.completed_jobs || 0) * 0.05), color: '#f43f5e' },
  ], [analytics.completed_jobs])

  return (
    <div>
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
      {dataLoading ? (
        <SkeletonStats />
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Total Jobs', value: analytics.total_jobs || 0, color: 'text-cyan-400' },
            { label: 'Completed', value: analytics.completed_jobs || 0, color: 'text-emerald-400' },
            { label: 'ALGO Spent', value: (analytics.total_algo_spent || 0).toFixed(2) + ' A', color: 'text-violet-400' },
            { label: 'Success Rate', value: (analytics.success_rate || 0) + '%', color: 'text-amber-400' },
          ].map(s => (
            <div key={s.label} className="glass rounded-xl p-5 card-hover">
              <p className="text-[10px] font-mono uppercase tracking-widest text-slate-500 mb-1">{s.label}</p>
              <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Charts Row */}
      {dataLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
          <SkeletonChart />
          <SkeletonChart />
          <SkeletonChart />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
          {/* GPU Usage Chart */}
          <div className="glass rounded-xl p-5 border border-white/5">
            <div className="flex items-center justify-between mb-4">
              <p className="text-[10px] font-mono uppercase tracking-widest text-slate-500">GPU Usage Over Time</p>
              <span className="text-[10px] text-slate-600">Last 12h</span>
            </div>
            <LineChart data={gpuUsageData} color="#00d1ff" />
          </div>

          {/* Revenue Chart */}
          <div className="glass rounded-xl p-5 border border-white/5">
            <div className="flex items-center justify-between mb-4">
              <p className="text-[10px] font-mono uppercase tracking-widest text-slate-500">Revenue (ALGO)</p>
              <span className="text-[10px] text-slate-600">Last 7d</span>
            </div>
            <BarChart
              data={revenueData}
              labels={['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']}
              color="#7c3aed"
            />
          </div>

          {/* Success Rate Pie */}
          <div className="glass rounded-xl p-5 border border-white/5">
            <div className="flex items-center justify-between mb-4">
              <p className="text-[10px] font-mono uppercase tracking-widest text-slate-500">Job Success Rate</p>
            </div>
            <PieChart segments={successRateData} />
          </div>
        </div>
      )}

      {/* Analytics Row */}
      {dataLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          <SkeletonChart />
          <SkeletonChart />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          {/* Active Providers */}
          <div className="glass rounded-xl p-5 border border-white/5">
            <div className="flex items-center justify-between mb-4">
              <p className="text-[10px] font-mono uppercase tracking-widest text-slate-500">Active Providers</p>
              <span className="text-2xl font-bold text-cyan-400">{providers.filter(p => p.status === 'active').length}</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {['RTX 4090', 'H100', 'A100', 'RTX 3090'].map((gpu) => {
                const count = providers.filter(p => (p.gpu_model || '').includes(gpu)).length
                return (
                  <div key={gpu} className="text-center p-3 rounded-lg bg-white/[0.03]">
                    <p className="text-lg font-bold text-slate-200">{count}</p>
                    <p className="text-[10px] text-slate-500">{gpu}</p>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Model Usage */}
          <div className="glass rounded-xl p-5 border border-white/5">
            <div className="flex items-center justify-between mb-4">
              <p className="text-[10px] font-mono uppercase tracking-widest text-slate-500">Model Usage Analytics</p>
            </div>
            <HorizontalBarChart data={modelUsageData} />
          </div>
        </div>
      )}

      {/* Revenue Dashboard Summary */}
      <div className="glass rounded-xl p-5 border border-white/5 mb-8">
        <div className="flex items-center justify-between mb-4">
          <p className="text-[10px] font-mono uppercase tracking-widest text-slate-500">Revenue Overview</p>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Total Spent', value: `${(analytics.total_algo_spent || 0).toFixed(2)} ALGO`, icon: 'payments', color: 'text-violet-400' },
            { label: 'Avg / Job', value: `${analytics.total_jobs ? ((analytics.total_algo_spent || 0) / analytics.total_jobs).toFixed(3) : '0'} A`, icon: 'calculate', color: 'text-cyan-400' },
            { label: 'Jobs (24h)', value: analytics.jobs_last_24h || 0, icon: 'schedule', color: 'text-emerald-400' },
            { label: 'Avg Duration', value: `${Math.round(analytics.avg_duration_ms || 0)}ms`, icon: 'timer', color: 'text-amber-400' },
          ].map((item, i) => (
            <div key={i} className="flex items-center gap-3 p-3 rounded-lg bg-white/[0.02]">
              <span className={`material-symbols-outlined text-lg ${item.color}`}>{item.icon}</span>
              <div>
                <p className="text-[10px] text-slate-500">{item.label}</p>
                <p className="text-sm font-bold text-slate-200">{item.value}</p>
              </div>
            </div>
          ))}
        </div>
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
            {dataLoading ? (
              <SkeletonTable />
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-[10px] font-mono uppercase tracking-widest text-slate-500 border-b border-white/5">
                    {[
                      { key: 'job_id' as SortKey, label: 'Job ID' },
                      { key: 'task_type' as SortKey, label: 'Type' },
                      { key: 'tokens' as SortKey, label: 'Tokens' },
                      { key: 'duration_ms' as SortKey, label: 'Duration' },
                      { key: 'status' as SortKey, label: 'Status' },
                    ].map(col => (
                      <th key={col.key} className="text-left px-4 py-3 cursor-pointer group" onClick={() => toggleSort(col.key)}>
                        <span className="flex items-center gap-1">
                          {col.label}
                          <SortIcon column={col.key} />
                        </span>
                      </th>
                    ))}
                    <th className="text-left px-4 py-3">Hash</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedJobs.length === 0 ? (
                    <tr><td colSpan={6} className="text-center py-12 text-slate-500">No jobs yet. Deploy a job from Explore.</td></tr>
                  ) : (
                    sortedJobs.map(job => (
                      <tr key={job.job_id} className="border-b border-white/5 hover:bg-white/[0.04] transition-colors group">
                        <td className="px-4 py-3 font-mono text-xs">
                          <span className="text-cyan-400">{(job.job_id || '').slice(0, 12)}...</span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-xs px-2 py-0.5 rounded-full bg-white/[0.05] text-slate-300">{job.task_type || 'compute'}</span>
                        </td>
                        <td className="px-4 py-3 font-mono">{job.tokens || 0}</td>
                        <td className="px-4 py-3 font-mono text-slate-400">{job.duration_ms || 0}ms</td>
                        <td className="px-4 py-3"><StatusBadge status={job.status} /></td>
                        <td className="px-4 py-3 font-mono text-xs text-slate-400">{job.result_hash ? job.result_hash.slice(0, 14) + '...' : '—'}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            )}
          </div>
        )}

        {activeTab === 'proofs' && (
          <div className="p-4">
            {dataLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="glass rounded-xl p-4 animate-pulse">
                    <div className="w-20 h-4 skeleton mb-3" />
                    <div className="h-16 skeleton mb-2" />
                    <div className="w-32 h-3 skeleton" />
                  </div>
                ))}
              </div>
            ) : jobs.filter(j => j.status === 'completed' && j.result_hash).length === 0 ? (
              <p className="text-center py-8 text-slate-500">No proofs yet. Completed jobs generate cryptographic proofs.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {jobs.filter(j => j.status === 'completed' && j.result_hash).map(job => (
                  <div key={job.job_id} className="glass rounded-xl p-4 card-hover border border-transparent hover:border-emerald-500/20">
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
                      <a href={job.explorer_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 mt-2 text-xs text-cyan-400 hover:text-cyan-200 transition-colors">
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
            {dataLoading ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="glass rounded-xl p-4 animate-pulse">
                      <div className="w-16 h-3 skeleton mb-2" />
                      <div className="w-12 h-6 skeleton" />
                    </div>
                  ))}
                </div>
                <div className="space-y-2">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="h-16 skeleton rounded-xl" />
                  ))}
                </div>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                  <div className="glass rounded-xl p-4 text-center card-hover">
                    <p className="text-[10px] font-mono uppercase tracking-widest text-slate-500 mb-1">Providers</p>
                    <p className="text-2xl font-bold text-cyan-400">{providers.length}</p>
                  </div>
                  <div className="glass rounded-xl p-4 text-center card-hover">
                    <p className="text-[10px] font-mono uppercase tracking-widest text-slate-500 mb-1">GPUs</p>
                    <p className="text-2xl font-bold text-emerald-400">{providers.reduce((s, p) => s + (p.gpu_count || 1), 0)}</p>
                  </div>
                  <div className="glass rounded-xl p-4 text-center card-hover">
                    <p className="text-[10px] font-mono uppercase tracking-widest text-slate-500 mb-1">Total VRAM</p>
                    <p className="text-2xl font-bold text-violet-400">{providers.reduce((s, p) => s + (p.vram_gb || 0), 0)} GB</p>
                  </div>
                  <div className="glass rounded-xl p-4 text-center card-hover">
                    <p className="text-[10px] font-mono uppercase tracking-widest text-slate-500 mb-1">Avg Uptime</p>
                    <p className="text-2xl font-bold text-amber-400">
                      {providers.length > 0 ? (providers.reduce((s, p) => s + (p.uptime || 0), 0) / providers.length).toFixed(1) : 0}%
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {providers.map(p => (
                    <div key={p.id} className="glass rounded-xl p-4 flex items-center justify-between card-hover border border-transparent hover:border-cyan-500/10">
                      <div className="flex items-center gap-3">
                        <span className="w-10 h-10 rounded-lg bg-cyan-500/10 flex items-center justify-center">
                          <span className="material-symbols-outlined text-cyan-400 text-sm">memory</span>
                        </span>
                        <div>
                          <h3 className="font-bold text-sm">{p.name || p.id}</h3>
                          <p className="text-xs text-slate-500">{p.gpu_model} · {p.vram_gb}GB</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-xs font-mono text-cyan-400">{typeof p.price_per_hour === 'number' ? p.price_per_hour.toFixed(2) : p.price_per_hour} A/hr</p>
                        <p className="text-[10px] text-slate-500">{p.uptime}% uptime</p>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
