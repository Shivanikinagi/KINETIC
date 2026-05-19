import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { fetchJson, type Provider, type Analytics } from '../lib/api'
import ProviderCard from '../components/ProviderCard'

export default function Hub() {
  const [providers, setProviders] = useState<Provider[]>([])
  const [analytics, setAnalytics] = useState<Analytics>({})

  useEffect(() => {
    Promise.all([
      fetchJson('/providers').catch(() => []),
      fetchJson('/analytics').catch(() => ({}))
    ]).then(([p, a]) => {
      setProviders(Array.isArray(p) ? p : [])
      setAnalytics(a)
    })
  }, [])

  const gpuCount = providers.reduce((s, p) => s + (p.gpu_count || 1), 0)
  const vol = analytics.total_algo_spent || 0

  return (
    <div className="hero-glow" style={{ background: 'radial-gradient(ellipse 60% 50% at 30% 10%, rgba(0,245,255,0.06), transparent 70%), radial-gradient(ellipse 40% 40% at 80% 80%, rgba(99,102,241,0.04), transparent)' }}>
      {/* Hero */}
      <section className="max-w-7xl mx-auto px-6 pt-20 pb-16 text-center">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-cyan-500/25 bg-cyan-500/5 text-cyan-300 text-xs uppercase tracking-[0.15em] mb-6">
          <span className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse" />
          Open GPU Marketplace on Algorand
        </div>
        <h1 className="text-5xl md:text-7xl font-black tracking-tight leading-[1.05]">
          The <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500">GPU Hub</span>
        </h1>
        <p className="mt-5 text-lg text-slate-400 max-w-xl mx-auto leading-relaxed">
          Browse, compare, and deploy GPU compute in one click. Fully decentralized, instant settlement.
        </p>

        <div className="mt-10 max-w-2xl mx-auto">
          <form action="/explore" method="GET" className="flex items-center glass rounded-xl px-5 py-3 gap-3 hover:border-cyan-500/30 transition-colors">
            <span className="material-symbols-outlined text-slate-500">search</span>
            <input
              type="text"
              name="q"
              placeholder="Search GPUs — H100, RTX 4090, A100..."
              className="flex-1 bg-transparent border-none outline-none text-sm text-slate-300 placeholder:text-slate-500"
            />
            <button type="submit" className="text-[10px] text-slate-600 font-mono border border-slate-700/50 px-2 py-0.5 rounded hover:border-cyan-500/30 hover:text-cyan-400 transition-colors">
              ENTER
            </button>
          </form>
        </div>

        <div className="mt-8 flex flex-wrap justify-center gap-4">
          <Link to="/explore" className="bg-gradient-to-r from-cyan-500 to-cyan-600 text-slate-950 px-7 py-3 rounded-xl font-bold text-sm hover:brightness-110 transition-all flex items-center gap-2">
            <span className="material-symbols-outlined text-lg">explore</span>
            Browse GPUs
          </Link>
          <Link to="/submit" className="glass text-cyan-300 px-7 py-3 rounded-xl font-semibold text-sm hover:bg-white/5 transition-all flex items-center gap-2">
            <span className="material-symbols-outlined text-lg">rocket_launch</span>
            Submit Job
          </Link>
          <Link to="/provide" className="glass text-slate-400 px-7 py-3 rounded-xl font-semibold text-sm hover:bg-white/5 transition-all flex items-center gap-2">
            <span className="material-symbols-outlined text-lg">cloud_upload</span>
            Start Providing
          </Link>
        </div>
      </section>

      {/* Live Stats */}
      <section className="max-w-7xl mx-auto px-6 pb-16">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="glass rounded-xl p-5 text-center">
            <p className="text-[10px] font-mono uppercase tracking-widest text-slate-500 mb-1">Providers</p>
            <p className="text-2xl font-bold text-cyan-400">{providers.length}</p>
          </div>
          <div className="glass rounded-xl p-5 text-center">
            <p className="text-[10px] font-mono uppercase tracking-widest text-slate-500 mb-1">Active GPUs</p>
            <p className="text-2xl font-bold text-cyan-400">{gpuCount}</p>
          </div>
          <div className="glass rounded-xl p-5 text-center">
            <p className="text-[10px] font-mono uppercase tracking-widest text-slate-500 mb-1">Jobs Completed</p>
            <p className="text-2xl font-bold text-cyan-400">{(analytics.total_jobs ?? 0).toLocaleString()}</p>
          </div>
          <div className="glass rounded-xl p-5 text-center">
            <p className="text-[10px] font-mono uppercase tracking-widest text-slate-500 mb-1">ALGO Volume</p>
            <p className="text-2xl font-bold text-cyan-400">{vol > 0 ? vol.toFixed(2) + ' A' : '0 A'}</p>
          </div>
        </div>
      </section>

      {/* Featured */}
      <section className="max-w-7xl mx-auto px-6 pb-20">
        <div className="flex items-end justify-between mb-8">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Featured GPUs</h2>
            <p className="text-slate-500 text-sm mt-1">Top-rated providers with verified uptime</p>
          </div>
          <Link to="/explore" className="text-cyan-400 text-sm font-semibold hover:text-cyan-200 flex items-center gap-1 transition-colors">
            View all <span className="material-symbols-outlined text-sm">arrow_forward</span>
          </Link>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {providers.length === 0 ? (
            <div className="glass rounded-xl p-8 text-center text-slate-500 col-span-full">
              No providers online yet. Be the first to <Link to="/provide" className="text-cyan-400 underline">register your GPU</Link>.
            </div>
          ) : (
            providers.slice(0, 3).map(p => <ProviderCard key={p.id} provider={p} />)
          )}
        </div>
      </section>

      {/* How It Works */}
      <section className="max-w-7xl mx-auto px-6 pb-24">
        <h2 className="text-3xl font-bold tracking-tight text-center mb-12">How It Works</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="glass rounded-xl p-6 text-center card-hover">
            <div className="w-12 h-12 rounded-xl bg-cyan-500/10 flex items-center justify-center mx-auto mb-4">
              <span className="material-symbols-outlined text-cyan-400 text-2xl">search</span>
            </div>
            <h3 className="font-bold mb-2">1. Browse</h3>
            <p className="text-sm text-slate-400">Search GPUs by model, VRAM, price. Compare providers side-by-side.</p>
          </div>
          <div className="glass rounded-xl p-6 text-center card-hover">
            <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center mx-auto mb-4">
              <span className="material-symbols-outlined text-emerald-400 text-2xl">rocket_launch</span>
            </div>
            <h3 className="font-bold mb-2">2. Deploy</h3>
            <p className="text-sm text-slate-400">Submit any compute job. Docker-based execution in secure sandboxes.</p>
          </div>
          <div className="glass rounded-xl p-6 text-center card-hover">
            <div className="w-12 h-12 rounded-xl bg-violet-500/10 flex items-center justify-center mx-auto mb-4">
              <span className="material-symbols-outlined text-violet-400 text-2xl">verified</span>
            </div>
            <h3 className="font-bold mb-2">3. Verify</h3>
            <p className="text-sm text-slate-400">Every job produces a cryptographic proof, settled on Algorand.</p>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-7xl mx-auto px-6 pb-24">
        <div className="glass rounded-2xl p-12 text-center">
          <h2 className="text-4xl font-black tracking-tight mb-4">Have idle GPUs?</h2>
          <p className="text-slate-400 max-w-md mx-auto mb-8">Register your hardware and start earning ALGO. No complicated setup — just connect and earn.</p>
          <Link to="/provide" className="inline-flex items-center gap-2 bg-gradient-to-r from-cyan-500 to-cyan-600 text-slate-950 px-8 py-4 rounded-xl font-bold hover:brightness-110 transition-all">
            <span className="material-symbols-outlined">cloud_upload</span>
            Start Providing
          </Link>
        </div>
      </section>
    </div>
  )
}
