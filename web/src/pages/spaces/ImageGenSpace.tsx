import { useState } from 'react'
import { fetchJson } from '../../lib/api'

export default function ImageGenSpace() {
  const [prompt, setPrompt] = useState('')
  const [result, setResult] = useState('')
  const [loading, setLoading] = useState(false)
  const [jobId, setJobId] = useState('')
  const [txUrl, setTxUrl] = useState('')
  const [imageUrl, setImageUrl] = useState('')
  const [history, setHistory] = useState<Array<{prompt: string, output: string, jobId: string, txUrl?: string, imageUrl: string}>>([])

  const handleGenerate = async () => {
    if (!prompt.trim()) return
    
    setLoading(true)
    setResult('')
    setImageUrl('')

    try {
      // 1. Submit compute job for proof/transaction
      const res = await fetchJson('/job', {
        method: 'POST',
        body: JSON.stringify({
          type: 'image_generation',
          tokens: 1200,
          payload: JSON.stringify({
            name: 'Image Generation',
            description: 'Generate image from prompt',
            prompt: prompt.trim(),
            model: 'stable-diffusion-xl',
            width: 1024,
            height: 1024,
            steps: 30
          })
        })
      })

      const output = res.output || res.compute_output || res.result_hash || 'Image generation job completed'
      const jid = res.job_id || ''
      const tx = res.explorer_url || ''
      const localImageUrl = jid ? `/job/${jid}/image` : ''

      setJobId(jid)
      setTxUrl(tx)
      setResult(output)
      setImageUrl(localImageUrl)
      setHistory(prev => [{ prompt: prompt.trim(), output, jobId: jid, txUrl: tx, imageUrl: localImageUrl }, ...prev])
    } catch (err: any) {
      setResult(`Error: ${err.message || 'Failed to generate image'}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-6xl mx-auto px-6 py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">SDXL Image Generator</h1>
        <p className="text-slate-500 text-sm mt-1">Generate real AI images via compute jobs on the decentralized network</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Input Panel */}
        <div className="space-y-6">
          <div className="glass rounded-xl p-6">
            <h2 className="text-lg font-bold mb-4">Prompt</h2>
            <textarea
              value={prompt}
              onChange={e => setPrompt(e.target.value)}
              placeholder="Describe the image you want to generate...&#10;&#10;Example: A serene mountain landscape at sunset with a crystal clear lake reflecting the orange sky, photorealistic, 8k, highly detailed"
              rows={8}
              className="w-full bg-black/30 border border-white/10 rounded-lg px-4 py-3 text-sm placeholder:text-slate-600 focus:border-cyan-500/50 focus:outline-none resize-none"
            />
            
            <div className="mt-4 space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-400">Size</span>
                <span className="text-slate-300 font-mono">1024 x 1024</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-400">Steps</span>
                <span className="text-slate-300 font-mono">30</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-400">Cost</span>
                <span className="text-cyan-400 font-mono">~1.2 ALGO</span>
              </div>
            </div>

            <button
              onClick={handleGenerate}
              disabled={loading || !prompt.trim()}
              className="w-full mt-6 py-3 rounded-xl bg-cyan-500 text-slate-950 font-bold hover:brightness-110 transition-all disabled:opacity-50 flex items-center justify-center gap-2">
              {loading ? (
                <>
                  <span className="animate-spin material-symbols-outlined">progress_activity</span>
                  Generating...
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined">auto_awesome</span>
                  Generate Image
                </>
              )}
            </button>
          </div>

          {/* Example Prompts */}
          <div className="glass rounded-xl p-6">
            <h3 className="text-sm font-bold mb-3 text-slate-400">Example Prompts</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {[
                'A futuristic city with flying cars at night, neon lights, cyberpunk style',
                'A cute corgi wearing sunglasses on a beach, professional photography',
                'Abstract geometric patterns in blue and purple, digital art',
                'A cozy coffee shop interior with warm lighting, cinematic'
              ].map((ex, i) => (
                <button
                  key={i}
                  onClick={() => setPrompt(ex)}
                  className="text-left text-xs px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-slate-400 hover:text-slate-300 hover:bg-white/10 transition-all">
                  {ex}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Output Panel */}
        <div className="space-y-6">
          <div className="glass rounded-xl p-6">
            <h2 className="text-lg font-bold mb-4">Result</h2>
            {result ? (
              <div className="space-y-4">
                {/* REAL Generated Image */}
                {imageUrl && (
                  <div className="aspect-square rounded-lg overflow-hidden border border-white/10 bg-black/20">
                    <img src={imageUrl} alt={prompt} className="w-full h-full object-cover" />
                  </div>
                )}
                <div className="bg-black/30 border border-white/10 rounded-lg p-4">
                  <p className="text-sm text-slate-300 whitespace-pre-wrap font-mono">{result}</p>
                </div>
                {jobId && (
                  <div className="text-xs text-slate-500">
                    Job ID: <span className="font-mono text-cyan-400">{jobId}</span>
                  </div>
                )}
                {txUrl && (
                  <a href={txUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs text-cyan-400 hover:text-cyan-200">
                    <span className="material-symbols-outlined text-xs">open_in_new</span> View on-chain proof
                  </a>
                )}
                <div className="flex gap-2">
                  <button
                    onClick={() => { if (imageUrl) window.open(imageUrl, '_blank') }}
                    disabled={!imageUrl}
                    className="flex-1 py-2 rounded-lg bg-white/5 border border-white/10 text-slate-300 text-sm font-bold hover:bg-white/10 transition-all flex items-center justify-center gap-1 disabled:opacity-50">
                    <span className="material-symbols-outlined text-sm">download</span> Download
                  </button>
                  <button
                    onClick={() => { setPrompt(''); setResult(''); setJobId(''); setTxUrl(''); setImageUrl('') }}
                    className="flex-1 py-2 rounded-lg bg-white/5 border border-white/10 text-slate-300 text-sm font-bold hover:bg-white/10 transition-all flex items-center justify-center gap-1">
                    <span className="material-symbols-outlined text-sm">refresh</span> New
                  </button>
                </div>
              </div>
            ) : (
              <div className="h-64 rounded-lg border-2 border-dashed border-white/10 flex items-center justify-center">
                <div className="text-center text-slate-500">
                  <span className="material-symbols-outlined text-4xl mb-2 block">image</span>
                  <p className="text-sm">Enter a prompt and click Generate</p>
                </div>
              </div>
            )}
          </div>

          {/* History */}
          {history.length > 0 && (
            <div className="glass rounded-xl p-6">
              <h3 className="text-sm font-bold mb-3 text-slate-400">History</h3>
              <div className="space-y-3 max-h-80 overflow-y-auto">
                {history.map((h, i) => (
                  <div key={i} className="bg-black/20 rounded-lg p-3">
                    <div className="flex gap-3 mb-2">
                      <img src={h.imageUrl} alt="" className="w-16 h-16 rounded-lg object-cover shrink-0" loading="lazy" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-slate-500">Prompt: <span className="text-slate-400">{h.prompt.slice(0, 40)}...</span></p>
                        <p className="text-xs text-slate-300 font-mono mt-0.5">{h.output.slice(0, 40)}...</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-slate-600">ID: {h.jobId.slice(0, 12)}...</span>
                      {h.txUrl && (
                        <a href={h.txUrl} target="_blank" rel="noreferrer" className="text-[10px] text-cyan-400 hover:text-cyan-200 flex items-center gap-0.5">
                          <span className="material-symbols-outlined text-[10px]">open_in_new</span> Proof
                        </a>
                      )}
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
