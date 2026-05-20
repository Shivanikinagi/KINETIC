import { useState } from 'react'
import { fetchJson } from '../../lib/api'

const SAMPLE_IMAGES = [
  { name: 'Street Scene', url: 'https://images.unsplash.com/photo-1514565131-fce0801e5785?w=512&h=512&fit=crop', desc: 'City street with cars and pedestrians' },
  { name: 'Forest Path', url: 'https://images.unsplash.com/photo-1448375240586-882707db888b?w=512&h=512&fit=crop', desc: 'Dense forest with hiking trail' },
  { name: 'Beach Sunset', url: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=512&h=512&fit=crop', desc: 'Ocean beach at golden hour' },
  { name: 'Kitchen', url: 'https://images.unsplash.com/photo-1556911220-e15b29be8c8f?w=512&h=512&fit=crop', desc: 'Modern kitchen with appliances' },
]

export default function VisionSpace() {
  const [selectedImage, setSelectedImage] = useState(SAMPLE_IMAGES[0])
  const [result, setResult] = useState('')
  const [loading, setLoading] = useState(false)
  const [history, setHistory] = useState<Array<{image: string, output: string, jobId: string, txUrl?: string}>>([])

  const handleDetect = async () => {
    setLoading(true)
    try {
      const res = await fetchJson('/job', {
        method: 'POST',
        body: JSON.stringify({
          type: 'vision',
          tokens: 400,
          payload: JSON.stringify({
            name: 'Object Detection',
            description: 'Detect objects in image',
            image_url: selectedImage.url,
            image_name: selectedImage.name,
            action: 'detect'
          })
        })
      })
      const output = res.output || res.compute_output || 'Detection completed'
      const newItem = {
        image: selectedImage.name,
        output,
        jobId: res.job_id || '',
        txUrl: res.explorer_url
      }
      setResult(output)
      setHistory(prev => [newItem, ...prev])
    } catch (err: any) {
      setResult(`Error: ${err.message || 'Detection failed'}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-6xl mx-auto px-6 py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">YOLO Object Detection</h1>
        <p className="text-slate-500 text-sm mt-1">Run computer vision inference to detect objects in images via compute jobs</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Image Selection */}
        <div className="space-y-6">
          <div className="glass rounded-xl p-6">
            <h2 className="text-lg font-bold mb-4">Select Image</h2>
            <div className="grid grid-cols-2 gap-3">
              {SAMPLE_IMAGES.map((img) => (
                <button
                  key={img.name}
                  onClick={() => setSelectedImage(img)}
                  className={`relative rounded-lg overflow-hidden border-2 transition-all ${
                    selectedImage.name === img.name
                      ? 'border-cyan-500 ring-2 ring-cyan-500/20'
                      : 'border-white/10 hover:border-white/30'
                  }`}>
                  <img src={img.url} alt={img.name} className="w-full aspect-square object-cover" />
                  <div className="absolute inset-x-0 bottom-0 bg-black/60 px-2 py-1">
                    <p className="text-[10px] font-bold text-white">{img.name}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="glass rounded-xl p-6">
            <h3 className="text-sm font-bold mb-3 text-slate-400">Selected</h3>
            <div className="rounded-lg overflow-hidden border border-white/10 mb-3">
              <img src={selectedImage.url} alt={selectedImage.name} className="w-full aspect-video object-cover" />
            </div>
            <p className="text-xs text-slate-400 mb-4">{selectedImage.desc}</p>
            <button
              onClick={handleDetect}
              disabled={loading}
              className="w-full py-3 rounded-xl bg-cyan-500 text-slate-950 font-bold hover:brightness-110 transition-all disabled:opacity-50 flex items-center justify-center gap-2">
              {loading ? (
                <>
                  <span className="animate-spin material-symbols-outlined text-sm">progress_activity</span>
                  Analyzing...
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-sm">visibility</span>
                  Detect Objects
                </>
              )}
            </button>
          </div>
        </div>

        {/* Results */}
        <div className="lg:col-span-2 space-y-6">
          <div className="glass rounded-xl p-6">
            <h2 className="text-lg font-bold mb-4">Detection Results</h2>
            {result ? (
              <div className="space-y-4">
                <div className="bg-black/30 border border-white/10 rounded-lg p-4">
                  <p className="text-sm text-slate-300 whitespace-pre-wrap font-mono">{result}</p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => navigator.clipboard.writeText(result)}
                    className="flex-1 py-2 rounded-lg bg-white/5 border border-white/10 text-slate-300 text-sm font-bold hover:bg-white/10 transition-all flex items-center justify-center gap-1">
                    <span className="material-symbols-outlined text-sm">content_copy</span> Copy
                  </button>
                  <button
                    onClick={() => setResult('')}
                    className="flex-1 py-2 rounded-lg bg-white/5 border border-white/10 text-slate-300 text-sm font-bold hover:bg-white/10 transition-all flex items-center justify-center gap-1">
                    <span className="material-symbols-outlined text-sm">refresh</span> Clear
                  </button>
                </div>
              </div>
            ) : (
              <div className="h-64 rounded-lg border-2 border-dashed border-white/10 flex items-center justify-center">
                <div className="text-center text-slate-500">
                  <span className="material-symbols-outlined text-4xl mb-2 block">photo_library</span>
                  <p className="text-sm">Select an image and click Detect Objects</p>
                </div>
              </div>
            )}
          </div>

          {/* History */}
          {history.length > 0 && (
            <div className="glass rounded-xl p-6">
              <h3 className="text-sm font-bold mb-3 text-slate-400">Analysis History</h3>
              <div className="space-y-3 max-h-64 overflow-y-auto">
                {history.map((h, i) => (
                  <div key={i} className="bg-black/20 rounded-lg p-3 flex items-start gap-3">
                    <img src={SAMPLE_IMAGES.find(img => img.name === h.image)?.url || ''} alt="" className="w-12 h-12 rounded-lg object-cover shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-slate-400 font-bold">{h.image}</p>
                      <p className="text-xs text-slate-300 font-mono mt-0.5">{h.output.slice(0, 80)}...</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[10px] text-slate-600">ID: {h.jobId.slice(0, 12)}...</span>
                        {h.txUrl && (
                          <a href={h.txUrl} target="_blank" rel="noreferrer" className="text-[10px] text-cyan-400 hover:text-cyan-200 flex items-center gap-0.5">
                            <span className="material-symbols-outlined text-[10px]">open_in_new</span> Proof
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
