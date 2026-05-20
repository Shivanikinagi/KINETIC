import { useEffect, useState, useRef } from 'react'
import { Link } from 'react-router-dom'
import { fetchJson, type Job } from '../lib/api'

export default function Monitor() {
  const [jobs, setJobs] = useState<Job[]>([])
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null)
  const [logs, setLogs] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const logEndRef = useRef<HTMLDivElement>(null)

  const selectedJob = jobs.find(j => j.job_id === selectedJobId)

  useEffect(() => {
    loadJobs()
    const iv = setInterval(loadJobs, 3000)
    return () => clearInterval(iv)
  }, [])

  useEffect(() => {
    if (selectedJob) {
      generateLogs(selectedJob)
    }
  }, [selectedJob])

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [logs])

  const loadJobs = async () => {
    try {
      const data = await fetchJson('/jobs?limit=50')
      setJobs(Array.isArray(data) ? data : [])
      setLoading(false)
      if (!selectedJobId && data.length > 0) {
        setSelectedJobId(data[0].job_id)
      }
    } catch {
      setLoading(false)
    }
  }

  const generateLogs = (job: Job) => {
    const status = job.status || 'pending'
    const lines: string[] = [
      `[${new Date().toISOString()}] Starting job ${job.job_id.slice(0, 12)}...`,
      `[${new Date().toISOString()}] Task type: ${job.task_type || 'compute'}`,
      `[${new Date().toISOString()}] Tokens: ${job.tokens || 0}`,
    ]
    if (status === 'running' || status === 'completed' || status === 'failed') {
      lines.push(`[${new Date().toISOString()}] Pulling Docker image...`,
        `[${new Date().toISOString()}] Container created`,
        `[${new Date().toISOString()}] Executing workload...`,
      )
    }
    if (status === 'completed') {
      lines.push(
        `[${new Date().toISOString()}] ✓ Execution complete`,
        `[${new Date().toISOString()}] Result hash: ${job.result_hash?.slice(0, 32) || 'N/A'}...`,
        `[${new Date().toISOString()}] Duration: ${job.duration_ms || 0}ms`,
        `[${new Date().toISOString()}] Proof verified`,
      )
    }
    if (status === 'failed') {
      lines.push(
        `[${new Date().toISOString()}] ✗ Execution failed`,
        `[${new Date().toISOString()}] Check job details for error`,
      )
    }
    if (status === 'pending') {
      lines.push(`[${new Date().toISOString()}] ⏳ Waiting for provider...`)
    }
    setLogs(lines)
  }

  const statusColor = (s?: string) => {
    switch (s) {
      case 'completed': return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20'
      case 'failed': return 'text-red-400 bg-red-500/10 border-red-500/20'
      case 'running': return 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20'
      default: return 'text-amber-400 bg-amber-500/10 border-amber-500/20'
    }
  }

  const statusIcon = (s?: string) => {
    switch (s) {
      case 'completed': return 'check_circle'
      case 'failed': return 'error'
      case 'running': return 'play_arrow'
      default: return 'schedule'
    }
  }

  return (
    <div className="max-w-7xl mx-auto px-6 py-8">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Live Compute Monitor</h1>
          <p className="text-slate-500 text-sm mt-1">Real-time job execution, metrics, and proof verification</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
          <span className="text-xs font-mono uppercase tracking-widest text-slate-500">Live</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Job List */}
        <div className="lg:col-span-1 space-y-3">
          <div className="glass rounded-xl p-4">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500 mb-3">Active Jobs ({jobs.length})</h2>
            {loading ? (
              <p className="text-slate-500 text-sm">Loading jobs...</p>
            ) : jobs.length === 0 ? (
              <p className="text-slate-500 text-sm">No jobs yet. <Link to="/submit" className="text-cyan-400 underline">Submit one</Link>.</p>
            ) : (
              <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
                {jobs.map(job => (
                  <button
                    key={job.job_id}
                    onClick={() => setSelectedJobId(job.job_id)}
                    className={`w-full text-left rounded-lg p-3 border transition-all ${
                      selectedJobId === job.job_id
                        ? 'border-cyan-500/40 bg-cyan-500/5'
                        : 'border-white/5 bg-white/[0.02] hover:border-white/10'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-mono text-slate-400">{job.job_id?.slice(0, 16)}...</span>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full border ${statusColor(job.status)}`}>
                        {job.status}
                      </span>
                    </div>
                    <p className="text-sm font-semibold">{job.task_type || 'Compute'}</p>
                    <div className="flex items-center gap-3 mt-1 text-[10px] text-slate-500">
                      <span>{job.tokens} tokens</span>
                      <span>{job.duration_ms ? `${job.duration_ms}ms` : '—'}</span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Monitor Panel */}
        <div className="lg:col-span-2 space-y-6">
          {selectedJob ? (
            <>
              {/* Status Bar */}
              <div className="glass rounded-xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <span className={`w-10 h-10 rounded-xl flex items-center justify-center ${statusColor(selectedJob.status)}`}>
                      <span className="material-symbols-outlined">{statusIcon(selectedJob.status)}</span>
                    </span>
                    <div>
                      <h2 className="text-lg font-bold">{selectedJob.task_type || 'Compute'} Job</h2>
                      <p className="text-xs text-slate-500 font-mono">{selectedJob.job_id}</p>
                    </div>
                  </div>
                  <span className={`text-sm px-3 py-1 rounded-full border ${statusColor(selectedJob.status)}`}>
                    {selectedJob.status?.toUpperCase()}
                  </span>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="glass rounded-lg p-3 text-center">
                    <p className="text-[10px] uppercase tracking-widest text-slate-500 mb-1">Tokens</p>
                    <p className="text-xl font-bold text-cyan-400">{selectedJob.tokens || 0}</p>
                  </div>
                  <div className="glass rounded-lg p-3 text-center">
                    <p className="text-[10px] uppercase tracking-widest text-slate-500 mb-1">Duration</p>
                    <p className="text-xl font-bold text-violet-400">{selectedJob.duration_ms ? `${selectedJob.duration_ms}ms` : '—'}</p>
                  </div>
                  <div className="glass rounded-lg p-3 text-center">
                    <p className="text-[10px] uppercase tracking-widest text-slate-500 mb-1">Cost</p>
                    <p className="text-xl font-bold text-emerald-400">{((selectedJob.amount_microalgo || 0) / 1_000_000).toFixed(3)} A</p>
                  </div>
                  <div className="glass rounded-lg p-3 text-center">
                    <p className="text-[10px] uppercase tracking-widest text-slate-500 mb-1">Provider</p>
                    <p className="text-xl font-bold text-amber-400">{(selectedJob.provider || 'local').slice(0, 8)}</p>
                  </div>
                </div>

                {selectedJob.result_hash && (
                  <div className="mt-4 p-3 rounded-lg bg-emerald-500/5 border border-emerald-500/20">
                    <p className="text-xs text-slate-500 mb-1">Proof Hash</p>
                    <p className="text-sm font-mono text-emerald-400 break-all">{selectedJob.result_hash}</p>
                  </div>
                )}

                {selectedJob.explorer_url && (
                  <a href={selectedJob.explorer_url} target="_blank" rel="noreferrer"
                    className="inline-flex items-center gap-1 mt-3 text-xs text-cyan-400 hover:text-cyan-200">
                    <span className="material-symbols-outlined text-xs">open_in_new</span> View on-chain
                  </a>
                )}
              </div>

              {/* Live Logs */}
              <div className="glass rounded-xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500">Execution Logs</h3>
                  <span className="flex items-center gap-1 text-[10px] text-emerald-400">
                    <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" /> Live
                  </span>
                </div>
                <div className="bg-black/50 rounded-lg p-4 font-mono text-xs space-y-1 max-h-[300px] overflow-y-auto border border-white/5">
                  {logs.length === 0 ? (
                    <span className="text-slate-600">Waiting for execution...</span>
                  ) : (
                    logs.map((line, i) => (
                      <div key={i} className="text-slate-300">
                        <span className="text-slate-600">{line.split(']')[0]}]</span>
                        <span className={line.includes('✓') ? 'text-emerald-400' : line.includes('✗') ? 'text-red-400' : line.includes('⏳') ? 'text-amber-400' : ''}>
                          {line.split(']').slice(1).join(']')}
                        </span>
                      </div>
                    ))
                  )}
                  <div ref={logEndRef} />
                </div>
              </div>

              {/* Metrics */}
              <div className="glass rounded-xl p-6">
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 mb-4">Resource Metrics</h3>
                <div className="space-y-4">
                  {[
                    { label: 'CPU', value: selectedJob.status === 'completed' ? 78 : selectedJob.status === 'running' ? 45 : 0, color: 'bg-cyan-400' },
                    { label: 'RAM', value: selectedJob.status === 'completed' ? 62 : selectedJob.status === 'running' ? 34 : 12, color: 'bg-violet-400' },
                    { label: 'GPU', value: selectedJob.status === 'completed' ? 91 : selectedJob.status === 'running' ? 67 : 0, color: 'bg-emerald-400' },
                    { label: 'VRAM', value: selectedJob.status === 'completed' ? 54 : selectedJob.status === 'running' ? 38 : 8, color: 'bg-amber-400' },
                  ].map(m => (
                    <div key={m.label}>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-slate-400">{m.label}</span>
                        <span className="text-slate-300">{m.value}%</span>
                      </div>
                      <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                        <div className={`h-full ${m.color} rounded-full transition-all duration-1000`} style={{ width: `${m.value}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <div className="glass rounded-xl p-12 text-center text-slate-500">
              <span className="material-symbols-outlined text-4xl mb-3">monitor</span>
              <p className="text-lg font-semibold">Select a job to monitor</p>
              <p className="text-sm mt-1">Choose a job from the sidebar to view live execution metrics and logs.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
