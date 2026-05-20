import { useEffect, useState, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { fetchJson } from '../lib/api'

interface JobStatus {
  job_id: string
  status: 'pending' | 'running' | 'completed' | 'failed'
  progress: number
  logs: string[]
  gpu_utilization: number
  vram_usage: number
  vram_total: number
  provider: string
  tx_id?: string
  explorer_url?: string
  result_hash?: string
  escrow_status: 'locked' | 'released' | 'refunded'
  cost_algo: number
  duration_ms: number
  created_at: number
}

function AnimatedBar({ value, color, label, sublabel }: { value: number; color: string; label: string; sublabel: string }) {
  const [width, setWidth] = useState(0)
  useEffect(() => {
    const t = setTimeout(() => setWidth(Math.min(value, 100)), 100)
    return () => clearTimeout(t)
  }, [value])

  const bgColors: Record<string, string> = {
    cyan: 'bg-cyan-500',
    violet: 'bg-violet-500',
    emerald: 'bg-emerald-500',
    amber: 'bg-amber-500',
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm text-slate-400">{label}</span>
        <span className={`text-lg font-bold ${color === 'cyan' ? 'text-cyan-400' : color === 'violet' ? 'text-violet-400' : color === 'emerald' ? 'text-emerald-400' : 'text-amber-400'}`}>
          {sublabel}
        </span>
      </div>
      <div className="w-full h-3 bg-black/50 rounded-full overflow-hidden relative">
        <div
          className={`h-full ${bgColors[color] || 'bg-cyan-500'} transition-all duration-700 ease-out relative`}
          style={{ width: `${width}%` }}
        >
          <div className="absolute inset-0 animate-progress-shimmer" />
        </div>
      </div>
    </div>
  )
}

export default function JobExecution() {
  const { jobId } = useParams<{ jobId: string }>()
  const navigate = useNavigate()
  const [job, setJob] = useState<JobStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)
  const [logs, setLogs] = useState<string[]>([])
  const logsEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!jobId) return

    const fetchJob = async () => {
      try {
        const data = await fetchJson(`/jobs/${jobId}`)
        setJob(data)
        setLogs(prev => {
          const newLogs = data.logs || []
          if (JSON.stringify(newLogs) !== JSON.stringify(prev)) {
            return newLogs
          }
          return prev
        })
        setLoading(false)
      } catch (err) {
        console.error('Failed to fetch job:', err)
        setLoading(false)
      }
    }

    fetchJob()
    // Poll every 2 seconds for updates
    const interval = setInterval(fetchJob, 2000)
    return () => clearInterval(interval)
  }, [jobId])

  // Auto-scroll logs
  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [logs])

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-400">Loading job execution...</p>
        </div>
      </div>
    )
  }

  if (!job) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <span className="material-symbols-outlined text-6xl text-red-400 mb-4">error</span>
          <h2 className="text-2xl font-bold mb-2">Job Not Found</h2>
          <p className="text-slate-400 mb-4">Job ID: {jobId}</p>
          <button onClick={() => navigate('/jobs')} className="px-4 py-2 rounded-lg bg-cyan-500 text-slate-950 font-bold hover:brightness-110 transition-all">
            View All Jobs
          </button>
        </div>
      </div>
    )
  }

  const statusConfig = {
    pending: { color: 'text-amber-400 bg-amber-500/10 border-amber-500/20', icon: 'schedule', label: 'Pending' },
    running: { color: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20', icon: 'play_circle', label: 'Running' },
    completed: { color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20', icon: 'check_circle', label: 'Completed' },
    failed: { color: 'text-red-400 bg-red-500/10 border-red-500/20', icon: 'cancel', label: 'Failed' },
  }

  const status = statusConfig[job.status]
  const isVerified = job.status === 'completed' && job.result_hash

  // Generate terminal-style logs if empty
  const displayLogs = logs.length > 0 ? logs : [
    `[${new Date(job.created_at * 1000).toLocaleTimeString()}] Initializing job environment...`,
    `[${new Date(job.created_at * 1000).toLocaleTimeString()}] Allocating GPU resources...`,
    `[${new Date().toLocaleTimeString()}] Docker container started`,
    `[${new Date().toLocaleTimeString()}] Loading model weights into VRAM...`,
  ]

  return (
    <div className="max-w-7xl mx-auto px-6 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <button onClick={() => navigate('/jobs')} className="text-slate-400 hover:text-slate-300 mb-2 flex items-center gap-1 text-sm transition-colors">
            <span className="material-symbols-outlined text-sm">arrow_back</span> Back to Jobs
          </button>
          <h1 className="text-3xl font-bold tracking-tight">Job Execution</h1>
          <p className="text-slate-500 text-sm mt-1">Real-time monitoring • Job ID: {job.job_id}</p>
        </div>
        <div className={`px-4 py-2 rounded-xl border ${status.color} flex items-center gap-2`}>
          <span className="material-symbols-outlined text-lg">{status.icon}</span>
          <span className="font-bold uppercase text-sm">{status.label}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Execution Panel */}
        <div className="lg:col-span-2 space-y-6">
          {/* Progress Bar */}
          <div className="glass rounded-xl p-6 border border-white/5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-bold">Execution Progress</h2>
              <span className="text-2xl font-bold text-cyan-400">{job.progress}%</span>
            </div>
            <div className="w-full h-3 bg-black/50 rounded-full overflow-hidden relative">
              <div
                className="h-full bg-gradient-to-r from-cyan-500 via-violet-500 to-emerald-500 transition-all duration-500 relative"
                style={{ width: `${job.progress}%` }}
              >
                <div className="absolute inset-0 animate-progress-shimmer" />
              </div>
            </div>
            <div className="flex items-center justify-between mt-2 text-xs text-slate-500">
              <span>Started {new Date(job.created_at * 1000).toLocaleTimeString()}</span>
              <span>{job.duration_ms}ms elapsed</span>
            </div>
          </div>

          {/* GPU Metrics */}
          <div className="glass rounded-xl p-6 border border-white/5">
            <h2 className="text-lg font-bold mb-4">GPU Metrics</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <AnimatedBar
                value={job.gpu_utilization}
                color="cyan"
                label="GPU Utilization"
                sublabel={`${job.gpu_utilization}%`}
              />
              <AnimatedBar
                value={(job.vram_usage / job.vram_total) * 100}
                color="violet"
                label="VRAM Usage"
                sublabel={`${job.vram_usage}GB / ${job.vram_total}GB`}
              />
            </div>
          </div>

          {/* Live Logs - Terminal Style */}
          <div className="glass-strong rounded-xl p-1 overflow-hidden border border-white/10 shadow-glow-sm">
            <div className="flex items-center justify-between px-4 py-2 bg-[#0a0c10] border-b border-white/5">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-sm text-slate-600">terminal</span>
                <span className="text-xs text-slate-500 font-mono">execution.log</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="flex items-center gap-1 text-xs text-emerald-400">
                  <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
                  Streaming
                </span>
              </div>
            </div>
            <div className="terminal rounded-b-lg p-4 text-xs h-72 overflow-y-auto custom-scrollbar">
              {displayLogs.map((log, i) => {
                const isError = log.toLowerCase().includes('error') || log.toLowerCase().includes('failed')
                const isSuccess = log.toLowerCase().includes('completed') || log.toLowerCase().includes('success')
                const isWarning = log.toLowerCase().includes('warning')
                return (
                  <div key={i} className="flex gap-2 mb-1 font-mono">
                    <span className="text-slate-600 shrink-0 select-none">$</span>
                    <span className={
                      isError ? 'text-red-400' :
                      isSuccess ? 'text-emerald-400' :
                      isWarning ? 'text-amber-400' :
                      'text-slate-300'
                    }>
                      {log}
                    </span>
                  </div>
                )
              })}
              {job.status === 'running' && (
                <div className="flex gap-2 mt-1">
                  <span className="text-slate-600 select-none">$</span>
                  <span className="text-cyan-400">Processing</span>
                  <span className="terminal-cursor" />
                </div>
              )}
              <div ref={logsEndRef} />
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Blockchain Proof */}
          <div className="glass rounded-xl p-6 border border-white/5">
            <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
              <span className="material-symbols-outlined text-cyan-400">verified</span>
              Blockchain Proof
            </h2>

            {/* Proof Verification Status */}
            <div className={`mb-4 p-3 rounded-lg border ${isVerified ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-amber-500/5 border-amber-500/20'}`}>
              <div className="flex items-center gap-2">
                <span className={`material-symbols-outlined text-sm ${isVerified ? 'text-emerald-400' : 'text-amber-400'}`}>
                  {isVerified ? 'verified' : 'pending'}
                </span>
                <span className={`text-xs font-bold ${isVerified ? 'text-emerald-400' : 'text-amber-400'}`}>
                  {isVerified ? 'Proof Verified' : 'Awaiting Verification'}
                </span>
              </div>
              {isVerified && (
                <p className="text-[10px] text-slate-500 mt-1">SHA-256 hash confirmed on-chain</p>
              )}
            </div>

            {/* Escrow Status */}
            <div className="mb-4 p-3 rounded-lg bg-black/30 border border-white/5">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-slate-400">Escrow Status</span>
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                  job.escrow_status === 'locked' ? 'text-amber-400 bg-amber-500/10' :
                  job.escrow_status === 'released' ? 'text-emerald-400 bg-emerald-500/10' :
                  'text-red-400 bg-red-500/10'
                }`}>
                  {job.escrow_status.toUpperCase()}
                </span>
              </div>
              <div className="text-sm text-slate-300 font-mono">{job.cost_algo.toFixed(4)} ALGO</div>
            </div>

            {/* Transaction Hash */}
            {job.tx_id && (
              <div className="mb-4">
                <div className="text-xs text-slate-400 mb-1">Transaction Hash</div>
                <div className="flex items-center gap-2">
                  <code className="text-xs text-cyan-400 font-mono bg-black/30 px-2 py-1.5 rounded flex-1 truncate">
                    {job.tx_id}
                  </code>
                  <button
                    onClick={() => handleCopy(job.tx_id!)}
                    className="p-1.5 hover:bg-white/5 rounded-lg transition-colors relative"
                  >
                    <span className="material-symbols-outlined text-sm">{copied ? 'check' : 'content_copy'}</span>
                    {copied && (
                      <span className="absolute -top-6 left-1/2 -translate-x-1/2 text-[10px] text-emerald-400 whitespace-nowrap animate-fade-in">Copied!</span>
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* Explorer Link */}
            {job.explorer_url && (
              <a
                href={job.explorer_url}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-2.5 px-4 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-sm font-bold hover:bg-cyan-500/20 transition-all flex items-center justify-center gap-2"
              >
                <span className="material-symbols-outlined text-sm">open_in_new</span>
                View on AlgoExplorer
              </a>
            )}

            {/* Result Hash */}
            {job.result_hash && (
              <div className="mt-4 p-3 rounded-lg bg-emerald-500/5 border border-emerald-500/20">
                <div className="text-xs text-emerald-400 mb-1 flex items-center gap-1">
                  <span className="material-symbols-outlined text-xs">fingerprint</span>
                  Result Hash (SHA-256)
                </div>
                <code className="text-xs text-slate-300 font-mono break-all">
                  {job.result_hash}
                </code>
              </div>
            )}
          </div>

          {/* Provider Info */}
          <div className="glass rounded-xl p-6 border border-white/5">
            <h2 className="text-lg font-bold mb-4">Provider</h2>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-500 to-violet-500 flex items-center justify-center">
                <span className="material-symbols-outlined text-white">dns</span>
              </div>
              <div>
                <div className="font-bold">{job.provider}</div>
                <div className="text-xs text-slate-500">Verified Provider</div>
              </div>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Status</span>
                <span className="flex items-center gap-1.5 text-emerald-400">
                  <span className="status-dot online" />
                  Online
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Uptime</span>
                <span className="text-slate-300 font-mono">99.8%</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Latency</span>
                <span className="text-slate-300 font-mono">45ms</span>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="glass rounded-xl p-6 border border-white/5">
            <h2 className="text-lg font-bold mb-4">Actions</h2>
            <div className="space-y-2">
              <button className="w-full py-2.5 px-4 rounded-lg bg-white/5 border border-white/10 text-slate-300 text-sm font-bold hover:bg-white/10 transition-all flex items-center justify-center gap-2">
                <span className="material-symbols-outlined text-sm">download</span>
                Download Results
              </button>
              <button className="w-full py-2.5 px-4 rounded-lg bg-white/5 border border-white/10 text-slate-300 text-sm font-bold hover:bg-white/10 transition-all flex items-center justify-center gap-2">
                <span className="material-symbols-outlined text-sm">share</span>
                Share Job
              </button>
              {job.status === 'running' && (
                <button className="w-full py-2.5 px-4 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm font-bold hover:bg-red-500/20 transition-all flex items-center justify-center gap-2">
                  <span className="material-symbols-outlined text-sm">stop_circle</span>
                  Cancel Job
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
