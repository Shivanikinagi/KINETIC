import { useState } from 'react'
import { fetchJson } from '../../lib/api'

export default function SummarizeSpace() {
  const [text, setText] = useState('')
  const [length, setLength] = useState<'short' | 'medium' | 'long'>('medium')
  const [result, setResult] = useState('')
  const [loading, setLoading] = useState(false)
  const [history, setHistory] = useState<Array<{input: string, output: string, jobId: string, txUrl?: string}>>([])

  const handleSummarize = async () => {
    if (!text.trim()) return
    setLoading(true)
    try {
      const res = await fetchJson('/job', {
        method: 'POST',
        body: JSON.stringify({
          type: 'inference',
          tokens: 800,
          payload: JSON.stringify({
            name: 'Text Summarization',
            description: 'Summarize long text',
            text: text.trim(),
            action: 'summarize',
            length: length,
            model: 'bart-large-cnn'
          })
        })
      })
      const output = res.output || res.compute_output || 'Summarization completed'
      setResult(output)
      setHistory(prev => [{ input: text.trim().slice(0, 100), output, jobId: res.job_id || '', txUrl: res.explorer_url }, ...prev])
    } catch (err: any) {
      setResult(`Error: ${err.message || 'Summarization failed'}`)
    } finally {
      setLoading(false)
    }
  }

  const sampleTexts = [
    'Artificial intelligence (AI) is transforming industries worldwide. From healthcare to finance, AI-powered systems are automating tasks, improving decision-making, and enabling new capabilities that were previously impossible. Machine learning, a subset of AI, allows computers to learn from data without explicit programming.',
    'The Algorand blockchain uses a pure proof-of-stake consensus mechanism that enables fast, secure, and decentralized transactions. Founded by MIT professor Silvio Micali, Algorand solves the blockchain trilemma by achieving scalability, security, and decentralization simultaneously.',
    'Decentralized compute marketplaces allow users to rent GPU power from providers around the world. This creates a more efficient and accessible infrastructure for AI training, inference, and other compute-intensive tasks.',
  ]

  return (
    <div className="max-w-5xl mx-auto px-6 py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">Text Summarizer</h1>
        <p className="text-slate-500 text-sm mt-1">Summarize long articles and documents into key points</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-6">
          <div className="glass rounded-xl p-6">
            <h2 className="text-lg font-bold mb-4">Input Text</h2>
            <textarea
              value={text}
              onChange={e => setText(e.target.value)}
              placeholder="Paste text to summarize..."
              rows={10}
              className="w-full bg-black/30 border border-white/10 rounded-lg px-4 py-3 text-sm placeholder:text-slate-600 focus:border-cyan-500/50 focus:outline-none resize-none"
            />
            <div className="flex items-center gap-3 mt-4">
              <span className="text-xs text-slate-500">Length:</span>
              {(['short', 'medium', 'long'] as const).map(l => (
                <button
                  key={l}
                  onClick={() => setLength(l)}
                  className={`px-3 py-1 rounded-lg text-xs font-bold border transition-all ${
                    length === l
                      ? 'bg-cyan-500/20 border-cyan-500/40 text-cyan-400'
                      : 'bg-white/5 border-white/10 text-slate-400 hover:bg-white/10'
                  }`}>
                  {l.charAt(0).toUpperCase() + l.slice(1)}
                </button>
              ))}
            </div>
            <div className="flex items-center justify-between mt-4">
              <span className="text-xs text-slate-500">{text.length} chars</span>
              <button
                onClick={handleSummarize}
                disabled={loading || !text.trim()}
                className="px-6 py-2.5 rounded-lg bg-cyan-500 text-slate-950 font-bold hover:brightness-110 transition-all disabled:opacity-50 flex items-center gap-2">
                {loading ? (
                  <>
                    <span className="animate-spin material-symbols-outlined text-sm">progress_activity</span>
                    Summarizing...
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-sm">summarize</span>
                    Summarize
                  </>
                )}
              </button>
            </div>
          </div>

          <div className="glass rounded-xl p-6">
            <h3 className="text-sm font-bold mb-3 text-slate-400">Sample Texts</h3>
            <div className="space-y-2">
              {sampleTexts.map((t, i) => (
                <button
                  key={i}
                  onClick={() => setText(t)}
                  className="w-full text-left text-xs px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-slate-400 hover:text-slate-300 hover:bg-white/10 transition-all">
                  {t.slice(0, 80)}...
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="glass rounded-xl p-6">
            <h2 className="text-lg font-bold mb-4">Summary</h2>
            {result ? (
              <div className="space-y-4">
                <div className="bg-black/30 border border-white/10 rounded-lg p-4">
                  <p className="text-sm text-slate-300 whitespace-pre-wrap leading-relaxed">{result}</p>
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
                  <span className="material-symbols-outlined text-4xl mb-2 block">summarize</span>
                  <p className="text-sm">Paste text and click Summarize</p>
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
                    <p className="text-xs text-slate-500">{h.input}...</p>
                    <p className="text-xs text-slate-300 mt-0.5">{h.output.slice(0, 60)}...</p>
                    <div className="flex items-center gap-2 mt-1">
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
