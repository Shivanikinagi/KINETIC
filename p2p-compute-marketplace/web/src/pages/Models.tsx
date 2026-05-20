import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { fetchJson } from '../lib/api'

interface Model {
  id: string
  name: string
  description: string
  tags: string[]
  readme: string
  owner: string
  likes: number
  forks: number
  downloads: number
  license: string
  compute_req: string
  created_at: number
}

export default function Models() {
  const [models, setModels] = useState<Model[]>([])
  const [search, setSearch] = useState('')
  const [showUpload, setShowUpload] = useState(false)
  const [uploadForm, setUploadForm] = useState({ name: '', description: '', tags: '', readme: '', license: 'MIT', compute_req: '' })
  const [selectedModel, setSelectedModel] = useState<Model | null>(null)

  useEffect(() => { loadModels() }, [])

  const loadModels = async () => {
    const data = await fetchJson('/models').catch(() => ({ models: [] }))
    setModels(data.models || [])
    if ((data.models || []).length === 0) seedDemoModels()
  }

  const seedDemoModels = async () => {
    const demos = [
      { name: 'Llama-3-8B-Instruct', description: 'Meta Llama 3 8B instruction-tuned model for chat and completion.', tags: ['llm', 'chat', 'meta'], readme: '# Llama 3 8B\n\nState-of-the-art open LLM.', license: 'LLAMA3', compute_req: '1× A100 80GB' },
      { name: 'Stable-Diffusion-XL', description: 'High-resolution image generation model.', tags: ['image', 'diffusion', 'sdxl'], readme: '# SDXL\n\n1024×1024 image generation.', license: 'OpenRAIL-M', compute_req: '1× RTX 4090 24GB' },
      { name: 'YOLOv8', description: 'Real-time object detection model.', tags: ['cv', 'detection', 'yolo'], readme: '# YOLOv8\n\nFast and accurate object detection.', license: 'AGPL-3.0', compute_req: '1× RTX 3090 24GB' },
      { name: 'Whisper-Large-v3', description: 'OpenAI Whisper speech-to-text model.', tags: ['audio', 'asr', 'openai'], readme: '# Whisper v3\n\nMultilingual speech recognition.', license: 'MIT', compute_req: '1× A100 40GB' },
      { name: 'Mistral-7B-Instruct', description: 'Mistral AI 7B instruction model.', tags: ['llm', 'chat', 'mistral'], readme: '# Mistral 7B\n\nEfficient and powerful LLM.', license: 'Apache-2.0', compute_req: '1× RTX 4090 24GB' },
    ]
    for (const m of demos) {
      await fetchJson('/models', { method: 'POST', body: JSON.stringify(m) }).catch(() => {})
    }
    const data = await fetchJson('/models').catch(() => ({ models: [] }))
    setModels(data.models || [])
  }

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault()
    await fetchJson('/models', {
      method: 'POST',
      body: JSON.stringify({
        ...uploadForm,
        tags: uploadForm.tags.split(',').map(t => t.trim()).filter(Boolean),
      })
    })
    setShowUpload(false)
    setUploadForm({ name: '', description: '', tags: '', readme: '', license: 'MIT', compute_req: '' })
    loadModels()
  }

  const filtered = models.filter(m =>
    m.name.toLowerCase().includes(search.toLowerCase()) ||
    m.description.toLowerCase().includes(search.toLowerCase()) ||
    m.tags.some(t => t.toLowerCase().includes(search.toLowerCase()))
  )

  const allTags = Array.from(new Set(models.flatMap(m => m.tags)))

  return (
    <div className="max-w-7xl mx-auto px-6 py-8">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Model Hub</h1>
          <p className="text-slate-500 text-sm mt-1">Discover, share, and deploy AI models on decentralized compute</p>
        </div>
        <button onClick={() => setShowUpload(true)}
          className="px-5 py-2.5 rounded-lg bg-cyan-500 text-slate-950 font-bold text-sm hover:brightness-110 transition-all flex items-center gap-2">
          <span className="material-symbols-outlined text-sm">cloud_upload</span> Upload Model
        </button>
      </div>

      {/* Search + Tags */}
      <div className="glass rounded-xl p-5 mb-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">search</span>
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search models by name, tag, or description..."
              className="w-full bg-black/30 border border-white/10 rounded-lg pl-10 pr-4 py-3 text-sm placeholder:text-slate-500 focus:border-cyan-500/50 focus:outline-none" />
          </div>
        </div>
        <div className="flex flex-wrap gap-2 mt-4">
          {allTags.slice(0, 12).map(tag => (
            <button key={tag} onClick={() => setSearch(tag)}
              className="chip">{tag}</button>
          ))}
        </div>
      </div>

      {/* Model Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
        {filtered.map(m => (
          <div key={m.id} className="glass rounded-xl p-5 card-hover cursor-pointer" onClick={() => setSelectedModel(m)}>
            <div className="flex items-start justify-between mb-3">
              <div>
                <h3 className="text-base font-bold">{m.name}</h3>
                <p className="text-[10px] text-slate-500 font-mono">{m.owner}</p>
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-slate-400">{m.license}</span>
            </div>
            <p className="text-sm text-slate-400 mb-3 line-clamp-2">{m.description}</p>
            <div className="flex flex-wrap gap-1.5 mb-4">
              {m.tags.map(t => (
                <span key={t} className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">{t}</span>
              ))}
            </div>
            <div className="flex items-center justify-between text-xs text-slate-500 pt-3 border-t border-white/5">
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1"><span className="material-symbols-outlined text-xs">favorite</span> {m.likes}</span>
                <span className="flex items-center gap-1"><span className="material-symbols-outlined text-xs">fork_right</span> {m.forks}</span>
                <span className="flex items-center gap-1"><span className="material-symbols-outlined text-xs">download</span> {m.downloads}</span>
              </div>
              {m.compute_req && <span className="text-[10px] text-amber-400">{m.compute_req}</span>}
            </div>
          </div>
        ))}
      </div>

      {/* Upload Modal */}
      {showUpload && (
        <div className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={e => { if (e.target === e.currentTarget) setShowUpload(false) }}>
          <div className="glass rounded-2xl p-8 w-full max-w-lg">
            <h2 className="text-xl font-bold mb-4">Upload Model</h2>
            <form onSubmit={handleUpload} className="space-y-4">
              <input required placeholder="Model name" value={uploadForm.name}
                onChange={e => setUploadForm(f => ({ ...f, name: e.target.value }))}
                className="w-full bg-black/30 border border-white/10 rounded-lg px-4 py-3 text-sm focus:border-cyan-500/50 outline-none" />
              <textarea placeholder="Description" rows={2} value={uploadForm.description}
                onChange={e => setUploadForm(f => ({ ...f, description: e.target.value }))}
                className="w-full bg-black/30 border border-white/10 rounded-lg px-4 py-3 text-sm focus:border-cyan-500/50 outline-none" />
              <input placeholder="Tags (comma separated)" value={uploadForm.tags}
                onChange={e => setUploadForm(f => ({ ...f, tags: e.target.value }))}
                className="w-full bg-black/30 border border-white/10 rounded-lg px-4 py-3 text-sm focus:border-cyan-500/50 outline-none" />
              <input placeholder="License" value={uploadForm.license}
                onChange={e => setUploadForm(f => ({ ...f, license: e.target.value }))}
                className="w-full bg-black/30 border border-white/10 rounded-lg px-4 py-3 text-sm focus:border-cyan-500/50 outline-none" />
              <input placeholder="Compute requirements (e.g. 1× A100 80GB)" value={uploadForm.compute_req}
                onChange={e => setUploadForm(f => ({ ...f, compute_req: e.target.value }))}
                className="w-full bg-black/30 border border-white/10 rounded-lg px-4 py-3 text-sm focus:border-cyan-500/50 outline-none" />
              <button type="submit" className="w-full py-3 rounded-xl bg-cyan-500 text-slate-950 font-bold hover:brightness-110 transition-all">
                Upload
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {selectedModel && (
        <div className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={e => { if (e.target === e.currentTarget) setSelectedModel(null) }}>
          <div className="glass rounded-2xl p-8 w-full max-w-2xl max-h-[80vh] overflow-y-auto">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h2 className="text-2xl font-bold">{selectedModel.name}</h2>
                <p className="text-sm text-slate-500">by {selectedModel.owner} · {selectedModel.license}</p>
              </div>
              <button onClick={() => setSelectedModel(null)} className="text-slate-500 hover:text-white">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <p className="text-slate-300 mb-4">{selectedModel.description}</p>
            <div className="flex flex-wrap gap-2 mb-6">
              {selectedModel.tags.map(t => (
                <span key={t} className="text-xs px-3 py-1 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">{t}</span>
              ))}
            </div>
            {selectedModel.compute_req && (
              <div className="glass rounded-lg p-4 mb-6">
                <p className="text-xs uppercase tracking-wider text-slate-500 mb-1">Compute Requirements</p>
                <p className="text-sm font-semibold text-amber-400">{selectedModel.compute_req}</p>
              </div>
            )}
            <div className="flex items-center gap-4 mb-6">
              <div className="text-center">
                <p className="text-2xl font-bold text-cyan-400">{selectedModel.likes}</p>
                <p className="text-[10px] text-slate-500 uppercase tracking-wider">Likes</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-violet-400">{selectedModel.forks}</p>
                <p className="text-[10px] text-slate-500 uppercase tracking-wider">Forks</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-emerald-400">{selectedModel.downloads}</p>
                <p className="text-[10px] text-slate-500 uppercase tracking-wider">Downloads</p>
              </div>
            </div>
            <div className="flex gap-3">
              <Link to={`/submit?template=${selectedModel.tags[0] || 'inference'}`}
                className="flex-1 py-3 rounded-xl bg-cyan-500 text-slate-950 font-bold text-center hover:brightness-110 transition-all">
                Run Inference
              </Link>
              <button onClick={async () => {
                await fetchJson(`/models/${selectedModel.id}/fork`, { method: 'POST', body: JSON.stringify({ owner: 'user' }) })
                loadModels()
              }} className="flex-1 py-3 rounded-xl bg-white/5 border border-white/10 text-slate-300 font-bold hover:bg-white/10 transition-all">
                Fork Model
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
