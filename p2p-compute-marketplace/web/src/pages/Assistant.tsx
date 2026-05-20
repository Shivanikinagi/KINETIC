import { useState, useRef, useEffect } from 'react'
import { fetchJson } from '../lib/api'

interface Message {
  role: 'user' | 'assistant'
  content: string
  actions?: { label: string; action: string; payload?: any }[]
}

interface ProviderInfo {
  name: string
  id: string
  gpu_model: string
  vram_gb: number
  price_per_hour: number
  uptime: number
  status: string
}

export default function Assistant() {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: 'Hey there! I\'m Kinetic Assistant — your personal compute concierge.\n\nI can help you:\n• Find the best GPU deals for your workload\n• Estimate costs before you deploy\n• Recommend providers based on your needs\n• Deploy jobs directly from chat\n• Explain how proof-of-compute works\n\nWhat are you working on today?'
    }
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [providers, setProviders] = useState<ProviderInfo[]>([])
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetchJson('/providers').then(d => {
      const list = Array.isArray(d) ? d : []
      setProviders(list.map((p: any) => ({
        name: p.name || p.id,
        id: p.id,
        gpu_model: p.gpu_model || 'Unknown',
        vram_gb: p.vram_gb || 0,
        price_per_hour: p.price_per_hour || 0,
        uptime: p.uptime || 99,
        status: p.status || 'active',
      })))
    }).catch(() => {})
  }, [])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSend = async () => {
    if (!input.trim()) return
    const userMsg = input.trim()
    setMessages(prev => [...prev, { role: 'user', content: userMsg }])
    setInput('')
    setLoading(true)

    // Simulate thinking time for realism
    setTimeout(() => {
      const response = generateSmartResponse(userMsg, providers)
      setMessages(prev => [...prev, response])
      setLoading(false)
    }, 600 + Math.random() * 800)
  }

  const handleAction = async (action: string, payload?: any) => {
    if (action === 'deploy') {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: `Deploying your job to **${payload.providerName}** now...`
      }])
      try {
        const res = await fetchJson('/job', {
          method: 'POST',
          body: JSON.stringify({
            type: 'inference',
            tokens: payload.tokens || 1000,
            payload: JSON.stringify({ auto_selected: true, provider: payload.providerId })
          })
        })
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: `✅ Job deployed successfully!\n\n**Job ID:** ${res.job_id}\n**Result Hash:** ${res.result_hash ? res.result_hash.slice(0, 20) + '...' : 'N/A'}\n**Duration:** ${res.duration_ms || 0}ms\n\nYou can track it in the Monitor or My Jobs page.`,
          actions: [
            { label: 'Open Monitor', action: 'navigate', payload: { to: '/monitor' } },
            { label: 'View My Jobs', action: 'navigate', payload: { to: '/jobs' } }
          ]
        }])
      } catch (err: any) {
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: `❌ Deployment failed: ${err.message || 'Unknown error'}\n\nMake sure the backend is running on port 8000.`
        }])
      }
    }
  }

  const generateSmartResponse = (query: string, providers: ProviderInfo[]): Message => {
    const q = query.toLowerCase()

    // GREETINGS
    if (/^(hi|hello|hey|yo|sup|hola)/.test(q)) {
      return {
        role: 'assistant',
        content: 'Hey! Ready to find you some GPU power. What kind of workload are you running — inference, training, or fine-tuning?'
      }
    }

    // CHEAPEST GPU
    if (q.includes('cheapest') || q.includes('best price') || q.includes('lowest') || q.includes('budget')) {
      const active = providers.filter(p => p.status === 'active')
      if (active.length === 0) {
        return {
          role: 'assistant',
          content: 'Hmm, no providers are online right now. You could be the first one! Want to register your GPU and start earning?',
          actions: [{ label: 'Register Provider', action: 'navigate', payload: { to: '/provide' } }]
        }
      }
      const cheapest = [...active].sort((a, b) => a.price_per_hour - b.price_per_hour)[0]
      const nextCheapest = active.length > 1 ? [...active].sort((a, b) => a.price_per_hour - b.price_per_hour)[1] : null
      return {
        role: 'assistant',
        content: `The cheapest provider right now is **${cheapest.name}** at **${cheapest.price_per_hour.toFixed(2)} ALGO/hour**.\n\nSpecs: ${cheapest.gpu_model} · ${cheapest.vram_gb}GB VRAM · ${cheapest.uptime.toFixed(1)}% uptime\n${nextCheapest ? `Runner-up: ${nextCheapest.name} at ${nextCheapest.price_per_hour.toFixed(2)} ALGO/hr` : ''}\n\nA 1000-token inference job would cost roughly **${(cheapest.price_per_hour * 0.28).toFixed(3)} ALGO**.`,
        actions: [
          { label: `Deploy to ${cheapest.name}`, action: 'deploy', payload: { providerId: cheapest.id, providerName: cheapest.name, tokens: 1000 } },
          { label: 'Browse All GPUs', action: 'navigate', payload: { to: '/explore' } }
        ]
      }
    }

    // SPECIFIC GPU REQUESTS
    const gpuTypes = [
      { keyword: 'rtx 4090', name: 'RTX 4090' },
      { keyword: 'h100', name: 'H100' },
      { keyword: 'a100', name: 'A100' },
      { keyword: '3090', name: 'RTX 3090' },
      { keyword: '4090', name: 'RTX 4090' },
    ]
    for (const gpu of gpuTypes) {
      if (q.includes(gpu.keyword)) {
        const matches = providers.filter(p => p.gpu_model.toLowerCase().includes(gpu.keyword))
        if (matches.length === 0) {
          return {
            role: 'assistant',
            content: `No ${gpu.name} providers are online right now. Would you like me to find the next best option?`,
            actions: [
              { label: 'Find cheapest GPU', action: 'navigate', payload: { to: '/explore' } }
            ]
          }
        }
        const best = matches.sort((a, b) => a.price_per_hour - b.price_per_hour)[0]
        return {
          role: 'assistant',
          content: `Found **${matches.length}** ${gpu.name} provider(s).\n\nBest value: **${best.name}**\n• Price: ${best.price_per_hour.toFixed(2)} ALGO/hr\n• VRAM: ${best.vram_gb}GB\n• Uptime: ${best.uptime.toFixed(1)}%`,
          actions: [
            { label: `Deploy to ${best.name}`, action: 'deploy', payload: { providerId: best.id, providerName: best.name, tokens: 1000 } },
            { label: 'View All', action: 'navigate', payload: { to: '/explore' } }
          ]
        }
      }
    }

    // COST ESTIMATES
    if (q.includes('cost') || q.includes('price') || q.includes('estimate') || q.includes('how much')) {
      const tokenMatch = q.match(/(\d+)/)
      const tokens = tokenMatch ? parseInt(tokenMatch[1]) : 1000
      const avgPrice = providers.length > 0
        ? providers.reduce((s, p) => s + p.price_per_hour, 0) / providers.length
        : 1.5
      const cost = (avgPrice * (tokens / 3600)).toFixed(4)
      return {
        role: 'assistant',
        content: `For **${tokens} tokens**, you're looking at roughly **${cost} ALGO** based on current market rates.\n\nPricing tiers:\n• Budget (RTX 3090): ~${(0.65 * tokens / 3600).toFixed(3)} ALGO\n• Standard (RTX 4090): ~${(1.4 * tokens / 3600).toFixed(3)} ALGO\n• Premium (H100): ~${(4.5 * tokens / 3600).toFixed(3)} ALGO\n\nWant me to find the best provider for your budget?`,
        actions: [
          { label: 'Find Cheapest', action: 'navigate', payload: { to: '/explore' } },
          { label: 'Submit Job', action: 'navigate', payload: { to: '/submit' } }
        ]
      }
    }

    // WORKLOAD RECOMMENDATIONS
    if (q.includes('inference') || q.includes('llama') || q.includes('chat') || q.includes('stable diffusion') || q.includes('sdxl')) {
      return {
        role: 'assistant',
        content: `For **LLM inference**, I'd recommend:\n\n1. **RTX 4090** (24GB) — Best price/performance for most models\n2. **A100** (40-80GB) — If you're running 70B+ parameter models\n\nFor **image generation (SDXL)**, an RTX 4090 with 24GB VRAM handles 1024×1024 images smoothly.\n\nWant me to find available providers for your specific model?`,
        actions: [
          { label: 'Find RTX 4090', action: 'navigate', payload: { to: '/explore' } },
          { label: 'Browse Model Hub', action: 'navigate', payload: { to: '/models' } }
        ]
      }
    }

    if (q.includes('training') || q.includes('fine-tune') || q.includes('finetune')) {
      return {
        role: 'assistant',
        content: `For **training / fine-tuning**, you'll want serious VRAM:\n\n• **LoRA fine-tuning (7B models)**: RTX 4090 (24GB) works\n• **Full fine-tuning (7B)**: A100 40GB minimum\n• **70B models**: H100 80GB or multi-GPU setup\n\nTraining jobs typically run 1-12 hours. At ~1.4 ALGO/hr for an RTX 4090, a 4-hour fine-tune costs about **5.6 ALGO**.`,
        actions: [
          { label: 'Find H100 Providers', action: 'navigate', payload: { to: '/explore' } },
          { label: 'Submit Training Job', action: 'navigate', payload: { to: '/submit' } }
        ]
      }
    }

    // PROOF / TRUST
    if (q.includes('proof') || q.includes('verify') || q.includes('trust') || q.includes('secure') || q.includes('safe')) {
      return {
        role: 'assistant',
        content: `Great question — trust is everything in a decentralized marketplace.\n\nHere's how Kinetic guarantees honest compute:\n\n1. **Escrow Lock**: Your ALGO payment is locked in a TEAL smart contract on Algorand TestNet before any work begins.\n\n2. **Sandboxed Execution**: Providers run your workload in an isolated Docker container.\n\n3. **Cryptographic Proof**: After execution, the result is hashed with SHA-256. This hash is stored on-chain.\n\n4. **Conditional Release**: The escrow only releases funds after the proof is verified. If a provider cheats, they don't get paid.\n\nIt's like a smart contract escrow on steroids — designed specifically for compute verification.`,
        actions: [
          { label: 'View Contracts', action: 'navigate', payload: { to: '/' } }
        ]
      }
    }

    // MODEL HUB
    if (q.includes('model') || q.includes('hub') || q.includes('hugging face') || q.includes('download')) {
      return {
        role: 'assistant',
        content: `The **Model Hub** has pre-configured models ready to deploy instantly:\n\n• **Llama-3-8B-Instruct** — Best open chat model\n• **Stable Diffusion XL** — High-res image generation\n• **Whisper-Large-v3** — Speech-to-text in 99 languages\n• **YOLOv8** — Real-time object detection\n• **Mistral-7B** — Efficient and powerful LLM\n\nEach model card shows compute requirements, license, and a one-click deploy button.`,
        actions: [
          { label: 'Browse Model Hub', action: 'navigate', payload: { to: '/models' } },
          { label: 'Upload My Model', action: 'navigate', payload: { to: '/models' } }
        ]
      }
    }

    // WALLET / PAYMENTS
    if (q.includes('wallet') || q.includes('balance') || q.includes('payment') || q.includes('algo')) {
      return {
        role: 'assistant',
        content: `Kinetic uses **Algorand TestNet** for all payments. Here's what you need to know:\n\n• Connect your **Pera Wallet** (mobile app) via the button in the navbar\n• All transactions cost ~**0.001 ALGO** (basically free)\n• Payments are locked in escrow until job completion\n• Providers receive ALGO instantly after proof verification\n\nIf you don't have TestNet ALGO, you can get some from the Algorand TestNet dispenser.`,
        actions: [
          { label: 'Open Wallet', action: 'navigate', payload: { to: '/wallet' } },
          { label: 'Get TestNet ALGO', action: 'navigate', payload: { to: 'https://testnet.algoexplorer.io/dispenser' } }
        ]
      }
    }

    // PROVIDER / EARN
    if (q.includes('provider') || q.includes('earn') || q.includes('idle') || q.includes('money') || q.includes('income')) {
      return {
        role: 'assistant',
        content: `Turning your idle GPU into passive income is straightforward:\n\n1. **Register** your hardware (GPU model, VRAM, price/hour)\n2. **Keep your node online** — jobs come to you automatically\n3. **Execute workloads** in a Docker sandbox\n4. **Get paid in ALGO** instantly after proof verification\n\nCurrent market rates:\n• RTX 3090: ~0.65 ALGO/hr\n• RTX 4090: ~1.40 ALGO/hr\n• H100: ~4.50 ALGO/hr\n\nIf you run your GPU 8 hours/day at 1.4 ALGO/hr, that's **11.2 ALGO/day**.`,
        actions: [
          { label: 'Register Provider', action: 'navigate', payload: { to: '/provide' } },
          { label: 'Provider Guide', action: 'navigate', payload: { to: 'https://github.com/Shivanikinagi/KINETIC/blob/main/docs/PROVIDER_GUIDE.md' } }
        ]
      }
    }

    // HELP
    if (q.includes('help') || q.includes('what can you do') || q.includes('commands')) {
      return {
        role: 'assistant',
        content: `Here's what I can help you with:\n\n**Finding Compute**\n• "Find cheapest GPU"\n• "Find RTX 4090"\n• "Best GPU for Stable Diffusion"\n\n**Cost Estimation**\n• "How much for 5000 tokens?"\n• "Estimate training cost"\n\n**Deploying**\n• "Deploy inference job"\n• "Run Llama 3"\n\n**Learning**\n• "How does proof-of-compute work?"\n• "What is escrow?"\n• "How do I earn as a provider?"\n\nJust ask naturally — I understand context!`
      }
    }

    // THANKS
    if (/thanks|thank you|thx|ty/.test(q)) {
      return {
        role: 'assistant',
        content: 'You\'re welcome! Happy computing. If you need anything else, just ask.'
      }
    }

    // FALLBACK — natural and helpful
    return {
      role: 'assistant',
      content: `I'm not sure I fully understood that, but I want to help!\n\nI can assist with:\n• Finding the right GPU provider for your workload\n• Estimating compute costs\n• Deploying jobs directly from chat\n• Explaining how Kinetic's proof-of-compute works\n• Helping you register as a provider\n\nCould you rephrase, or try asking something like:\n• "Find cheapest GPU for inference"\n• "How much does training cost?"\n• "Deploy a job to RTX 4090"`,
      actions: [
        { label: 'Browse GPUs', action: 'navigate', payload: { to: '/explore' } },
        { label: 'Submit Job', action: 'navigate', payload: { to: '/submit' } }
      ]
    }
  }

  const suggestions = [
    'Find cheapest GPU',
    'How much for 5000 tokens?',
    'Deploy inference job',
    'How does escrow work?'
  ]

  return (
    <div className="max-w-4xl mx-auto px-6 py-8 h-[calc(100vh-140px)] flex flex-col">
      <div className="mb-4">
        <h1 className="text-3xl font-bold tracking-tight">AI Assistant</h1>
        <p className="text-slate-500 text-sm mt-1">Your compute concierge — find GPUs, estimate costs, deploy jobs</p>
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
              <div className={`inline-block rounded-2xl px-4 py-2.5 text-sm whitespace-pre-wrap ${
                msg.role === 'user'
                  ? 'bg-cyan-500/10 text-cyan-100 border border-cyan-500/20'
                  : 'bg-white/[0.03] text-slate-300 border border-white/5'
              }`}>
                {msg.content}
              </div>
              {msg.actions && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {msg.actions.map((a, j) => (
                    <button key={j}
                      onClick={() => {
                        if (a.action === 'navigate') {
                          if (a.payload?.to?.startsWith('http')) {
                            window.open(a.payload.to, '_blank')
                          } else {
                            window.location.href = a.payload?.to || '/'
                          }
                        } else {
                          handleAction(a.action, a.payload)
                        }
                      }}
                      className="text-xs px-3 py-1.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 hover:bg-cyan-500/20 transition-all"
                    >
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
            placeholder="Ask me anything..."
            className="flex-1 bg-black/30 border border-white/10 rounded-lg px-4 py-3 text-sm placeholder:text-slate-600 focus:border-cyan-500/50 focus:outline-none"
          />
          <button onClick={handleSend} disabled={loading || !input.trim()}
            className="px-4 py-3 rounded-lg bg-cyan-500 text-slate-950 font-bold hover:brightness-110 transition-all disabled:opacity-50">
            <span className="material-symbols-outlined text-sm">send</span>
          </button>
        </div>
        <div className="flex flex-wrap gap-2 mt-2">
          {suggestions.map(s => (
            <button key={s} onClick={() => { setInput(s) }}
              className="text-[10px] px-2 py-1 rounded-full bg-white/5 text-slate-500 hover:bg-white/10 hover:text-slate-300 transition-all">
              {s}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
