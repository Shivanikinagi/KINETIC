import { useEffect, useMemo, useRef, useState } from 'react'
import { fetchJson, formatBytes, formatNumber } from '../lib/api'
import type { DatasetCard } from '../lib/api'

const CATEGORIES = ['All', 'Text', 'Image', 'Audio', 'Video', 'Tabular', 'Code']

function SkeletonCard() {
  return (
    <div className="glass rounded-xl p-5 animate-pulse">
      <div className="flex items-start justify-between mb-3">
        <div className="space-y-2">
          <div className="h-4 w-32 bg-white/5 rounded" />
          <div className="h-3 w-20 bg-white/5 rounded" />
        </div>
        <div className="h-5 w-14 bg-white/5 rounded-full" />
      </div>
      <div className="h-3 w-full bg-white/5 rounded mb-2" />
      <div className="h-3 w-2/3 bg-white/5 rounded mb-4" />
      <div className="flex gap-1.5 mb-4">
        {[1,2,3].map(i => <div key={i} className="h-4 w-12 bg-white/5 rounded-full" />)}
      </div>
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

export default function Datasets() {
  const [datasets, setDatasets] = useState<DatasetCard[]>([])
  const [search, setSearch] = useState('')
  const [searchFocused, setSearchFocused] = useState(false)
  const [showUpload, setShowUpload] = useState(false)
  const [uploadForm, setUploadForm] = useState({
    name: '', description: '', tags: '', license: 'MIT', file_count: 0, size_mb: 0, is_public: true, category: 'Text'
  })
  const [selectedDataset, setSelectedDataset] = useState<DatasetCard | null>(null)
  const [activeCategory, setActiveCategory] = useState('All')
  const [loading, setLoading] = useState(true)
  const searchRef = useRef<HTMLDivElement>(null)

  useEffect(() => { loadDatasets() }, [])

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setSearchFocused(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const loadDatasets = async () => {
    setLoading(true)
    const data = await fetchJson('/datasets').catch(() => ({ datasets: [] }))
    const enriched = (data.datasets || []).map((d: any) => enrichDataset(d))
    setDatasets(enriched)
    if (enriched.length === 0) {
      await seedDemoDatasets()
      const data2 = await fetchJson('/datasets').catch(() => ({ datasets: [] }))
      setDatasets((data2.datasets || []).map((d: any) => enrichDataset(d)))
    }
    setLoading(false)
  }

  const enrichDataset = (d: any): DatasetCard => {
    const tags = (d.tags || []).map((t: string) => t.toLowerCase())
    const nameLower = (d.name || '').toLowerCase()
    let category = 'Text'
    if (tags.includes('image') || tags.includes('cv') || nameLower.includes('coco') || nameLower.includes('imagenet')) category = 'Image'
    else if (tags.includes('audio') || tags.includes('speech') || nameLower.includes('librispeech')) category = 'Audio'
    else if (tags.includes('video') || nameLower.includes('video')) category = 'Video'
    else if (tags.includes('tabular') || tags.includes('csv')) category = 'Tabular'
    else if (tags.includes('code')) category = 'Code'
    return {
      ...d,
      category,
      train_split: d.train_split || 80,
      test_split: d.test_split || 10,
      val_split: d.val_split || 10,
      sample_data: generateSampleData(d.name, category),
    }
  }

  const generateSampleData = (_name: string, category: string): Record<string, any>[] => {
    if (category === 'Text' || category === 'Code') {
      return [
        { id: 1, text: 'The quick brown fox jumps over the lazy dog.', label: 'neutral' },
        { id: 2, text: 'I love this product! Absolutely amazing.', label: 'positive' },
        { id: 3, text: 'This is terrible and disappointing.', label: 'negative' },
      ]
    }
    if (category === 'Image') {
      return [
        { image_id: 'img_001', width: 640, height: 480, objects: [{ class: 'person', bbox: [100, 200, 50, 80] }] },
        { image_id: 'img_002', width: 640, height: 480, objects: [{ class: 'car', bbox: [300, 400, 120, 60] }] },
      ]
    }
    if (category === 'Audio') {
      return [
        { file: 'sample_001.wav', duration: 12.5, transcript: 'Hello world, this is a sample audio clip.', speaker: 'A' },
        { file: 'sample_002.wav', duration: 8.2, transcript: 'Machine learning is transforming technology.', speaker: 'B' },
      ]
    }
    if (category === 'Tabular') {
      return [
        { id: 1, age: 34, income: 75000, city: 'New York', purchased: true },
        { id: 2, age: 28, income: 52000, city: 'San Francisco', purchased: false },
      ]
    }
    return [
      { id: 1, feature_a: 0.42, feature_b: 0.88, target: 1 },
      { id: 2, feature_a: 0.15, feature_b: 0.33, target: 0 },
    ]
  }

  const seedDemoDatasets = async () => {
    const demos = [
      { name: 'COCO-2017', description: 'Common Objects in Context dataset for object detection, segmentation, and captioning.', tags: ['cv', 'detection', 'segmentation'], license: 'CC-BY-4.0', file_count: 330000, size_mb: 25000, is_public: true, category: 'Image' },
      { name: 'Alpaca-52k', description: 'Instruction-following dataset for fine-tuning LLMs.', tags: ['nlp', 'instruction', 'llm'], license: 'CC-BY-NC-4.0', file_count: 52000, size_mb: 45, is_public: true, category: 'Text' },
      { name: 'LAION-5B', description: 'Large-scale image-text dataset for training multimodal models.', tags: ['multimodal', 'image', 'text'], license: 'CC-BY-4.0', file_count: 5000000000, size_mb: 240000000, is_public: true, category: 'Image' },
      { name: 'LibriSpeech', description: 'Corpus of read English speech for ASR research.', tags: ['audio', 'asr', 'speech'], license: 'CC-BY-4.0', file_count: 28539, size_mb: 60000, is_public: true, category: 'Audio' },
      { name: 'ImageNet-1k', description: 'Large visual database for object recognition research.', tags: ['cv', 'classification', 'imagenet'], license: 'Custom', file_count: 1281167, size_mb: 150000, is_public: true, category: 'Image' },
      { name: 'CodeSearchNet', description: 'Large dataset for code search and generation tasks.', tags: ['code', 'search', 'nlp'], license: 'BSD-3', file_count: 2000000, size_mb: 20000, is_public: true, category: 'Code' },
      { name: 'RedPajama-Data-1T', description: 'Open dataset for pretraining large language models.', tags: ['text', 'pretraining', 'llm'], license: 'Various', file_count: 208000000, size_mb: 5000000, is_public: true, category: 'Text' },
      { name: 'AudioSet', description: 'Large-scale dataset of manually annotated audio events.', tags: ['audio', 'classification', 'events'], license: 'CC-BY-4.0', file_count: 2084320, size_mb: 1200000, is_public: true, category: 'Audio' },
      { name: 'UCI-Adult', description: 'Census income dataset for classification tasks.', tags: ['tabular', 'classification', 'census'], license: 'CC0', file_count: 48842, size_mb: 5, is_public: true, category: 'Tabular' },
      { name: 'Kinetics-700', description: 'Large-scale video dataset for human action recognition.', tags: ['video', 'action', 'recognition'], license: 'CC-BY-4.0', file_count: 650000, size_mb: 800000, is_public: true, category: 'Video' },
    ]
    for (const d of demos) {
      await fetchJson('/datasets', { method: 'POST', body: JSON.stringify(d) }).catch(() => {})
    }
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
    setUploadForm({ name: '', description: '', tags: '', license: 'MIT', file_count: 0, size_mb: 0, is_public: true, category: 'Text' })
    loadDatasets()
  }

  const filtered = useMemo(() => {
    let arr = [...datasets]
    if (activeCategory !== 'All') arr = arr.filter(d => d.category === activeCategory)
    if (search.trim()) {
      const q = search.toLowerCase()
      arr = arr.filter(d =>
        d.name.toLowerCase().includes(q) ||
        d.description.toLowerCase().includes(q) ||
        d.tags.some(t => t.toLowerCase().includes(q))
      )
    }
    return arr
  }, [datasets, activeCategory, search])

  const searchSuggestions = useMemo(() => {
    if (!search.trim()) return []
    const q = search.toLowerCase()
    return datasets.filter(d => d.name.toLowerCase().includes(q)).slice(0, 5)
  }, [search, datasets])

  const allTags = useMemo(() => Array.from(new Set(datasets.flatMap(d => d.tags))), [datasets])

  const categoryColor = (cat?: string) => {
    switch (cat) {
      case 'Text': return 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20'
      case 'Image': return 'bg-violet-500/10 text-violet-400 border-violet-500/20'
      case 'Audio': return 'bg-amber-500/10 text-amber-400 border-amber-500/20'
      case 'Video': return 'bg-rose-500/10 text-rose-400 border-rose-500/20'
      case 'Tabular': return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
      case 'Code': return 'bg-sky-500/10 text-sky-400 border-sky-500/20'
      default: return 'bg-white/5 text-slate-400 border-white/10'
    }
  }

  return (
    <div className="max-w-7xl mx-auto px-6 py-8">
      {/* Header */}
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

      {/* Search + Filters */}
      <div className="glass rounded-xl p-5 mb-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative" ref={searchRef}>
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">search</span>
            <input value={search} onChange={e => setSearch(e.target.value)}
              onFocus={() => setSearchFocused(true)}
              placeholder="Search datasets by name, tag, or description..."
              className="w-full bg-black/30 border border-white/10 rounded-lg pl-10 pr-4 py-3 text-sm placeholder:text-slate-500 focus:border-cyan-500/50 focus:outline-none" />
            {searchFocused && searchSuggestions.length > 0 && (
              <div className="absolute z-20 top-full left-0 right-0 mt-2 glass-strong rounded-xl overflow-hidden border border-white/10">
                {searchSuggestions.map(s => (
                  <button key={s.id} onClick={() => { setSearch(s.name); setSearchFocused(false) }}
                    className="w-full text-left px-4 py-2.5 text-sm text-slate-300 hover:bg-white/5 transition-colors flex items-center gap-2">
                    <span className="material-symbols-outlined text-sm text-slate-500">search</span>
                    {s.name}
                  </button>
                ))}
              </div>
            )}
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
        <div className="flex flex-wrap gap-2 mt-3">
          {allTags.slice(0, 12).map(tag => (
            <button key={tag} onClick={() => setSearch(tag)}
              className="chip">{tag}</button>
          ))}
        </div>
      </div>

      {/* Dataset Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
        {loading ? (
          Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)
        ) : filtered.map(d => (
          <div key={d.id} className="glass rounded-xl p-5 card-hover cursor-pointer gradient-border relative" onClick={() => setSelectedDataset(d)}>
            <div className="flex items-start justify-between mb-3">
              <div>
                <h3 className="text-base font-bold">{d.name}</h3>
                <p className="text-[10px] text-slate-500 font-mono">{d.owner}</p>
              </div>
              <Badge text={d.license} />
            </div>
            <p className="text-sm text-slate-400 mb-3 line-clamp-2">{d.description}</p>
            <div className="flex flex-wrap gap-1.5 mb-3">
              {d.category && <Badge text={d.category} colorClass={categoryColor(d.category)} />}
              {!d.is_public && <Badge text="Private" colorClass="bg-rose-500/10 text-rose-400 border-rose-500/20" />}
            </div>
            <div className="flex flex-wrap gap-1.5 mb-4">
              {d.tags.slice(0, 4).map(t => (
                <span key={t} className="text-[10px] px-2 py-0.5 rounded-full bg-violet-500/10 text-violet-400 border border-violet-500/20">{t}</span>
              ))}
            </div>
            <div className="flex items-center justify-between text-xs text-slate-500 pt-3 border-t border-white/5">
              <span className="flex items-center gap-1">
                <span className="material-symbols-outlined text-xs">description</span>
                {formatNumber(d.file_count)} files
              </span>
              <span className="flex items-center gap-1">
                <span className="material-symbols-outlined text-xs">storage</span>
                {formatBytes(d.size_mb)}
              </span>
            </div>
          </div>
        ))}
      </div>

      {filtered.length === 0 && !loading && (
        <div className="text-center py-16">
          <span className="material-symbols-outlined text-4xl text-slate-600 mb-3">search_off</span>
          <p className="text-slate-500">No datasets found matching your filters.</p>
        </div>
      )}

      {/* Upload Modal */}
      {showUpload && (
        <div className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={e => { if (e.target === e.currentTarget) setShowUpload(false) }}>
          <div className="glass rounded-2xl p-8 w-full max-w-lg max-h-[85vh] overflow-y-auto">
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
              <select value={uploadForm.category}
                onChange={e => setUploadForm(f => ({ ...f, category: e.target.value }))}
                className="w-full bg-black/30 border border-white/10 rounded-lg px-4 py-3 text-sm text-slate-300 focus:border-cyan-500/50 outline-none">
                {CATEGORIES.filter(c => c !== 'All').map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              <div className="grid grid-cols-2 gap-4">
                <input type="number" placeholder="Files" value={uploadForm.file_count}
                  onChange={e => setUploadForm(f => ({ ...f, file_count: parseInt(e.target.value) || 0 }))}
                  className="w-full bg-black/30 border border-white/10 rounded-lg px-4 py-3 text-sm focus:border-cyan-500/50 outline-none" />
                <input type="number" placeholder="Size (MB)" value={uploadForm.size_mb}
                  onChange={e => setUploadForm(f => ({ ...f, size_mb: parseFloat(e.target.value) || 0 }))}
                  className="w-full bg-black/30 border border-white/10 rounded-lg px-4 py-3 text-sm focus:border-cyan-500/50 outline-none" />
              </div>
              <input placeholder="License" value={uploadForm.license}
                onChange={e => setUploadForm(f => ({ ...f, license: e.target.value }))}
                className="w-full bg-black/30 border border-white/10 rounded-lg px-4 py-3 text-sm focus:border-cyan-500/50 outline-none" />
              <div className="flex items-center gap-2">
                <input type="checkbox" id="is_public" checked={uploadForm.is_public}
                  onChange={e => setUploadForm(f => ({ ...f, is_public: e.target.checked }))}
                  className="rounded border-white/10 bg-black/30 text-cyan-500 focus:ring-cyan-500/30" />
                <label htmlFor="is_public" className="text-sm text-slate-400">Make this dataset public</label>
              </div>
              <button type="submit" className="w-full py-3 rounded-xl bg-cyan-500 text-slate-950 font-bold hover:brightness-110 transition-all">
                Upload
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {selectedDataset && (
        <div className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={e => { if (e.target === e.currentTarget) setSelectedDataset(null) }}>
          <div className="glass rounded-2xl p-6 md:p-8 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between mb-4">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-2xl font-bold">{selectedDataset.name}</h2>
                  {selectedDataset.category && <Badge text={selectedDataset.category} colorClass={categoryColor(selectedDataset.category)} />}
                  {!selectedDataset.is_public && <Badge text="Private" colorClass="bg-rose-500/10 text-rose-400 border-rose-500/20" />}
                </div>
                <p className="text-sm text-slate-500">by {selectedDataset.owner} · {selectedDataset.license}</p>
              </div>
              <button onClick={() => setSelectedDataset(null)} className="text-slate-500 hover:text-white p-1">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <p className="text-slate-300 mb-4">{selectedDataset.description}</p>

            <div className="flex flex-wrap gap-2 mb-6">
              {selectedDataset.tags.map(t => (
                <span key={t} className="text-xs px-3 py-1 rounded-full bg-violet-500/10 text-violet-400 border border-violet-500/20">{t}</span>
              ))}
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="glass rounded-lg p-4 text-center">
                <p className="text-2xl font-bold text-cyan-400">{formatNumber(selectedDataset.file_count)}</p>
                <p className="text-[10px] text-slate-500 uppercase tracking-wider">Files</p>
              </div>
              <div className="glass rounded-lg p-4 text-center">
                <p className="text-2xl font-bold text-emerald-400">{formatBytes(selectedDataset.size_mb)}</p>
                <p className="text-[10px] text-slate-500 uppercase tracking-wider">Size</p>
              </div>
              <div className="glass rounded-lg p-4 text-center">
                <p className="text-2xl font-bold text-violet-400">{selectedDataset.train_split || 80}%</p>
                <p className="text-[10px] text-slate-500 uppercase tracking-wider">Train</p>
              </div>
              <div className="glass rounded-lg p-4 text-center">
                <p className="text-2xl font-bold text-amber-400">{selectedDataset.test_split || 10}%</p>
                <p className="text-[10px] text-slate-500 uppercase tracking-wider">Test</p>
              </div>
            </div>

            {/* Train/Test Split Visual */}
            <div className="glass rounded-lg p-4 mb-6">
              <p className="text-xs uppercase tracking-wider text-slate-500 mb-3">Train / Val / Test Split</p>
              <div className="h-4 w-full rounded-full overflow-hidden flex">
                <div className="bg-cyan-500/60 h-full" style={{ width: `${selectedDataset.train_split || 80}%` }} />
                <div className="bg-violet-500/60 h-full" style={{ width: `${selectedDataset.val_split || 10}%` }} />
                <div className="bg-amber-500/60 h-full" style={{ width: `${selectedDataset.test_split || 10}%` }} />
              </div>
              <div className="flex justify-between text-[10px] text-slate-500 mt-2">
                <span className="text-cyan-400">Train {(selectedDataset.train_split || 80)}%</span>
                <span className="text-violet-400">Val {(selectedDataset.val_split || 10)}%</span>
                <span className="text-amber-400">Test {(selectedDataset.test_split || 10)}%</span>
              </div>
            </div>

            {/* Sample Data Preview */}
            {selectedDataset.sample_data && selectedDataset.sample_data.length > 0 && (
              <div className="glass rounded-lg p-4 mb-6 overflow-hidden">
                <p className="text-xs uppercase tracking-wider text-slate-500 mb-2">Preview</p>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead>
                      <tr className="border-b border-white/10">
                        {Object.keys(selectedDataset.sample_data[0]).map(k => (
                          <th key={k} className="py-2 pr-4 text-slate-400 font-semibold uppercase tracking-wider">{k}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {selectedDataset.sample_data.map((row, i) => (
                        <tr key={i} className="border-b border-white/5">
                          {Object.values(row).map((v: any, j) => (
                            <td key={j} className="py-2 pr-4 text-slate-300 font-mono truncate max-w-[200px]">{JSON.stringify(v)}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Metadata */}
            <div className="glass rounded-lg p-4 overflow-hidden mb-6">
              <p className="text-xs uppercase tracking-wider text-slate-500 mb-2">Metadata</p>
              <div className="font-mono text-xs text-slate-400 space-y-1">
                <p>{`{`}</p>
                <p className="pl-4">"dataset": "{selectedDataset.name}",</p>
                <p className="pl-4">"split": "train",</p>
                <p className="pl-4">"samples": {formatNumber(selectedDataset.file_count)},</p>
                <p className="pl-4">"format": "parquet",</p>
                <p className="pl-4">"size": "{formatBytes(selectedDataset.size_mb)}",</p>
                <p className="pl-4">"public": {selectedDataset.is_public ? 'true' : 'false'}</p>
                <p>{`}`}</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
