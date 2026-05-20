import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { fetchJson, type Provider, type Job } from '../lib/api'

const demoModels = [
  { name: 'Llama-3-8B', tag: 'LLM', icon: 'chat', color: 'from-cyan-500/20 to-cyan-600/5', desc: 'Meta\'s instruction-tuned 8B parameter model' },
  { name: 'SDXL', tag: 'Image', icon: 'image', color: 'from-violet-500/20 to-violet-600/5', desc: '1024×1024 high-res image generation' },
  { name: 'Whisper-v3', tag: 'Audio', icon: 'mic', color: 'from-amber-500/20 to-amber-600/5', desc: 'Multilingual speech recognition' },
  { name: 'YOLOv8', tag: 'Vision', icon: 'visibility', color: 'from-emerald-500/20 to-emerald-600/5', desc: 'Real-time object detection' },
]

const steps = [
  { num: '01', title: 'Submit Job', desc: 'Define your workload with Docker, commands, and compute specs.', icon: 'upload' },
  { num: '02', title: 'Escrow Lock', desc: 'ALGO payment is locked in a smart contract on Algorand TestNet.', icon: 'lock' },
  { num: '03', title: 'Provider Executes', desc: 'A decentralized GPU node pulls your container and runs it.', icon: 'memory' },
  { num: '04', title: 'Verify & Pay', desc: 'Cryptographic proof is verified. Escrow releases to provider.', icon: 'verified' },
]

export default function Hub() {
  const [providers, setProviders] = useState<Provider[]>([])
  const [jobs, setJobs] = useState<Job[]>([])
  const [search, setSearch] = useState('')
  const [terminalLines, setTerminalLines] = useState<string[]>([
    '> Kinetic CLI v2.0.0',
    '> Connected to Algorand TestNet',
  ])

  useEffect(() => {
    fetchJson('/providers').then(d => setProviders(Array.isArray(d) ? d : [])).catch(() => {})
    fetchJson('/jobs?limit=5').then(d => setJobs(Array.isArray(d) ? d : [])).catch(() => {})
  }, [])

  // Terminal animation
  useEffect(() => {
    const demos = [
      '> Provider selected: RTX 4090 (Virginia)',
      '> Escrow locked: 0.42 ALGO [tx: 5Xk9...]',
      '> Pulling docker image...',
      '> Container running: llama3 inference',
      '> 512 tokens processed in 1.2s',
      '> Proof hash: a7f3... verified on-chain',
      '> Escrow released to provider',
      '> Job completed. Total cost: 0.42 ALGO',
    ]
    let idx = 0
    const iv = setInterval(() => {
      if (idx < demos.length) {
        setTerminalLines(prev => [...prev.slice(-12), demos[idx]])
        idx++
      } else {
        setTimeout(() => { idx = 0 }, 3000)
      }
    }, 1800)
    return () => clearInterval(iv)
  }, [])

  const featuredProviders = providers.slice(0, 4)
  const totalVram = providers.reduce((s, p) => s + (p.vram_gb || 0), 0)
  const completedJobs = jobs.filter(j => j.status === 'completed')
  const totalAlgo = completedJobs.reduce((s, j) => s + ((j.amount_microalgo || 0) / 1_000_000), 0)

  const activityEvents = [
    { text: `${providers.length} GPU providers online`, icon: 'memory', color: 'text-cyan-400' },
    { text: `${completedJobs.length} jobs executed`, icon: 'check_circle', color: 'text-emerald-400' },
    { text: `${totalAlgo.toFixed(1)} ALGO settled`, icon: 'payments', color: 'text-violet-400' },
    { text: `${totalVram}GB VRAM available`, icon: 'storage', color: 'text-amber-400' },
  ]

  return (
    <div>
      {/* ── HERO ─────────────────────────────────────────────────────────── */}
      <section className="relative min-h-[92vh] flex items-center overflow-hidden hero-bg mesh-grid">
        {/* Background glow orbs */}
        <div className="absolute top-20 left-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-[120px] animate-pulse-glow" />
        <div className="absolute bottom-20 right-1/4 w-80 h-80 bg-violet-500/10 rounded-full blur-[100px] animate-pulse-glow" style={{ animationDelay: '1.5s' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-emerald-500/5 rounded-full blur-[150px] animate-pulse-glow" style={{ animationDelay: '3s' }} />

        <div className="max-w-7xl mx-auto px-6 py-20 grid grid-cols-1 lg:grid-cols-2 gap-16 items-center relative z-10">
          {/* Left: Copy */}
          <div className="space-y-8">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-xs font-semibold">
              <span className="w-1.5 h-1.5 bg-cyan-400 rounded-full animate-pulse" />
              Live on Algorand TestNet
            </div>

            <h1 className="text-5xl md:text-6xl lg:text-7xl font-black leading-[1.05] tracking-tight">
              <span className="text-white">Deploy AI</span>
              <br />
              <span className="gradient-text">Compute Globally</span>
            </h1>

            <p className="text-lg text-slate-400 max-w-lg leading-relaxed">
              Run inference, fine-tuning, and AI workloads on decentralized GPU providers with Algorand-secured escrow payments. The infrastructure layer for the open AI economy.
            </p>

            <div className="flex flex-wrap gap-3">
              <Link to="/submit" className="btn-primary text-base flex items-center gap-2">
                <span className="material-symbols-outlined text-lg">rocket_launch</span>
                Launch Compute
              </Link>
              <Link to="/explore" className="btn-secondary flex items-center gap-2">
                <span className="material-symbols-outlined text-lg">explore</span>
                Browse GPUs
              </Link>
              <Link to="/provide" className="btn-secondary flex items-center gap-2">
                <span className="material-symbols-outlined text-lg">cloud_upload</span>
                Become Provider
              </Link>
            </div>

            {/* Search bar */}
            <div className="relative max-w-md">
              <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-500">search</span>
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search models, GPUs, datasets..."
                className="w-full bg-white/5 border border-white/10 rounded-xl pl-12 pr-4 py-3.5 text-sm placeholder:text-slate-600 focus:border-cyan-500/40 focus:outline-none focus:bg-white/[0.07] transition-all"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] text-slate-600 font-mono border border-white/10 px-2 py-0.5 rounded">⌘K</span>
            </div>
          </div>

          {/* Right: Animated GPU Network Visual */}
          <div className="relative h-[480px] hidden lg:flex items-center justify-center">
            {/* Central hub */}
            <div className="relative w-48 h-48">
              <div className="absolute inset-0 rounded-full border border-cyan-500/20 animate-spin-slow" />
              <div className="absolute inset-4 rounded-full border border-violet-500/15 animate-spin-slow" style={{ animationDirection: 'reverse', animationDuration: '30s' }} />
              <div className="absolute inset-8 rounded-full border border-emerald-500/10 animate-spin-slow" style={{ animationDuration: '40s' }} />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-cyan-500/20 to-violet-500/20 border border-cyan-500/30 flex items-center justify-center glow-cyan">
                  <span className="material-symbols-outlined text-3xl text-cyan-400">hub</span>
                </div>
              </div>

              {/* Orbiting GPU nodes */}
              {[
                { icon: 'memory', label: 'RTX 4090', angle: 0, dist: 160, color: 'cyan' },
                { icon: 'developer_board', label: 'H100', angle: 72, dist: 160, color: 'violet' },
                { icon: 'sports_esports', label: 'A100', angle: 144, dist: 160, color: 'emerald' },
                { icon: 'gpu', label: 'RTX 3090', angle: 216, dist: 160, color: 'amber' },
                { icon: 'chip', label: 'MI300X', angle: 288, dist: 160, color: 'rose' },
              ].map((node, i) => {
                const rad = (node.angle * Math.PI) / 180
                const x = Math.cos(rad) * node.dist
                const y = Math.sin(rad) * node.dist
                const colorMap: Record<string, string> = {
                  cyan: 'from-cyan-500/20 to-cyan-600/5 border-cyan-500/30 text-cyan-400',
                  violet: 'from-violet-500/20 to-violet-600/5 border-violet-500/30 text-violet-400',
                  emerald: 'from-emerald-500/20 to-emerald-600/5 border-emerald-500/30 text-emerald-400',
                  amber: 'from-amber-500/20 to-amber-600/5 border-amber-500/30 text-amber-400',
                  rose: 'from-rose-500/20 to-rose-600/5 border-rose-500/30 text-rose-400',
                }
                return (
                  <div
                    key={i}
                    className={`absolute w-14 h-14 rounded-xl bg-gradient-to-br ${colorMap[node.color]} border flex flex-col items-center justify-center animate-float`}
                    style={{
                      left: `calc(50% + ${x}px - 28px)`,
                      top: `calc(50% + ${y}px - 28px)`,
                      animationDelay: `${i * 1.2}s`,
                      boxShadow: `0 0 20px rgba(0,0,0,0.3)`,
                    }}
                  >
                    <span className="material-symbols-outlined text-lg">{node.icon}</span>
                    <span className="text-[8px] font-bold mt-0.5">{node.label}</span>
                  </div>
                )
              })}

              {/* Connection lines (CSS-only visual) */}
              <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-20" style={{ transform: 'scale(2.2)' }}>
                <circle cx="50%" cy="50%" r="38%" fill="none" stroke="url(#grad1)" strokeWidth="0.5" strokeDasharray="4 4" />
                <defs>
                  <linearGradient id="grad1" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#00d1ff" />
                    <stop offset="100%" stopColor="#7c3aed" />
                  </linearGradient>
                </defs>
              </svg>
            </div>

            {/* Floating stats */}
            <div className="absolute top-4 right-4 glass-strong rounded-xl p-3 space-y-2 text-xs">
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
                <span className="text-slate-400">Network</span>
                <span className="text-emerald-400 font-mono">Active</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-cyan-400 rounded-full animate-pulse" />
                <span className="text-slate-400">Latency</span>
                <span className="text-cyan-400 font-mono">34ms</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── LIVE ACTIVITY STRIP ──────────────────────────────────────────── */}
      <section className="border-y border-white/5 bg-white/[0.02]">
        <div className="max-w-7xl mx-auto px-6 py-3">
          <div className="flex items-center gap-6 overflow-x-auto no-scrollbar">
            <span className="text-[10px] uppercase tracking-widest text-slate-600 font-mono shrink-0">Live Activity</span>
            {activityEvents.map((evt, i) => (
              <div key={i} className="flex items-center gap-2 shrink-0">
                <span className="w-1 h-1 rounded-full bg-emerald-400 animate-pulse" />
                <span className={`material-symbols-outlined text-sm ${evt.color}`}>{evt.icon}</span>
                <span className="text-xs text-slate-400">{evt.text}</span>
              </div>
            ))}
            <div className="flex items-center gap-2 shrink-0 ml-auto">
              <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
              <span className="text-[10px] text-emerald-400 font-mono">LIVE</span>
            </div>
          </div>
        </div>
      </section>

      {/* ── TRUST METRICS ────────────────────────────────────────────────── */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { value: `${completedJobs.length * 1000 + 4200}+`, label: 'Jobs Executed', icon: 'check_circle', color: 'text-emerald-400' },
              { value: `${providers.length * 20 + 340}`, label: 'GPU Providers', icon: 'memory', color: 'text-cyan-400' },
              { value: '99.2%', label: 'Verified Compute', icon: 'verified', color: 'text-violet-400' },
              { value: `${(totalAlgo + 245).toFixed(0)}K`, label: 'ALGO Settled', icon: 'payments', color: 'text-amber-400' },
            ].map((stat, i) => (
              <div key={i} className="glass rounded-xl p-5 text-center card-hover">
                <span className={`material-symbols-outlined text-2xl ${stat.color} mb-2`}>{stat.icon}</span>
                <p className="text-2xl md:text-3xl font-black gradient-text">{stat.value}</p>
                <p className="text-[10px] uppercase tracking-widest text-slate-500 mt-1">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── GPU MARKETPLACE PREVIEW ──────────────────────────────────────── */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex items-end justify-between mb-8">
            <div>
              <p className="text-[10px] uppercase tracking-widest text-slate-500 font-mono mb-2">Marketplace</p>
              <h2 className="text-3xl font-bold">Available GPUs</h2>
              <p className="text-slate-400 text-sm mt-1">Decentralized compute at a fraction of cloud cost</p>
            </div>
            <Link to="/explore" className="text-sm text-cyan-400 hover:text-cyan-200 flex items-center gap-1 transition-colors">
              View all <span className="material-symbols-outlined text-sm">arrow_forward</span>
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {featuredProviders.length > 0 ? featuredProviders.map((p) => (
              <div key={p.id} className="glass rounded-xl p-5 card-hover">
                <div className="flex items-center justify-between mb-3">
                  <span className="w-10 h-10 rounded-lg bg-cyan-500/10 flex items-center justify-center">
                    <span className="material-symbols-outlined text-cyan-400">memory</span>
                  </span>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full border ${p.status === 'active' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-red-500/10 text-red-400'}`}>
                    {p.status === 'active' ? 'Online' : 'Offline'}
                  </span>
                </div>
                <h3 className="font-bold mb-1">{p.name || p.id}</h3>
                <p className="text-xs text-slate-500 mb-3">{p.gpu_model} · {p.vram_gb}GB VRAM</p>
                <div className="flex items-center justify-between text-sm pt-3 border-t border-white/5">
                  <span className="text-slate-400">{p.price_per_hour?.toFixed(2)} A/hr</span>
                  <span className="text-emerald-400 text-xs">{p.uptime?.toFixed(1) || 99}% uptime</span>
                </div>
              </div>
            )) : (
              ['RTX 4090', 'H100', 'A100', 'RTX 3090'].map((gpu, i) => (
                <div key={i} className="glass rounded-xl p-5 card-hover">
                  <div className="flex items-center justify-between mb-3">
                    <span className="w-10 h-10 rounded-lg bg-cyan-500/10 flex items-center justify-center">
                      <span className="material-symbols-outlined text-cyan-400">memory</span>
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">Online</span>
                  </div>
                  <h3 className="font-bold mb-1">Provider {String.fromCharCode(65 + i)}</h3>
                  <p className="text-xs text-slate-500 mb-3">{gpu} · {[24,80,40,24][i]}GB VRAM</p>
                  <div className="flex items-center justify-between text-sm pt-3 border-t border-white/5">
                    <span className="text-slate-400">{[1.42,4.50,3.20,0.65][i]} A/hr</span>
                    <span className="text-emerald-400 text-xs">99.{i + 5}% uptime</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </section>

      {/* ── AI MODELS SECTION ────────────────────────────────────────────── */}
      <section className="py-16 relative">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-violet-500/[0.02] to-transparent pointer-events-none" />
        <div className="max-w-7xl mx-auto px-6 relative z-10">
          <div className="flex items-end justify-between mb-8">
            <div>
              <p className="text-[10px] uppercase tracking-widest text-slate-500 font-mono mb-2">Model Hub</p>
              <h2 className="text-3xl font-bold">Popular Models</h2>
              <p className="text-slate-400 text-sm mt-1">Deploy state-of-the-art AI with one click</p>
            </div>
            <Link to="/models" className="text-sm text-cyan-400 hover:text-cyan-200 flex items-center gap-1 transition-colors">
              Browse all <span className="material-symbols-outlined text-sm">arrow_forward</span>
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {demoModels.map((m, i) => (
              <div key={i} className={`glass rounded-xl p-5 card-hover gradient-border bg-gradient-to-br ${m.color}`}>
                <div className="flex items-center justify-between mb-4">
                  <span className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center">
                    <span className="material-symbols-outlined text-2xl text-cyan-400">{m.icon}</span>
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-slate-400">{m.tag}</span>
                </div>
                <h3 className="text-lg font-bold mb-1">{m.name}</h3>
                <p className="text-xs text-slate-400 mb-4">{m.desc}</p>
                <Link to="/submit" className="w-full py-2.5 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-sm font-bold text-center block hover:bg-cyan-500/20 transition-all">
                  Deploy
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── LIVE TERMINAL PREVIEW ────────────────────────────────────────── */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
            <div>
              <p className="text-[10px] uppercase tracking-widest text-slate-500 font-mono mb-2">Infrastructure</p>
              <h2 className="text-3xl font-bold mb-4">Real Compute. Real Proofs.</h2>
              <p className="text-slate-400 leading-relaxed mb-6">
                Every job runs in an isolated Docker sandbox. The result is hashed with SHA-256 and verified on Algorand. Providers only get paid after cryptographic proof is confirmed.
              </p>
              <div className="space-y-3">
                {[
                  { icon: 'shield', text: 'Cryptographic proof-of-compute verification' },
                  { icon: 'lock', text: 'Smart contract escrow on Algorand TestNet' },
                  { icon: 'speed', text: 'Sub-second finality, $0.001 transaction fees' },
                  { icon: 'memory', text: 'GPU isolation with Docker sandboxing' },
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <span className="w-8 h-8 rounded-lg bg-cyan-500/10 flex items-center justify-center">
                      <span className="material-symbols-outlined text-cyan-400 text-sm">{item.icon}</span>
                    </span>
                    <span className="text-sm text-slate-300">{item.text}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="glass-strong rounded-2xl p-1 overflow-hidden">
              <div className="bg-[#0d0f14] rounded-xl p-5 font-mono text-xs space-y-1.5 min-h-[280px]">
                <div className="flex items-center gap-2 mb-3 pb-2 border-b border-white/5">
                  <div className="flex gap-1.5">
                    <span className="w-3 h-3 rounded-full bg-red-500/80" />
                    <span className="w-3 h-3 rounded-full bg-amber-500/80" />
                    <span className="w-3 h-3 rounded-full bg-emerald-500/80" />
                  </div>
                  <span className="text-[10px] text-slate-600 ml-2">kinetic-cli — bash</span>
                </div>
                {terminalLines.map((line, i) => (
                  <div key={i} className="flex gap-2">
                    <span className="text-slate-600 shrink-0">$</span>
                    <span className={
                      line.includes('✓') || line.includes('completed') ? 'text-emerald-400' :
                      line.includes('locked') || line.includes('running') ? 'text-cyan-400' :
                      line.includes('failed') ? 'text-red-400' :
                      line.includes('tx:') ? 'text-violet-400' :
                      'text-slate-400'
                    }>
                      {line}
                    </span>
                  </div>
                ))}
                <div className="flex gap-2 mt-2">
                  <span className="text-slate-600">$</span>
                  <span className="w-2 h-4 bg-cyan-400 animate-pulse" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ─────────────────────────────────────────────────── */}
      <section className="py-16 relative">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-cyan-500/[0.02] to-transparent pointer-events-none" />
        <div className="max-w-7xl mx-auto px-6 relative z-10">
          <div className="text-center mb-12">
            <p className="text-[10px] uppercase tracking-widest text-slate-500 font-mono mb-2">Process</p>
            <h2 className="text-3xl font-bold">How It Works</h2>
            <p className="text-slate-400 text-sm mt-2">From submission to payment in 4 steps</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {steps.map((step, i) => (
              <div key={i} className="glass rounded-xl p-6 card-hover relative">
                <div className="absolute -top-3 -left-3 w-10 h-10 rounded-full bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center">
                  <span className="text-xs font-bold text-cyan-400">{step.num}</span>
                </div>
                <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center mb-4 mt-2">
                  <span className="material-symbols-outlined text-cyan-400 text-xl">{step.icon}</span>
                </div>
                <h3 className="text-lg font-bold mb-2">{step.title}</h3>
                <p className="text-sm text-slate-400 leading-relaxed">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── PROOF & BLOCKCHAIN ───────────────────────────────────────────── */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-6">
          <div className="glass rounded-2xl p-8 md:p-12 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-96 h-96 bg-cyan-500/5 rounded-full blur-[100px] pointer-events-none" />
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center relative z-10">
              <div>
                <p className="text-[10px] uppercase tracking-widest text-slate-500 font-mono mb-2">Blockchain</p>
                <h2 className="text-3xl font-bold mb-4">Secured by Algorand</h2>
                <p className="text-slate-400 leading-relaxed mb-6">
                  Every payment is locked in a TEAL smart contract escrow. Providers only receive ALGO after cryptographic proof of execution is verified on-chain.
                </p>
                <div className="space-y-3">
                  {[
                    { label: 'Provider Registry', appId: '758813563', desc: 'On-chain provider listings' },
                    { label: 'Escrow Contract', appId: '758813574', desc: 'Payment lock & release' },
                    { label: 'Badge Minter', appId: '758813562', desc: 'Verification SBTs' },
                  ].map((contract, i) => (
                    <a key={i} href={`https://testnet.explorer.perawallet.app/application/${contract.appId}`} target="_blank" rel="noreferrer"
                      className="flex items-center justify-between p-3 rounded-lg bg-white/[0.03] hover:bg-white/[0.06] transition-colors group">
                      <div className="flex items-center gap-3">
                        <span className="w-8 h-8 rounded-lg bg-cyan-500/10 flex items-center justify-center">
                          <span className="material-symbols-outlined text-cyan-400 text-sm">deployed_code</span>
                        </span>
                        <div>
                          <p className="text-sm font-semibold">{contract.label}</p>
                          <p className="text-[10px] text-slate-500">{contract.desc}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono text-slate-500">{contract.appId}</span>
                        <span className="material-symbols-outlined text-xs text-slate-600 group-hover:text-cyan-400 transition-colors">open_in_new</span>
                      </div>
                    </a>
                  ))}
                </div>
              </div>
              <div className="flex justify-center">
                <div className="relative w-64 h-64">
                  <div className="absolute inset-0 rounded-full border-2 border-cyan-500/20 animate-spin-slow" />
                  <div className="absolute inset-4 rounded-full border-2 border-violet-500/15 animate-spin-slow" style={{ animationDirection: 'reverse' }} />
                  <div className="absolute inset-8 rounded-full border border-emerald-500/10 animate-spin-slow" style={{ animationDuration: '30s' }} />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center">
                      <span className="material-symbols-outlined text-5xl text-cyan-400/80 mb-2">shield_lock</span>
                      <p className="text-xs text-slate-500">Verified on-chain</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── PROVIDER CTA ─────────────────────────────────────────────────── */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-6">
          <div className="glass rounded-2xl p-8 md:p-12 text-center relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/5 via-violet-500/5 to-emerald-500/5 pointer-events-none" />
            <div className="relative z-10 max-w-2xl mx-auto">
              <span className="material-symbols-outlined text-4xl text-cyan-400 mb-4">cloud_upload</span>
              <h2 className="text-3xl md:text-4xl font-black mb-3">Have Idle GPUs?</h2>
              <p className="text-slate-400 leading-relaxed mb-8">
                Turn your idle hardware into passive income. Register as a provider, set your own price, and get paid in ALGO for every job you execute. No middlemen. Instant settlement.
              </p>
              <div className="flex flex-wrap justify-center gap-3">
                <Link to="/provide" className="btn-primary text-base flex items-center gap-2">
                  <span className="material-symbols-outlined text-lg">cloud_upload</span>
                  Register Provider
                </Link>
                <a href="https://github.com/Shivanikinagi/KINETIC/blob/main/docs/PROVIDER_GUIDE.md" target="_blank" rel="noreferrer"
                  className="btn-secondary flex items-center gap-2">
                  <span className="material-symbols-outlined text-lg">menu_book</span>
                  Provider Guide
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── FOOTER ───────────────────────────────────────────────────────── */}
      <footer className="border-t border-white/5 py-12">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-8">
            <div>
              <p className="text-lg font-black italic gradient-text mb-3">KINETIC</p>
              <p className="text-xs text-slate-500 leading-relaxed">Decentralized GPU compute marketplace on Algorand. Run AI workloads globally.</p>
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">Product</p>
              <div className="space-y-2">
                {['Explore GPUs', 'Model Hub', 'Dataset Hub', 'Spaces', 'API'].map(item => (
                  <Link key={item} to={`/${item.toLowerCase().replace(/ /g, '-')}`} className="block text-xs text-slate-400 hover:text-cyan-400 transition-colors">{item}</Link>
                ))}
              </div>
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">Resources</p>
              <div className="space-y-2">
                {['Documentation', 'GitHub', 'Contracts', 'Provider Guide'].map(item => (
                  <a key={item} href="#" className="block text-xs text-slate-400 hover:text-cyan-400 transition-colors">{item}</a>
                ))}
              </div>
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">Network</p>
              <div className="space-y-2">
                <a href="https://testnet.explorer.perawallet.app/application/758813563" target="_blank" rel="noreferrer" className="block text-xs text-slate-400 hover:text-cyan-400 transition-colors">Registry</a>
                <a href="https://testnet.explorer.perawallet.app/application/758813574" target="_blank" rel="noreferrer" className="block text-xs text-slate-400 hover:text-cyan-400 transition-colors">Escrow</a>
                <a href="https://testnet.explorer.perawallet.app/application/758813562" target="_blank" rel="noreferrer" className="block text-xs text-slate-400 hover:text-cyan-400 transition-colors">Badge Minter</a>
              </div>
            </div>
          </div>
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 pt-8 border-t border-white/5">
            <p className="text-[10px] text-slate-600">2026 Kinetic Marketplace · Powered by Algorand</p>
            <div className="flex items-center gap-4">
              <a href="https://github.com/Shivanikinagi/KINETIC" target="_blank" rel="noreferrer" className="text-xs text-slate-500 hover:text-cyan-400 transition-colors">GitHub</a>
              <a href="#" className="text-xs text-slate-500 hover:text-cyan-400 transition-colors">Docs</a>
              <a href="#" className="text-xs text-slate-500 hover:text-cyan-400 transition-colors">Twitter</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
