import { useEffect, useState, useRef, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import { fetchJson, type Provider, type Template } from '../lib/api'

const GPU_FILTERS = ['RTX 4090', 'H100', 'A100', 'RTX 3090', 'MI300X']
const VRAM_FILTERS = [
  { label: '8GB+', value: 8 },
  { label: '16GB+', value: 16 },
  { label: '24GB+', value: 24 },
  { label: '40GB+', value: 40 },
  { label: '80GB+', value: 80 },
]

function StarRating({ score }: { score: number }) {
  const stars = Math.round((score / 100) * 5)
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <span key={i} className={`material-symbols-outlined text-[10px] ${i < stars ? 'text-amber-400' : 'text-slate-600'}`} style={{ fontVariationSettings: "'FILL' 1" }}>
          star
        </span>
      ))}
    </div>
  )
}

function UptimeBadge({ uptime }: { uptime?: number }) {
  const value = uptime || 99.0
  const color = value >= 95 ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' :
    value >= 90 ? 'text-amber-400 bg-amber-500/10 border-amber-500/20' :
    'text-red-400 bg-red-500/10 border-red-500/20'
  return (
    <span className={`text-[10px] px-2 py-0.5 rounded-full border ${color}`}>
      {value.toFixed(1)}% uptime
    </span>
  )
}

function StatusDot({ status }: { status?: string }) {
  const isOnline = status === 'active'
  return (
    <div className="flex items-center gap-1.5">
      <span className={`status-dot ${isOnline ? 'online' : 'offline'}`} />
      <span className={`text-[10px] font-medium ${isOnline ? 'text-emerald-400' : 'text-red-400'}`}>
        {isOnline ? 'Online' : 'Offline'}
      </span>
    </div>
  )
}

function SkeletonCard() {
  return (
    <div className="glass rounded-xl p-5 animate-pulse">
      <div className="flex items-center justify-between mb-4">
        <div className="w-12 h-12 rounded-xl skeleton" />
        <div className="w-16 h-5 rounded-full skeleton" />
      </div>
      <div className="skeleton skeleton-title mb-2" />
      <div className="skeleton skeleton-text w-3/4 mb-4" />
      <div className="grid grid-cols-3 gap-2 mb-4">
        <div className="h-10 rounded-lg skeleton" />
        <div className="h-10 rounded-lg skeleton" />
        <div className="h-10 rounded-lg skeleton" />
      </div>
      <div className="space-y-2 mb-4">
        <div className="skeleton skeleton-text w-full" />
        <div className="skeleton skeleton-text w-5/6" />
        <div className="skeleton skeleton-text w-4/6" />
      </div>
      <div className="flex items-center justify-between pt-4 border-t border-white/5">
        <div className="w-20 h-6 rounded skeleton" />
        <div className="w-16 h-8 rounded-lg skeleton" />
      </div>
    </div>
  )
}

export default function Explore() {
  const [searchParams] = useSearchParams()
  const [providers, setProviders] = useState<Provider[]>([])
  const [templates, setTemplates] = useState<Template[]>([])
  const [filters, setFilters] = useState({
    search: searchParams.get('q') || '',
    gpu: '',
    vram: 0,
    verified: false,
    sort: 'reputation',
  })
  const [deployProvider, setDeployProvider] = useState<Provider | null>(null)
  const [deployTemplate, setDeployTemplate] = useState<Template | null>(null)
  const [deployJobType, setDeployJobType] = useState('inference')
  const [deployTokens, setDeployTokens] = useState(1000)
  const [deployResult, setDeployResult] = useState<{ msg: string; status: 'success' | 'error'; id?: string; tx_id?: string; explorer_url?: string } | null>(null)
  const [loading, setLoading] = useState(false)
  const [dataLoading, setDataLoading] = useState(true)
  const [rocketAnim, setRocketAnim] = useState(false)
  const [showAutocomplete, setShowAutocomplete] = useState(false)
  const searchRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    Promise.all([
      fetchJson('/hub/explore').then(d => d.providers || []).catch(() =>
        fetchJson('/providers').then(d => Array.isArray(d) ? d : [])
      ),
      fetchJson('/hub/templates').then(d => d.templates || []).catch(() => []),
    ]).then(([p, t]) => {
      setProviders(p)
      setTemplates(t)
      setDataLoading(false)
    })
  }, [])

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) setShowAutocomplete(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  const filtered = useMemo(() => {
    return providers.filter(p => {
      const q = filters.search.toLowerCase()
      if (q && !((p.name || '').toLowerCase().includes(q) || (p.gpu_model || '').toLowerCase().includes(q) || (p.org_name || '').toLowerCase().includes(q))) return false
      if (filters.gpu && !(p.gpu_model || '').toLowerCase().includes(filters.gpu.toLowerCase())) return false
      if (filters.vram > 0 && (p.vram_gb || 0) < filters.vram) return false
      if (filters.verified && !(p.verified_member || p.org_verified)) return false
      return true
    }).sort((a, b) => {
      if (filters.sort === 'price') return (a.price_per_hour || 0) - (b.price_per_hour || 0)
      if (filters.sort === 'uptime') return (b.uptime || 0) - (a.uptime || 0)
      if (filters.sort === 'vram') return (b.vram_gb || 0) - (a.vram_gb || 0)
      return (b.trust?.reputation_score || (b.verified_member ? 80 : 50)) - (a.trust?.reputation_score || (a.verified_member ? 80 : 50))
    })
  }, [providers, filters])

  // Recommendations: top 3 by reputation
  const recommended = useMemo(() => {
    return [...providers].sort((a, b) =>
      (b.trust?.reputation_score || (b.verified_member ? 80 : 50)) - (a.trust?.reputation_score || (a.verified_member ? 80 : 50))
    ).slice(0, 3)
  }, [providers])

  // Autocomplete suggestions
  const suggestions = useMemo(() => {
    if (!filters.search || filters.search.length < 2) return []
    const q = filters.search.toLowerCase()
    const gpuModels = [...new Set(providers.map(p => p.gpu_model).filter(Boolean))]
    const names = [...new Set(providers.map(p => p.name || p.id))]
    return [...gpuModels, ...names].filter(s => s!.toLowerCase().includes(q)).slice(0, 5)
  }, [filters.search, providers])

  const openDeploy = (provider?: Provider, template?: Template) => {
    setDeployProvider(provider || null)
    setDeployTemplate(template || null)
    setDeployResult(null)
    if (template) setDeployTokens(template.base_tokens || 1000)
  }

  const handleDeploy = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setDeployResult(null)
    setRocketAnim(true)
    setTimeout(() => setRocketAnim(false), 700)
    try {
      let result
      if (deployTemplate) {
        result = await fetchJson(`/hub/templates/${deployTemplate.template_id}/deploy`, {
          method: 'POST',
          body: JSON.stringify({ consumer_id: 'user_' + Date.now(), params: { tokens: deployTokens, type: deployJobType }, provider_id: deployProvider?.id }),
        })
      } else {
        const payload: Record<string, unknown> = { type: deployJobType, tokens: deployTokens, payload: `deploy:${deployProvider?.id || 'auto'}:${Date.now()}` }
        if (deployProvider?.endpoint) payload.provider_endpoint = deployProvider.endpoint
        result = await fetchJson('/job', { method: 'POST', body: JSON.stringify(payload) })
      }
      const isError = result.status === 'failed' || result.error
      setDeployResult({
        msg: isError ? (result.error || 'Job failed') : 'Job deployed!',
        status: isError ? 'error' : 'success',
        id: result.deployment_id || result.job_id,
        tx_id: result.tx_id,
        explorer_url: result.explorer_url,
      })
    } catch (err: any) {
      let msg = err.message || 'Deploy failed'
      try {
        const parsed = JSON.parse(msg)
        if (parsed.detail) msg = String(parsed.detail)
        else if (parsed.message) msg = String(parsed.message)
      } catch { /* not JSON */ }
      setDeployResult({ msg, status: 'error' })
    } finally {
      setLoading(false)
    }
  }

  const estCost = (price: number, tokens: number) => {
    const hours = Math.max(1 / 60, tokens / 3600)
    return (price * hours).toFixed(4)
  }

  const gpuIcon = (model?: string) => {
    const m = (model || '').toLowerCase()
    if (m.includes('h100')) return 'memory'
    if (m.includes('4090')) return 'videogame_asset'
    if (m.includes('3090')) return 'sports_esports'
    if (m.includes('a100')) return 'developer_board'
    if (m.includes('mi300x')) return 'chip'
    return 'gpu'
  }

  const mockLatency = (id?: string) => {
    // Deterministic pseudo-random latency based on id
    const hash = (id || '').split('').reduce((a, b) => a + b.charCodeAt(0), 0)
    return 20 + (hash % 80)
  }

  return (
    <div className="max-w-7xl mx-auto px-6 py-8">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">GPU Marketplace</h1>
          <p className="text-slate-500 text-sm mt-1">Browse, compare, and deploy to decentralized GPU providers</p>
        </div>
        <div className="flex items-center gap-3 text-sm">
          <span className="status-dot online" />
          <span className="text-slate-500 font-mono text-xs">{providers.length} providers online</span>
        </div>
      </div>

      {/* Search + Filters */}
      <div className="glass rounded-xl p-5 mb-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div ref={searchRef} className="flex-1 relative">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">search</span>
            <input
              type="text"
              value={filters.search}
              onChange={e => { setFilters(f => ({ ...f, search: e.target.value })); setShowAutocomplete(true) }}
              onFocus={() => setShowAutocomplete(true)}
              placeholder="Search by GPU model, provider name, org..."
              className="w-full bg-black/30 border border-white/10 rounded-lg pl-10 pr-4 py-3 text-sm placeholder:text-slate-500 focus:border-cyan-500/50 focus:outline-none transition-colors"
            />
            {showAutocomplete && suggestions.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-1 glass-strong rounded-lg border border-white/10 overflow-hidden z-20 animate-scale-in">
                {suggestions.map((s, i) => (
                  <button
                    key={i}
                    onClick={() => { setFilters(f => ({ ...f, search: s! })); setShowAutocomplete(false) }}
                    className="w-full text-left px-4 py-2 text-xs text-slate-300 hover:bg-white/5 transition-colors flex items-center gap-2"
                  >
                    <span className="material-symbols-outlined text-sm text-slate-500">search</span>
                    {s}
                  </button>
                ))}
              </div>
            )}
          </div>
          <select
            value={filters.sort}
            onChange={e => setFilters(f => ({ ...f, sort: e.target.value }))}
            className="bg-black/30 border border-white/10 rounded-lg px-4 py-3 text-sm text-slate-300 focus:border-cyan-500/50 focus:outline-none"
          >
            <option value="reputation">Sort: Reputation</option>
            <option value="price">Sort: Price (low → high)</option>
            <option value="uptime">Sort: Uptime</option>
            <option value="vram">Sort: VRAM</option>
          </select>
        </div>
        <div className="flex flex-wrap gap-2 mt-4">
          {GPU_FILTERS.map(g => (
            <button key={g} onClick={() => setFilters(f => ({ ...f, gpu: f.gpu === g ? '' : g }))}
              className={`chip ${filters.gpu === g ? 'active' : ''}`}>
              {g}
            </button>
          ))}
          <span className="w-px h-6 bg-white/10 mx-1" />
          {VRAM_FILTERS.map(v => (
            <button key={v.value} onClick={() => setFilters(f => ({ ...f, vram: f.vram === v.value ? 0 : v.value }))}
              className={`chip ${filters.vram === v.value ? 'active' : ''}`}>
              {v.label}
            </button>
          ))}
          <span className="w-px h-6 bg-white/10 mx-1" />
          <button onClick={() => setFilters(f => ({ ...f, verified: !f.verified }))}
            className={`chip ${filters.verified ? 'active' : ''}`}>
            <span className="material-symbols-outlined text-xs">verified</span> Verified only
          </button>
        </div>
      </div>

      {/* Templates */}
      <div className="mb-8">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500 mb-3">Quick Deploy Templates</h2>
        <div className="flex flex-wrap gap-3">
          {templates.length === 0 ? (
            <span className="text-xs text-slate-600">No templates available</span>
          ) : (
            templates.map(t => (
              <button key={t.template_id} onClick={() => openDeploy(undefined, t)}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold border border-white/8 bg-white/[0.03] text-slate-300 hover:border-cyan-500/30 hover:bg-cyan-500/5 transition-all">
                <span className="material-symbols-outlined text-sm text-cyan-400">bolt</span>
                {t.name}
                <span className="text-[10px] text-slate-500">{t.base_tokens} tokens</span>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Recommended Section */}
      {recommended.length > 0 && !filters.search && !filters.gpu && filters.vram === 0 && (
        <div className="mb-8">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500 mb-3 flex items-center gap-2">
            <span className="material-symbols-outlined text-sm text-amber-400">recommend</span>
            Recommended for You
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {recommended.map(p => (
              <div key={`rec-${p.id}`} className="glass rounded-xl p-4 card-hover-lift group border border-transparent hover:border-amber-500/20">
                <div className="flex items-center gap-3 mb-2">
                  <span className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
                    <span className="material-symbols-outlined text-amber-400">{gpuIcon(p.gpu_model)}</span>
                  </span>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-bold truncate">{p.name || p.id}</h3>
                    <p className="text-[10px] text-slate-500">{p.gpu_model} · {p.vram_gb}GB</p>
                  </div>
                  <StatusDot status={p.status} />
                </div>
                <div className="flex items-center justify-between mt-3 pt-2 border-t border-white/5">
                  <span className="text-xs text-slate-400">{p.price_per_hour?.toFixed(2)} A/hr</span>
                  <button onClick={() => openDeploy(p)}
                    className="px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-bold hover:bg-amber-500/20 transition-all flex items-center gap-1">
                    <span className="material-symbols-outlined text-xs">rocket_launch</span>
                    Deploy
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Provider Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
        {dataLoading ? (
          Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)
        ) : filtered.length === 0 ? (
          <div className="glass rounded-xl p-8 text-center text-slate-500 col-span-full">No GPUs match your filters. Try adjusting search criteria.</div>
        ) : (
          filtered.map(p => {
            const reputation = Math.round(p.trust?.reputation_score || (p.verified_member ? 80 : 50))
            return (
              <div key={p.id} className="glass rounded-xl p-5 card-hover-lift group border border-transparent hover:border-cyan-500/20">
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <span className="w-12 h-12 rounded-xl bg-cyan-500/10 flex items-center justify-center group-hover:bg-cyan-500/20 transition-colors">
                      <span className="material-symbols-outlined text-cyan-400 text-xl">{gpuIcon(p.gpu_model)}</span>
                    </span>
                    <div>
                      <h3 className="text-base font-bold">{p.name || p.id}</h3>
                      <p className="text-[10px] text-slate-500 font-mono">{p.id?.slice(0, 16)}...</p>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1.5">
                    {p.verified_member && (
                      <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        <span className="material-symbols-outlined text-[10px]">verified</span> Verified
                      </span>
                    )}
                    <StatusDot status={p.status} />
                  </div>
                </div>

                {/* Specs */}
                <div className="grid grid-cols-3 gap-2 mb-4">
                  <div className="text-center p-2 rounded-lg bg-white/[0.03]">
                    <p className="text-[10px] text-slate-500 uppercase tracking-wider">GPU</p>
                    <p className="text-sm font-bold text-slate-200">{p.gpu_model || '—'}</p>
                  </div>
                  <div className="text-center p-2 rounded-lg bg-white/[0.03]">
                    <p className="text-[10px] text-slate-500 uppercase tracking-wider">VRAM</p>
                    <p className="text-sm font-bold text-cyan-400">{p.vram_gb || 0}GB</p>
                  </div>
                  <div className="text-center p-2 rounded-lg bg-white/[0.03]">
                    <p className="text-[10px] text-slate-500 uppercase tracking-wider">Count</p>
                    <p className="text-sm font-bold text-violet-400">×{p.gpu_count || 1}</p>
                  </div>
                </div>

                {/* Details */}
                <div className="space-y-2 mb-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Region</span>
                    <span className="text-slate-300">{p.region || 'Global'}</span>
                  </div>
                  <div className="flex justify-between text-sm items-center">
                    <span className="text-slate-500">Uptime</span>
                    <UptimeBadge uptime={p.uptime} />
                  </div>
                  <div className="flex justify-between text-sm items-center">
                    <span className="text-slate-500">Reputation</span>
                    <div className="flex items-center gap-1.5">
                      <StarRating score={reputation} />
                      <span className="text-cyan-400 font-mono text-xs">{reputation}/100</span>
                    </div>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Latency</span>
                    <span className="text-slate-300 font-mono text-xs">{mockLatency(p.id)}ms</span>
                  </div>
                </div>

                {/* Price + CTA */}
                <div className="flex items-center justify-between pt-4 border-t border-white/5">
                  <div>
                    <p className="text-xs text-slate-500">Price / hour</p>
                    <p className="text-lg font-bold text-cyan-400">{p.price_per_hour?.toFixed(2) || '—'} A</p>
                  </div>
                  <button onClick={() => openDeploy(p)}
                    className="px-4 py-2 rounded-lg bg-cyan-500 text-slate-950 text-sm font-bold hover:brightness-110 transition-all flex items-center gap-1.5 group/deploy">
                    <span className={`material-symbols-outlined text-sm ${rocketAnim && deployProvider?.id === p.id ? 'animate-rocket' : ''}`}>rocket_launch</span>
                    Deploy
                  </button>
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* Deploy Modal */}
      {(deployProvider || deployTemplate) && (
        <div className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4" onClick={e => { if (e.target === e.currentTarget) { setDeployProvider(null); setDeployTemplate(null) } }}>
          <div className="glass rounded-2xl p-8 w-full max-w-lg relative animate-scale-in border border-white/10">
            <button onClick={() => { setDeployProvider(null); setDeployTemplate(null) }} className="absolute top-4 right-4 text-slate-500 hover:text-white transition-colors">
              <span className="material-symbols-outlined">close</span>
            </button>
            <h2 className="text-xl font-bold mb-1">
              {deployTemplate ? deployTemplate.name : `Deploy to ${deployProvider?.name || deployProvider?.id}`}
            </h2>
            <p className="text-sm text-slate-400 mb-6">
              {deployTemplate ? (deployTemplate.description || 'Deploy this template') : `${deployProvider?.gpu_model || 'GPU'} · ${deployProvider?.vram_gb || '?'}GB VRAM`}
            </p>
            <form onSubmit={handleDeploy} className="space-y-4">
              <div>
                <label className="text-xs uppercase tracking-wider text-slate-500 mb-1 block">Job Type</label>
                <select value={deployJobType} onChange={e => setDeployJobType(e.target.value)}
                  className="w-full bg-black/30 border border-white/10 rounded-lg px-4 py-3 text-sm text-slate-300 focus:border-cyan-500/50 focus:outline-none">
                  <option value="inference">Inference</option>
                  <option value="training">Training</option>
                  <option value="fine_tune">Fine-Tune LLM</option>
                  <option value="rendering">3D Rendering</option>
                  <option value="data">Data Pipeline</option>
                </select>
              </div>
              <div>
                <label className="text-xs uppercase tracking-wider text-slate-500 mb-1 block">Tokens</label>
                <input type="number" min={100} value={deployTokens} onChange={e => setDeployTokens(parseInt(e.target.value) || 1000)}
                  className="w-full bg-black/30 border border-white/10 rounded-lg px-4 py-3 text-sm text-slate-300 focus:border-cyan-500/50 focus:outline-none" />
              </div>
              <div className="glass rounded-lg p-4 text-sm">
                <div className="flex justify-between mb-1">
                  <span className="text-slate-400">Provider</span>
                  <span className="font-semibold">{deployProvider?.name || deployProvider?.id || 'Best available'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Est. Cost</span>
                  <span className="font-semibold text-cyan-400">
                    ~{estCost(deployProvider?.price_per_hour || 1.0, deployTokens)} ALGO
                  </span>
                </div>
              </div>
              <button type="submit" disabled={loading}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-cyan-600 text-slate-950 font-bold hover:brightness-110 transition-all flex items-center justify-center gap-2 disabled:opacity-50">
                <span className={`material-symbols-outlined text-lg ${rocketAnim ? 'animate-rocket' : ''}`}>rocket_launch</span>
                {loading ? 'Deploying...' : 'Deploy Now'}
              </button>
            </form>
            {deployResult && (
              <div className={`mt-4 p-4 rounded-lg text-sm animate-fade-in ${deployResult.status === 'success' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'}`}>
                <p className="font-semibold flex items-center gap-1">
                  <span className="material-symbols-outlined text-sm">{deployResult.status === 'success' ? 'check_circle' : 'error'}</span>
                  {deployResult.msg}
                </p>
                {deployResult.id && <p className="text-xs mt-1">ID: <span className="font-mono">{deployResult.id}</span></p>}
                {deployResult.tx_id && <p className="text-xs mt-1">Tx: <span className="font-mono">{deployResult.tx_id.slice(0, 20)}...</span></p>}
                {deployResult.explorer_url && (
                  <a href={deployResult.explorer_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 mt-2 text-xs text-cyan-400 hover:text-cyan-200 transition-colors">
                    <span className="material-symbols-outlined text-xs">open_in_new</span> View on-chain proof
                  </a>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
