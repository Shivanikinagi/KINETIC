import { useState } from 'react'
import { fetchJson } from '../../lib/api'

export default function ChatSpace() {
  const [messages, setMessages] = useState<Array<{role: string, content: string}>>([
    { role: 'assistant', content: 'Hi! I\'m running on Kinetic compute marketplace. Ask me anything and I\'ll process it through a decentralized compute job!' }
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSend = async () => {
    if (!input.trim()) return
    
    const userMsg = input.trim()
    setMessages(prev => [...prev, { role: 'user', content: userMsg }])
    setInput('')
    setLoading(true)

    try {
      const result = await fetchJson('/job', {
        method: 'POST',
        body: JSON.stringify({
          type: 'inference',
          tokens: 500,
          payload: JSON.stringify({
            name: 'Chat Inference',
            description: 'Interactive chat demo',
            prompt: userMsg,
            model: 'llama-3-8b',
            max_tokens: 500
          })
        })
      })

      const response = result.output || result.compute_output || result.result_hash || 'Compute job completed successfully'
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: `Result: ${response}\n\nJob ID: ${result.job_id || 'unknown'}${result.explorer_url ? '\nProof: ' + result.explorer_url : ''}` 
      }])
    } catch (err: any) {
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: `Error: ${err.message || 'Failed to get response'}` 
      }])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto px-6 py-8 h-[calc(100vh-140px)] flex flex-col">
      <div className="mb-4">
        <h1 className="text-3xl font-bold tracking-tight">Chat with Llama 3</h1>
        <p className="text-slate-500 text-sm mt-1">Interactive demo powered by Kinetic compute marketplace</p>
      </div>

      <div className="flex-1 glass rounded-xl p-4 overflow-y-auto mb-4 space-y-4">
        {messages.map((msg, i) => (
          <div key={i} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
              msg.role === 'user' ? 'bg-cyan-500/20 text-cyan-400' : 'bg-violet-500/20 text-violet-400'
            }`}>
              <span className="material-symbols-outlined text-sm">
                {msg.role === 'user' ? 'person' : 'smart_toy'}
              </span>
            </div>
            <div className={`max-w-[80%] ${msg.role === 'user' ? 'text-right' : ''}`}>
              <div className={`inline-block rounded-2xl px-4 py-2.5 text-sm whitespace-pre-wrap ${
                msg.role === 'user'
                  ? 'bg-cyan-500/10 text-cyan-100 border border-cyan-500/20'
                  : 'bg-white/[0.03] text-slate-300 border border-white/5'
              }`}>
                {msg.content}
              </div>
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-full bg-violet-500/20 flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-sm text-violet-400">smart_toy</span>
            </div>
            <div className="bg-white/[0.03] border border-white/5 rounded-2xl px-4 py-2.5">
              <div className="flex gap-1">
                <span className="w-2 h-2 bg-slate-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-2 h-2 bg-slate-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-2 h-2 bg-slate-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="glass rounded-xl p-3">
        <div className="flex gap-2">
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSend()}
            placeholder="Type your message..."
            className="flex-1 bg-black/30 border border-white/10 rounded-lg px-4 py-3 text-sm placeholder:text-slate-600 focus:border-cyan-500/50 focus:outline-none"
          />
          <button 
            onClick={handleSend} 
            disabled={loading || !input.trim()}
            className="px-4 py-3 rounded-lg bg-cyan-500 text-slate-950 font-bold hover:brightness-110 transition-all disabled:opacity-50">
            <span className="material-symbols-outlined text-sm">send</span>
          </button>
        </div>
      </div>
    </div>
  )
}
