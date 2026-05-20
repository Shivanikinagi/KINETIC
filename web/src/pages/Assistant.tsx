import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { fetchJson } from '../lib/api'
import type { AssistantMessage, AssistantCard, Provider } from '../lib/api'

const EXAMPLE_PROMPTS = [
  'Find cheapest RTX 4090 for SDXL fine-tuning',
  'How much for 5000 tokens on Mistral-7B?',
  'Deploy inference job to best provider',
  'Compare GPU prices for training LLaMA 3',
  'What\'s the best GPU for image generation?',
  'Estimate cost for 8-hour fine-tuning job',
]

function RecommendationCard({ card, onAction }: { card: AssistantCard; onAction: (action: string, payload?: any) => void }) {
  return (
    <div className="glass rounded-xl p-4 border border-white/10 hover:border-cyan-500/20 transition-all">
      <div className="flex items-center justify-between mb-2">
        <div>
          <h4 className="text-sm font-bold text-slate-200">{card.title}</h4>
          {card.subtitle && <p className="text-xs text-slate-500">{card.subtitle}</p>}
        </div>
        {card.badge && (
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-semibold">
            {card.badge}
          </span>
        )}
      </div>
      {card.meta && (
        <div className="grid grid-cols-3 gap-2 mb-3">
          {card.meta.map((m, mi) => (
            <div key={mi} className="text-center">
              <p className="text-[10px] text-slate-500 uppercase">{m.label}</p>
              <p className="text-xs font-mono text-cyan-400">{m.value}</p>
            </div>
          ))}
        </div>
      )}
      {card.action && (
        <button
          onClick={() => onAction(card.action!.action, card.action!.payload)}
          className="w-full py-2 rounded-lg bg-cyan-500 text-slate-950 text-xs font-bold hover:brightness-110 transition-all"
        >
          {card.action.label}
        </button>
      )}
    </div>
  )
}

function WorkflowStep({ number, title, desc, active }: { number: number; title: string; desc: string; active?: boolean }) {
  return (
    <div className={`flex items-start gap-3 p-3 rounded-lg border transition-all ${active ? 'bg-cyan-500/5 border-cyan-500/20' : 'bg-white/[0.02] border-white/5'}`}>
      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${active ? 'bg-cyan-500 text-slate-950' : 'bg-white/10 text-slate-500'}`}>
        {number}
      </div>
      <div>
        <p className="text-xs font-semibold text-slate-300">{title}</p>
        <p className="text-[10px] text-slate-500">{desc}</p>
      </div>
    </div>
  )
}

export default function Assistant() {
  const navigate = useNavigate()
  const [messages, setMessages] = useState<AssistantMessage[]>([
    {
      role: 'assistant',
      content: 'Hey there! I\'m Kinetic Assistant — your personal compute concierge.\n\nI can help you:\n• Find the best GPU deals for your workload\n• Estimate costs before you deploy\n• Recommend providers based on your needs\n• Deploy jobs directly from chat\n• Explain how proof-of-compute works\n\nWhat are you working on today?',
      actions: [
        { label: 'Browse GPUs', action: 'navigate', payload: { to: '/explore' } },
        { label: 'View Models', action: 'navigate', payload: { to: '/models' } },
      ]
    }
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [providers, setProviders] = useState<Provider[]>([])
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

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

    try {
      const response = await fetchJson('/assistant/chat', {
        method: 'POST',
        body: JSON.stringify({
          messages: [...messages, { role: 'user', content: userMsg }],
          provider_context: {
            providers: providers.map(p => ({
              name: p.name,
              id: p.id,
              gpu_model: p.gpu_model,
              vram_gb: p.vram_gb,
              price_per_hour: p.price_per_hour,
              uptime: p.uptime,
              status: p.status,
            }))
          }
        })
      })

      const enriched = enrichResponse(response, userMsg, providers)
      setMessages(prev => [...prev, enriched])
    } catch (err: any) {
      console.warn('LLM backend failed, using fallback:', err)
      setTimeout(() => {
        const response = generateSmartResponse(userMsg, providers)
        setMessages(prev => [...prev, response])
      }, 300)
    } finally {
      setLoading(false)
    }
  }

  const enrichResponse = (response: any, query: string, providers: Provider[]): AssistantMessage => {
    const q = query.toLowerCase()
    const cards: AssistantCard[] = response.cards || []
    const actions = response.actions || []

    // GPU Recommendation Agent — show 3 recommended GPUs
    if (q.includes('gpu') || q.includes('rtx') || q.includes('a100') || q.includes('h100') || q.includes('recommend') || q.includes('best')) {
      const active = providers.filter(p => p.status === 'active')
      if (active.length > 0) {
        const sorted = [...active].sort((a, b) => (a.price_per_hour || 0) - (b.price_per_hour || 0)).slice(0, 3)
        sorted.forEach((p, i) => {
          cards.push({
            type: 'provider',
            title: p.name || p.id,
            subtitle: p.gpu_model || 'Unknown',
            badge: i === 0 ? 'Best Value' : i === 1 ? 'Balanced' : 'Premium',
            meta: [
              { label: 'Price', value: `${p.price_per_hour?.toFixed(2) || 0} A/hr` },
              { label: 'VRAM', value: `${p.vram_gb || 0}GB` },
              { label: 'Uptime', value: `${p.uptime?.toFixed(1) || 99}%` },
            ],
            action: { label: 'Deploy Here', action: 'deploy', payload: { providerId: p.id, providerName: p.name, tokens: 1000 } }
          })
        })
      }
    }

    // Cost Estimation Agent
    if (q.includes('cost') || q.includes('price') || q.includes('estimate') || q.includes('how much') || q.includes('tokens')) {
      const tokenMatch = q.match(/(\d+)/)
      const tokens = tokenMatch ? parseInt(tokenMatch[1]) : 1000
      const avgPrice = providers.length > 0
        ? providers.reduce((s, p) => s + (p.price_per_hour || 0), 0) / providers.length
        : 1.5
      const cost = (avgPrice * (tokens / 3600)).toFixed(4)
      const hours = (tokens / 3600).toFixed(2)
      cards.unshift({
        type: 'cost',
        title: 'Cost Estimate',
        subtitle: `${tokens.toLocaleString()} tokens`,
        badge: 'Estimate',
        meta: [
          { label: 'Total', value: `${cost} ALGO` },
          { label: 'Duration', value: `~${hours} hrs` },
          { label: 'Avg Rate', value: `${avgPrice.toFixed(2)} A/hr` },
        ],
      })
    }

    // Auto-deploy workflow suggestions
    if (q.includes('deploy') || q.includes('run') || q.includes('launch')) {
      cards.push({
        type: 'workflow',
        title: 'Auto-Deploy Workflow',
        meta: [
          { label: 'Step 1', value: 'Select provider' },
          { label: 'Step 2', value: 'Lock escrow' },
          { label: 'Step 3', value: 'Execute job' },
        ],
      })
    }

    // Smart provider routing display
    if (q.includes('route') || q.includes('routing') || q.includes('provider')) {
      const active = providers.filter(p => p.status === 'active')
      if (active.length > 0) {
        const cheapest = active.sort((a, b) => (a.price_per_hour || 0) - (b.price_per_hour || 0))[0]
        const fastest = active.sort((a, b) => (b.uptime || 0) - (a.uptime || 0))[0]
        cards.push({
          type: 'routing',
          title: 'Smart Routing',
          subtitle: 'Recommended based on your query',
          meta: [
            { label: 'Cheapest', value: cheapest.name || cheapest.id },
            { label: 'Most Reliable', value: fastest.name || fastest.id },
            { label: 'Active', value: `${active.length} providers` },
          ],
        })
      }
    }

    return {
      role: 'assistant',
      content: response.message?.content || response.content || 'Here is what I found:',
      actions: actions.length > 0 ? actions : [
        { label: 'Browse GPUs', action: 'navigate', payload: { to: '/explore' } },
        { label: 'Submit Job', action: 'navigate', payload: { to: '/submit' } },
      ],
      cards,
    }
  }

  const handleAction = async (action: string, payload?: any) => {
    if (action === 'deploy') {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: `Deploying your job to **${payload.providerName}** now...`,
        cards: [{
          type: 'workflow',
          title: 'Deployment Progress',
          meta: [
            { label: 'Provider', value: payload.providerName },
            { label: 'Status', value: 'Initializing...' },
          ],
        }]
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
          content: `❌ Deployment failed: ${err.message || 'Unknown error'}\n\nMake sure the backend is running on port 8000.`,
        }])
      }
    }
  }

  const generateSmartResponse = (query: string, providers: Provider[]): AssistantMessage => {
    const q = query.toLowerCase()

    if (/^(hi|hello|hey|yo|sup|hola)/.test(q)) {
      return {
        role: 'assistant',
        content: 'Hey! Ready to find you some GPU power. What kind of workload are you running — inference, training, or fine-tuning?',
      }
    }

    if (q.includes('cheapest') || q.includes('best price') || q.includes('lowest') || q.includes('budget')) {
      const active = providers.filter(p => p.status === 'active')
      if (active.length === 0) {
        return {
          role: 'assistant',
          content: 'Hmm, no providers are online right now. You could be the first one! Want to register your GPU and start earning?',
          actions: [{ label: 'Register Provider', action: 'navigate', payload: { to: '/provide' } }]
        }
      }
      const cheapest = [...active].sort((a, b) => (a.price_per_hour || 0) - (b.price_per_hour || 0))[0]
      return {
        role: 'assistant',
        content: `Found the best deal for you. A 1000-token inference job on **${cheapest.name}** costs roughly **${((cheapest.price_per_hour || 0) * 0.28).toFixed(3)} ALGO**.`,
        cards: [{
          type: 'provider',
          title: cheapest.name || cheapest.id,
          subtitle: cheapest.gpu_model,
          badge: 'Cheapest',
          meta: [
            { label: 'Price', value: `${(cheapest.price_per_hour || 0).toFixed(2)} ALGO/hr` },
            { label: 'VRAM', value: `${cheapest.vram_gb || 0}GB` },
            { label: 'Uptime', value: `${(cheapest.uptime || 99).toFixed(1)}%` },
          ],
          action: { label: 'Deploy Here', action: 'deploy', payload: { providerId: cheapest.id, providerName: cheapest.name, tokens: 1000 } }
        }],
        actions: [
          { label: 'Browse All GPUs', action: 'navigate', payload: { to: '/explore' } }
        ]
      }
    }

    const gpuTypes = [
      { keyword: 'rtx 4090', name: 'RTX 4090' },
      { keyword: 'h100', name: 'H100' },
      { keyword: 'a100', name: 'A100' },
      { keyword: '3090', name: 'RTX 3090' },
      { keyword: '4090', name: 'RTX 4090' },
    ]
    for (const gpu of gpuTypes) {
      if (q.includes(gpu.keyword)) {
        const matches = providers.filter(p => (p.gpu_model || '').toLowerCase().includes(gpu.keyword))
        if (matches.length === 0) {
          return {
            role: 'assistant',
            content: `No ${gpu.name} providers are online right now. Would you like me to find the next best option?`,
            actions: [
              { label: 'Find cheapest GPU', action: 'navigate', payload: { to: '/explore' } }
            ]
          }
        }
        const best = matches.sort((a, b) => (a.price_per_hour || 0) - (b.price_per_hour || 0))[0]
        return {
          role: 'assistant',
          content: `Found **${matches.length}** ${gpu.name} provider(s).\n\nBest value: **${best.name}**\n• Price: ${(best.price_per_hour || 0).toFixed(2)} ALGO/hr\n• VRAM: ${best.vram_gb}GB\n• Uptime: ${(best.uptime || 99).toFixed(1)}%`,
          actions: [
            { label: `Deploy to ${best.name}`, action: 'deploy', payload: { providerId: best.id, providerName: best.name, tokens: 1000 } },
            { label: 'View All', action: 'navigate', payload: { to: '/explore' } }
          ]
        }
      }
    }

    if (q.includes('cost') || q.includes('price') || q.includes('estimate') || q.includes('how much')) {
      const tokenMatch = q.match(/(\d+)/)
      const tokens = tokenMatch ? parseInt(tokenMatch[1]) : 1000
      const avgPrice = providers.length > 0
        ? providers.reduce((s, p) => s + (p.price_per_hour || 0), 0) / providers.length
        : 1.5
      const cost = (avgPrice * (tokens / 3600)).toFixed(4)
      return {
        role: 'assistant',
        content: `For **${tokens} tokens**, you're looking at roughly **${cost} ALGO** based on current market rates.\n\nPricing tiers:\n• Budget (RTX 3090): ~${(0.65 * tokens / 3600).toFixed(3)} ALGO\n• Standard (RTX 4090): ~${(1.4 * tokens / 3600).toFixed(3)} ALGO\n• Premium (H100): ~${(4.5 * tokens / 3600).toFixed(3)} ALGO\n\nWant me to find the best provider for your budget?`,
        cards: [{
          type: 'cost',
          title: 'Cost Estimate',
          subtitle: `${tokens.toLocaleString()} tokens`,
          badge: 'Estimate',
          meta: [
            { label: 'Total', value: `${cost} ALGO` },
            { label: 'Duration', value: `~${(tokens / 3600).toFixed(2)} hrs` },
            { label: 'Avg Rate', value: `${avgPrice.toFixed(2)} A/hr` },
          ],
        }],
        actions: [
          { label: 'Find Cheapest', action: 'navigate', payload: { to: '/explore' } },
          { label: 'Submit Job', action: 'navigate', payload: { to: '/submit' } }
        ]
      }
    }

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

    if (q.includes('proof') || q.includes('verify') || q.includes('trust') || q.includes('secure') || q.includes('safe')) {
      return {
        role: 'assistant',
        content: `Great question — trust is everything in a decentralized marketplace.\n\nHere's how Kinetic guarantees honest compute:\n\n1. **Escrow Lock**: Your ALGO payment is locked in a TEAL smart contract on Algorand TestNet before any work begins.\n\n2. **Sandboxed Execution**: Providers run your workload in an isolated Docker container.\n\n3. **Cryptographic Proof**: After execution, the result is hashed with SHA-256. This hash is stored on-chain.\n\n4. **Conditional Release**: The escrow only releases funds after the proof is verified. If a provider cheats, they don't get paid.\n\nIt's like a smart contract escrow on steroids — designed specifically for compute verification.`,
        actions: [
          { label: 'View Contracts', action: 'navigate', payload: { to: '/' } }
        ]
      }
    }

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

    if (q.includes('help') || q.includes('what can you do') || q.includes('commands')) {
      return {
        role: 'assistant',
        content: `Here's what I can help you with:\n\n**Finding Compute**\n• "Find cheapest GPU"\n• "Find RTX 4090"\n• "Best GPU for Stable Diffusion"\n\n**Cost Estimation**\n• "How much for 5000 tokens?"\n• "Estimate training cost"\n\n**Deploying**\n• "Deploy inference job"\n• "Run Llama 3"\n\n**Learning**\n• "How does proof-of-compute work?"\n• "What is escrow?"\n• "How do I earn as a provider?"\n\nJust ask naturally — I understand context!`
      }
    }

    if (/thanks|thank you|thx|ty/.test(q)) {
      return {
        role: 'assistant',
        content: 'You\'re welcome! Happy computing. If you need anything else, just ask.'
      }
    }

    return {
      role: 'assistant',
      content: `I'm not sure I fully understood that, but I want to help!\n\nI can assist with:\n• Finding the right GPU provider for your workload\n• Estimating compute costs\n• Deploying jobs directly from chat\n• Explaining how Kinetic's proof-of-compute works\n• Helping you register as a provider\n\nCould you rephrase, or try asking something like:\n• "Find cheapest GPU for inference"\n• "How much does training cost?"\n• "Deploy a job to RTX 4090"`,
      actions: [
        { label: 'Browse GPUs', action: 'navigate', payload: { to: '/explore' } },
        { label: 'Submit Job', action: 'navigate', payload: { to: '/submit' } }
      ]
    }
  }

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
            <div className={`max-w-[85%] md:max-w-[80%] ${msg.role === 'user' ? 'text-right' : ''}`}>
              <div className={`inline-block rounded-2xl px-4 py-2.5 text-sm whitespace-pre-wrap ${
                msg.role === 'user'
                  ? 'bg-cyan-500/10 text-cyan-100 border border-cyan-500/20'
                  : 'bg-white/[0.03] text-slate-300 border border-white/5'
              }`}>
                {msg.content}
              </div>

              {/* Agent Cards */}
              {msg.cards && msg.cards.length > 0 && (
                <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-2">
                  {msg.cards.map((card, ci) => {
                    if (card.type === 'workflow') {
                      return (
                        <div key={ci} className="md:col-span-2 glass rounded-xl p-4 border border-white/10">
                          <p className="text-xs font-bold text-slate-300 mb-2">{card.title}</p>
                          <div className="space-y-2">
                            <WorkflowStep number={1} title="Select Provider" desc="Choose from available GPUs" active />
                            <WorkflowStep number={2} title="Lock Escrow" desc="Funds secured in smart contract" />
                            <WorkflowStep number={3} title="Execute & Verify" desc="Run job and validate proof" />
                          </div>
                        </div>
                      )
                    }
                    return (
                      <RecommendationCard key={ci} card={card} onAction={handleAction} />
                    )
                  })}
                </div>
              )}

              {msg.actions && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {msg.actions.map((a, j) => (
                    <button key={j}
                      onClick={() => {
                        if (a.action === 'navigate') {
                          if (a.payload?.to?.startsWith('http')) {
                            window.open(a.payload.to, '_blank')
                          } else {
                            navigate(a.payload?.to || '/')
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
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs text-slate-500">Kinetic Assistant is thinking</span>
              </div>
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
            ref={inputRef}
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
          {EXAMPLE_PROMPTS.slice(0, 4).map(s => (
            <button key={s} onClick={() => { setInput(s); inputRef.current?.focus() }}
              className="text-[10px] px-2 py-1 rounded-full bg-white/5 text-slate-500 hover:bg-white/10 hover:text-slate-300 transition-all">
              {s}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
