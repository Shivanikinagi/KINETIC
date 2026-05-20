import { useEffect, useState } from 'react'
import { fetchJson } from '../lib/api'

interface Space {
  id: string
  name: string
  description: string
  space_type: string
  owner: string
  url: string
  status: string
  likes: number
  compute_tokens: number
  created_at: number
}

export default function Spaces() {
  const [spaces, setSpaces] = useState<Space[]>([])
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [createForm, setCreateForm] = useState({ name: '', description: '', space_type: 'demo', url: '' })

  useEffect(() => { loadSpaces() }, [])

  const loadSpaces = async () => {
    const data = await fetchJson('/spaces').catch(() => ({ spaces: [] }))
    setSpaces(data.spaces || [])
    if ((data.spaces || []).length === 0) seedDemoSpaces()
  }

  const seedDemoSpaces = async () => {
    const demos = [
      { name: 'Chat with Llama 3', description: 'Interactive chat demo with Llama 3 8B.', space_type: 'chatbot', url: '/demo/llama3-chat', compute_tokens: 500 },
      { name: 'SDXL Image Gen', description: 'Generate images from text prompts using Stable Diffusion XL.', space_type: 'image_gen', url: '/demo/sdxl', compute_tokens: 1200 },
      { name: 'Code Copilot', description: 'AI-powered code completion and generation.', space_type: 'chatbot', url: '/demo/copilot', compute_tokens: 800 },
      { name: 'Whisper Transcribe', description: 'Upload audio and get text transcription.', space_type: 'audio', url: '/demo/whisper', compute_tokens: 600 },
      { name: 'YOLO Object Detect', description: 'Upload images and detect objects in real-time.', space_type: 'vision', url: '/demo/yolo', compute_tokens: 400 },
    ]
    for (const s of demos) {
      await fetchJson('/spaces', { method: 'POST', body: JSON.stringify(s) }).catch(() => {})
    }
    const data = await fetchJson('/spaces').catch(() => ({ spaces: [] }))
    setSpaces(data.spaces || [])
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    await fetchJson('/spaces', { method: 'POST', body: JSON.stringify(createForm) })
    setShowCreate(false)
    setCreateForm({ name: '', description: '', space_type: 'demo', url: '' })
    loadSpaces()
  }

  const filtered = spaces.filter(s => {
    const matchesSearch = s.name.toLowerCase().includes(search.toLowerCase()) || s.description.toLowerCase().includes(search.toLowerCase())
    const matchesType = !typeFilter || s.space_type === typeFilter
    return matchesSearch && matchesType
  })

  const typeIcon = (t: string) => {
    switch (t) {
      case 'chatbot': return 'chat'
      case 'image_gen': return 'image'
      case 'audio': return 'mic'
      case 'vision': return 'visibility'
      default: return 'rocket_launch'
    }
  }

  const typeColor = (t: string) => {
    switch (t) {
      case 'chatbot': return 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20'
      case 'image_gen': return 'text-violet-400 bg-violet-500/10 border-violet-500/20'
      case 'audio': return 'text-amber-400 bg-amber-500/10 border-amber-500/20'
      case 'vision': return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20'
      default: return 'text-slate-400 bg-white/5 border-white/10'
    }
  }

  return (
    <div className="max-w-7xl mx-auto px-6 py-8">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Spaces</h1>
          <p className="text-slate-500 text-sm mt-1">Deploy and share interactive AI demos and applications</p>
        </div>
        <button onClick={() => setShowCreate(true)}
          className="px-5 py-2.5 rounded-lg bg-cyan-500 text-slate-950 font-bold text-sm hover:brightness-110 transition-all flex items-center gap-2">
          <span className="material-symbols-outlined text-sm">add</span> Create Space
        </button>
      </div>

      <div className="glass rounded-xl p-5 mb-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">search</span>
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search spaces..."
              className="w-full bg-black/30 border border-white/10 rounded-lg pl-10 pr-4 py-3 text-sm placeholder:text-slate-500 focus:border-cyan-500/50 focus:outline-none" />
          </div>
          <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)}
            className="bg-black/30 border border-white/10 rounded-lg px-4 py-3 text-sm text-slate-300 focus:border-cyan-500/50 focus:outline-none">
            <option value="">All Types</option>
            <option value="chatbot">Chatbot</option>
            <option value="image_gen">Image Gen</option>
            <option value="audio">Audio</option>
            <option value="vision">Vision</option>
            <option value="demo">Demo</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
        {filtered.map(s => (
          <div key={s.id} className="glass rounded-xl p-5 card-hover">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                <span className={`w-10 h-10 rounded-xl flex items-center justify-center ${typeColor(s.space_type)}`}>
                  <span className="material-symbols-outlined text-lg">{typeIcon(s.space_type)}</span>
                </span>
                <div>
                  <h3 className="text-base font-bold">{s.name}</h3>
                  <p className="text-[10px] text-slate-500">by {s.owner}</p>
                </div>
              </div>
              <span className={`text-[10px] px-2 py-0.5 rounded-full border ${typeColor(s.space_type)}`}>
                {s.space_type}
              </span>
            </div>
            <p className="text-sm text-slate-400 mb-4 line-clamp-2">{s.description}</p>
            <div className="flex items-center justify-between text-xs text-slate-500 pt-3 border-t border-white/5">
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1"><span className="material-symbols-outlined text-xs">favorite</span> {s.likes}</span>
                <span className="flex items-center gap-1"><span className="material-symbols-outlined text-xs">token</span> {s.compute_tokens}</span>
              </div>
              <span className={`w-2 h-2 rounded-full ${s.status === 'running' ? 'bg-emerald-400' : 'bg-red-400'}`} />
            </div>
            <button className="w-full mt-4 py-2.5 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-sm font-bold hover:bg-cyan-500/20 transition-all flex items-center justify-center gap-2">
              <span className="material-symbols-outlined text-sm">open_in_new</span> Open Space
            </button>
          </div>
        ))}
      </div>

      {showCreate && (
        <div className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={e => { if (e.target === e.currentTarget) setShowCreate(false) }}>
          <div className="glass rounded-2xl p-8 w-full max-w-lg">
            <h2 className="text-xl font-bold mb-4">Create Space</h2>
            <form onSubmit={handleCreate} className="space-y-4">
              <input required placeholder="Space name" value={createForm.name}
                onChange={e => setCreateForm(f => ({ ...f, name: e.target.value }))}
                className="w-full bg-black/30 border border-white/10 rounded-lg px-4 py-3 text-sm focus:border-cyan-500/50 outline-none" />
              <textarea placeholder="Description" rows={2} value={createForm.description}
                onChange={e => setCreateForm(f => ({ ...f, description: e.target.value }))}
                className="w-full bg-black/30 border border-white/10 rounded-lg px-4 py-3 text-sm focus:border-cyan-500/50 outline-none" />
              <select value={createForm.space_type} onChange={e => setCreateForm(f => ({ ...f, space_type: e.target.value }))}
                className="w-full bg-black/30 border border-white/10 rounded-lg px-4 py-3 text-sm text-slate-300 focus:border-cyan-500/50 outline-none">
                <option value="demo">Demo</option>
                <option value="chatbot">Chatbot</option>
                <option value="image_gen">Image Gen</option>
                <option value="audio">Audio</option>
                <option value="vision">Vision</option>
              </select>
              <button type="submit" className="w-full py-3 rounded-xl bg-cyan-500 text-slate-950 font-bold hover:brightness-110 transition-all">
                Create Space
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
