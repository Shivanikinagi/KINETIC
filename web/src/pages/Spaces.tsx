import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { fetchJson } from '../lib/api'
import type { SpaceCard } from '../lib/api'

const CATEGORIES = ['All', 'Chat', 'Image', 'Audio', 'Code', 'Vision']

function SkeletonCard() {
  return (
    <div className="glass rounded-xl p-5 animate-pulse">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 bg-white/5 rounded-xl" />
          <div className="space-y-2">
            <div className="h-4 w-32 bg-white/5 rounded" />
            <div className="h-3 w-20 bg-white/5 rounded" />
          </div>
        </div>
        <div className="h-5 w-14 bg-white/5 rounded-full" />
      </div>
      <div className="h-3 w-full bg-white/5 rounded mb-2" />
      <div className="h-3 w-2/3 bg-white/5 rounded mb-4" />
      <div className="h-8 w-full bg-white/5 rounded" />
    </div>
  )
}

function Badge({ text, colorClass }: { text: string; colorClass?: string }) {
  return (
    <span className={`text-[10px] px-2 py-0.5 rounded-full border font-semibold ${colorClass || 'bg-white/5 text-slate-400 border-white/10'}`}>
      {text}
    </span>
  )
}

export default function Spaces() {
  const navigate = useNavigate()
  const [spaces, setSpaces] = useState<SpaceCard[]>([])
  const [search, setSearch] = useState('')
  const [activeCategory, setActiveCategory] = useState('All')
  const [showCreate, setShowCreate] = useState(false)
  const [showDeploy, setShowDeploy] = useState(false)
  const [createForm, setCreateForm] = useState({ name: '', description: '', space_type: 'demo', url: '', framework: 'gradio' as const, category: 'Chat' })
  const [loading, setLoading] = useState(true)

  useEffect(() => { loadSpaces() }, [])

  const loadSpaces = async () => {
    setLoading(true)
    let data = await fetchJson('/spaces').catch(() => ({ spaces: [] }))
    let valid = (data.spaces || []).filter((s: SpaceCard) => !s.url?.startsWith('/submit?template='))

    if (valid.length === 0) {
      await seedDemoSpaces()
      data = await fetchJson('/spaces').catch(() => ({ spaces: [] }))
      valid = (data.spaces || []).filter((s: SpaceCard) => !s.url?.startsWith('/submit?template='))
    }

    const byName = new Map<string, SpaceCard>()
    for (const s of valid) {
      const existing = byName.get(s.name)
      if (!existing || (s.created_at || 0) > (existing.created_at || 0)) {
        byName.set(s.name, enrichSpace(s))
      }
    }
    setSpaces(Array.from(byName.values()))
    setLoading(false)
  }

  const enrichSpace = (s: any): SpaceCard => {
    const type = s.space_type || 'demo'
    let framework: 'gradio' | 'streamlit' | 'docker' | 'static' = 'gradio'
    if (type === 'code' || type === 'nlp') framework = 'streamlit'
    if (type === 'vision') framework = 'docker'
    if (type === 'demo') framework = 'static'

    let category = 'Chat'
    if (type === 'image_gen') category = 'Image'
    else if (type === 'audio' || type === 'tts') category = 'Audio'
    else if (type === 'code') category = 'Code'
    else if (type === 'vision') category = 'Vision'
    else if (type === 'nlp' || type === 'chatbot') category = 'Chat'

    return {
      ...s,
      framework,
      category,
      status: s.status || 'running',
      share_url: `${window.location.origin}${s.url || '/spaces/' + (s.name || '').toLowerCase().replace(/\s+/g, '-')}`,
      embed_code: `<iframe src="${window.location.origin}${s.url}" width="100%" height="600" frameborder="0"></iframe>`,
    }
  }

  const seedDemoSpaces = async () => {
    const demos = [
      { name: 'Chat with Llama 3', description: 'Interactive chat demo with Llama 3 8B.', space_type: 'chatbot', url: '/spaces/chat', compute_tokens: 500, framework: 'gradio', category: 'Chat' },
      { name: 'SDXL Image Gen', description: 'Generate abstract art from text prompts.', space_type: 'image_gen', url: '/spaces/image-gen', compute_tokens: 1200, framework: 'gradio', category: 'Image' },
      { name: 'Code Copilot', description: 'AI-powered code generation in multiple languages.', space_type: 'code', url: '/spaces/code', compute_tokens: 1000, framework: 'streamlit', category: 'Code' },
      { name: 'Whisper Transcribe', description: 'Submit text for transcription and analysis.', space_type: 'audio', url: '/spaces/audio', compute_tokens: 600, framework: 'gradio', category: 'Audio' },
      { name: 'YOLO Object Detect', description: 'Detect objects in images via compute jobs.', space_type: 'vision', url: '/spaces/vision', compute_tokens: 400, framework: 'docker', category: 'Vision' },
      { name: 'Text Summarizer', description: 'Summarize long articles and documents.', space_type: 'nlp', url: '/spaces/summarize', compute_tokens: 800, framework: 'streamlit', category: 'Chat' },
      { name: 'Sentiment Analysis', description: 'Analyze emotional tone of text.', space_type: 'nlp', url: '/spaces/sentiment', compute_tokens: 400, framework: 'streamlit', category: 'Chat' },
      { name: 'Translation', description: 'Translate text between 10+ languages.', space_type: 'nlp', url: '/spaces/translate', compute_tokens: 600, framework: 'streamlit', category: 'Chat' },
      { name: 'Named Entity Recognition', description: 'Extract people, orgs, locations from text.', space_type: 'nlp', url: '/spaces/ner', compute_tokens: 500, framework: 'streamlit', category: 'Chat' },
      { name: 'Text to Speech', description: 'Convert text to natural speech.', space_type: 'audio', url: '/spaces/tts', compute_tokens: 700, framework: 'gradio', category: 'Audio' },
    ]
    for (const s of demos) {
      await fetchJson('/spaces', { method: 'POST', body: JSON.stringify(s) }).catch(() => {})
    }
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    await fetchJson('/spaces', { method: 'POST', body: JSON.stringify(createForm) })
    setShowCreate(false)
    setCreateForm({ name: '', description: '', space_type: 'demo', url: '', framework: 'gradio', category: 'Chat' })
    loadSpaces()
  }

  const filtered = useMemo(() => {
    let arr = [...spaces]
    if (activeCategory !== 'All') arr = arr.filter(s => s.category === activeCategory)
    if (search.trim()) {
      const q = search.toLowerCase()
      arr = arr.filter(s =>
        s.name.toLowerCase().includes(q) ||
        s.description.toLowerCase().includes(q)
      )
    }
    return arr
  }, [spaces, activeCategory, search])

  const typeIcon = (t: string) => {
    switch (t) {
      case 'chatbot': return 'chat'
      case 'image_gen': return 'image'
      case 'audio': return 'mic'
      case 'vision': return 'visibility'
      case 'code': return 'code_blocks'
      case 'nlp': return 'psychology'
      default: return 'rocket_launch'
    }
  }

  const typeColor = (t: string) => {
    switch (t) {
      case 'chatbot': return 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20'
      case 'image_gen': return 'text-violet-400 bg-violet-500/10 border-violet-500/20'
      case 'audio': return 'text-amber-400 bg-amber-500/10 border-amber-500/20'
      case 'vision': return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20'
      case 'code': return 'text-rose-400 bg-rose-500/10 border-rose-500/20'
      case 'nlp': return 'text-sky-400 bg-sky-500/10 border-sky-500/20'
      default: return 'text-slate-400 bg-white/5 border-white/10'
    }
  }

  const frameworkBadge = (fw?: string) => {
    switch (fw) {
      case 'gradio': return <Badge text="Gradio" colorClass="bg-orange-500/10 text-orange-400 border-orange-500/20" />
      case 'streamlit': return <Badge text="Streamlit" colorClass="bg-rose-500/10 text-rose-400 border-rose-500/20" />
      case 'docker': return <Badge text="Docker" colorClass="bg-sky-500/10 text-sky-400 border-sky-500/20" />
      default: return <Badge text="Static" colorClass="bg-slate-500/10 text-slate-400 border-slate-500/20" />
    }
  }

  const [showEmbedFor, setShowEmbedFor] = useState<string | null>(null)

  return (
    <div className="max-w-7xl mx-auto px-6 py-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Spaces</h1>
          <p className="text-slate-500 text-sm mt-1">Deploy and share interactive AI demos and applications</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowDeploy(true)}
            className="px-5 py-2.5 rounded-lg bg-violet-500 text-white font-bold text-sm hover:brightness-110 transition-all flex items-center gap-2">
            <span className="material-symbols-outlined text-sm">rocket_launch</span> Deploy AI Demo
          </button>
          <button onClick={() => setShowCreate(true)}
            className="px-5 py-2.5 rounded-lg bg-cyan-500 text-slate-950 font-bold text-sm hover:brightness-110 transition-all flex items-center gap-2">
            <span className="material-symbols-outlined text-sm">add</span> Create Space
          </button>
        </div>
      </div>

      {/* Search + Filters */}
      <div className="glass rounded-xl p-5 mb-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">search</span>
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search spaces..."
              className="w-full bg-black/30 border border-white/10 rounded-lg pl-10 pr-4 py-3 text-sm placeholder:text-slate-500 focus:border-cyan-500/50 focus:outline-none" />
          </div>
        </div>
        <div className="flex flex-wrap gap-2 mt-4">
          {CATEGORIES.map(cat => (
            <button key={cat} onClick={() => setActiveCategory(cat)}
              className={`chip ${activeCategory === cat ? 'active' : ''}`}>
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Spaces Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
        {loading ? (
          Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)
        ) : filtered.map(s => (
          <div key={s.id} className="glass rounded-xl p-5 card-hover gradient-border relative">
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
              <div className="flex flex-col items-end gap-1">
                <span className={`text-[10px] px-2 py-0.5 rounded-full border ${typeColor(s.space_type)}`}>
                  {s.space_type}
                </span>
                {frameworkBadge(s.framework)}
              </div>
            </div>
            <p className="text-sm text-slate-400 mb-4 line-clamp-2">{s.description}</p>
            <div className="flex items-center justify-between text-xs text-slate-500 pt-3 border-t border-white/5">
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1"><span className="material-symbols-outlined text-xs">favorite</span> {s.likes}</span>
                <span className="flex items-center gap-1"><span className="material-symbols-outlined text-xs">token</span> {s.compute_tokens}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${s.status === 'running' ? 'bg-emerald-400 animate-pulse' : 'bg-red-400'}`} />
                <span className="text-[10px] text-slate-500">{s.status}</span>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 mt-4">
              <button
                onClick={() => {
                  if (s.url) {
                    if (s.url.startsWith('http')) window.open(s.url, '_blank')
                    else navigate(s.url)
                  } else {
                    alert('This space does not have a URL configured yet.')
                  }
                }}
                className="py-2.5 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-sm font-bold hover:bg-cyan-500/20 transition-all flex items-center justify-center gap-2">
                <span className="material-symbols-outlined text-sm">open_in_new</span> Open Space
              </button>
              <button
                onClick={() => setShowEmbedFor(showEmbedFor === s.id ? null : s.id)}
                className="py-2.5 rounded-lg bg-white/5 border border-white/10 text-slate-300 text-sm font-bold hover:bg-white/10 transition-all flex items-center justify-center gap-2">
                <span className="material-symbols-outlined text-sm">code</span> {showEmbedFor === s.id ? 'Hide Embed' : 'Embed'}
              </button>
            </div>
            {showEmbedFor === s.id && s.embed_code && (
              <div className="mt-3 p-3 rounded-lg bg-black/30 border border-white/10">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-[10px] text-slate-500 uppercase">Embed Code</p>
                  <button onClick={() => { navigator.clipboard.writeText(s.embed_code!).catch(() => {}) }}
                    className="text-[10px] text-cyan-400 hover:text-cyan-200">Copy</button>
                </div>
                <code className="text-[10px] text-slate-400 font-mono break-all">{s.embed_code}</code>
                <div className="mt-2 pt-2 border-t border-white/5">
                  <p className="text-[10px] text-slate-500 uppercase mb-1">Share URL</p>
                  <div className="flex items-center gap-2">
                    <input readOnly value={s.share_url || ''} className="flex-1 bg-black/20 border border-white/10 rounded px-2 py-1 text-[10px] text-slate-400 font-mono" />
                    <button onClick={() => { navigator.clipboard.writeText(s.share_url || '').catch(() => {}) }}
                      className="text-[10px] text-cyan-400 hover:text-cyan-200">Copy</button>
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {filtered.length === 0 && !loading && (
        <div className="text-center py-16">
          <span className="material-symbols-outlined text-4xl text-slate-600 mb-3">search_off</span>
          <p className="text-slate-500">No spaces found matching your filters.</p>
        </div>
      )}

      {/* Create Modal */}
      {showCreate && (
        <div className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={e => { if (e.target === e.currentTarget) setShowCreate(false) }}>
          <div className="glass rounded-2xl p-8 w-full max-w-lg max-h-[85vh] overflow-y-auto">
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
                <option value="code">Code</option>
                <option value="nlp">NLP</option>
              </select>
              <select value={createForm.framework} onChange={e => setCreateForm(f => ({ ...f, framework: e.target.value as any }))}
                className="w-full bg-black/30 border border-white/10 rounded-lg px-4 py-3 text-sm text-slate-300 focus:border-cyan-500/50 outline-none">
                <option value="gradio">Gradio</option>
                <option value="streamlit">Streamlit</option>
                <option value="docker">Docker</option>
                <option value="static">Static</option>
              </select>
              <button type="submit" className="w-full py-3 rounded-xl bg-cyan-500 text-slate-950 font-bold hover:brightness-110 transition-all">
                Create Space
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Deploy AI Demo Modal */}
      {showDeploy && (
        <div className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={e => { if (e.target === e.currentTarget) setShowDeploy(false) }}>
          <div className="glass rounded-2xl p-8 w-full max-w-lg max-h-[85vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-2">Deploy AI Demo</h2>
            <p className="text-sm text-slate-500 mb-4">Launch an interactive demo from a model or template.</p>
            <div className="space-y-3">
              <button onClick={() => { navigate('/spaces/image-gen'); setShowDeploy(false) }}
                className="w-full glass rounded-xl p-4 text-left card-hover flex items-center gap-4">
                <span className="w-10 h-10 rounded-xl bg-violet-500/10 text-violet-400 flex items-center justify-center">
                  <span className="material-symbols-outlined">image</span>
                </span>
                <div>
                  <p className="text-sm font-bold">Image Generation</p>
                  <p className="text-xs text-slate-500">Deploy SDXL, FLUX, or custom diffusion models</p>
                </div>
              </button>
              <button onClick={() => { navigate('/spaces/chat'); setShowDeploy(false) }}
                className="w-full glass rounded-xl p-4 text-left card-hover flex items-center gap-4">
                <span className="w-10 h-10 rounded-xl bg-cyan-500/10 text-cyan-400 flex items-center justify-center">
                  <span className="material-symbols-outlined">chat</span>
                </span>
                <div>
                  <p className="text-sm font-bold">Chatbot</p>
                  <p className="text-xs text-slate-500">Deploy Llama, Mistral, or custom LLMs</p>
                </div>
              </button>
              <button onClick={() => { navigate('/spaces/code'); setShowDeploy(false) }}
                className="w-full glass rounded-xl p-4 text-left card-hover flex items-center gap-4">
                <span className="w-10 h-10 rounded-xl bg-rose-500/10 text-rose-400 flex items-center justify-center">
                  <span className="material-symbols-outlined">code_blocks</span>
                </span>
                <div>
                  <p className="text-sm font-bold">Code Assistant</p>
                  <p className="text-xs text-slate-500">Deploy code generation and completion demos</p>
                </div>
              </button>
              <button onClick={() => { navigate('/spaces/audio'); setShowDeploy(false) }}
                className="w-full glass rounded-xl p-4 text-left card-hover flex items-center gap-4">
                <span className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center">
                  <span className="material-symbols-outlined">mic</span>
                </span>
                <div>
                  <p className="text-sm font-bold">Audio / Speech</p>
                  <p className="text-xs text-slate-500">Deploy Whisper, TTS, or music generation</p>
                </div>
              </button>
            </div>
            <button onClick={() => setShowDeploy(false)} className="w-full mt-4 py-3 rounded-xl bg-white/5 text-slate-300 font-bold hover:bg-white/10 transition-all">
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
