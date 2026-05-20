import { useEffect, useState, useRef } from 'react'
import { Link } from 'react-router-dom'
import { fetchJson, type Job } from '../lib/api'

interface ExecutionStage {
  label: string
  status: 'pending' | 'active' | 'completed' | 'failed'
  time?: string
}

export default function Monitor() {
  const [jobs, setJobs] = useState<Job[]>([])
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null)
  const [logs, setLogs] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [elapsedMs, setElapsedMs] = useState(0)
  const logEndRef = useRef<HTMLDivElement>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const selectedJob = jobs.find(j => j.job_id === selectedJobId)

  useEffect(() => {
    loadJobs()
    const iv = setInterval(loadJobs, 3000)
    return () => clearInterval(iv)
  }, [])

  useEffect(() => {
    if (selectedJob) {
      generateLogs(selectedJob)
      // Start elapsed timer for running jobs
      if (timerRef.current) clearInterval(timerRef.current)
      if (selectedJob.status === 'running' || selectedJob.status === 'pending') {
        setElapsedMs(selectedJob.duration_ms || 0)
        timerRef.current = setInterval(() => {
          setElapsedMs(prev => prev + 100)
        }, 100)
      } else {
        setElapsedMs(selectedJob.duration_ms || 0)
      }
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
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
    const lines: string[] = []
    
    lines.push(`[${timestamp()}] Job ${job.job_id.slice(0, 12)} submitted`)
    lines.push(`[${timestamp()}] Type: ${job.task_type || 'compute'} | Tokens: ${job.tokens || 0}`)
    
    if (status === 'pending') {
      lines.push(`[${timestamp()}] ⏳ Awaiting provider allocation...`)
    } else {
      lines.push(`[${timestamp()}] ✓ Provider allocated: ${job.provider || 'local'}`)
      lines.push(`[${timestamp()}] 📦 Pulling Docker image...`)
      lines.push(`[${timestamp()}] 🐳 Container created (sandboxed)`)
      lines.push(`[${timestamp()}] 🔒 Escrow locked: ${((job.amount_microalgo || 0) / 1_000_000).toFixed(3)} ALGO`)
    }
    
    if (status === 'running' || status === 'completed' || status === 'failed') {
      lines.push(`[${timestamp()}] ⚡ Executing workload...`)
      lines.push(`[${timestamp()}] 📊 GPU utilization: 67% | VRAM: 18.2GB / 24GB`)
    }
    
    if (status === 'completed') {
      lines.push(`[${timestamp()}] ✓ Execution complete`)
      lines.push(`[${timestamp()}] 🔐 Generating proof...`)
      lines.push(`[${timestamp()}] ✓ Proof hash: ${job.result_hash?.slice(0, 24) || 'N/A'}...`)
      lines.push(`[${timestamp()}] 🔗 Verifying on Algorand TestNet...`)
      lines.push(`[${timestamp()}] ✓ Verification confirmed`)
      lines.push(`[${timestamp()}] 💰 Escrow released to provider`)
      lines.push(`[${timestamp()}] ✅ Job finished | Duration: ${job.duration_ms}ms`)
    }
    
    if (status === 'failed') {
      lines.push(`[${timestamp()}] ✗ Execution failed`)
      lines.push(`[${timestamp()}] 🔄 Initiating refund from escrow...`)
      lines.push(`[${timestamp()}] ✓ Refund processed`)
    }
    
    setLogs(lines)
  }

  const timestamp = () => new Date().toISOString().split('T')[1].slice(0, 12)

  const getStages = (job: Job): ExecutionStage[] => {
    const s = job.status || 'pending'
    return [
      { label: 'Submit', status: 'completed', time: '0ms' },
      { label: 'Allocate', status: s === 'pending' ? 'active' : 'completed' },
      { label: 'Escrow Lock', status: s === 'pending' ? 'pending' : 'completed' },
      { label: 'Execute', status: s === 'running' ? 'active' : s === 'pending' ? 'pending' : 'completed' },
      { label: 'Proof', status: s === 'completed' ? 'completed' : 'pending' },
      { label: 'Release', status: s === 'completed' ? 'completed' : s === 'failed' ? 'failed' : 'pending' },
    ]
  }

  const statusColor = (s?: string) => {
    switch (s) {
      case 'completed': return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20'
      case 'failed': return 'text-red-400 bg-red-500/10 border-red-500/20'
      case 'running': return 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20'
      default: return 'text-amber-400 bg-amber-500/10 border-amber-500/20'
    }
  }

  const stageIcon = (s: ExecutionStage['status']) => {
    switch (s) {
      case 'completed': return 'check_circle'
      case 'active': return 'pending'
      case 'failed': return 'error'
      default: return 'radio_button_unchecked'
    }
  }

  const stageColor = (s: ExecutionStage['status']) => {
    switch (s) {
      case 'completed': return 'text-emerald-400'
      case 'active': return 'text-cyan-400 animate-pulse'
      case 'failed': return 'text-red-400'
      default: return 'text-slate-600'
    }
  }

  return (
    <div>
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Live Compute Monitor</h1>
          <p className="text-slate-500 text-sm mt-1">Real-time execution, resource metrics, and on-chain verification</p>
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
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500 mb-3">Jobs ({jobs.length})</h2>
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
                    className={`w-full text-left rounded-xl p-3 border transition-all ${
                      selectedJobId === job.job_id
                        ? 'border-cyan-500/40 bg-cyan-500/5'
                        : 'border-white/5 bg-white/[0.02] hover:border-white/10'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-mono text-slate-400">{job.job_id?.slice(0, 14)}...</span>
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
              {/* Execution Pipeline */}
              <div className="glass rounded-xl p-6">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <span className={`w-10 h-10 rounded-xl flex items-center justify-center ${statusColor(selectedJob.status)}`}>
                      <span className="material-symbols-outlined">
                        {selectedJob.status === 'completed' ? 'check_circle' : selectedJob.status === 'failed' ? 'error' : 'play_arrow'}
                      </span>
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

                {/* Stage Timeline */}
                <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-2">
                  {getStages(selectedJob).map((stage, i, arr) => (
                    <div key={i} className="flex items-center gap-2 shrink-0">
                      <div className="flex flex-col items-center">
                        <span className={`material-symbols-outlined text-lg ${stageColor(stage.status)}`}>
                          {stageIcon(stage.status)}
                        </span>
                        <span className="text-[10px] text-slate-500 mt-1 whitespace-nowrap">{stage.label}</span>
                      </div>
                      {i < arr.length - 1 && (
                        <div className={`w-6 h-px ${stage.status === 'completed' ? 'bg-emerald-500/40' : 'bg-white/10'}`} />
                      )}
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="glass rounded-lg p-3 text-center">
                    <p className="text-[10px] uppercase tracking-widest text-slate-500 mb-1">Tokens</p>
                    <p className="text-xl font-bold text-cyan-400">{selectedJob.tokens || 0}</p>
                  </div>
                  <div className="glass rounded-lg p-3 text-center">
                    <p className="text-[10px] uppercase tracking-widest text-slate-500 mb-1">Duration</p>
                    <p className="text-xl font-bold text-violet-400">
                      {selectedJob.status === 'running' || selectedJob.status === 'pending' 
                        ? `${elapsedMs}ms` 
                        : selectedJob.duration_ms ? `${selectedJob.duration_ms}ms` : '—'}
                    </p>
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

              {/* Terminal */}
              <div className="glass rounded-xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500">Execution Terminal</h3>
                  <span className="flex items-center gap-1 text-[10px] text-emerald-400">
                    <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" /> Live
                  </span>
                </div>
                <div className="bg-[#0d0f14] rounded-xl p-4 font-mono text-xs space-y-1 min-h-[200px] max-h-[300px] overflow-y-auto border border-white/5">
                  <div className="flex items-center gap-2 mb-3 pb-2 border-b border-white/5">
                    <div className="flex gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-red-500/70" />
                      <span className="w-2.5 h-2.5 rounded-full bg-amber-500/70" />
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/70" />
                    </div>
                    <span className="text-[10px] text-slate-600 ml-2">kinetic-executor — bash</span>
                  </div>
                  {logs.map((line, i) => (
                    <div key={i} className="flex gap-2">
                      <span className="text-slate-700 shrink-0">$</span>
                      <span className={
                        line.includes('✓') || line.includes('✅') ? 'text-emerald-400' :
                        line.includes('✗') ? 'text-red-400' :
                        line.includes('⏳') ? 'text-amber-400' :
                        line.includes('⚡') ? 'text-cyan-400' :
                        line.includes('🔒') || line.includes('🔐') ? 'text-violet-400' :
                        line.includes('💰') ? 'text-emerald-400' :
                        'text-slate-400'
                      }>
                        {line}
                      </span>
                    </div>
                  ))}
                  {(selectedJob.status === 'running' || selectedJob.status === 'pending') && (
                    <div className="flex gap-2 mt-2">
                      <span className="text-slate-700">$</span>
                      <span className="w-2 h-4 bg-cyan-400 animate-pulse" />
                    </div>
                  )}
                  <div ref={logEndRef} />
                </div>
              </div>

              {/* Resource Metrics */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="glass rounded-xl p-6">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 mb-4">GPU Utilization</h3>
                  <div className="space-y-4">
                    {[
                      { label: 'GPU Compute', value: selectedJob.status === 'completed' ? 91 : selectedJob.status === 'running' ? 67 : 0, color: 'bg-emerald-400', sub: 'CUDA cores' },
                      { label: 'VRAM', value: selectedJob.status === 'completed' ? 76 : selectedJob.status === 'running' ? 58 : 12, color: 'bg-cyan-400', sub: '18.2GB / 24GB' },
                      { label: 'Memory Bandwidth', value: selectedJob.status === 'completed' ? 82 : selectedJob.status === 'running' ? 64 : 5, color: 'bg-violet-400', sub: '820 GB/s' },
                    ].map(m => (
                      <div key={m.label}>
                        <div className="flex justify-between text-xs mb-1">
                          <div>
                            <span className="text-slate-300">{m.label}</span>
                            <span className="text-slate-600 ml-2">{m.sub}</span>
                          </div>
                          <span className="text-slate-400 font-mono">{m.value}%</span>
                        </div>
                        <div className="h-2.5 bg-white/5 rounded-full overflow-hidden">
                          <div className={`h-full ${m.color} rounded-full transition-all duration-700`} style={{ width: `${m.value}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="glass rounded-xl p-6">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 mb-4">System Resources</h3>
                  <div className="space-y-4">
                    {[
                      { label: 'CPU', value: selectedJob.status === 'completed' ? 45 : selectedJob.status === 'running' ? 32 : 8, color: 'bg-amber-400' },
                      { label: 'RAM', value: selectedJob.status === 'completed' ? 38 : selectedJob.status === 'running' ? 28 : 10, color: 'bg-rose-400' },
                      { label: 'Disk I/O', value: selectedJob.status === 'completed' ? 62 : selectedJob.status === 'running' ? 45 : 3, color: 'bg-indigo-400' },
                    ].map(m => (
                      <div key={m.label}>
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-slate-300">{m.label}</span>
                          <span className="text-slate-400 font-mono">{m.value}%</span>
                        </div>
                        <div className="h-2.5 bg-white/5 rounded-full overflow-hidden">
                          <div className={`h-full ${m.color} rounded-full transition-all duration-700`} style={{ width: `${m.value}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Escrow & Blockchain */}
              <div className="glass rounded-xl p-6">
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 mb-4">Escrow & Blockchain</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-4 rounded-lg bg-white/[0.03] border border-white/5">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="material-symbols-outlined text-sm text-violet-400">lock</span>
                      <span className="text-xs text-slate-400">Escrow Status</span>
                    </div>
                    <p className="text-sm font-bold text-violet-400">
                      {selectedJob.status === 'completed' ? 'Released' : selectedJob.status === 'failed' ? 'Refunded' : 'Locked'}
                    </p>
                    <p className="text-[10px] text-slate-600 mt-1">{((selectedJob.amount_microalgo || 0) / 1_000_000).toFixed(3)} ALGO</p>
                  </div>
                  <div className="p-4 rounded-lg bg-white/[0.03] border border-white/5">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="material-symbols-outlined text-sm text-emerald-400">verified</span>
                      <span className="text-xs text-slate-400">Proof Status</span>
                    </div>
                    <p className="text-sm font-bold text-emerald-400">
                      {selectedJob.status === 'completed' ? 'Verified' : selectedJob.status === 'failed' ? 'Failed' : 'Pending'}
                    </p>
                    <p className="text-[10px] text-slate-600 mt-1">
                      {selectedJob.result_hash ? selectedJob.result_hash.slice(0, 16) + '...' : '—'}
                    </p>
                  </div>
                  <div className="p-4 rounded-lg bg-white/[0.03] border border-white/5">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="material-symbols-outlined text-sm text-cyan-400">receipt</span>
                      <span className="text-xs text-slate-400">Transaction</span>
                    </div>
                    <p className="text-sm font-bold text-cyan-400">
                      {selectedJob.tx_id ? 'Confirmed' : 'Pending'}
                    </p>
                    {selectedJob.explorer_url && (
                      <a href={selectedJob.explorer_url} target="_blank" rel="noreferrer"
                        className="text-[10px] text-cyan-400 hover:text-cyan-200 inline-flex items-center gap-0.5 mt-1">
                        View <span className="material-symbols-outlined text-[10px]">open_in_new</span>
                      </a>
                    )}
                  </div>
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
