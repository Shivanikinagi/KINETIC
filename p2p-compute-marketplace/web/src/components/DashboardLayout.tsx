import { Link, useLocation } from 'react-router-dom'
import type { ReactNode } from 'react'

const sidebarItems = [
  { href: '/dashboard', label: 'Dashboard', icon: 'dashboard' },
  { href: '/monitor', label: 'Live Monitor', icon: 'monitor' },
  { href: '/jobs', label: 'My Jobs', icon: 'work_history' },
  { href: '/activity', label: 'Activity', icon: 'timeline' },
  { href: '/api', label: 'API Keys', icon: 'key' },
  { href: '/provide', label: 'Provider', icon: 'cloud_upload' },
]

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const location = useLocation()
  const activeId = sidebarItems.find(p => p.href === location.pathname)?.href || ''

  return (
    <div className="max-w-7xl mx-auto px-6 py-8">
      <div className="flex flex-col lg:flex-row gap-8">
        {/* Sidebar */}
        <aside className="lg:w-56 shrink-0">
          <div className="lg:sticky lg:top-24 space-y-1">
            <p className="text-[10px] uppercase tracking-widest text-slate-600 font-mono mb-3 px-3 hidden lg:block">Workspace</p>
            {sidebarItems.map(item => {
              const isActive = item.href === activeId
              return (
                <Link
                  key={item.href}
                  to={item.href}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                    isActive
                      ? 'text-cyan-400 bg-cyan-500/10'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
                  }`}
                >
                  <span className="material-symbols-outlined text-lg">{item.icon}</span>
                  {item.label}
                </Link>
              )
            })}
          </div>
        </aside>

        {/* Main content */}
        <main className="flex-1 min-w-0">
          {children}
        </main>
      </div>
    </div>
  )
}
