import { useState } from 'react'
import { fetchJson } from '../../lib/api'

const LANGUAGES = [
  { id: 'python', name: 'Python', icon: 'code' },
  { id: 'javascript', name: 'JavaScript', icon: 'javascript' },
  { id: 'typescript', name: 'TypeScript', icon: 'code_blocks' },
  { id: 'rust', name: 'Rust', icon: 'memory' },
  { id: 'go', name: 'Go', icon: 'terminal' },
  { id: 'solidity', name: 'Solidity', icon: 'account_balance_wallet' },
]

export default function CodeGenSpace() {
  const [prompt, setPrompt] = useState('')
  const [lang, setLang] = useState('python')
  const [result, setResult] = useState('')
  const [loading, setLoading] = useState(false)
  const [history, setHistory] = useState<Array<{prompt: string, lang: string, output: string, jobId: string, txUrl?: string}>>([])

  const generate = async () => {
    if (!prompt.trim()) return
    setLoading(true)
    try {
      const res = await fetchJson('/job', {
        method: 'POST',
        body: JSON.stringify({
          type: 'inference',
          tokens: 1000,
          payload: JSON.stringify({
            name: 'Code Generation',
            description: 'Generate code from description',
            prompt: prompt.trim(),
            language: lang,
            action: 'code_gen',
            model: 'codellama-7b'
          })
        })
      })
      const output = res.output || res.compute_output || 'Code generation completed'
      setResult(output)
      setHistory(prev => [{ prompt: prompt.trim(), lang, output, jobId: res.job_id || '', txUrl: res.explorer_url }, ...prev])
    } catch (err: any) {
      setResult(`Error: ${err.message || 'Generation failed'}`)
    } finally {
      setLoading(false)
    }
  }

  const samples = [
    { text: 'Write a function to reverse a linked list', lang: 'python' },
    { text: 'Create a React component for a todo list', lang: 'typescript' },
    { text: 'Implement a smart contract for an NFT marketplace', lang: 'solidity' },
    { text: 'Build an HTTP server with routing', lang: 'go' },
  ]

  return (
    <div className="max-w-5xl mx-auto px-6 py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">Code Copilot</h1>
        <p className="text-slate-500 text-sm mt-1">Generate code in multiple languages via compute jobs</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-6">
          <div className="glass rounded-xl p-6">
            <h2 className="text-lg font-bold mb-4">Prompt</h2>
            <textarea
              value={prompt}
              onChange={e => setPrompt(e.target.value)}
              placeholder="Describe what you want to build...&#10;&#10;Example: Write a Python function that computes the Fibonacci sequence using memoization"
              rows={6}
              className="w-full bg-black/30 border border-white/10 rounded-lg px-4 py-3 text-sm placeholder:text-slate-600 focus:border-cyan-500/50 focus:outline-none resize-none"
            />
            <div className="mt-4">
              <label className="text-xs text-slate-500 mb-2 block">Language</label>
              <div className="grid grid-cols-3 gap-2">
                {LANGUAGES.map(l => (
                  <button key={l.id} onClick={() => setLang(l.id)}
                    className={`px-2 py-1.5 rounded-lg text-xs font-bold border transition-all flex items-center justify-center gap-1 ${
                      lang === l.id
                        ? 'bg-cyan-500/20 border-cyan-500/40 text-cyan-400'
                        : 'bg-white/5 border-white/10 text-slate-400 hover:bg-white/10'
                    }`}>
                    <span className="material-symbols-outlined text-xs">{l.icon}</span>
                    {l.name}
                  </button>
                ))}
              </div>
            </div>
            <button
              onClick={generate}
              disabled={loading || !prompt.trim()}
              className="w-full mt-4 py-3 rounded-xl bg-cyan-500 text-slate-950 font-bold hover:brightness-110 transition-all disabled:opacity-50 flex items-center justify-center gap-2">
              {loading ? (
                <>
                  <span className="animate-spin material-symbols-outlined text-sm">progress_activity</span>
                  Generating...
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-sm">code</span>
                  Generate Code
                </>
              )}
            </button>
          </div>

          <div className="glass rounded-xl p-6">
            <h3 className="text-sm font-bold mb-3 text-slate-400">Examples</h3>
            <div className="space-y-2">
              {samples.map((s, i) => (
                <button key={i} onClick={() => { setPrompt(s.text); setLang(s.lang) }}
                  className="w-full text-left text-xs px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-slate-400 hover:text-slate-300 hover:bg-white/10 transition-all">
                  <span className="text-cyan-400 font-bold">{LANGUAGES.find(l => l.id === s.lang)?.name}</span>: {s.text}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="glass rounded-xl p-6">
            <h2 className="text-lg font-bold mb-4">Generated Code</h2>
            {result ? (
              <div className="space-y-4">
                <div className="bg-black/40 border border-white/10 rounded-lg p-4 overflow-x-auto">
                  <pre className="text-xs text-slate-300 font-mono whitespace-pre-wrap">{result}</pre>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => navigator.clipboard.writeText(result)}
                    className="flex-1 py-2 rounded-lg bg-white/5 border border-white/10 text-slate-300 text-sm font-bold hover:bg-white/10 transition-all flex items-center justify-center gap-1">
                    <span className="material-symbols-outlined text-sm">content_copy</span> Copy
                  </button>
                  <button onClick={() => { setPrompt(''); setResult('') }}
                    className="flex-1 py-2 rounded-lg bg-white/5 border border-white/10 text-slate-300 text-sm font-bold hover:bg-white/10 transition-all flex items-center justify-center gap-1">
                    <span className="material-symbols-outlined text-sm">refresh</span> New
                  </button>
                </div>
              </div>
            ) : (
              <div className="h-64 rounded-lg border-2 border-dashed border-white/10 flex items-center justify-center">
                <div className="text-center text-slate-500">
                  <span className="material-symbols-outlined text-4xl mb-2 block">code_blocks</span>
                  <p className="text-sm">Describe your code and click Generate</p>
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
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-violet-500/10 text-violet-400 border border-violet-500/20">{h.lang}</span>
                      <span className="text-[10px] text-slate-600">ID: {h.jobId.slice(0, 12)}...</span>
                    </div>
                    <p className="text-xs text-slate-500">{h.prompt.slice(0, 50)}...</p>
                    <p className="text-xs text-slate-300 font-mono mt-0.5">{h.output.slice(0, 60)}...</p>
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
