import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { fetchJson, type Provider, type Template } from '../lib/api'
import ProviderCard from '../components/ProviderCard'

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
  const [deployResult, setDeployResult] = useState<{msg: string; status: 'success' | 'error'; id?: string} | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    fetchJson('/hub/explore').then(d => setProviders(d.providers || [])).catch(() =>
      fetchJson('/providers').then(d => setProviders(Array.isArray(d) ? d : []))
    )
    fetchJson('/hub/templates').then(d => setTemplates(d.templates || [])).catch(() => setTemplates([]))
  }, [])

  const filtered = providers.filter(p => {
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
      const isError = result.status === 'failed'
      setDeployResult({ msg: isError ? 'Job failed' : 'Job deployed!', status: isError ? 'error' : 'success', id: result.deployment_id || result.job_id })
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

  return (
    <div className="max-w-7xl mx-auto px-6 py-8">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Explore GPUs</h1>
          <p className="text-slate-500 text-sm mt-1">Search, compare, and deploy GPU compute instantly</p>
        </div>
        <div className="flex items-center gap-3 text-sm">
          <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
          <span className="text-slate-500 font-mono text-xs">{providers.length} providers online</span>
        </div>
      </div>

      {/* Search + Filters */}
      <div className="glass rounded-xl p-5 mb-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">search</span>
            <input
              type="text"
              value={filters.search}
              onChange={e => setFilters(f => ({ ...f, search: e.target.value }))}
              placeholder="Search by GPU model, provider name, org..."
              className="w-full bg-black/30 border border-white/10 rounded-lg pl-10 pr-4 py-3 text-sm placeholder:text-slate-500 focus:border-cyan-500/50 focus:outline-none transition-colors"
            />
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
          {['H100', 'RTX 4090', 'A100', 'RTX 3090'].map(g => (
            <button key={g} onClick={() => setFilters(f => ({ ...f, gpu: f.gpu === g ? '' : g }))}
              className={`chip ${filters.gpu === g ? 'active' : ''}`}>
              {g}
            </button>
          ))}
          <span className="w-px h-6 bg-white/10 mx-1" />
          {[8, 24, 48].map(v => (
            <button key={v} onClick={() => setFilters(f => ({ ...f, vram: f.vram === v ? 0 : v }))}
              className={`chip ${filters.vram === v ? 'active' : ''}`}>
              {v}GB+
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
                className="template-pill inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold border border-white/8 bg-white/[0.03] text-slate-300 hover:border-cyan-500/30 hover:bg-cyan-500/5 transition-all">
                <span className="material-symbols-outlined text-sm text-cyan-400">bolt</span>
                {t.name}
                <span className="text-[10px] text-slate-500">{t.base_tokens} tokens</span>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
        {filtered.length === 0 ? (
          <div className="glass rounded-xl p-8 text-center text-slate-500 col-span-full">No GPUs match your filters. Try adjusting search criteria.</div>
        ) : (
          filtered.map(p => <ProviderCard key={p.id} provider={p} onDeploy={() => openDeploy(p)} />)
        )}
      </div>

      {/* Deploy Modal */}
      {(deployProvider || deployTemplate) && (
        <div className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4" onClick={e => { if (e.target === e.currentTarget) { setDeployProvider(null); setDeployTemplate(null) } }}>
          <div className="glass rounded-2xl p-8 w-full max-w-lg relative">
            <button onClick={() => { setDeployProvider(null); setDeployTemplate(null) }} className="absolute top-4 right-4 text-slate-500 hover:text-white">
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
                <span className="material-symbols-outlined text-lg">rocket_launch</span>
                {loading ? 'Deploying...' : 'Deploy Now'}
              </button>
            </form>
            {deployResult && (
              <div className={`mt-4 p-4 rounded-lg text-sm ${deployResult.status === 'success' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'}`}>
                <p className="font-semibold flex items-center gap-1">
                  <span className="material-symbols-outlined text-sm">{deployResult.status === 'success' ? 'check_circle' : 'error'}</span>
                  {deployResult.msg}
                </p>
                {deployResult.id && <p className="text-xs mt-1">ID: <span className="font-mono">{deployResult.id}</span></p>}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
