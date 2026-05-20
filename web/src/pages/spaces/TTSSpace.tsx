import { useState } from 'react'
import { fetchJson } from '../../lib/api'

const VOICES = [
  { id: 'alloy', name: 'Alloy', desc: 'Balanced and neutral' },
  { id: 'echo', name: 'Echo', desc: 'Warm and expressive' },
  { id: 'fable', name: 'Fable', desc: 'British accent' },
  { id: 'onyx', name: 'Onyx', desc: 'Deep and authoritative' },
  { id: 'nova', name: 'Nova', desc: 'Energetic and bright' },
  { id: 'shimmer', name: 'Shimmer', desc: 'Optimistic and clear' },
]

export default function TTSSpace() {
  const [text, setText] = useState('')
  const [voice, setVoice] = useState('alloy')
  const [result, setResult] = useState('')
  const [loading, setLoading] = useState(false)
  const [history, setHistory] = useState<Array<{text: string, voice: string, output: string, jobId: string, txUrl?: string}>>([])

  const synthesize = async () => {
    if (!text.trim()) return
    setLoading(true)
    try {
      const res = await fetchJson('/job', {
        method: 'POST',
        body: JSON.stringify({
          type: 'audio',
          tokens: 700,
          payload: JSON.stringify({
            name: 'Text to Speech',
            description: 'Convert text to speech',
            text: text.trim(),
            voice: voice,
            action: 'tts',
            model: 'tts-1'
          })
        })
      })
      const output = res.output || res.compute_output || 'Speech synthesis completed'
      setResult(output)
      setHistory(prev => [{ text: text.trim(), voice, output, jobId: res.job_id || '', txUrl: res.explorer_url }, ...prev])
    } catch (err: any) {
      setResult(`Error: ${err.message || 'Synthesis failed'}`)
    } finally {
      setLoading(false)
    }
  }

  const samples = [
    'Welcome to the decentralized compute marketplace. Your job is now being processed by a network of GPU providers.',
    'Hello! I am an AI assistant powered by decentralized compute infrastructure.',
    'The future of artificial intelligence lies in distributed, trustless computing networks.',
  ]

  const getVoiceIcon = (v: string) => {
    if (v === 'nova' || v === 'shimmer') return 'face_3'
    if (v === 'onyx') return 'face_6'
    return 'face'
  }

  return (
    <div className="max-w-5xl mx-auto px-6 py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">Text to Speech</h1>
        <p className="text-slate-500 text-sm mt-1">Convert text to natural speech via compute jobs</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-6">
          <div className="glass rounded-xl p-6">
            <h2 className="text-lg font-bold mb-4">Input Text</h2>
            <textarea
              value={text}
              onChange={e => setText(e.target.value)}
              placeholder="Enter text to convert to speech..."
              rows={6}
              className="w-full bg-black/30 border border-white/10 rounded-lg px-4 py-3 text-sm placeholder:text-slate-600 focus:border-cyan-500/50 focus:outline-none resize-none"
            />
            <div className="mt-4">
              <label className="text-xs text-slate-500 mb-2 block">Voice</label>
              <div className="grid grid-cols-3 gap-2">
                {VOICES.map(v => (
                  <button
                    key={v.id}
                    onClick={() => setVoice(v.id)}
                    className={`px-2 py-2 rounded-lg text-xs font-bold border transition-all flex flex-col items-center gap-1 ${
                      voice === v.id
                        ? 'bg-cyan-500/20 border-cyan-500/40 text-cyan-400'
                        : 'bg-white/5 border-white/10 text-slate-400 hover:bg-white/10'
                    }`}>
                    <span className="material-symbols-outlined text-sm">{getVoiceIcon(v.id)}</span>
                    {v.name}
                    <span className="text-[9px] text-slate-500 font-normal">{v.desc}</span>
                  </button>
                ))}
              </div>
            </div>
            <button
              onClick={synthesize}
              disabled={loading || !text.trim()}
              className="w-full mt-4 py-3 rounded-xl bg-cyan-500 text-slate-950 font-bold hover:brightness-110 transition-all disabled:opacity-50 flex items-center justify-center gap-2">
              {loading ? (
                <>
                  <span className="animate-spin material-symbols-outlined text-sm">progress_activity</span>
                  Synthesizing...
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-sm">record_voice_over</span>
                  Synthesize
                </>
              )}
            </button>
          </div>

          <div className="glass rounded-xl p-6">
            <h3 className="text-sm font-bold mb-3 text-slate-400">Sample Texts</h3>
            <div className="space-y-2">
              {samples.map((t, i) => (
                <button key={i} onClick={() => setText(t)}
                  className="w-full text-left text-xs px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-slate-400 hover:text-slate-300 hover:bg-white/10 transition-all">
                  {t.slice(0, 80)}...
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="glass rounded-xl p-6">
            <h2 className="text-lg font-bold mb-4">Audio Result</h2>
            {result ? (
              <div className="space-y-4">
                <div className="bg-black/30 border border-white/10 rounded-lg p-6 flex flex-col items-center justify-center">
                  <div className="w-20 h-20 rounded-full bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center mb-3">
                    <span className="material-symbols-outlined text-3xl text-cyan-400">graphic_eq</span>
                  </div>
                  <p className="text-sm text-slate-300 font-mono">{result.slice(0, 40)}...</p>
                  <p className="text-xs text-slate-500 mt-2">Voice: {VOICES.find(v => v.id === voice)?.name}</p>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => navigator.clipboard.writeText(result)}
                    className="flex-1 py-2 rounded-lg bg-white/5 border border-white/10 text-slate-300 text-sm font-bold hover:bg-white/10 transition-all flex items-center justify-center gap-1">
                    <span className="material-symbols-outlined text-sm">content_copy</span> Copy Hash
                  </button>
                  <button onClick={() => { setText(''); setResult('') }}
                    className="flex-1 py-2 rounded-lg bg-white/5 border border-white/10 text-slate-300 text-sm font-bold hover:bg-white/10 transition-all flex items-center justify-center gap-1">
                    <span className="material-symbols-outlined text-sm">refresh</span> New
                  </button>
                </div>
              </div>
            ) : (
              <div className="h-64 rounded-lg border-2 border-dashed border-white/10 flex items-center justify-center">
                <div className="text-center text-slate-500">
                  <span className="material-symbols-outlined text-4xl mb-2 block">record_voice_over</span>
                  <p className="text-sm">Enter text and click Synthesize</p>
                </div>
              </div>
            )}
          </div>

          {history.length > 0 && (
            <div className="glass rounded-xl p-6">
              <h3 className="text-sm font-bold mb-3 text-slate-400">History</h3>
              <div className="space-y-3 max-h-64 overflow-y-auto">
                {history.map((h, i) => (
                  <div key={i} className="bg-black/20 rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">{h.voice}</span>
                      <span className="text-[10px] text-slate-600">ID: {h.jobId.slice(0, 12)}...</span>
                    </div>
                    <p className="text-xs text-slate-500">{h.text.slice(0, 50)}...</p>
                    {h.txUrl && (
                      <a href={h.txUrl} target="_blank" rel="noreferrer" className="text-[10px] text-cyan-400 hover:text-cyan-200 flex items-center gap-0.5 mt-1">
                        <span className="material-symbols-outlined text-[10px]">open_in_new</span> Proof
                      </a>
                    )}
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
