import { Link, useLocation } from 'react-router-dom'

const pages = [
  { href: '/', label: 'Hub', id: 'home' },
  { href: '/explore', label: 'Explore GPUs', id: 'explore' },
  { href: '/submit', label: 'Submit Job', id: 'submit' },
  { href: '/jobs', label: 'My Jobs', id: 'jobs' },
  { href: '/dashboard', label: 'Dashboard', id: 'dashboard' },
  { href: '/provide', label: 'Provide', id: 'provide' },
  { href: '/activity', label: 'Activity', id: 'activity' },
]

export default function Navbar() {
  const location = useLocation()
  const activePage = pages.find(p => p.href === location.pathname)?.id || ''

  return (
    <header className="w-full top-0 sticky z-50 border-b border-white/5" style={{ background: 'rgba(11,13,16,0.92)', backdropFilter: 'blur(16px)' }}>
      <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-10">
          <Link to="/" className="text-2xl font-black italic tracking-tight text-cyan-400" style={{ fontFamily: "'Space Grotesk',sans-serif" }}>
            KINETIC
          </Link>
          <nav className="hidden md:flex items-center gap-7 text-sm font-medium" style={{ fontFamily: "'Space Grotesk',sans-serif" }}>
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
          <button className="bg-gradient-to-r from-cyan-500 to-cyan-600 text-slate-950 px-5 py-2 rounded-lg font-semibold text-sm hover:brightness-110 transition-all">
            Connect Wallet
          </button>
        </div>
      </div>
    </header>
  )
}
