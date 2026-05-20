import { Link, useLocation } from 'react-router-dom'
import { useWallet } from '../hooks/useWallet'

const pages = [
  { href: '/', label: 'Hub', id: 'home' },
  { href: '/explore', label: 'GPUs', id: 'explore' },
  { href: '/models', label: 'Models', id: 'models' },
  { href: '/datasets', label: 'Datasets', id: 'datasets' },
  { href: '/spaces', label: 'Spaces', id: 'spaces' },
  { href: '/assistant', label: 'Assistant', id: 'assistant' },
  { href: '/submit', label: 'Submit Job', id: 'submit' },
  { href: '/monitor', label: 'Monitor', id: 'monitor' },
  { href: '/jobs', label: 'My Jobs', id: 'jobs' },
  { href: '/wallet', label: 'Wallet', id: 'wallet' },
  { href: '/api', label: 'API', id: 'api' },
  { href: '/dashboard', label: 'Dashboard', id: 'dashboard' },
  { href: '/provide', label: 'Provide', id: 'provide' },
  { href: '/activity', label: 'Activity', id: 'activity' },
]

function formatAddress(addr: string) {
  return `${addr.slice(0, 4)}...${addr.slice(-4)}`
}

export default function Navbar() {
  const location = useLocation()
  const { address, connected, connecting, connect, disconnect } = useWallet()
  const activePage = pages.find(p => p.href === location.pathname)?.id || ''

  return (
    <header className="w-full top-0 sticky z-50 border-b border-white/5" style={{ background: 'rgba(11,13,16,0.92)', backdropFilter: 'blur(16px)' }}>
      <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-10">
          <Link to="/" className="text-2xl font-black italic tracking-tight text-cyan-400" style={{ fontFamily: "'Space Grotesk',sans-serif" }}>
            KINETIC
          </Link>
          <nav className="hidden lg:flex items-center gap-6 text-sm font-medium" style={{ fontFamily: "'Space Grotesk',sans-serif" }}>
            {pages.map(p => {
              const isActive = p.id === activePage
              return (
                <Link
                  key={p.id}
                  to={p.href}
                  className={isActive
                    ? 'text-cyan-400 font-semibold border-b-2 border-cyan-400 pb-1'
                    : 'text-slate-400 hover:text-cyan-200 transition-colors'}
                >
                  {p.label}
                </Link>
              )
            })}
          </nav>
        </div>
        <div className="flex items-center gap-3">
          <span className="hidden sm:inline text-[10px] tracking-widest uppercase text-slate-500 font-mono border border-slate-700/50 px-3 py-1 rounded-full">
            Algorand TestNet
          </span>
          {connected && address ? (
            <button
              onClick={disconnect}
              className="flex items-center gap-2 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-4 py-2 rounded-lg font-semibold text-sm hover:bg-emerald-500/20 transition-all"
            >
              <span className="material-symbols-outlined text-sm">account_balance_wallet</span>
              {formatAddress(address)}
            </button>
          ) : (
            <button
              onClick={connect}
              disabled={connecting}
              className="bg-gradient-to-r from-cyan-500 to-cyan-600 text-slate-950 px-5 py-2 rounded-lg font-semibold text-sm hover:brightness-110 transition-all disabled:opacity-50"
            >
              {connecting ? 'Connecting...' : 'Connect Wallet'}
            </button>
          )}
        </div>
      </div>
    </header>
  )
}
