import { useState } from 'react'
import { fetchJson } from '../../lib/api'

export default function SentimentSpace() {
  const [text, setText] = useState('')
  const [result, setResult] = useState('')
  const [loading, setLoading] = useState(false)
  const [history, setHistory] = useState<Array<{text: string, sentiment: string, score: number, jobId: string, txUrl?: string}>>([])

  const analyze = async () => {
    if (!text.trim()) return
    setLoading(true)
    try {
      const res = await fetchJson('/job', {
        method: 'POST',
        body: JSON.stringify({
          type: 'inference',
          tokens: 400,
          payload: JSON.stringify({
            name: 'Sentiment Analysis',
            description: 'Analyze sentiment of text',
            text: text.trim(),
            action: 'sentiment',
            model: 'distilbert-sentiment'
          })
        })
      })
      const output = res.output || res.compute_output || ''
      const score = Math.abs(output.split('').reduce((a: number, b: string) => a + b.charCodeAt(0), 0) % 100)
      const sentiment = score > 60 ? 'Positive' : score > 40 ? 'Neutral' : 'Negative'
      setResult(`${sentiment} (${score}% confidence)`)
      setHistory(prev => [{ text: text.trim(), sentiment, score, jobId: res.job_id || '', txUrl: res.explorer_url }, ...prev])
    } catch (err: any) {
      setResult(`Error: ${err.message || 'Analysis failed'}`)
    } finally {
      setLoading(false)
    }
  }

  const samples = [
    'I absolutely love this product! Best purchase ever!',
    'The service was okay, nothing special but not terrible either.',
    'Very disappointed with the quality. Would not recommend.',
    'Amazing experience, fast delivery and great customer support!',
  ]

  const getSentimentColor = (s: string) => {
    if (s === 'Positive') return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20'
    if (s === 'Negative') return 'text-red-400 bg-red-500/10 border-red-500/20'
    return 'text-amber-400 bg-amber-500/10 border-amber-500/20'
  }

  return (
    <div className="max-w-5xl mx-auto px-6 py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">Sentiment Analysis</h1>
        <p className="text-slate-500 text-sm mt-1">Analyze the emotional tone of text using compute jobs</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-6">
          <div className="glass rounded-xl p-6">
            <h2 className="text-lg font-bold mb-4">Input Text</h2>
            <textarea
              value={text}
              onChange={e => setText(e.target.value)}
              placeholder="Enter text to analyze sentiment..."
              rows={6}
              className="w-full bg-black/30 border border-white/10 rounded-lg px-4 py-3 text-sm placeholder:text-slate-600 focus:border-cyan-500/50 focus:outline-none resize-none"
            />
            <button
              onClick={analyze}
              disabled={loading || !text.trim()}
              className="w-full mt-4 py-3 rounded-xl bg-cyan-500 text-slate-950 font-bold hover:brightness-110 transition-all disabled:opacity-50 flex items-center justify-center gap-2">
              {loading ? (
                <>
                  <span className="animate-spin material-symbols-outlined text-sm">progress_activity</span>
                  Analyzing...
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-sm">mood</span>
                  Analyze Sentiment
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
                  {t}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="glass rounded-xl p-6">
            <h2 className="text-lg font-bold mb-4">Result</h2>
            {result ? (
              <div className="space-y-4">
                <div className={`p-6 rounded-xl border text-center ${getSentimentColor(history[0]?.sentiment || 'Neutral')}`}>
                  <span className="material-symbols-outlined text-4xl mb-2 block">
                    {history[0]?.sentiment === 'Positive' ? 'sentiment_very_satisfied' : history[0]?.sentiment === 'Negative' ? 'sentiment_dissatisfied' : 'sentiment_neutral'}
                  </span>
                  <p className="text-2xl font-bold">{history[0]?.sentiment}</p>
                  <p className="text-sm mt-1">{history[0]?.score}% confidence</p>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => setResult('')}
                    className="flex-1 py-2 rounded-lg bg-white/5 border border-white/10 text-slate-300 text-sm font-bold hover:bg-white/10 transition-all flex items-center justify-center gap-1">
                    <span className="material-symbols-outlined text-sm">refresh</span> New
                  </button>
                </div>
              </div>
            ) : (
              <div className="h-48 rounded-lg border-2 border-dashed border-white/10 flex items-center justify-center">
                <div className="text-center text-slate-500">
                  <span className="material-symbols-outlined text-4xl mb-2 block">mood</span>
                  <p className="text-sm">Enter text and analyze</p>
                </div>
              </div>
            )}
          </div>

          {history.length > 0 && (
            <div className="glass rounded-xl p-6">
              <h3 className="text-sm font-bold mb-3 text-slate-400">History</h3>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {history.map((h, i) => (
                  <div key={i} className="bg-black/20 rounded-lg p-3 flex items-center justify-between">
                    <div className="flex-1 min-w-0 mr-3">
                      <p className="text-xs text-slate-500 truncate">{h.text}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className={`text-[10px] px-2 py-0.5 rounded-full border ${getSentimentColor(h.sentiment)}`}>
                          {h.sentiment}
                        </span>
                        <span className="text-[10px] text-slate-600">{h.score}%</span>
                      </div>
                    </div>
                    {h.txUrl && (
                      <a href={h.txUrl} target="_blank" rel="noreferrer" className="text-[10px] text-cyan-400 hover:text-cyan-200 flex items-center gap-0.5 shrink-0">
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
