import { useState, useRef, useEffect } from 'react'
import { fetchJson } from '../lib/api'

interface Message {
  role: 'user' | 'assistant'
  content: string
  actions?: { label: string; action: string; payload?: any }[]
}

export default function Assistant() {
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: 'Hello! I am your Kinetic AI Assistant. I can help you:\n\n• Find the cheapest GPU for your workload\n• Estimate compute costs\n• Recommend providers\n• Deploy models and jobs\n• Explain platform features\n\nWhat would you like to do today?' }
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [providers, setProviders] = useState<any[]>([])
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetchJson('/providers').then(d => setProviders(Array.isArray(d) ? d : [])).catch(() => {})
  }, [])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSend = async () => {
    if (!input.trim()) return
    const userMsg: Message = { role: 'user', content: input.trim() }
    setMessages(prev => [...prev, userMsg])
    setInput('')
    setLoading(true)

    // Simulate AI processing
    setTimeout(() => {
      const response = generateResponse(userMsg.content, providers)
      setMessages(prev => [...prev, response])
      setLoading(false)
    }, 800)
  }

  const handleAction = (action: string, payload?: any) => {
    if (action === 'deploy') {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: `Deploying job to provider ${payload.provider} with ${payload.tokens} tokens...`,
      }])
      // Actually deploy
      fetchJson('/job', {
        method: 'POST',
        body: JSON.stringify({ type: 'inference', tokens: payload.tokens, payload: JSON.stringify({ auto_selected: true, provider: payload.provider }) })
      }).then(res => {
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: `✓ Job deployed! ID: ${res.job_id}\nResult hash: ${res.result_hash?.slice(0, 20) || 'N/A'}...\n\nView in My Jobs or Monitor.`
        }])
      }).catch(err => {
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: `Job deployment failed: ${err.message}`
        }])
      })
    }
  }

  const generateResponse = (query: string, providers: any[]): Message => {
    const q = query.toLowerCase()

    if (q.includes('cheapest') || q.includes('best price') || q.includes('lowest cost')) {
      const cheapest = [...providers].sort((a, b) => (a.price_per_hour || 999) - (b.price_per_hour || 999))[0]
      if (!cheapest) return { role: 'assistant', content: 'No providers are currently available. Try registering a provider first.' }
      return {
        role: 'assistant',
        content: `The cheapest provider is **${cheapest.name || cheapest.id}** at **${cheapest.price_per_hour?.toFixed(2)} ALGO/hour**.\n\nSpecs: ${cheapest.gpu_model} · ${cheapest.vram_gb}GB VRAM · ${cheapest.uptime?.toFixed(1) || 99}% uptime`,
        actions: [
          { label: 'Deploy to this provider', action: 'deploy', payload: { provider: cheapest.id, tokens: 1000 } },
          { label: 'View all providers', action: 'navigate', payload: { to: '/explore' } }
        ]
      }
    }

    if (q.includes('rtx 4090') || q.includes('h100') || q.includes('a100')) {
      const gpu = q.includes('h100') ? 'H100' : q.includes('a100') ? 'A100' : 'RTX 4090'
      const matches = providers.filter(p => (p.gpu_model || '').toLowerCase().includes(gpu.toLowerCase()))
      if (matches.length === 0) return { role: 'assistant', content: `No providers with ${gpu} are currently online. Try adjusting your search or register your own hardware.` }
      const best = matches.sort((a, b) => (a.price_per_hour || 999) - (b.price_per_hour || 999))[0]
      return {
        role: 'assistant',
        content: `Found **${matches.length}** provider(s) with ${gpu}.\n\nBest value: **${best.name || best.id}** — ${best.price_per_hour?.toFixed(2)} ALGO/hr · ${best.vram_gb}GB VRAM`,
        actions: [
          { label: `Deploy to ${best.name || best.id}`, action: 'deploy', payload: { provider: best.id, tokens: 1000 } }
        ]
      }
    }

    if (q.includes('cost') || q.includes('price') || q.includes('estimate')) {
      return {
        role: 'assistant',
        content: `Compute pricing on Kinetic:\n\n• **H100**: ~4.50 ALGO/hr (best for LLM training)\n• **RTX 4090**: ~1.40 ALGO/hr (best for inference)\n• **RTX 3090**: ~0.65 ALGO/hr (budget option)\n\nA typical 1000-token inference job costs **~0.04 ALGO**.`,
        actions: [
          { label: 'Submit a job', action: 'navigate', payload: { to: '/submit' } }
        ]
      }
    }

    if (q.includes('help') || q.includes('what can you do')) {
      return {
        role: 'assistant',
        content: `I can help you with:\n\n1. **Find GPUs** — "Find cheapest RTX 4090"\n2. **Cost estimates** — "How much for 5000 tokens?"\n3. **Deploy jobs** — "Deploy inference job"\n4. **Explain features** — "What is proof-of-compute?"\n5. **Provider advice** — "Best GPU for Stable Diffusion?"`,
      }
    }

    if (q.includes('proof') || q.includes('verify') || q.includes('trust')) {
      return {
        role: 'assistant',
        content: `Kinetic uses **cryptographic proof-of-compute** to verify job execution:\n\n1. Provider runs your workload in a Docker sandbox\n2. Result is hashed with SHA-256\n3. Hash is stored on Algorand TestNet\n4. Escrow releases payment only after verified completion\n\nThis ensures providers cannot cheat — they only get paid for real work.`,
      }
    }

    if (q.includes('model') || q.includes('llama') || q.includes('stable diffusion') || q.includes('sdxl')) {
      return {
        role: 'assistant',
        content: `Check out the **Model Hub** for pre-trained models you can deploy instantly:\n\n• Llama-3-8B-Instruct\n• Stable Diffusion XL\n• Whisper Large v3\n• YOLOv8\n• Mistral-7B\n\nEach model shows compute requirements and can be deployed with one click.`,
        actions: [
          { label: 'Browse Model Hub', action: 'navigate', payload: { to: '/models' } }
        ]
      }
    }

    // Default response
    return {
      role: 'assistant',
      content: `I understand you're asking about "${query}".\n\nI can help you:\n• Find and compare GPU providers\n• Estimate compute costs\n• Deploy jobs to the network\n• Navigate the Model Hub and Spaces\n\nTry asking something like:\n• "Find cheapest GPU for inference"\n• "Deploy a training job"\n• "What is proof-of-compute?"`,
    }
  }

  return (
    <div className="max-w-4xl mx-auto px-6 py-8 h-[calc(100vh-140px)] flex flex-col">
      <div className="mb-4">
        <h1 className="text-3xl font-bold tracking-tight">AI Assistant</h1>
        <p className="text-slate-500 text-sm mt-1">Your autonomous compute agent — find GPUs, estimate costs, deploy jobs</p>
      </div>

      {/* Messages */}
      <div className="flex-1 glass rounded-xl p-4 overflow-y-auto mb-4 space-y-4">
        {messages.map((msg, i) => (
          <div key={i} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
              msg.role === 'user' ? 'bg-cyan-500/20 text-cyan-400' : 'bg-violet-500/20 text-violet-400'
            }`}>
              <span className="material-symbols-outlined text-sm">{msg.role === 'user' ? 'person' : 'smart_toy'}</span>
            </div>
            <div className={`max-w-[80%] ${msg.role === 'user' ? 'text-right' : ''}`}>
              <div className={`inline-block rounded-2xl px-4 py-2.5 text-sm ${
                msg.role === 'user'
                  ? 'bg-cyan-500/10 text-cyan-100 border border-cyan-500/20'
                  : 'bg-white/[0.03] text-slate-300 border border-white/5'
              }`}>
                <div className="whitespace-pre-wrap">{msg.content}</div>
              </div>
              {msg.actions && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {msg.actions.map((a, j) => (
                    <button key={j} onClick={() => handleAction(a.action, a.payload)}
                      className="text-xs px-3 py-1.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 hover:bg-cyan-500/20 transition-all">
                      {a.label}
                    </button>
                  ))}
                </div>
              )}
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
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="glass rounded-xl p-3">
        <div className="flex gap-2">
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSend()}
            placeholder="Ask me anything... e.g. 'Find cheapest RTX 4090'"
            className="flex-1 bg-black/30 border border-white/10 rounded-lg px-4 py-3 text-sm placeholder:text-slate-600 focus:border-cyan-500/50 focus:outline-none"
          />
          <button onClick={handleSend} disabled={loading || !input.trim()}
            className="px-4 py-3 rounded-lg bg-cyan-500 text-slate-950 font-bold hover:brightness-110 transition-all disabled:opacity-50">
            <span className="material-symbols-outlined text-sm">send</span>
          </button>
        </div>
        <div className="flex flex-wrap gap-2 mt-2">
          {['Find cheapest GPU', 'Estimate cost', 'Deploy inference', 'What is proof-of-compute?'].map(suggestion => (
            <button key={suggestion} onClick={() => { setInput(suggestion); }}
              className="text-[10px] px-2 py-1 rounded-full bg-white/5 text-slate-500 hover:bg-white/10 hover:text-slate-300 transition-all">
              {suggestion}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
