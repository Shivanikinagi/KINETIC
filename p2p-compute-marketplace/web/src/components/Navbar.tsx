import { Link, useLocation } from 'react-router-dom'
import { useWallet } from '../hooks/useWallet'
import { useState } from 'react'

const mainNav = [
  { href: '/explore', label: 'Explore', id: 'explore' },
  { href: '/models', label: 'Models', id: 'models' },
  { href: '/spaces', label: 'Spaces', id: 'spaces' },
  { href: '/assistant', label: 'Assistant', id: 'assistant' },
]

const rightNav = [
  { href: '/jobs', label: 'Jobs', icon: 'work_history' },
  { href: '/wallet', label: 'Wallet', icon: 'account_balance_wallet' },
]

function formatAddress(addr: string) {
  return `${addr.slice(0, 4)}...${addr.slice(-4)}`
}

export default function Navbar() {
  const location = useLocation()
  const { address, connected, connecting, connect, disconnect } = useWallet()
  const [mobileOpen, setMobileOpen] = useState(false)
  const activeId = mainNav.find(p => p.href === location.pathname)?.id || ''

  return (
    <header className="w-full top-0 sticky z-50 border-b border-white/5 hero-bg" style={{ background: 'rgba(8,9,12,0.92)', backdropFilter: 'blur(24px)' }}>
      <div className="max-w-7xl mx-auto px-6 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-8">
          <Link to="/" className="text-xl font-black italic tracking-tight gradient-text" style={{ fontFamily: "'Space Grotesk',sans-serif" }}>
            KINETIC
          </Link>
          <nav className="hidden md:flex items-center gap-1">
            {mainNav.map(p => {
              const isActive = p.id === activeId
              return (
                <Link
                  key={p.id}
                  to={p.href}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                    isActive
                      ? 'text-cyan-400 bg-cyan-500/10'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
                  }`}
                >
                  {p.label}
                </Link>
              )
            })}
          </nav>
        </div>

        <div className="flex items-center gap-2">
          <div className="hidden lg:flex items-center gap-1 mr-2">
            {rightNav.map(p => (
              <Link
                key={p.href}
                to={p.href}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-500 hover:text-slate-300 hover:bg-white/5 transition-all"
              >
                <span className="material-symbols-outlined text-sm">{p.icon}</span>
                {p.label}
              </Link>
            ))}
          </div>

          {connected && address ? (
            <button onClick={disconnect}
              className="flex items-center gap-1.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-3 py-1.5 rounded-lg font-semibold text-xs hover:bg-emerald-500/20 transition-all">
              <span className="material-symbols-outlined text-sm">account_balance_wallet</span>
              {formatAddress(address)}
            </button>
          ) : (
            <button onClick={connect} disabled={connecting}
              className="btn-primary text-xs py-2 px-4">
              {connecting ? '...' : 'Connect'}
            </button>
          )}

          <button onClick={() => setMobileOpen(!mobileOpen)} className="md:hidden text-slate-400 hover:text-white p-1">
            <span className="material-symbols-outlined">{mobileOpen ? 'close' : 'menu'}</span>
          </button>
        </div>
      </div>

      {mobileOpen && (
        <div className="md:hidden border-t border-white/5 px-6 py-4 space-y-1">
          {[...mainNav, ...rightNav].map(p => (
            <Link key={p.href} to={p.href} onClick={() => setMobileOpen(false)}
              className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm text-slate-400 hover:text-slate-200 hover:bg-white/5 transition-all">
              {'icon' in p && <span className="material-symbols-outlined text-sm">{(p as any).icon}</span>}
              {p.label}
            </Link>
          ))}
        </div>
      )}
    </header>
  )
}
