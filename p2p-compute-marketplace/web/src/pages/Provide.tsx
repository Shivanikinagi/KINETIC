import { useEffect, useState } from 'react'
import { fetchJson } from '../lib/api'

export default function Provide() {
  const [form, setForm] = useState({
    gpuModel: '', vramGb: 24, gpuCount: 1, priceHour: 1.5,
    endpoint: '', orgName: '', mnemonic: '',
  })
  const [result, setResult] = useState<{msg: string; status: 'success' | 'error'; details?: Record<string, unknown>} | null>(null)
  const [loading, setLoading] = useState(false)
  const [stats, setStats] = useState({ providers: 0, avgPrice: '0.00', totalJobs: 0, earnings: '0.00' })

  useEffect(() => {
    loadStats()
  }, [])

  const loadStats = async () => {
    try {
      const [providers, jobs] = await Promise.all([
        fetchJson('/providers').catch(() => []),
        fetchJson('/jobs?limit=100').catch(() => []),
      ])
      const list = Array.isArray(providers) ? providers : []
      const jobList = Array.isArray(jobs) ? jobs : []
      const completed = jobList.filter((j: any) => j.status === 'completed')
      const earned = completed.reduce((s: number, j: any) => s + ((j.amount_microalgo || 0) / 1_000_000), 0)
      setStats({
        providers: list.length,
        avgPrice: list.length > 0 ? (list.reduce((s: number, p: any) => s + (p.price_per_hour || 0), 0) / list.length).toFixed(2) : '0.00',
        totalJobs: jobList.length,
        earnings: earned.toFixed(2),
      })
    } catch (e) {}
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setResult(null)
    try {
      const payload = {
        gpu_model: form.gpuModel.trim(),
        vram_gb: form.vramGb,
        price_per_hour: form.priceHour,
        endpoint: form.endpoint.trim(),
        org_name: form.orgName.trim(),
        gpu_count: form.gpuCount,
        provider_mnemonic: form.mnemonic.trim(),
      }
      const res = await fetchJson('/provider/register', { method: 'POST', body: JSON.stringify(payload) })
      setResult({ msg: 'Provider registered!', status: 'success', details: res })
      loadStats()
    } catch (err: any) {
      setResult({ msg: err.message || 'Registration failed', status: 'error' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-7xl mx-auto px-6 py-8">
      <section className="glass rounded-2xl p-8 md:p-12 text-center mb-10">
        <h1 className="text-3xl md:text-4xl font-black tracking-tight mb-3">Have idle GPUs?</h1>
        <p className="text-slate-400 max-w-lg mx-auto text-sm">Register your hardware and start earning ALGO. Set your own price, get paid per job, instant settlement.</p>
        <div className="flex flex-wrap justify-center gap-6 mt-8">
          {['Register', 'List GPU', 'Earn'].map((s, i) => (
            <div key={s} className="text-center">
              <p className="text-2xl font-bold text-cyan-400">{i + 1}</p>
              <p className="text-[10px] uppercase tracking-widest text-slate-500 mt-1">{s}</p>
            </div>
          ))}
        </div>
      </section>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="glass rounded-xl p-5 text-center">
          <p className="text-[10px] font-mono uppercase tracking-widest text-slate-500 mb-1">Total Jobs</p>
          <p className="text-2xl font-bold text-cyan-400">{stats.totalJobs}</p>
        </div>
        <div className="glass rounded-xl p-5 text-center">
          <p className="text-[10px] font-mono uppercase tracking-widest text-slate-500 mb-1">Earnings</p>
          <p className="text-2xl font-bold text-emerald-400">{stats.earnings} A</p>
        </div>
        <div className="glass rounded-xl p-5 text-center">
          <p className="text-[10px] font-mono uppercase tracking-widest text-slate-500 mb-1">Providers</p>
          <p className="text-2xl font-bold text-violet-400">{stats.providers}</p>
        </div>
        <div className="glass rounded-xl p-5 text-center">
          <p className="text-[10px] font-mono uppercase tracking-widest text-slate-500 mb-1">Avg Price</p>
          <p className="text-2xl font-bold text-amber-400">{stats.avgPrice} A</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <section className="glass rounded-xl p-6">
          <h2 className="text-xl font-bold mb-1">Register Provider</h2>
          <p className="text-slate-500 text-xs mb-6">List your compute on-chain</p>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1">GPU Model</label>
              <input required value={form.gpuModel} onChange={e => setForm(f => ({ ...f, gpuModel: e.target.value }))}
                placeholder="e.g. RTX 4090" className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-sm focus:border-cyan-500/50 outline-none" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1">VRAM (GB)</label>
                <input type="number" required min={1} value={form.vramGb} onChange={e => setForm(f => ({ ...f, vramGb: parseInt(e.target.value) }))}
                  className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-sm focus:border-cyan-500/50 outline-none" />
              </div>
              <div>
                <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1">GPU Count</label>
                <input type="number" required min={1} value={form.gpuCount} onChange={e => setForm(f => ({ ...f, gpuCount: parseInt(e.target.value) }))}
                  className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-sm focus:border-cyan-500/50 outline-none" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1">Price / hour (ALGO)</label>
                <input type="number" required step={0.01} min={0.01} value={form.priceHour} onChange={e => setForm(f => ({ ...f, priceHour: parseFloat(e.target.value) }))}
                  className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-sm focus:border-cyan-500/50 outline-none" />
              </div>
              <div>
                <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1">Endpoint URL</label>
                <input type="url" required value={form.endpoint} onChange={e => setForm(f => ({ ...f, endpoint: e.target.value }))}
                  placeholder="https://provider.example.com" className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-sm focus:border-cyan-500/50 outline-none" />
              </div>
            </div>
            <div>
              <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1">Organization Name</label>
              <input value={form.orgName} onChange={e => setForm(f => ({ ...f, orgName: e.target.value }))}
                placeholder="Optional: My GPU Farm" className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-sm focus:border-cyan-500/50 outline-none" />
            </div>
            <div>
              <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1">Provider Mnemonic (exactly 25 words)</label>
              <textarea rows={3} value={form.mnemonic} onChange={e => setForm(f => ({ ...f, mnemonic: e.target.value }))}
                placeholder="Optional — must be exactly 25 words for on-chain registration" className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-sm focus:border-cyan-500/50 outline-none" />
              <p className="text-[10px] text-slate-500 mt-1">
                {form.mnemonic.trim() ? (
                  <span className={form.mnemonic.trim().split(/\s+/).length === 25 ? 'text-emerald-400' : 'text-amber-400'}>
                    {form.mnemonic.trim().split(/\s+/).length} words — {form.mnemonic.trim().split(/\s+/).length === 25 ? 'valid for on-chain' : 'must be exactly 25 words'}
                  </span>
                ) : (
                  'Optional. Add a 25-word Algorand mnemonic to register on-chain.'
                )}
              </p>
            </div>
            <button type="submit" disabled={loading}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-cyan-600 text-slate-950 font-bold hover:brightness-110 transition-all flex items-center justify-center gap-2 disabled:opacity-50">
              <span className="material-symbols-outlined text-lg">cloud_upload</span>
              {loading ? 'Registering...' : 'Register on-chain'}
            </button>
          </form>
          {result && (
            <div className={`mt-4 p-4 rounded-lg text-sm ${result.status === 'success' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'}`}>
              <p className="font-semibold flex items-center gap-1">
                <span className="material-symbols-outlined text-sm">{result.status === 'success' ? 'check_circle' : 'error'}</span>
                {result.msg}
              </p>
              {result.details && (
                <div className="mt-2 text-xs space-y-1">
                  <p>ID: <span className="font-mono">{String((result.details as any).provider_id || (result.details as any).provider_address || 'local')}</span></p>
                  <p>Status: <span className="text-emerald-400">{(() => {
                    const s = String((result.details as any).on_chain_status || 'local')
                    if (s === 'success') return 'Registered on-chain'
                    if (s === 'local_fallback') return 'Registered locally (on-chain failed, but you are listed)'
                    return 'Registered locally (add a 25-word mnemonic to register on-chain)'
                  })()}</span></p>
                  {(result.details as any).explorer_url && (
                    <a href={String((result.details as any).explorer_url)} target="_blank" rel="noreferrer" className="text-cyan-400 underline inline-flex items-center gap-1">
                      <span className="material-symbols-outlined text-xs">open_in_new</span> View on Explorer
                    </a>
                  )}
                </div>
              )}
            </div>
          )}
        </section>

        <section className="space-y-6">
          <div className="glass rounded-xl p-6">
            <h2 className="text-xl font-bold mb-4">Network Overview</h2>
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-4 rounded-lg bg-white/[0.03]">
                <p className="text-[10px] uppercase tracking-widest text-slate-500 mb-1">Total Providers</p>
                <p className="text-2xl font-bold text-cyan-400">{stats.providers}</p>
              </div>
              <div className="text-center p-4 rounded-lg bg-white/[0.03]">
                <p className="text-[10px] uppercase tracking-widest text-slate-500 mb-1">Avg Price</p>
                <p className="text-2xl font-bold text-emerald-400">{stats.avgPrice} A</p>
              </div>
            </div>
          </div>
          <div className="glass rounded-xl p-6">
            <h2 className="text-xl font-bold mb-2">Need Help?</h2>
            <p className="text-slate-500 text-sm mb-4">Run the provider node software to start accepting jobs.</p>
            <a href="https://github.com/Shivanikinagi/KINETIC/blob/main/docs/PROVIDER_GUIDE.md" target="_blank" rel="noreferrer"
              className="inline-flex items-center gap-2 text-cyan-400 text-sm font-semibold hover:text-cyan-200 transition-colors">
              <span className="material-symbols-outlined text-sm">open_in_new</span>
              Provider Setup Guide
            </a>
          </div>
        </section>
      </div>
    </div>
  )
}
