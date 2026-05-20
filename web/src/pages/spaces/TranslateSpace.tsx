import { useState } from 'react'
import { fetchJson } from '../../lib/api'

const LANGUAGES = [
  { code: 'es', name: 'Spanish', flag: 'ES' },
  { code: 'fr', name: 'French', flag: 'FR' },
  { code: 'de', name: 'German', flag: 'DE' },
  { code: 'zh', name: 'Chinese', flag: 'CN' },
  { code: 'ja', name: 'Japanese', flag: 'JP' },
  { code: 'ko', name: 'Korean', flag: 'KR' },
  { code: 'ar', name: 'Arabic', flag: 'AE' },
  { code: 'hi', name: 'Hindi', flag: 'IN' },
  { code: 'pt', name: 'Portuguese', flag: 'PT' },
  { code: 'ru', name: 'Russian', flag: 'RU' },
]

export default function TranslateSpace() {
  const [text, setText] = useState('')
  const [targetLang, setTargetLang] = useState('es')
  const [result, setResult] = useState('')
  const [loading, setLoading] = useState(false)
  const [history, setHistory] = useState<Array<{text: string, lang: string, output: string, jobId: string, txUrl?: string}>>([])

  const translate = async () => {
    if (!text.trim()) return
    setLoading(true)
    try {
      const res = await fetchJson('/job', {
        method: 'POST',
        body: JSON.stringify({
          type: 'inference',
          tokens: 600,
          payload: JSON.stringify({
            name: 'Translation',
            description: 'Translate text',
            text: text.trim(),
            target_language: targetLang,
            action: 'translate',
            model: 'nllb-200'
          })
        })
      })
      const output = res.output || res.compute_output || 'Translation completed'
      const langName = LANGUAGES.find(l => l.code === targetLang)?.name || targetLang
      setResult(output)
      setHistory(prev => [{ text: text.trim(), lang: langName, output, jobId: res.job_id || '', txUrl: res.explorer_url }, ...prev])
    } catch (err: any) {
      setResult(`Error: ${err.message || 'Translation failed'}`)
    } finally {
      setLoading(false)
    }
  }

  const samples = [
    { text: 'Hello, how are you today?', lang: 'es' },
    { text: 'The future of AI is decentralized computing.', lang: 'fr' },
    { text: 'Blockchain technology enables trustless transactions.', lang: 'de' },
  ]

  return (
    <div className="max-w-5xl mx-auto px-6 py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">Translation</h1>
        <p className="text-slate-500 text-sm mt-1">Translate text between languages via compute jobs</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-6">
          <div className="glass rounded-xl p-6">
            <h2 className="text-lg font-bold mb-4">Input</h2>
            <textarea
              value={text}
              onChange={e => setText(e.target.value)}
              placeholder="Enter text to translate..."
              rows={6}
              className="w-full bg-black/30 border border-white/10 rounded-lg px-4 py-3 text-sm placeholder:text-slate-600 focus:border-cyan-500/50 focus:outline-none resize-none"
            />
            <div className="mt-4">
              <label className="text-xs text-slate-500 mb-2 block">Target Language</label>
              <div className="grid grid-cols-5 gap-2">
                {LANGUAGES.map(l => (
                  <button
                    key={l.code}
                    onClick={() => setTargetLang(l.code)}
                    className={`px-2 py-1.5 rounded-lg text-xs font-bold border transition-all ${
                      targetLang === l.code
                        ? 'bg-cyan-500/20 border-cyan-500/40 text-cyan-400'
                        : 'bg-white/5 border-white/10 text-slate-400 hover:bg-white/10'
                    }`}>
                    {l.name}
                  </button>
                ))}
              </div>
            </div>
            <button
              onClick={translate}
              disabled={loading || !text.trim()}
              className="w-full mt-4 py-3 rounded-xl bg-cyan-500 text-slate-950 font-bold hover:brightness-110 transition-all disabled:opacity-50 flex items-center justify-center gap-2">
              {loading ? (
                <>
                  <span className="animate-spin material-symbols-outlined text-sm">progress_activity</span>
                  Translating...
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-sm">translate</span>
                  Translate
                </>
              )}
            </button>
          </div>

          <div className="glass rounded-xl p-6">
            <h3 className="text-sm font-bold mb-3 text-slate-400">Quick Samples</h3>
            <div className="space-y-2">
              {samples.map((s, i) => (
                <button key={i} onClick={() => { setText(s.text); setTargetLang(s.lang) }}
                  className="w-full text-left text-xs px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-slate-400 hover:text-slate-300 hover:bg-white/10 transition-all">
                  {s.text} <span className="text-slate-600">{'->'} {LANGUAGES.find(l => l.code === s.lang)?.name}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="glass rounded-xl p-6">
            <h2 className="text-lg font-bold mb-4">Translation</h2>
            {result ? (
              <div className="space-y-4">
                <div className="bg-black/30 border border-white/10 rounded-lg p-4">
                  <p className="text-sm text-slate-300 whitespace-pre-wrap">{result}</p>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => navigator.clipboard.writeText(result)}
                    className="flex-1 py-2 rounded-lg bg-white/5 border border-white/10 text-slate-300 text-sm font-bold hover:bg-white/10 transition-all flex items-center justify-center gap-1">
                    <span className="material-symbols-outlined text-sm">content_copy</span> Copy
                  </button>
                  <button onClick={() => { setText(''); setResult('') }}
                    className="flex-1 py-2 rounded-lg bg-white/5 border border-white/10 text-slate-300 text-sm font-bold hover:bg-white/10 transition-all flex items-center justify-center gap-1">
                    <span className="material-symbols-outlined text-sm">refresh</span> New
                  </button>
                </div>
              </div>
            ) : (
              <div className="h-48 rounded-lg border-2 border-dashed border-white/10 flex items-center justify-center">
                <div className="text-center text-slate-500">
                  <span className="material-symbols-outlined text-4xl mb-2 block">translate</span>
                  <p className="text-sm">Enter text and select a language</p>
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
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">{h.lang}</span>
                      <span className="text-[10px] text-slate-600">ID: {h.jobId.slice(0, 12)}...</span>
                    </div>
                    <p className="text-xs text-slate-500">{h.text.slice(0, 50)}...</p>
                    <p className="text-xs text-slate-300 mt-0.5">{h.output.slice(0, 60)}...</p>
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
