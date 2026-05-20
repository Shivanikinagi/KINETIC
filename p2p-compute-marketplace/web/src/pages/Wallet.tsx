import { useEffect, useState } from 'react'
import { useWallet } from '../hooks/useWallet'
import { fetchJson, type Job } from '../lib/api'

interface TxRecord {
  id: string
  type: 'escrow_lock' | 'escrow_release' | 'provider_payout' | 'refund'
  amount_algo: number
  status: 'confirmed' | 'pending'
  timestamp: string
  explorer_url: string
}

export default function Wallet() {
  const { address, connected } = useWallet()
  const [jobs, setJobs] = useState<Job[]>([])
  const [analytics, setAnalytics] = useState<any>({})
  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    const [j, a] = await Promise.all([
      fetchJson('/jobs?limit=100').catch(() => []),
      fetchJson('/analytics').catch(() => ({})),
    ])
    setJobs(Array.isArray(j) ? j : [])
    setAnalytics(a)
  }

  const completedJobs = jobs.filter(j => j.status === 'completed')
  const failedJobs = jobs.filter(j => j.status === 'failed')
  const pendingJobs = jobs.filter(j => j.status === 'pending')
  const totalSpent = completedJobs.reduce((s, j) => s + ((j.amount_microalgo || 0) / 1_000_000), 0)
  const avgDuration = completedJobs.length > 0
    ? Math.round(completedJobs.reduce((s, j) => s + (j.duration_ms || 0), 0) / completedJobs.length)
    : 0

  // Build mock tx records from real job data
  const txRecords: TxRecord[] = completedJobs.map(j => ({
    id: j.job_id,
    type: 'escrow_release' as const,
    amount_algo: (j.amount_microalgo || 0) / 1_000_000,
    status: 'confirmed',
    timestamp: j.completed_at ? new Date(j.completed_at * 1000).toISOString() : new Date().toISOString(),
    explorer_url: j.explorer_url || `https://testnet.explorer.perawallet.app/tx/${j.tx_id || j.job_id}`,
  }))

  const formatDate = (ts?: number | string) => {
    if (!ts) return '—'
    const d = typeof ts === 'number' ? new Date(ts * 1000) : new Date(ts)
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
  }

  if (!connected) {
    return (
      <div className="max-w-7xl mx-auto px-6 py-12 text-center">
        <div className="glass rounded-2xl p-12 max-w-lg mx-auto">
          <span className="material-symbols-outlined text-5xl text-slate-600 mb-4">account_balance_wallet</span>
          <h2 className="text-2xl font-bold mb-2">Connect Your Wallet</h2>
          <p className="text-slate-500 text-sm mb-6">Connect your Pera Wallet to view balances, escrow history, and transaction details.</p>
          <p className="text-xs text-slate-600">Use the "Connect Wallet" button in the navbar.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-6 py-8">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Wallet Dashboard</h1>
          <p className="text-slate-500 text-sm mt-1">Track your ALGO balance, escrow activity, and compute spending</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 bg-emerald-400 rounded-full" />
          <span className="text-xs font-mono text-slate-500">{address?.slice(0, 6)}...{address?.slice(-4)}</span>
        </div>
      </div>

      {/* Balance Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="glass rounded-xl p-5 text-center">
          <p className="text-[10px] font-mono uppercase tracking-widest text-slate-500 mb-1">Total Jobs</p>
          <p className="text-2xl font-bold text-cyan-400">{jobs.length}</p>
        </div>
        <div className="glass rounded-xl p-5 text-center">
          <p className="text-[10px] font-mono uppercase tracking-widest text-slate-500 mb-1">ALGO Spent</p>
          <p className="text-2xl font-bold text-emerald-400">{totalSpent.toFixed(2)} A</p>
        </div>
        <div className="glass rounded-xl p-5 text-center">
          <p className="text-[10px] font-mono uppercase tracking-widest text-slate-500 mb-1">Success Rate</p>
          <p className="text-2xl font-bold text-violet-400">{analytics.success_rate || 0}%</p>
        </div>
        <div className="glass rounded-xl p-5 text-center">
          <p className="text-[10px] font-mono uppercase tracking-widest text-slate-500 mb-1">Avg Duration</p>
          <p className="text-2xl font-bold text-amber-400">{avgDuration}ms</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Escrow Status */}
        <div className="space-y-6">
          <div className="glass rounded-xl p-6">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500 mb-4">Escrow Overview</h2>
            <div className="space-y-3">
              <div className="flex justify-between items-center p-3 rounded-lg bg-white/[0.03]">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 bg-emerald-400 rounded-full" />
                  <span className="text-sm text-slate-300">Completed</span>
                </div>
                <span className="text-sm font-bold text-emerald-400">{completedJobs.length}</span>
              </div>
              <div className="flex justify-between items-center p-3 rounded-lg bg-white/[0.03]">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 bg-amber-400 rounded-full" />
                  <span className="text-sm text-slate-300">Pending</span>
                </div>
                <span className="text-sm font-bold text-amber-400">{pendingJobs.length}</span>
              </div>
              <div className="flex justify-between items-center p-3 rounded-lg bg-white/[0.03]">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 bg-red-400 rounded-full" />
                  <span className="text-sm text-slate-300">Failed</span>
                </div>
                <span className="text-sm font-bold text-red-400">{failedJobs.length}</span>
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-white/10">
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">Total Escrowed</span>
                <span className="font-bold text-cyan-400">{totalSpent.toFixed(3)} A</span>
              </div>
            </div>
          </div>

          <div className="glass rounded-xl p-6">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500 mb-4">Network</h2>
            <div className="flex items-center gap-3 p-3 rounded-lg bg-white/[0.03]">
              <span className="material-symbols-outlined text-cyan-400">network_node</span>
              <div>
                <p className="text-sm font-semibold">Algorand TestNet</p>
                <p className="text-[10px] text-slate-500">Sub-second finality · $0.001 txn fee</p>
              </div>
            </div>
          </div>
        </div>

        {/* Transaction History */}
        <div className="lg:col-span-2">
          <div className="glass rounded-xl p-6">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500 mb-4">Transaction History</h2>
            {txRecords.length === 0 ? (
              <div className="text-center py-8 text-slate-500">
                <span className="material-symbols-outlined text-3xl mb-2">receipt_long</span>
                <p className="text-sm">No transactions yet.</p>
                <p className="text-xs mt-1">Submit a job to generate on-chain activity.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {txRecords.map(tx => (
                  <div key={tx.id} className="flex items-center justify-between p-4 rounded-lg bg-white/[0.03] hover:bg-white/[0.05] transition-colors">
                    <div className="flex items-center gap-3">
                      <span className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                        tx.type === 'escrow_release' ? 'bg-emerald-500/10 text-emerald-400' :
                        tx.type === 'escrow_lock' ? 'bg-amber-500/10 text-amber-400' :
                        'bg-cyan-500/10 text-cyan-400'
                      }`}>
                        <span className="material-symbols-outlined text-sm">
                          {tx.type === 'escrow_release' ? 'lock_open' : tx.type === 'escrow_lock' ? 'lock' : 'payments'}
                        </span>
                      </span>
                      <div>
                        <p className="text-sm font-semibold capitalize">{tx.type.replace(/_/g, ' ')}</p>
                        <p className="text-[10px] text-slate-500 font-mono">{tx.id.slice(0, 20)}...</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-emerald-400">+{tx.amount_algo.toFixed(3)} A</p>
                      <p className="text-[10px] text-slate-500">{formatDate(tx.timestamp)}</p>
                      <a href={tx.explorer_url} target="_blank" rel="noreferrer"
                        className="text-[10px] text-cyan-400 hover:text-cyan-200 inline-flex items-center gap-0.5 mt-0.5">
                        <span className="material-symbols-outlined text-[10px]">open_in_new</span> Explorer
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
