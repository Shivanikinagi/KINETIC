import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { fetchJson, type Provider } from '../lib/api'

const templates = [
  { id: 'inference', name: 'Inference', icon: 'psychology', docker: 'pytorch/pytorch:2.0-cuda11.7-cudnn8-runtime', cmd: 'python inference.py --model model.pt', vram: 8 },
  { id: 'training', name: 'Training', icon: 'model_training', docker: 'pytorch/pytorch:2.0-cuda11.7-cudnn8-runtime', cmd: 'python train.py --epochs 10', vram: 24 },
  { id: 'fine_tune', name: 'Fine-Tune LLM', icon: 'tune', docker: 'huggingface/transformers-pytorch-gpu:latest', cmd: 'python finetune.py --model llama-7b', vram: 48 },
  { id: 'rendering', name: '3D Rendering', icon: 'view_in_ar', docker: 'nytimes/blender:latest', cmd: 'blender -b scene.blend -f 1', vram: 12 },
  { id: 'data', name: 'Data Pipeline', icon: 'database', docker: 'python:3.11-slim', cmd: 'python pipeline.py', vram: 8 },
  { id: 'custom', name: 'Custom', icon: 'code', docker: 'python:3.11-slim', cmd: 'python -c "import hashlib; p=\'compute\'; [p:=hashlib.sha256(p.encode()).hexdigest() for _ in range(500)]; print(p)"', vram: 8 },
]

export default function SubmitJob() {
  const [providers, setProviders] = useState<Provider[]>([])
  const [selectedTemplate, setSelectedTemplate] = useState('custom')
  const [form, setForm] = useState({
    name: '', desc: '', dockerImage: 'python:3.11-slim', command: '',
    gpuRequired: 'true', minVram: 8, cpuCores: 4, ramGb: 16,
    timeoutMin: 30, tokens: 1000,
  })
  const [result, setResult] = useState<{msg: string; status: 'success' | 'error'; id?: string; hash?: string; tx_id?: string; explorer_url?: string} | null>(null)
  const [loading, setLoading] = useState(false)
  const [modelName, setModelName] = useState<string | null>(null)

  useEffect(() => {
    fetchJson('/providers').then(d => setProviders(Array.isArray(d) ? d : [])).catch(() => {})
    
    // Read URL params for template pre-selection and model name
    const params = new URLSearchParams(window.location.search)
    const templateParam = params.get('template')
    const modelParam = params.get('model')
    
    if (templateParam) {
      applyTemplate(templateParam)
    }
    
    if (modelParam) {
      setModelName(decodeURIComponent(modelParam))
      // Pre-fill the name field with the model name
      setForm(f => ({ ...f, name: `Run ${decodeURIComponent(modelParam)}` }))
    }
  }, [])

  const applyTemplate = (id: string) => {
    setSelectedTemplate(id)
    const t = templates.find(x => x.id === id) || templates[5]
    setForm(f => ({ ...f, dockerImage: t.docker, command: t.cmd, minVram: t.vram }))
  }

  const eligible = providers.filter(p => (p.vram_gb || 0) >= form.minVram && p.status === 'active')
  const bestPrice = eligible.length > 0 ? Math.min(...eligible.map(p => p.price_per_hour || 1)) : 1
  const estCost = (bestPrice * Math.max(1 / 60, form.tokens / 3600)).toFixed(3)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setResult(null)
    try {
      const payload = {
        type: selectedTemplate,
        tokens: form.tokens,
        payload: JSON.stringify({
          name: form.name, description: form.desc, docker_image: form.dockerImage,
          command: form.command, gpu_required: form.gpuRequired === 'true',
          min_vram: form.minVram, cpu_cores: form.cpuCores, ram_gb: form.ramGb,
          timeout_min: form.timeoutMin,
        }),
      }
      const res = await fetchJson('/job', { method: 'POST', body: JSON.stringify(payload) })
      if (res.status === 'failed' || res.error) {
        throw new Error(res.error || 'Job execution failed on the backend')
      }
      setResult({ msg: 'Job deployed!', status: 'success', id: res.job_id || res.pid, hash: res.result_hash, tx_id: res.tx_id, explorer_url: res.explorer_url })
    } catch (err: any) {
      // Try to extract a clean message from the error
      let msg = err.message || 'Deploy failed'
      try {
        const parsed = JSON.parse(msg)
        if (parsed.detail) msg = String(parsed.detail)
        else if (parsed.message) msg = String(parsed.message)
      } catch { /* not JSON */ }
      setResult({ msg, status: 'error' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-7xl mx-auto px-6 py-8">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Submit Compute Job</h1>
          <p className="text-slate-500 text-sm mt-1">Configure and deploy your workload to the decentralized network</p>
          {modelName && (
            <div className="mt-2 inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-cyan-500/10 border border-cyan-500/20">
              <span className="material-symbols-outlined text-cyan-400 text-sm">model_training</span>
              <span className="text-xs text-cyan-400 font-semibold">Running: {modelName}</span>
            </div>
          )}
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
          <span>{providers.length} providers online</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          {/* Templates */}
          <div className="glass rounded-xl p-6">
            <h2 className="text-lg font-bold mb-4">Quick Start Templates</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {templates.map(t => (
                <button key={t.id} onClick={() => applyTemplate(t.id)}
                  className={`rounded-lg p-4 text-left border transition-all ${selectedTemplate === t.id ? 'border-cyan-500/40 bg-cyan-500/5' : 'border-white/5 bg-white/[0.02] hover:border-cyan-500/20'}`}>
                  <span className="material-symbols-outlined text-cyan-400 text-xl mb-2">{t.icon}</span>
                  <p className="text-sm font-semibold">{t.name}</p>
                  <p className="text-[10px] text-slate-500">{t.vram}GB VRAM</p>
                </button>
              ))}
            </div>
          </div>

          {/* Form */}
          <div className="glass rounded-xl p-6">
            <h2 className="text-lg font-bold mb-4">Job Details</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1">Job Name</label>
                  <input required value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                    placeholder="e.g. Stable Diffusion Training" className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-sm focus:border-cyan-500/50 outline-none" />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1">Job Type</label>
                  <select value={selectedTemplate} onChange={e => applyTemplate(e.target.value)}
                    className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-sm focus:border-cyan-500/50 outline-none">
                    {templates.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1">Description</label>
                <textarea value={form.desc} onChange={e => setForm(f => ({ ...f, desc: e.target.value }))} rows={2}
                  placeholder="Brief description..." className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-sm focus:border-cyan-500/50 outline-none" />
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1">GPU Required</label>
                  <select value={form.gpuRequired} onChange={e => setForm(f => ({ ...f, gpuRequired: e.target.value }))}
                    className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-sm focus:border-cyan-500/50 outline-none">
                    <option value="true">Yes</option>
                    <option value="false">No</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1">Min VRAM (GB)</label>
                  <input type="number" min={1} value={form.minVram} onChange={e => setForm(f => ({ ...f, minVram: parseInt(e.target.value) }))}
                    className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-sm focus:border-cyan-500/50 outline-none" />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1">CPU Cores</label>
                  <input type="number" min={1} value={form.cpuCores} onChange={e => setForm(f => ({ ...f, cpuCores: parseInt(e.target.value) }))}
                    className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-sm focus:border-cyan-500/50 outline-none" />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1">RAM (GB)</label>
                  <input type="number" min={1} value={form.ramGb} onChange={e => setForm(f => ({ ...f, ramGb: parseInt(e.target.value) }))}
                    className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-sm focus:border-cyan-500/50 outline-none" />
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1">Docker Image</label>
                <input value={form.dockerImage} onChange={e => setForm(f => ({ ...f, dockerImage: e.target.value }))}
                  placeholder="e.g. pytorch/pytorch:2.0-cuda11.7-cudnn8-runtime" className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-sm focus:border-cyan-500/50 outline-none" />
              </div>
              <div>
                <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1">Command</label>
                <textarea value={form.command} onChange={e => setForm(f => ({ ...f, command: e.target.value }))} rows={2}
                  placeholder="e.g. python train.py --epochs 10" className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-sm focus:border-cyan-500/50 outline-none" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1">Timeout (minutes)</label>
                  <input type="number" min={1} max={1440} value={form.timeoutMin} onChange={e => setForm(f => ({ ...f, timeoutMin: parseInt(e.target.value) }))}
                    className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-sm focus:border-cyan-500/50 outline-none" />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1">Tokens</label>
                  <input type="number" min={100} value={form.tokens} onChange={e => setForm(f => ({ ...f, tokens: parseInt(e.target.value) }))}
                    className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-sm focus:border-cyan-500/50 outline-none" />
                </div>
              </div>
              <button type="submit" disabled={loading}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-cyan-600 text-slate-950 font-bold hover:brightness-110 transition-all flex items-center justify-center gap-2 disabled:opacity-50">
                <span className="material-symbols-outlined text-lg">rocket_launch</span>
                {loading ? 'Deploying...' : 'Deploy Job'}
              </button>
            </form>
            {result && (
              <div className={`mt-4 p-4 rounded-lg text-sm ${result.status === 'success' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'}`}>
                <p className="font-semibold flex items-center gap-1">
                  <span className="material-symbols-outlined text-sm">{result.status === 'success' ? 'check_circle' : 'error'}</span>
                  {result.msg}
                </p>
                {result.id && <p className="text-xs mt-1">ID: <span className="font-mono">{result.id}</span></p>}
                {result.hash && <p className="text-xs mt-1">Hash: <span className="font-mono">{result.hash.slice(0, 20)}...</span></p>}
                {result.tx_id && <p className="text-xs mt-1">Tx: <span className="font-mono">{result.tx_id.slice(0, 20)}...</span></p>}
                {result.explorer_url && (
                  <a href={result.explorer_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 mt-2 text-xs text-cyan-400 hover:text-cyan-200">
                    <span className="material-symbols-outlined text-xs">open_in_new</span> View on-chain proof
                  </a>
                )}
                {result.status === 'success' && (
                  <Link to="/jobs" className="text-xs text-cyan-400 underline mt-2 inline-block ml-3">View in My Jobs</Link>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <div className="glass rounded-xl p-6 sticky top-24">
            <h2 className="text-lg font-bold mb-4">Cost Estimate</h2>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between"><span className="text-slate-400">Compute Rate</span><span className="font-mono">{bestPrice.toFixed(2)} A/hr</span></div>
              <div className="flex justify-between"><span className="text-slate-400">Est. Duration</span><span className="font-mono">~{Math.max(1, Math.round((form.tokens / 3600) * 60))} min</span></div>
              <div className="flex justify-between"><span className="text-slate-400">Tokens</span><span className="font-mono">{form.tokens}</span></div>
              <div className="border-t border-white/10 pt-3 flex justify-between">
                <span className="text-slate-300 font-semibold">Total Est.</span>
                <span className="font-mono font-bold text-cyan-400">~{estCost} A</span>
              </div>
            </div>
            <div className="mt-6 p-4 rounded-lg bg-emerald-500/5 border border-emerald-500/20">
              <div className="flex items-center gap-2 mb-2">
                <span className="material-symbols-outlined text-emerald-400 text-sm">shield</span>
                <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">Secure Escrow</span>
              </div>
              <p className="text-xs text-slate-400">Payment is locked in escrow and released only after verified execution.</p>
            </div>
            <div className="mt-4">
              <label className="text-xs text-slate-500 mb-1 block">Selected Provider</label>
              <div className="glass rounded-lg p-3">
                {eligible.length > 0 ? (
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold">{eligible[0].name || eligible[0].id}</p>
                      <p className="text-[10px] text-slate-500">{eligible[0].gpu_model} · {eligible[0].vram_gb}GB</p>
                    </div>
                    <p className="text-xs font-mono text-cyan-400">{eligible[0].price_per_hour?.toFixed(2)} A/hr</p>
                  </div>
                ) : <p className="text-xs text-slate-500">No providers match requirements</p>}
              </div>
            </div>
          </div>

          <div className="glass rounded-xl p-6">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500 mb-3">How it works</h2>
            <ol className="space-y-3 text-xs text-slate-400 list-decimal list-inside">
              <li>Your job is dispatched to a decentralized node via the Autonomous Agent Bridge.</li>
              <li>The node pulls the Docker image in a secure sandbox.</li>
              <li>Execution runs and live logs are streamed back.</li>
              <li>Upon completion, a cryptographic proof is generated and verified on Algorand.</li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  )
}
