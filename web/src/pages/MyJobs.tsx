import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { fetchJson, type Job } from '../lib/api'
import StatusBadge from '../components/StatusBadge'

export default function MyJobs() {
  const [jobs, setJobs] = useState<Job[]>([])
  const [selectedJob, setSelectedJob] = useState<Job | null>(null)

  useEffect(() => {
    loadJobs()
    const iv = setInterval(loadJobs, 10000)
    return () => clearInterval(iv)
  }, [])

  const loadJobs = () => {
    fetchJson('/jobs?limit=50').then(d => setJobs(Array.isArray(d) ? d : [])).catch(() => setJobs([]))
  }

  const formatTime = (ts?: number) => {
    if (!ts) return '—'
    return new Date(ts * 1000).toLocaleString()
  }

  return (
    <div>
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">My Jobs</h1>
          <p className="text-slate-500 text-sm mt-1">Track execution, view results, verify proofs</p>
        </div>
        <Link to="/submit" className="bg-gradient-to-r from-cyan-500 to-cyan-600 text-slate-950 px-5 py-2.5 rounded-xl font-bold text-sm hover:brightness-110 transition-all flex items-center gap-2">
          <span className="material-symbols-outlined text-lg">add</span>
          New Job
        </Link>
      </div>

      <div className="space-y-4">
        {jobs.length === 0 ? (
          <div className="glass rounded-xl p-12 text-center">
            <span className="material-symbols-outlined text-5xl text-slate-600 mb-4">work_outline</span>
            <h3 className="text-lg font-bold mb-2">No jobs yet</h3>
            <p className="text-slate-500 text-sm mb-6">Submit your first compute job to get started</p>
            <Link to="/submit" className="inline-flex items-center gap-2 bg-gradient-to-r from-cyan-500 to-cyan-600 text-slate-950 px-6 py-2.5 rounded-xl font-bold text-sm hover:brightness-110 transition-all">
              <span className="material-symbols-outlined text-sm">rocket_launch</span>
              Submit Job
            </Link>
          </div>
        ) : (
          jobs.map(job => {
            const progress = job.status === 'completed' ? 100 : job.status === 'failed' ? 100 : job.status === 'running' ? 60 : 10
            return (
              <div key={job.job_id} onClick={() => setSelectedJob(job)}
                className="glass rounded-xl p-5 card-hover cursor-pointer">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="font-mono text-xs text-cyan-400">{(job.job_id || '').slice(0, 16)}...</span>
                      <StatusBadge status={job.status} />
                    </div>
                    <p className="text-sm font-semibold">{job.task_type || 'Compute'} · {job.tokens || 0} tokens</p>
                    <p className="text-xs text-slate-500 mt-1">{formatTime(job.created_at)}</p>
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="text-right">
                      <p className="text-[10px] text-slate-500 uppercase">Duration</p>
                      <p className="text-sm font-mono">{job.duration_ms || 0}ms</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] text-slate-500 uppercase">Hash</p>
                      <p className="text-sm font-mono text-slate-400">{job.result_hash ? job.result_hash.slice(0, 14) + '...' : 'Pending'}</p>
                    </div>
                    <span className="material-symbols-outlined text-slate-500">chevron_right</span>
                  </div>
                </div>
                <div className="mt-4">
                  <div className="flex justify-between text-[10px] text-slate-500 mb-1">
                    <span>Progress</span>
                    <span>{progress}%</span>
                  </div>
                  <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                    <div className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-blue-500 transition-all" style={{ width: `${progress}%` }} />
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* Detail Modal */}
      {selectedJob && (
        <div className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4" onClick={e => { if (e.target === e.currentTarget) setSelectedJob(null) }}>
          <div className="glass rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto relative p-6">
            <button onClick={() => setSelectedJob(null)} className="absolute top-4 right-4 text-slate-500 hover:text-white">
              <span className="material-symbols-outlined">close</span>
            </button>
            <div className="space-y-6">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <h2 className="text-xl font-bold">Job Details</h2>
                  <StatusBadge status={selectedJob.status} />
                </div>
                <p className="font-mono text-xs text-cyan-400">{selectedJob.job_id}</p>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="glass rounded-lg p-3 text-center">
                  <p className="text-[10px] text-slate-500 uppercase">Type</p>
                  <p className="text-sm font-semibold mt-1">{selectedJob.task_type || 'compute'}</p>
                </div>
                <div className="glass rounded-lg p-3 text-center">
                  <p className="text-[10px] text-slate-500 uppercase">Tokens</p>
                  <p className="text-sm font-semibold mt-1">{selectedJob.tokens || 0}</p>
                </div>
                <div className="glass rounded-lg p-3 text-center">
                  <p className="text-[10px] text-slate-500 uppercase">Duration</p>
                  <p className="text-sm font-semibold mt-1">{selectedJob.duration_ms || 0}ms</p>
                </div>
                <div className="glass rounded-lg p-3 text-center">
                  <p className="text-[10px] text-slate-500 uppercase">Cost</p>
                  <p className="text-sm font-semibold mt-1">{((selectedJob.amount_microalgo || 0) / 1_000_000).toFixed(4)} A</p>
                </div>
              </div>
              {selectedJob.status === 'completed' && (
                <div className="glass rounded-xl p-5 border border-emerald-500/20 bg-emerald-500/5">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="material-symbols-outlined text-emerald-400">verified</span>
                    <h3 className="font-bold text-sm">Proof of Compute</h3>
                  </div>
                  <p className="text-xs text-slate-400 mb-2">Cryptographic hash verifying execution integrity:</p>
                  <code className="block bg-black/40 rounded-lg px-3 py-2 text-xs font-mono text-slate-300 break-all">{selectedJob.result_hash}</code>
                  {selectedJob.explorer_url && (
                    <a href={selectedJob.explorer_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 mt-3 text-xs text-cyan-400 hover:text-cyan-200">
                      <span className="material-symbols-outlined text-xs">open_in_new</span>
                      View on AlgoExplorer
                    </a>
                  )}
                </div>
              )}
              {selectedJob.status === 'failed' && (
                <div className="glass rounded-xl p-5 border border-red-500/20 bg-red-500/5">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="material-symbols-outlined text-red-400">error</span>
                    <h3 className="font-bold text-sm">Execution Failed</h3>
                  </div>
                  <p className="text-xs text-slate-400">The job could not complete. Payment was not released.</p>
                </div>
              )}
              <div className="glass rounded-xl p-5">
                <h3 className="font-bold text-sm mb-3">Execution Timeline</h3>
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <span className="w-6 h-6 rounded-full bg-emerald-500/20 flex items-center justify-center shrink-0">
                      <span className="material-symbols-outlined text-emerald-400 text-xs">check</span>
                    </span>
                    <div>
                      <p className="text-sm">Job Submitted</p>
                      <p className="text-[10px] text-slate-500">{formatTime(selectedJob.created_at)}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className={`w-6 h-6 rounded-full ${selectedJob.status === 'completed' || selectedJob.status === 'failed' ? 'bg-emerald-500/20' : 'bg-white/5'} flex items-center justify-center shrink-0`}>
                      <span className={`material-symbols-outlined ${selectedJob.status === 'completed' || selectedJob.status === 'failed' ? 'text-emerald-400' : 'text-slate-500'} text-xs`}>
                        {selectedJob.status === 'completed' || selectedJob.status === 'failed' ? 'check' : 'schedule'}
                      </span>
                    </span>
                    <div>
                      <p className="text-sm">Execution {selectedJob.status === 'completed' ? 'Completed' : selectedJob.status === 'failed' ? 'Failed' : 'In Progress'}</p>
                      <p className="text-[10px] text-slate-500">{selectedJob.duration_ms ? selectedJob.duration_ms + 'ms' : 'Waiting for provider...'}</p>
                    </div>
                  </div>
                  {selectedJob.status === 'completed' && (
                    <div className="flex items-start gap-3">
                      <span className="w-6 h-6 rounded-full bg-emerald-500/20 flex items-center justify-center shrink-0">
                        <span className="material-symbols-outlined text-emerald-400 text-xs">check</span>
                      </span>
                      <div>
                        <p className="text-sm">Payment Released from Escrow</p>
                        <p className="text-[10px] text-slate-500">Verified and settled on-chain</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
