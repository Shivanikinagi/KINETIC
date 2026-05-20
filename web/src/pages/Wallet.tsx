import { useEffect, useMemo, useState } from 'react'
import { useWallet } from '../hooks/useWallet'
import { fetchJson, formatDate, buildExplorerUrl } from '../lib/api'
import type { Job, WalletHistory, EscrowRecord, AnalyticsChart } from '../lib/api'

const ALGO_PRICE_USD = 0.18 // Mock ALGO price for display

function SkeletonCard() {
  return (
    <div className="glass rounded-xl p-5 animate-pulse">
      <div className="h-3 w-24 bg-white/5 rounded mb-2" />
      <div className="h-8 w-32 bg-white/5 rounded" />
    </div>
  )
}

function SkeletonRow() {
  return (
    <div className="flex items-center justify-between p-4 rounded-lg bg-white/[0.03] animate-pulse">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 bg-white/5 rounded-xl" />
        <div className="space-y-2">
          <div className="h-3 w-24 bg-white/5 rounded" />
          <div className="h-3 w-16 bg-white/5 rounded" />
        </div>
      </div>
      <div className="h-4 w-16 bg-white/5 rounded" />
    </div>
  )
}

export default function Wallet() {
  const { address, connected } = useWallet()
  const [jobs, setJobs] = useState<Job[]>([])
  const [analytics, setAnalytics] = useState<any>({})
  const [walletHistory, setWalletHistory] = useState<WalletHistory[]>([])
  const [escrowRecords, setEscrowRecords] = useState<EscrowRecord[]>([])
  const [chartPeriod, setChartPeriod] = useState<'daily' | 'weekly' | 'monthly'>('daily')
  const [loading, setLoading] = useState(true)
  const [showDeposit, setShowDeposit] = useState(false)
  const [showWithdraw, setShowWithdraw] = useState(false)
  const [depositAmount, setDepositAmount] = useState('')
  const [withdrawAmount, setWithdrawAmount] = useState('')
  const [isProvider, setIsProvider] = useState(false)

  useEffect(() => {
    if (connected) {
      loadData()
    }
  }, [connected])

  const loadData = async () => {
    setLoading(true)
    try {
      const [j, a, providers] = await Promise.all([
        fetchJson('/jobs?limit=100').catch(() => []),
        fetchJson('/analytics').catch(() => ({})),
        fetchJson('/providers').catch(() => []),
      ])
      setJobs(Array.isArray(j) ? j : [])
      setAnalytics(a)

      // Check if user is a provider
      const providerList = Array.isArray(providers) ? providers : []
      setIsProvider(providerList.some((p: any) => p.payment_address === address || p.owner === address))

      // Build mock wallet history from jobs
      const completed = (Array.isArray(j) ? j : []).filter((job: Job) => job.status === 'completed')
      const mockHistory: WalletHistory[] = completed.map((job: Job) => ({
        id: job.job_id,
        type: 'escrow_release' as const,
        amount_algo: (job.amount_microalgo || 0) / 1_000_000,
        status: 'confirmed',
        timestamp: job.completed_at ? new Date(job.completed_at * 1000).toISOString() : new Date().toISOString(),
        tx_id: job.tx_id,
        explorer_url: job.explorer_url || buildExplorerUrl(job.tx_id || job.job_id),
        description: `Job ${job.job_id.slice(0, 8)}...`,
      }))

      // Add some mock deposits/withdrawals
      mockHistory.unshift(
        { id: 'dep-1', type: 'deposit', amount_algo: 50, status: 'confirmed', timestamp: new Date(Date.now() - 86400000 * 3).toISOString(), tx_id: 'mock-tx-1', explorer_url: buildExplorerUrl('mock-tx-1'), description: 'Wallet deposit' },
        { id: 'dep-2', type: 'deposit', amount_algo: 25, status: 'confirmed', timestamp: new Date(Date.now() - 86400000 * 7).toISOString(), tx_id: 'mock-tx-2', explorer_url: buildExplorerUrl('mock-tx-2'), description: 'Wallet deposit' }
      )

      setWalletHistory(mockHistory.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()))

      // Build mock escrow records
      const mockEscrow: EscrowRecord[] = completed.slice(0, 8).map((job: Job) => ({
        id: `esc-${job.job_id}`,
        job_id: job.job_id,
        amount_algo: (job.amount_microalgo || 0) / 1_000_000,
        status: Math.random() > 0.3 ? 'released' : 'locked',
        created_at: job.created_at ? new Date(job.created_at * 1000).toISOString() : new Date().toISOString(),
        updated_at: job.completed_at ? new Date(job.completed_at * 1000).toISOString() : undefined,
        tx_id: job.tx_id,
        explorer_url: job.explorer_url || buildExplorerUrl(job.tx_id || job.job_id),
      }))
      setEscrowRecords(mockEscrow)
    } catch (e) {
      console.error('Wallet load error:', e)
    } finally {
      setLoading(false)
    }
  }

  const completedJobs = jobs.filter(j => j.status === 'completed')
  const failedJobs = jobs.filter(j => j.status === 'failed')
  const pendingJobs = jobs.filter(j => j.status === 'pending')
  const totalSpent = completedJobs.reduce((s, j) => s + ((j.amount_microalgo || 0) / 1_000_000), 0)
  const avgDuration = completedJobs.length > 0
    ? Math.round(completedJobs.reduce((s, j) => s + (j.duration_ms || 0), 0) / completedJobs.length)
    : 0

  // Mock balance (based on deposits minus spending)
  const totalDeposits = walletHistory.filter(h => h.type === 'deposit').reduce((s, h) => s + h.amount_algo, 0)
  const totalWithdrawals = walletHistory.filter(h => h.type === 'withdraw').reduce((s, h) => s + h.amount_algo, 0)
  const balance = Math.max(0, totalDeposits - totalWithdrawals - totalSpent)

  const chartData = useMemo(() => {
    const data: AnalyticsChart = { labels: [], datasets: [{ label: 'Spending', data: [], color: '#00d1ff' }] }
    const now = new Date()
    const days = chartPeriod === 'daily' ? 7 : chartPeriod === 'weekly' ? 4 : 12

    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(now)
      if (chartPeriod === 'daily') d.setDate(d.getDate() - i)
      else if (chartPeriod === 'weekly') d.setDate(d.getDate() - i * 7)
      else d.setMonth(d.getMonth() - i)

      const label = chartPeriod === 'daily'
        ? d.toLocaleDateString(undefined, { weekday: 'short' })
        : chartPeriod === 'weekly'
          ? `W${days - i}`
          : d.toLocaleDateString(undefined, { month: 'short' })

      data.labels.push(label)
      // Generate mock spending data
      const spent = Math.random() * 5 + (chartPeriod === 'daily' ? 1 : 10)
      data.datasets[0].data.push(parseFloat(spent.toFixed(2)))
    }
    return data
  }, [chartPeriod, walletHistory.length])

  const maxChartValue = Math.max(...chartData.datasets[0].data, 1)

  const handleDeposit = (e: React.FormEvent) => {
    e.preventDefault()
    const amount = parseFloat(depositAmount)
    if (!amount || amount <= 0) return
    const newTx: WalletHistory = {
      id: `dep-${Date.now()}`,
      type: 'deposit',
      amount_algo: amount,
      status: 'confirmed',
      timestamp: new Date().toISOString(),
      tx_id: `mock-deposit-${Date.now()}`,
      explorer_url: buildExplorerUrl(`mock-deposit-${Date.now()}`),
      description: 'Wallet deposit',
    }
    setWalletHistory(prev => [newTx, ...prev])
    setDepositAmount('')
    setShowDeposit(false)
  }

  const handleWithdraw = (e: React.FormEvent) => {
    e.preventDefault()
    const amount = parseFloat(withdrawAmount)
    if (!amount || amount <= 0 || amount > balance) return
    const newTx: WalletHistory = {
      id: `wdr-${Date.now()}`,
      type: 'withdraw',
      amount_algo: amount,
      status: 'confirmed',
      timestamp: new Date().toISOString(),
      tx_id: `mock-withdraw-${Date.now()}`,
      explorer_url: buildExplorerUrl(`mock-withdraw-${Date.now()}`),
      description: 'Wallet withdrawal',
    }
    setWalletHistory(prev => [newTx, ...prev])
    setWithdrawAmount('')
    setShowWithdraw(false)
  }

  const providerPayouts = useMemo(() => {
    // Mock provider payouts
    return [
      { id: 'p1', amount: 12.5, date: new Date(Date.now() - 86400000).toISOString(), job_count: 8 },
      { id: 'p2', amount: 8.2, date: new Date(Date.now() - 86400000 * 3).toISOString(), job_count: 5 },
      { id: 'p3', amount: 15.0, date: new Date(Date.now() - 86400000 * 7).toISOString(), job_count: 12 },
    ]
  }, [])

  const txIcon = (type: string) => {
    switch (type) {
      case 'deposit': return 'arrow_downward'
      case 'withdraw': return 'arrow_upward'
      case 'escrow_lock': return 'lock'
      case 'escrow_release': return 'lock_open'
      case 'provider_payout': return 'payments'
      case 'refund': return 'replay'
      default: return 'receipt'
    }
  }

  const txColor = (type: string) => {
    switch (type) {
      case 'deposit': return 'bg-emerald-500/10 text-emerald-400'
      case 'withdraw': return 'bg-amber-500/10 text-amber-400'
      case 'escrow_lock': return 'bg-cyan-500/10 text-cyan-400'
      case 'escrow_release': return 'bg-violet-500/10 text-violet-400'
      case 'provider_payout': return 'bg-sky-500/10 text-sky-400'
      case 'refund': return 'bg-rose-500/10 text-rose-400'
      default: return 'bg-white/5 text-slate-400'
    }
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
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Wallet Dashboard</h1>
          <p className="text-slate-500 text-sm mt-1">Track your ALGO balance, escrow activity, and compute spending</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
          <span className="text-xs font-mono text-slate-500">{address?.slice(0, 6)}...{address?.slice(-4)}</span>
        </div>
      </div>

      {/* Balance Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)
        ) : (
          <>
            <div className="glass rounded-xl p-5 text-center gradient-border relative">
              <p className="text-[10px] font-mono uppercase tracking-widest text-slate-500 mb-1">ALGO Balance</p>
              <p className="text-2xl font-bold text-cyan-400">{balance.toFixed(2)} A</p>
              <p className="text-[10px] text-slate-600 mt-1">≈ ${(balance * ALGO_PRICE_USD).toFixed(2)} USD</p>
            </div>
            <div className="glass rounded-xl p-5 text-center gradient-border relative">
              <p className="text-[10px] font-mono uppercase tracking-widest text-slate-500 mb-1">ALGO Spent</p>
              <p className="text-2xl font-bold text-emerald-400">{totalSpent.toFixed(2)} A</p>
              <p className="text-[10px] text-slate-600 mt-1">Lifetime compute</p>
            </div>
            <div className="glass rounded-xl p-5 text-center gradient-border relative">
              <p className="text-[10px] font-mono uppercase tracking-widest text-slate-500 mb-1">Success Rate</p>
              <p className="text-2xl font-bold text-violet-400">{analytics.success_rate || 0}%</p>
              <p className="text-[10px] text-slate-600 mt-1">Job completion</p>
            </div>
            <div className="glass rounded-xl p-5 text-center gradient-border relative">
              <p className="text-[10px] font-mono uppercase tracking-widest text-slate-500 mb-1">Avg Duration</p>
              <p className="text-2xl font-bold text-amber-400">{avgDuration}ms</p>
              <p className="text-[10px] text-slate-600 mt-1">Per job</p>
            </div>
          </>
        )}
      </div>

      {/* Deposit / Withdraw Buttons */}
      <div className="flex gap-3 mb-8">
        <button onClick={() => setShowDeposit(true)}
          className="px-5 py-2.5 rounded-lg bg-emerald-500 text-slate-950 font-bold text-sm hover:brightness-110 transition-all flex items-center gap-2">
          <span className="material-symbols-outlined text-sm">arrow_downward</span> Deposit
        </button>
        <button onClick={() => setShowWithdraw(true)}
          className="px-5 py-2.5 rounded-lg bg-white/5 border border-white/10 text-slate-300 font-bold text-sm hover:bg-white/10 transition-all flex items-center gap-2">
          <span className="material-symbols-outlined text-sm">arrow_upward</span> Withdraw
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column */}
        <div className="space-y-6">
          {/* Escrow Overview */}
          <div className="glass rounded-xl p-6">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500 mb-4">Escrow Overview</h2>
            {loading ? (
              <div className="space-y-3">
                {[1,2,3].map(i => <div key={i} className="h-10 bg-white/5 rounded-lg" />)}
              </div>
            ) : (
              <>
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
              </>
            )}
          </div>

          {/* Escrow History Table */}
          <div className="glass rounded-xl p-6">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500 mb-4">Escrow History</h2>
            {loading ? (
              <div className="space-y-3">
                {[1,2,3].map(i => <SkeletonRow key={i} />)}
              </div>
            ) : escrowRecords.length === 0 ? (
              <div className="text-center py-4 text-slate-500 text-sm">No escrow records yet.</div>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                {escrowRecords.map(tx => (
                  <div key={tx.id} className="flex items-center justify-between p-3 rounded-lg bg-white/[0.03] hover:bg-white/[0.05] transition-colors">
                    <div className="flex items-center gap-3">
                      <span className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs ${tx.status === 'released' ? 'bg-emerald-500/10 text-emerald-400' : tx.status === 'refunded' ? 'bg-rose-500/10 text-rose-400' : 'bg-amber-500/10 text-amber-400'}`}>
                        <span className="material-symbols-outlined text-sm">{tx.status === 'released' ? 'lock_open' : tx.status === 'refunded' ? 'replay' : 'lock'}</span>
                      </span>
                      <div>
                        <p className="text-xs font-semibold capitalize">{tx.status}</p>
                        <p className="text-[10px] text-slate-500 font-mono">{tx.job_id.slice(0, 12)}...</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-bold text-cyan-400">{tx.amount_algo.toFixed(3)} A</p>
                      <p className="text-[10px] text-slate-500">{formatDate(tx.updated_at || tx.created_at)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Network Info */}
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

        {/* Right Column */}
        <div className="lg:col-span-2 space-y-6">
          {/* Spending Analytics */}
          <div className="glass rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500">Spending Analytics</h2>
              <div className="flex gap-1">
                {(['daily', 'weekly', 'monthly'] as const).map(p => (
                  <button key={p} onClick={() => setChartPeriod(p)}
                    className={`text-[10px] px-2 py-1 rounded-md font-semibold capitalize transition-all ${chartPeriod === p ? 'bg-cyan-500/20 text-cyan-400' : 'text-slate-500 hover:text-slate-300'}`}>
                    {p}
                  </button>
                ))}
              </div>
            </div>
            {loading ? (
              <div className="h-48 bg-white/5 rounded-lg animate-pulse" />
            ) : (
              <div className="space-y-2">
                <div className="flex items-end gap-2 h-48">
                  {chartData.labels.map((label, i) => {
                    const val = chartData.datasets[0].data[i]
                    const pct = (val / maxChartValue) * 100
                    return (
                      <div key={i} className="flex-1 flex flex-col items-center gap-1">
                        <div className="w-full bg-cyan-500/20 rounded-t-md relative group" style={{ height: `${Math.max(pct, 5)}%` }}>
                          <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-slate-800 text-xs text-cyan-400 px-2 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap border border-white/10">
                            {val} A
                          </div>
                        </div>
                        <span className="text-[10px] text-slate-500">{label}</span>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Transaction History */}
          <div className="glass rounded-xl p-6">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500 mb-4">Transaction History</h2>
            {loading ? (
              <div className="space-y-3">
                {[1,2,3,4].map(i => <SkeletonRow key={i} />)}
              </div>
            ) : walletHistory.length === 0 ? (
              <div className="text-center py-8 text-slate-500">
                <span className="material-symbols-outlined text-3xl mb-2">receipt_long</span>
                <p className="text-sm">No transactions yet.</p>
                <p className="text-xs mt-1">Submit a job to generate on-chain activity.</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
                {walletHistory.map(tx => (
                  <div key={tx.id} className="flex items-center justify-between p-4 rounded-lg bg-white/[0.03] hover:bg-white/[0.05] transition-colors">
                    <div className="flex items-center gap-3">
                      <span className={`w-10 h-10 rounded-xl flex items-center justify-center ${txColor(tx.type)}`}>
                        <span className="material-symbols-outlined text-sm">{txIcon(tx.type)}</span>
                      </span>
                      <div>
                        <p className="text-sm font-semibold capitalize">{tx.type.replace(/_/g, ' ')}</p>
                        <p className="text-[10px] text-slate-500 font-mono">{tx.id.slice(0, 16)}...</p>
                        {tx.description && <p className="text-[10px] text-slate-600">{tx.description}</p>}
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`text-sm font-bold ${tx.type === 'deposit' || tx.type === 'refund' ? 'text-emerald-400' : tx.type === 'withdraw' ? 'text-amber-400' : 'text-cyan-400'}`}>
                        {tx.type === 'deposit' || tx.type === 'refund' ? '+' : '-'}{tx.amount_algo.toFixed(3)} A
                      </p>
                      <p className="text-[10px] text-slate-500">{formatDate(tx.timestamp)}</p>
                      {tx.explorer_url && (
                        <a href={tx.explorer_url} target="_blank" rel="noreferrer"
                          className="text-[10px] text-cyan-400 hover:text-cyan-200 inline-flex items-center gap-0.5 mt-0.5">
                          <span className="material-symbols-outlined text-[10px]">open_in_new</span> Explorer
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Provider Payouts */}
          {isProvider && (
            <div className="glass rounded-xl p-6">
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500 mb-4">Provider Payouts</h2>
              {loading ? (
                <div className="space-y-3">
                  {[1,2].map(i => <SkeletonRow key={i} />)}
                </div>
              ) : (
                <div className="space-y-3">
                  {providerPayouts.map(p => (
                    <div key={p.id} className="flex items-center justify-between p-4 rounded-lg bg-white/[0.03]">
                      <div className="flex items-center gap-3">
                        <span className="w-10 h-10 rounded-xl bg-sky-500/10 text-sky-400 flex items-center justify-center">
                          <span className="material-symbols-outlined text-sm">payments</span>
                        </span>
                        <div>
                          <p className="text-sm font-semibold">Payout</p>
                          <p className="text-[10px] text-slate-500">{p.job_count} jobs</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-emerald-400">+{p.amount.toFixed(2)} A</p>
                        <p className="text-[10px] text-slate-500">{formatDate(p.date)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Deposit Modal */}
      {showDeposit && (
        <div className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={e => { if (e.target === e.currentTarget) setShowDeposit(false) }}>
          <div className="glass rounded-2xl p-8 w-full max-w-md">
            <h2 className="text-xl font-bold mb-2">Deposit ALGO</h2>
            <p className="text-sm text-slate-500 mb-4">Add ALGO to your Kinetic wallet. This is a mock deposit for demo purposes.</p>
            <form onSubmit={handleDeposit} className="space-y-4">
              <div>
                <label className="text-xs text-slate-500 uppercase tracking-wider mb-1 block">Amount (ALGO)</label>
                <input type="number" step="0.001" min="0" required placeholder="25.0"
                  value={depositAmount}
                  onChange={e => setDepositAmount(e.target.value)}
                  className="w-full bg-black/30 border border-white/10 rounded-lg px-4 py-3 text-sm focus:border-cyan-500/50 outline-none" />
              </div>
              <div className="flex gap-2">
                <button type="button" onClick={() => setDepositAmount('10')} className="chip">10 A</button>
                <button type="button" onClick={() => setDepositAmount('50')} className="chip">50 A</button>
                <button type="button" onClick={() => setDepositAmount('100')} className="chip">100 A</button>
              </div>
              <button type="submit" className="w-full py-3 rounded-xl bg-emerald-500 text-slate-950 font-bold hover:brightness-110 transition-all">
                Confirm Deposit
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Withdraw Modal */}
      {showWithdraw && (
        <div className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={e => { if (e.target === e.currentTarget) setShowWithdraw(false) }}>
          <div className="glass rounded-2xl p-8 w-full max-w-md">
            <h2 className="text-xl font-bold mb-2">Withdraw ALGO</h2>
            <p className="text-sm text-slate-500 mb-4">Available: {balance.toFixed(2)} A</p>
            <form onSubmit={handleWithdraw} className="space-y-4">
              <div>
                <label className="text-xs text-slate-500 uppercase tracking-wider mb-1 block">Amount (ALGO)</label>
                <input type="number" step="0.001" min="0" max={balance} required placeholder="10.0"
                  value={withdrawAmount}
                  onChange={e => setWithdrawAmount(e.target.value)}
                  className="w-full bg-black/30 border border-white/10 rounded-lg px-4 py-3 text-sm focus:border-cyan-500/50 outline-none" />
              </div>
              <button type="submit" disabled={parseFloat(withdrawAmount) > balance}
                className="w-full py-3 rounded-xl bg-amber-500 text-slate-950 font-bold hover:brightness-110 transition-all disabled:opacity-50">
                Confirm Withdraw
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
