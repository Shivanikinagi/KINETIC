import { Link, useLocation } from 'react-router-dom'
import { useWallet } from '../hooks/useWallet'
import { useState, useEffect, useRef } from 'react'

const mainNav = [
  { href: '/explore', label: 'Explore', id: 'explore' },
  { href: '/models', label: 'Models', id: 'models' },
  { href: '/spaces', label: 'Spaces', id: 'spaces' },
  { href: '/assistant', label: 'Assistant', id: 'assistant' },
  { href: '/agent', label: 'Agent', id: 'agent' },
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
  const [walletOpen, setWalletOpen] = useState(false)
  const [notifOpen, setNotifOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const walletRef = useRef<HTMLDivElement>(null)
  const notifRef = useRef<HTMLDivElement>(null)

  const isActive = (href: string) => location.pathname === href

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (walletRef.current && !walletRef.current.contains(e.target as Node)) setWalletOpen(false)
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setNotifOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  const notifications = [
    { text: 'Job #A7F3 completed successfully', time: '2m ago', icon: 'check_circle', color: 'text-emerald-400' },
    { text: 'New provider RTX 4090 online', time: '15m ago', icon: 'memory', color: 'text-cyan-400' },
    { text: 'Escrow released: 0.42 ALGO', time: '1h ago', icon: 'payments', color: 'text-violet-400' },
  ]

  return (
    <header
      className={`w-full top-0 sticky z-50 border-b border-white/5 transition-all duration-300 ${
        scrolled ? 'bg-[rgba(8,9,12,0.95)] shadow-lg shadow-black/20' : 'bg-[rgba(8,9,12,0.85)]'
      }`}
      style={{ backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)' }}
    >
      <div className="max-w-7xl mx-auto px-4 md:px-6 py-3 flex items-center justify-between">
        {/* Logo + Desktop Nav */}
        <div className="flex items-center gap-6">
          <Link to="/" className="text-xl font-black italic tracking-tight gradient-text shrink-0" style={{ fontFamily: "'Space Grotesk',sans-serif" }}>
            KINETIC
          </Link>
          <nav className="hidden md:flex items-center gap-1">
            {mainNav.map(p => {
              const active = isActive(p.href)
              return (
                <Link
                  key={p.id}
                  to={p.href}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 relative ${
                    active
                      ? 'text-cyan-400'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
                  }`}
                >
                  {p.label}
                  {active && (
                    <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-4 h-0.5 bg-cyan-400 rounded-full" />
                  )}
                </Link>
              )
            })}
          </nav>
        </div>

        {/* Right Section */}
        <div className="flex items-center gap-1 md:gap-2">
          <div className="hidden lg:flex items-center gap-1 mr-1">
            {rightNav.map(p => (
              <Link
                key={p.href}
                to={p.href}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 ${
                  isActive(p.href)
                    ? 'text-cyan-400 bg-cyan-500/10'
                    : 'text-slate-500 hover:text-slate-300 hover:bg-white/5'
                }`}
              >
                <span className="material-symbols-outlined text-sm">{p.icon}</span>
                {p.label}
              </Link>
            ))}
          </div>

          {/* Notification Bell */}
          <div ref={notifRef} className="relative">
            <button
              onClick={() => setNotifOpen(!notifOpen)}
              className="relative p-2 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-white/5 transition-all"
            >
              <span className="material-symbols-outlined text-lg">notifications</span>
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-rose-500 rounded-full animate-pulse" />
            </button>
            {notifOpen && (
              <div className="absolute right-0 top-full mt-2 w-72 glass-strong rounded-xl p-3 space-y-2 z-50 animate-scale-in border border-white/10">
                <p className="text-[10px] uppercase tracking-widest text-slate-500 font-mono mb-1 px-1">Notifications</p>
                {notifications.map((n, i) => (
                  <div key={i} className="flex items-start gap-2 p-2 rounded-lg hover:bg-white/[0.03] transition-colors cursor-pointer">
                    <span className={`material-symbols-outlined text-sm ${n.color} mt-0.5`}>{n.icon}</span>
                    <div>
                      <p className="text-xs text-slate-300">{n.text}</p>
                      <p className="text-[10px] text-slate-600">{n.time}</p>
                    </div>
                  </div>
                ))}
                <button className="w-full text-center text-[10px] text-cyan-400 hover:text-cyan-300 py-1 transition-colors">
                  View all
                </button>
              </div>
            )}
          </div>

          {/* Wallet */}
          <div ref={walletRef} className="relative">
            {connected && address ? (
              <button
                onClick={() => setWalletOpen(!walletOpen)}
                className="flex items-center gap-1.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-3 py-1.5 rounded-lg font-semibold text-xs hover:bg-emerald-500/20 transition-all"
              >
                <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
                {formatAddress(address)}
                <span className="material-symbols-outlined text-sm transition-transform duration-200" style={{ transform: walletOpen ? 'rotate(180deg)' : 'none' }}>
                  expand_more
                </span>
              </button>
            ) : (
              <button onClick={connect} disabled={connecting}
                className="btn-primary text-xs py-2 px-4">
                {connecting ? (
                  <span className="flex items-center gap-1.5">
                    <span className="w-3 h-3 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                    Connect
                  </span>
                ) : 'Connect'}
              </button>
            )}

            {walletOpen && connected && address && (
              <div className="absolute right-0 top-full mt-2 w-56 glass-strong rounded-xl p-3 z-50 animate-scale-in border border-white/10">
                <div className="flex items-center gap-2 mb-3 pb-2 border-b border-white/5">
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                    <span className="material-symbols-outlined text-emerald-400 text-sm">account_balance_wallet</span>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-200">My Wallet</p>
                    <p className="text-[10px] font-mono text-slate-500">{address.slice(0, 10)}...{address.slice(-6)}</p>
                  </div>
                </div>
                <div className="space-y-1">
                  <Link to="/wallet" onClick={() => setWalletOpen(false)}
                    className="flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs text-slate-400 hover:text-slate-200 hover:bg-white/5 transition-all">
                    <span className="material-symbols-outlined text-sm">account_balance_wallet</span>
                    Wallet Dashboard
                  </Link>
                  <Link to="/jobs" onClick={() => setWalletOpen(false)}
                    className="flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs text-slate-400 hover:text-slate-200 hover:bg-white/5 transition-all">
                    <span className="material-symbols-outlined text-sm">work_history</span>
                    My Jobs
                  </Link>
                  <button
                    onClick={() => { disconnect(); setWalletOpen(false) }}
                    className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 transition-all text-left"
                  >
                    <span className="material-symbols-outlined text-sm">logout</span>
                    Disconnect
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Mobile Hamburger */}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="md:hidden text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-white/5 transition-all"
          >
            <span className="material-symbols-outlined text-2xl transition-transform duration-300" style={{ transform: mobileOpen ? 'rotate(90deg)' : 'none' }}>
              {mobileOpen ? 'close' : 'menu'}
            </span>
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileOpen && (
        <div className="md:hidden border-t border-white/5 px-4 py-4 space-y-1 animate-fade-in">
          {[...mainNav, ...rightNav].map(p => (
            <Link
              key={p.href}
              to={p.href}
              onClick={() => setMobileOpen(false)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all ${
                isActive(p.href)
                  ? 'text-cyan-400 bg-cyan-500/10'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
              }`}
            >
              {'icon' in p && <span className="material-symbols-outlined text-sm">{(p as any).icon}</span>}
              {p.label}
              {isActive(p.href) && <span className="material-symbols-outlined text-sm ml-auto">check</span>}
            </Link>
          ))}
          {connected && address && (
            <button
              onClick={() => { disconnect(); setMobileOpen(false) }}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-rose-400 hover:bg-rose-500/10 transition-all"
            >
              <span className="material-symbols-outlined text-sm">logout</span>
              Disconnect Wallet
            </button>
          )}
        </div>
      )}
    </header>
  )
}
