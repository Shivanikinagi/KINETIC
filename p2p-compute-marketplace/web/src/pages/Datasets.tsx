import { useEffect, useState } from 'react'
import { fetchJson } from '../lib/api'

interface Dataset {
  id: string
  name: string
  description: string
  tags: string[]
  owner: string
  license: string
  file_count: number
  size_mb: number
  is_public: boolean
  created_at: number
}

export default function Datasets() {
  const [datasets, setDatasets] = useState<Dataset[]>([])
  const [search, setSearch] = useState('')
  const [showUpload, setShowUpload] = useState(false)
  const [uploadForm, setUploadForm] = useState({ name: '', description: '', tags: '', license: 'MIT', file_count: 0, size_mb: 0 })
  const [selectedDataset, setSelectedDataset] = useState<Dataset | null>(null)

  useEffect(() => { loadDatasets() }, [])

  const loadDatasets = async () => {
    const data = await fetchJson('/datasets').catch(() => ({ datasets: [] }))
    setDatasets(data.datasets || [])
    if ((data.datasets || []).length === 0) seedDemoDatasets()
  }

  const seedDemoDatasets = async () => {
    const demos = [
      { name: 'COCO-2017', description: 'Common Objects in Context dataset for object detection, segmentation, and captioning.', tags: ['cv', 'detection', 'segmentation'], license: 'CC-BY-4.0', file_count: 330000, size_mb: 25000 },
      { name: 'Alpaca-52k', description: 'Instruction-following dataset for fine-tuning LLMs.', tags: ['nlp', 'instruction', 'llm'], license: 'CC-BY-NC-4.0', file_count: 52000, size_mb: 45 },
      { name: 'LAION-5B', description: 'Large-scale image-text dataset for training multimodal models.', tags: ['multimodal', 'image', 'text'], license: 'CC-BY-4.0', file_count: 5000000000, size_mb: 240000000 },
      { name: 'LibriSpeech', description: 'Corpus of read English speech for ASR research.', tags: ['audio', 'asr', 'speech'], license: 'CC-BY-4.0', file_count: 28539, size_mb: 60000 },
      { name: 'ImageNet-1k', description: 'Large visual database for object recognition research.', tags: ['cv', 'classification', 'imagenet'], license: 'Custom', file_count: 1281167, size_mb: 150000 },
    ]
    for (const d of demos) {
      await fetchJson('/datasets', { method: 'POST', body: JSON.stringify(d) }).catch(() => {})
    }
    const data = await fetchJson('/datasets').catch(() => ({ datasets: [] }))
    setDatasets(data.datasets || [])
  }

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault()
    await fetchJson('/datasets', {
      method: 'POST',
      body: JSON.stringify({
        ...uploadForm,
        tags: uploadForm.tags.split(',').map(t => t.trim()).filter(Boolean),
      })
    })
    setShowUpload(false)
    setUploadForm({ name: '', description: '', tags: '', license: 'MIT', file_count: 0, size_mb: 0 })
    loadDatasets()
  }

  const filtered = datasets.filter(d =>
    d.name.toLowerCase().includes(search.toLowerCase()) ||
    d.description.toLowerCase().includes(search.toLowerCase())
  )

  const formatSize = (mb: number) => {
    if (mb > 1_000_000) return `${(mb / 1_000_000).toFixed(1)} TB`
    if (mb > 1000) return `${(mb / 1000).toFixed(1)} GB`
    return `${mb.toFixed(0)} MB`
  }

  const formatCount = (n: number) => {
    if (n > 1_000_000_000) return `${(n / 1_000_000_000).toFixed(1)}B`
    if (n > 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
    if (n > 1000) return `${(n / 1000).toFixed(1)}K`
    return `${n}`
  }

  return (
    <div className="max-w-7xl mx-auto px-6 py-8">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dataset Hub</h1>
          <p className="text-slate-500 text-sm mt-1">Share and discover datasets for AI training and evaluation</p>
        </div>
        <button onClick={() => setShowUpload(true)}
          className="px-5 py-2.5 rounded-lg bg-cyan-500 text-slate-950 font-bold text-sm hover:brightness-110 transition-all flex items-center gap-2">
          <span className="material-symbols-outlined text-sm">cloud_upload</span> Upload Dataset
        </button>
      </div>

      <div className="glass rounded-xl p-5 mb-6">
        <div className="relative">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">search</span>
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search datasets..."
            className="w-full bg-black/30 border border-white/10 rounded-lg pl-10 pr-4 py-3 text-sm placeholder:text-slate-500 focus:border-cyan-500/50 focus:outline-none" />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
        {filtered.map(d => (
          <div key={d.id} className="glass rounded-xl p-5 card-hover cursor-pointer" onClick={() => setSelectedDataset(d)}>
            <div className="flex items-start justify-between mb-3">
              <h3 className="text-base font-bold">{d.name}</h3>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-slate-400">{d.license}</span>
            </div>
            <p className="text-sm text-slate-400 mb-3 line-clamp-2">{d.description}</p>
            <div className="flex flex-wrap gap-1.5 mb-4">
              {d.tags.map(t => (
                <span key={t} className="text-[10px] px-2 py-0.5 rounded-full bg-violet-500/10 text-violet-400 border border-violet-500/20">{t}</span>
              ))}
            </div>
            <div className="flex items-center justify-between text-xs text-slate-500 pt-3 border-t border-white/5">
              <span className="flex items-center gap-1">
                <span className="material-symbols-outlined text-xs">description</span>
                {formatCount(d.file_count)} files
              </span>
              <span className="flex items-center gap-1">
                <span className="material-symbols-outlined text-xs">storage</span>
                {formatSize(d.size_mb)}
              </span>
            </div>
          </div>
        ))}
      </div>

      {showUpload && (
        <div className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={e => { if (e.target === e.currentTarget) setShowUpload(false) }}>
          <div className="glass rounded-2xl p-8 w-full max-w-lg">
            <h2 className="text-xl font-bold mb-4">Upload Dataset</h2>
            <form onSubmit={handleUpload} className="space-y-4">
              <input required placeholder="Dataset name" value={uploadForm.name}
                onChange={e => setUploadForm(f => ({ ...f, name: e.target.value }))}
                className="w-full bg-black/30 border border-white/10 rounded-lg px-4 py-3 text-sm focus:border-cyan-500/50 outline-none" />
              <textarea placeholder="Description" rows={2} value={uploadForm.description}
                onChange={e => setUploadForm(f => ({ ...f, description: e.target.value }))}
                className="w-full bg-black/30 border border-white/10 rounded-lg px-4 py-3 text-sm focus:border-cyan-500/50 outline-none" />
              <input placeholder="Tags (comma separated)" value={uploadForm.tags}
                onChange={e => setUploadForm(f => ({ ...f, tags: e.target.value }))}
                className="w-full bg-black/30 border border-white/10 rounded-lg px-4 py-3 text-sm focus:border-cyan-500/50 outline-none" />
              <div className="grid grid-cols-2 gap-4">
                <input type="number" placeholder="Files" value={uploadForm.file_count}
                  onChange={e => setUploadForm(f => ({ ...f, file_count: parseInt(e.target.value) || 0 }))}
                  className="w-full bg-black/30 border border-white/10 rounded-lg px-4 py-3 text-sm focus:border-cyan-500/50 outline-none" />
                <input type="number" placeholder="Size (MB)" value={uploadForm.size_mb}
                  onChange={e => setUploadForm(f => ({ ...f, size_mb: parseFloat(e.target.value) || 0 }))}
                  className="w-full bg-black/30 border border-white/10 rounded-lg px-4 py-3 text-sm focus:border-cyan-500/50 outline-none" />
              </div>
              <button type="submit" className="w-full py-3 rounded-xl bg-cyan-500 text-slate-950 font-bold hover:brightness-110 transition-all">
                Upload
              </button>
            </form>
          </div>
        </div>
      )}

      {selectedDataset && (
        <div className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={e => { if (e.target === e.currentTarget) setSelectedDataset(null) }}>
          <div className="glass rounded-2xl p-8 w-full max-w-2xl">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h2 className="text-2xl font-bold">{selectedDataset.name}</h2>
                <p className="text-sm text-slate-500">by {selectedDataset.owner} · {selectedDataset.license}</p>
              </div>
              <button onClick={() => setSelectedDataset(null)} className="text-slate-500 hover:text-white">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <p className="text-slate-300 mb-4">{selectedDataset.description}</p>
            <div className="flex flex-wrap gap-2 mb-6">
              {selectedDataset.tags.map(t => (
                <span key={t} className="text-xs px-3 py-1 rounded-full bg-violet-500/10 text-violet-400 border border-violet-500/20">{t}</span>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="glass rounded-lg p-4 text-center">
                <p className="text-2xl font-bold text-cyan-400">{formatCount(selectedDataset.file_count)}</p>
                <p className="text-[10px] text-slate-500 uppercase tracking-wider">Files</p>
              </div>
              <div className="glass rounded-lg p-4 text-center">
                <p className="text-2xl font-bold text-emerald-400">{formatSize(selectedDataset.size_mb)}</p>
                <p className="text-[10px] text-slate-500 uppercase tracking-wider">Size</p>
              </div>
            </div>
            <div className="glass rounded-lg p-4 overflow-hidden">
              <p className="text-xs uppercase tracking-wider text-slate-500 mb-2">Preview</p>
              <div className="font-mono text-xs text-slate-400 space-y-1">
                <p>{`{`}</p>
                <p className="pl-4">"dataset": "{selectedDataset.name}",</p>
                <p className="pl-4">"split": "train",</p>
                <p className="pl-4">"samples": {formatCount(selectedDataset.file_count)},</p>
                <p className="pl-4">"format": "parquet"</p>
                <p>{`}`}</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
