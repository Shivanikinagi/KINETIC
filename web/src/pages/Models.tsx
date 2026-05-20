import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { fetchJson, estimatePriceFromComputeReq, formatNumber } from '../lib/api'
import type { ModelCard } from '../lib/api'

const CATEGORIES = ['All', 'LLM', 'Image', 'Audio', 'Video', 'CV', 'Multimodal', 'Specialized']

const TAB_OPTIONS = ['Trending', 'Popular', 'Recently Updated']

const LICENSE_COLORS: Record<string, string> = {
  'MIT': 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  'Apache-2.0': 'bg-sky-500/10 text-sky-400 border-sky-500/20',
  'LLAMA3': 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  'LLAMA2': 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  'GPL-3.0': 'bg-rose-500/10 text-rose-400 border-rose-500/20',
  'AGPL-3.0': 'bg-rose-500/10 text-rose-400 border-rose-500/20',
}

function SkeletonCard() {
  return (
    <div className="glass rounded-xl p-5 animate-pulse">
      <div className="flex items-start justify-between mb-3">
        <div className="space-y-2">
          <div className="h-4 w-32 bg-white/5 rounded" />
          <div className="h-3 w-20 bg-white/5 rounded" />
        </div>
        <div className="h-5 w-14 bg-white/5 rounded-full" />
      </div>
      <div className="h-3 w-full bg-white/5 rounded mb-2" />
      <div className="h-3 w-2/3 bg-white/5 rounded mb-4" />
      <div className="flex gap-1.5 mb-4">
        {[1,2,3].map(i => <div key={i} className="h-4 w-12 bg-white/5 rounded-full" />)}
      </div>
      <div className="h-8 w-full bg-white/5 rounded" />
    </div>
  )
}

function SkeletonDetail() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="h-8 w-48 bg-white/5 rounded" />
      <div className="h-4 w-32 bg-white/5 rounded" />
      <div className="h-24 w-full bg-white/5 rounded" />
    </div>
  )
}

function Badge({ text, colorClass }: { text: string; colorClass?: string }) {
  return (
    <span className={`text-[10px] px-2 py-0.5 rounded-full border font-semibold ${colorClass || 'bg-white/5 text-slate-400 border-white/10'}`}>
      {text}
    </span>
  )
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  const handleCopy = () => {
    navigator.clipboard.writeText(text).catch(() => {})
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }
  return (
    <button onClick={handleCopy} className="text-[10px] text-cyan-400 hover:text-cyan-200 transition-colors flex items-center gap-1">
      <span className="material-symbols-outlined text-[10px]">{copied ? 'check' : 'content_copy'}</span>
      {copied ? 'Copied' : 'Copy'}
    </button>
  )
}

function ReadmeRenderer({ readme }: { readme: string }) {
  const lines = readme.split('\n')
  return (
    <div className="prose prose-invert prose-sm max-w-none">
      {lines.map((line, i) => {
        if (line.startsWith('# ')) return <h1 key={i} className="text-xl font-bold text-white mb-2 mt-4">{line.replace('# ', '')}</h1>
        if (line.startsWith('## ')) return <h2 key={i} className="text-lg font-bold text-slate-200 mb-2 mt-4">{line.replace('## ', '')}</h2>
        if (line.startsWith('### ')) return <h3 key={i} className="text-base font-bold text-slate-300 mb-1 mt-3">{line.replace('### ', '')}</h3>
        if (line.startsWith('- ')) return <li key={i} className="text-sm text-slate-400 ml-4">{line.replace('- ', '')}</li>
        if (line.startsWith('```')) return <div key={i} className="my-2" />
        if (line.trim() === '') return <div key={i} className="h-2" />
        return <p key={i} className="text-sm text-slate-400 leading-relaxed">{line}</p>
      })}
    </div>
  )
}

export default function Models() {
  const [models, setModels] = useState<ModelCard[]>([])
  const [search, setSearch] = useState('')
  const [searchFocused, setSearchFocused] = useState(false)
  const [showUpload, setShowUpload] = useState(false)
  const [uploadForm, setUploadForm] = useState({ name: '', description: '', tags: '', readme: '', license: 'MIT', compute_req: '', category: 'LLM' })
  const [selectedModel, setSelectedModel] = useState<ModelCard | null>(null)
  const [activeTab, setActiveTab] = useState('Trending')
  const [activeCategory, setActiveCategory] = useState('All')
  const [loading, setLoading] = useState(true)
  const searchRef = useRef<HTMLDivElement>(null)

  useEffect(() => { loadModels() }, [])

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setSearchFocused(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const loadModels = async () => {
    setLoading(true)
    const data = await fetchJson('/models').catch(() => ({ models: [] }))
    const uniqueModels = new Map<string, ModelCard>()
    for (const model of (data.models || [])) {
      const baseName = model.name.replace(/\s*\(fork\)\s*/g, '').trim()
      if (!uniqueModels.has(baseName)) {
        uniqueModels.set(baseName, enrichModel(model))
      }
    }
    const filtered = Array.from(uniqueModels.values())
    setModels(filtered)
    if (filtered.length === 0) {
      await seedDemoModels()
      const data2 = await fetchJson('/models').catch(() => ({ models: [] }))
      const uniq2 = new Map<string, ModelCard>()
      for (const model of (data2.models || [])) {
        const baseName = model.name.replace(/\s*\(fork\)\s*/g, '').trim()
        if (!uniq2.has(baseName)) uniq2.set(baseName, enrichModel(model))
      }
      setModels(Array.from(uniq2.values()))
    }
    setLoading(false)
  }

  const enrichModel = (m: any): ModelCard => {
    const nameLower = (m.name || '').toLowerCase()
    const params = extractParams(nameLower)
    const precision = extractPrecision(nameLower, m.tags)
    const category = inferCategory(m.tags, nameLower)
    return {
      ...m,
      parameters: params,
      precision,
      category,
      versions: [{ version: 'v1.0', created_at: m.created_at || Date.now() / 1000, changelog: 'Initial release' }],
      benchmarks: generateBenchmarks(nameLower, m.compute_req),
    }
  }

  const extractParams = (name: string): string => {
    if (name.includes('70b')) return '70B'
    if (name.includes('34b')) return '34B'
    if (name.includes('13b')) return '13B'
    if (name.includes('8x7b')) return '8x7B'
    if (name.includes('8b')) return '8B'
    if (name.includes('7b')) return '7B'
    if (name.includes('3.8b')) return '3.8B'
    if (name.includes('mini')) return '3.8B'
    return ''
  }

  const extractPrecision = (name: string, tags: string[]): string[] => {
    const out: string[] = []
    if (name.includes('int4') || tags.some(t => t.includes('int4'))) out.push('INT4')
    if (name.includes('int8') || tags.some(t => t.includes('int8'))) out.push('INT8')
    if (name.includes('fp16') || tags.some(t => t.includes('fp16'))) out.push('FP16')
    if (name.includes('bf16') || tags.some(t => t.includes('bf16'))) out.push('BF16')
    if (out.length === 0) out.push('FP16')
    return out
  }

  const inferCategory = (tags: string[], name: string): string => {
    const t = tags.map(x => x.toLowerCase())
    if (t.includes('image') || t.includes('diffusion') || name.includes('stable-diffusion') || name.includes('flux') || name.includes('midjourney') || name.includes('controlnet')) return 'Image'
    if (t.includes('audio') || t.includes('tts') || t.includes('asr') || t.includes('music') || name.includes('whisper') || name.includes('bark') || name.includes('musicgen')) return 'Audio'
    if (t.includes('video') || t.includes('animation') || name.includes('animate') || name.includes('cogvideo')) return 'Video'
    if (t.includes('cv') || t.includes('detection') || t.includes('segmentation') || t.includes('vision') || name.includes('yolo') || name.includes('sam') || name.includes('dino')) return 'CV'
    if (t.includes('multimodal') || name.includes('llava') || name.includes('qwen-vl') || name.includes('cogvlm') || name.includes('clip')) return 'Multimodal'
    if (t.includes('specialized') || t.includes('biomedical') || t.includes('protein') || t.includes('chemistry') || name.includes('biogpt') || name.includes('esm') || name.includes('alphafold') || name.includes('molformer')) return 'Specialized'
    if (t.includes('embedding') || t.includes('retrieval')) return 'LLM'
    return 'LLM'
  }

  const generateBenchmarks = (name: string, computeReq: string): any[] => {
    const lower = name.toLowerCase()
    const isLLM = lower.includes('llama') || lower.includes('mistral') || lower.includes('phi') || lower.includes('gemma') || lower.includes('qwen') || lower.includes('yi') || lower.includes('code') || lower.includes('deepseek')
    if (isLLM) {
      const tokens = lower.includes('70b') ? 45 : lower.includes('34b') ? 65 : lower.includes('13b') ? 85 : lower.includes('8x7b') ? 35 : 120
      return [
        { metric: 'Throughput', value: tokens, unit: 'tokens/sec', hardware: computeReq || '1× A100' },
        { metric: 'Latency (TTFT)', value: lower.includes('70b') ? 280 : 120, unit: 'ms', hardware: computeReq || '1× A100' },
        { metric: 'Memory', value: lower.includes('70b') ? 70 : lower.includes('34b') ? 35 : 18, unit: 'GB', hardware: computeReq || '1× A100' },
      ]
    }
    if (lower.includes('stable') || lower.includes('flux') || lower.includes('midjourney')) {
      return [
        { metric: 'Image Speed', value: 4.2, unit: 'img/sec', hardware: computeReq || '1× RTX 4090' },
        { metric: 'Resolution', value: 1024, unit: '×1024', hardware: computeReq || '1× RTX 4090' },
      ]
    }
    if (lower.includes('yolo')) {
      return [
        { metric: 'FPS', value: 120, unit: 'fps', hardware: computeReq || '1× RTX 4090' },
        { metric: 'mAP', value: 56.8, unit: '%', hardware: computeReq || '1× RTX 4090' },
      ]
    }
    return [
      { metric: 'Throughput', value: 85, unit: 'ops/sec', hardware: computeReq || '1× RTX 4090' },
    ]
  }

  const seedDemoModels = async () => {
    const demos = [
      { name: 'Llama-3-8B-Instruct', description: 'Meta Llama 3 8B instruction-tuned model for chat and completion.', tags: ['llm', 'chat', 'meta'], readme: '# Llama 3 8B\n\nState-of-the-art open LLM.\n\n## Usage\n```python\nfrom transformers import AutoModelForCausalLM\nmodel = AutoModelForCausalLM.from_pretrained("meta-llama/Meta-Llama-3-8B-Instruct")\n```', license: 'LLAMA3', compute_req: '1× A100 80GB', category: 'LLM' },
      { name: 'Llama-3-70B-Instruct', description: 'Meta Llama 3 70B - powerful instruction model for complex tasks.', tags: ['llm', 'chat', 'meta'], readme: '# Llama 3 70B\n\nHigh-performance LLM.', license: 'LLAMA3', compute_req: '2× A100 80GB', category: 'LLM' },
      { name: 'Mistral-7B-Instruct', description: 'Mistral AI 7B instruction model.', tags: ['llm', 'chat', 'mistral'], readme: '# Mistral 7B\n\nEfficient and powerful LLM.', license: 'Apache-2.0', compute_req: '1× RTX 4090 24GB', category: 'LLM' },
      { name: 'Mixtral-8x7B-Instruct', description: 'Mistral AI Mixtral 8x7B MoE model - 47B parameters.', tags: ['llm', 'chat', 'mistral', 'moe'], readme: '# Mixtral 8x7B\n\nMixture of Experts model.', license: 'Apache-2.0', compute_req: '2× A100 80GB', category: 'LLM' },
      { name: 'Phi-3-Mini-4K', description: 'Microsoft Phi-3 Mini - 3.8B parameters, efficient reasoning.', tags: ['llm', 'chat', 'microsoft'], readme: '# Phi-3 Mini\n\nSmall but powerful.', license: 'MIT', compute_req: '1× RTX 3090 24GB', category: 'LLM' },
      { name: 'Gemma-7B-IT', description: 'Google Gemma 7B instruction-tuned model.', tags: ['llm', 'chat', 'google'], readme: '# Gemma 7B\n\nGoogle\'s open LLM.', license: 'Gemma', compute_req: '1× RTX 4090 24GB', category: 'LLM' },
      { name: 'Qwen2-7B-Instruct', description: 'Alibaba Qwen2 7B - multilingual instruction model.', tags: ['llm', 'chat', 'multilingual'], readme: '# Qwen2 7B\n\nMultilingual support.', license: 'Apache-2.0', compute_req: '1× RTX 4090 24GB', category: 'LLM' },
      { name: 'Yi-34B-Chat', description: '01.AI Yi 34B chat model - excellent reasoning.', tags: ['llm', 'chat', '01ai'], readme: '# Yi 34B\n\nStrong reasoning capabilities.', license: 'Apache-2.0', compute_req: '2× A100 40GB', category: 'LLM' },
      { name: 'CodeLlama-34B-Instruct', description: 'Meta Code Llama 34B - specialized for code generation.', tags: ['llm', 'code', 'meta'], readme: '# Code Llama 34B\n\nCode generation expert.', license: 'LLAMA2', compute_req: '2× A100 40GB', category: 'LLM' },
      { name: 'Deepseek-Coder-33B', description: 'Deepseek Coder 33B - advanced code understanding.', tags: ['llm', 'code', 'deepseek'], readme: '# Deepseek Coder\n\nCode expert.', license: 'Deepseek', compute_req: '2× A100 40GB', category: 'LLM' },
      { name: 'Stable-Diffusion-XL', description: 'High-resolution image generation model.', tags: ['image', 'diffusion', 'sdxl'], readme: '# SDXL\n\n1024×1024 image generation.', license: 'OpenRAIL-M', compute_req: '1× RTX 4090 24GB', category: 'Image' },
      { name: 'Stable-Diffusion-3', description: 'Latest Stable Diffusion 3 with improved quality.', tags: ['image', 'diffusion', 'sd3'], readme: '# SD3\n\nNext-gen image generation.', license: 'Stability-AI', compute_req: '1× RTX 4090 24GB', category: 'Image' },
      { name: 'FLUX.1-Dev', description: 'Black Forest Labs FLUX.1 - photorealistic image generation.', tags: ['image', 'diffusion', 'flux'], readme: '# FLUX.1\n\nPhotorealistic images.', license: 'FLUX', compute_req: '1× A100 40GB', category: 'Image' },
      { name: 'Midjourney-v6-Alpha', description: 'Midjourney v6 community model - artistic generation.', tags: ['image', 'art', 'midjourney'], readme: '# Midjourney v6\n\nArtistic images.', license: 'Community', compute_req: '1× RTX 4090 24GB', category: 'Image' },
      { name: 'Playground-v2.5', description: 'Playground AI v2.5 - aesthetic image generation.', tags: ['image', 'aesthetic', 'playground'], readme: '# Playground v2.5\n\nAesthetic images.', license: 'Playground', compute_req: '1× RTX 4090 24GB', category: 'Image' },
      { name: 'ControlNet-SDXL', description: 'ControlNet for SDXL - precise image control.', tags: ['image', 'controlnet', 'sdxl'], readme: '# ControlNet SDXL\n\nPrecise control.', license: 'OpenRAIL-M', compute_req: '1× RTX 4090 24GB', category: 'Image' },
      { name: 'YOLOv8', description: 'Real-time object detection model.', tags: ['cv', 'detection', 'yolo'], readme: '# YOLOv8\n\nFast and accurate object detection.', license: 'AGPL-3.0', compute_req: '1× RTX 3090 24GB', category: 'CV' },
      { name: 'YOLOv9', description: 'Latest YOLO v9 with improved accuracy.', tags: ['cv', 'detection', 'yolo'], readme: '# YOLOv9\n\nState-of-the-art detection.', license: 'GPL-3.0', compute_req: '1× RTX 4090 24GB', category: 'CV' },
      { name: 'SAM-2', description: 'Meta Segment Anything Model 2 - universal segmentation.', tags: ['cv', 'segmentation', 'meta'], readme: '# SAM 2\n\nUniversal segmentation.', license: 'Apache-2.0', compute_req: '1× A100 40GB', category: 'CV' },
      { name: 'DINO-v2', description: 'Meta DINOv2 - self-supervised vision transformer.', tags: ['cv', 'vision', 'meta'], readme: '# DINOv2\n\nVision transformer.', license: 'Apache-2.0', compute_req: '1× RTX 4090 24GB', category: 'CV' },
      { name: 'CLIP-ViT-L', description: 'OpenAI CLIP ViT-L - vision-language model.', tags: ['cv', 'multimodal', 'openai'], readme: '# CLIP ViT-L\n\nVision-language model.', license: 'MIT', compute_req: '1× RTX 3090 24GB', category: 'Multimodal' },
      { name: 'Whisper-Large-v3', description: 'OpenAI Whisper speech-to-text model.', tags: ['audio', 'asr', 'openai'], readme: '# Whisper v3\n\nMultilingual speech recognition.', license: 'MIT', compute_req: '1× A100 40GB', category: 'Audio' },
      { name: 'Whisper-Large-v3-Turbo', description: 'Faster Whisper v3 with optimized inference.', tags: ['audio', 'asr', 'openai'], readme: '# Whisper Turbo\n\nFast speech recognition.', license: 'MIT', compute_req: '1× RTX 4090 24GB', category: 'Audio' },
      { name: 'Bark', description: 'Suno AI Bark - text-to-audio generation.', tags: ['audio', 'tts', 'suno'], readme: '# Bark\n\nText-to-audio generation.', license: 'MIT', compute_req: '1× RTX 4090 24GB', category: 'Audio' },
      { name: 'MusicGen', description: 'Meta MusicGen - AI music generation.', tags: ['audio', 'music', 'meta'], readme: '# MusicGen\n\nAI music generation.', license: 'CC-BY-NC-4.0', compute_req: '1× A100 40GB', category: 'Audio' },
      { name: 'AudioCraft', description: 'Meta AudioCraft - audio and music generation suite.', tags: ['audio', 'music', 'meta'], readme: '# AudioCraft\n\nAudio generation suite.', license: 'MIT', compute_req: '1× A100 40GB', category: 'Audio' },
      { name: 'AnimateDiff', description: 'AnimateDiff - animate images with motion.', tags: ['video', 'animation', 'diffusion'], readme: '# AnimateDiff\n\nImage animation.', license: 'Apache-2.0', compute_req: '1× A100 40GB', category: 'Video' },
      { name: 'Stable-Video-Diffusion', description: 'Stability AI video generation model.', tags: ['video', 'diffusion', 'stability'], readme: '# SVD\n\nVideo generation.', license: 'Stability-AI', compute_req: '2× A100 40GB', category: 'Video' },
      { name: 'CogVideoX', description: 'Tsinghua CogVideoX - text-to-video generation.', tags: ['video', 'generation', 'tsinghua'], readme: '# CogVideoX\n\nText-to-video.', license: 'Apache-2.0', compute_req: '2× A100 80GB', category: 'Video' },
      { name: 'LLaVA-1.6-34B', description: 'Large Language and Vision Assistant - multimodal understanding.', tags: ['multimodal', 'vision', 'llm'], readme: '# LLaVA 1.6\n\nVision-language model.', license: 'Apache-2.0', compute_req: '2× A100 40GB', category: 'Multimodal' },
      { name: 'Qwen-VL-Chat', description: 'Alibaba Qwen Vision-Language chat model.', tags: ['multimodal', 'vision', 'chat'], readme: '# Qwen-VL\n\nVision-language chat.', license: 'Tongyi Qianwen', compute_req: '1× A100 40GB', category: 'Multimodal' },
      { name: 'CogVLM2', description: 'Tsinghua CogVLM2 - advanced vision-language model.', tags: ['multimodal', 'vision', 'tsinghua'], readme: '# CogVLM2\n\nAdvanced VLM.', license: 'Apache-2.0', compute_req: '2× A100 40GB', category: 'Multimodal' },
      { name: 'BioGPT', description: 'Microsoft BioGPT - biomedical text generation.', tags: ['specialized', 'biomedical', 'microsoft'], readme: '# BioGPT\n\nBiomedical LLM.', license: 'MIT', compute_req: '1× RTX 3090 24GB', category: 'Specialized' },
      { name: 'ESM-2', description: 'Meta ESM-2 - protein language model.', tags: ['specialized', 'protein', 'meta'], readme: '# ESM-2\n\nProtein language model.', license: 'MIT', compute_req: '1× A100 40GB', category: 'Specialized' },
      { name: 'AlphaFold2', description: 'DeepMind AlphaFold2 - protein structure prediction.', tags: ['specialized', 'protein', 'deepmind'], readme: '# AlphaFold2\n\nProtein structure.', license: 'Apache-2.0', compute_req: '1× A100 40GB', category: 'Specialized' },
      { name: 'MolFormer', description: 'IBM MolFormer - molecular property prediction.', tags: ['specialized', 'chemistry', 'ibm'], readme: '# MolFormer\n\nMolecular properties.', license: 'MIT', compute_req: '1× RTX 4090 24GB', category: 'Specialized' },
      { name: 'BGE-Large-EN-v1.5', description: 'BAAI BGE - best embedding model for English.', tags: ['embedding', 'retrieval', 'baai'], readme: '# BGE Large\n\nBest embeddings.', license: 'MIT', compute_req: '1× RTX 3090 24GB', category: 'LLM' },
      { name: 'E5-Mistral-7B', description: 'Microsoft E5-Mistral - instruction-tuned embeddings.', tags: ['embedding', 'retrieval', 'microsoft'], readme: '# E5-Mistral\n\nInstruction embeddings.', license: 'MIT', compute_req: '1× RTX 4090 24GB', category: 'LLM' },
      { name: 'Nomic-Embed-Text-v1.5', description: 'Nomic AI embedding model with long context.', tags: ['embedding', 'retrieval', 'nomic'], readme: '# Nomic Embed\n\nLong context embeddings.', license: 'Apache-2.0', compute_req: '1× RTX 3090 24GB', category: 'LLM' },
    ]
    for (const m of demos) {
      await fetchJson('/models', { method: 'POST', body: JSON.stringify(m) }).catch(() => {})
    }
  }

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault()
    await fetchJson('/models', {
      method: 'POST',
      body: JSON.stringify({
        ...uploadForm,
        tags: uploadForm.tags.split(',').map(t => t.trim()).filter(Boolean),
      })
    })
    setShowUpload(false)
    setUploadForm({ name: '', description: '', tags: '', readme: '', license: 'MIT', compute_req: '', category: 'LLM' })
    loadModels()
  }

  const sortedModels = useMemo(() => {
    let arr = [...models]
    if (activeTab === 'Popular') arr.sort((a, b) => (b.downloads || 0) - (a.downloads || 0))
    else if (activeTab === 'Recently Updated') arr.sort((a, b) => (b.created_at || 0) - (a.created_at || 0))
    else arr.sort((a, b) => (b.likes || 0) - (a.likes || 0))
    return arr
  }, [models, activeTab])

  const filtered = useMemo(() => {
    let arr = sortedModels
    if (activeCategory !== 'All') {
      arr = arr.filter(m => m.category === activeCategory)
    }
    if (search.trim()) {
      const q = search.toLowerCase()
      arr = arr.filter(m =>
        m.name.toLowerCase().includes(q) ||
        m.description.toLowerCase().includes(q) ||
        m.tags.some(t => t.toLowerCase().includes(q))
      )
    }
    return arr
  }, [sortedModels, activeCategory, search])

  const searchSuggestions = useMemo(() => {
    if (!search.trim()) return []
    const q = search.toLowerCase()
    return models.filter(m => m.name.toLowerCase().includes(q)).slice(0, 5)
  }, [search, models])

  const allTags = useMemo(() => Array.from(new Set(models.flatMap(m => m.tags))), [models])

  const similarModels = useMemo(() => {
    if (!selectedModel) return []
    return models.filter(m =>
      m.id !== selectedModel.id &&
      (m.category === selectedModel.category || m.tags.some(t => selectedModel.tags.includes(t)))
    ).slice(0, 4)
  }, [selectedModel, models])

  const getUsageExample = (model: ModelCard): string => {
    const name = model.name
    const lower = name.toLowerCase()
    if (lower.includes('stable') || lower.includes('flux') || lower.includes('midjourney')) {
      return `from diffusers import StableDiffusionPipeline
pipe = StableDiffusionPipeline.from_pretrained("${name}")
pipe.to("cuda")
image = pipe("A cyberpunk city at night").images[0]`
    }
    if (lower.includes('whisper')) {
      return `import whisper
model = whisper.load_model("${name}")
result = model.transcribe("audio.mp3")
print(result["text"])`
    }
    if (lower.includes('yolo')) {
      return `from ultralytics import YOLO
model = YOLO("${name}.pt")
results = model.predict("image.jpg")
results[0].show()`
    }
    return `from transformers import AutoModelForCausalLM, AutoTokenizer
model = AutoModelForCausalLM.from_pretrained("${name}")
tokenizer = AutoTokenizer.from_pretrained("${name}")
inputs = tokenizer("Hello, world!", return_tensors="pt")
outputs = model.generate(**inputs, max_new_tokens=100)
print(tokenizer.decode(outputs[0]))`
  }

  return (
    <div className="max-w-7xl mx-auto px-6 py-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Model Hub</h1>
          <p className="text-slate-500 text-sm mt-1">Discover, share, and deploy AI models on decentralized compute</p>
        </div>
        <button onClick={() => setShowUpload(true)}
          className="px-5 py-2.5 rounded-lg bg-cyan-500 text-slate-950 font-bold text-sm hover:brightness-110 transition-all flex items-center gap-2">
          <span className="material-symbols-outlined text-sm">cloud_upload</span> Upload Model
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 overflow-x-auto">
        {TAB_OPTIONS.map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className={`tab-btn whitespace-nowrap ${activeTab === tab ? 'active' : ''}`}>
            {tab}
          </button>
        ))}
      </div>

      {/* Search + Category Filters */}
      <div className="glass rounded-xl p-5 mb-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative" ref={searchRef}>
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">search</span>
            <input value={search} onChange={e => setSearch(e.target.value)}
              onFocus={() => setSearchFocused(true)}
              placeholder="Search models by name, tag, or description..."
              className="w-full bg-black/30 border border-white/10 rounded-lg pl-10 pr-4 py-3 text-sm placeholder:text-slate-500 focus:border-cyan-500/50 focus:outline-none" />
            {searchFocused && searchSuggestions.length > 0 && (
              <div className="absolute z-20 top-full left-0 right-0 mt-2 glass-strong rounded-xl overflow-hidden border border-white/10">
                {searchSuggestions.map(s => (
                  <button key={s.id} onClick={() => { setSearch(s.name); setSearchFocused(false) }}
                    className="w-full text-left px-4 py-2.5 text-sm text-slate-300 hover:bg-white/5 transition-colors flex items-center gap-2">
                    <span className="material-symbols-outlined text-sm text-slate-500">search</span>
                    {s.name}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
        <div className="flex flex-wrap gap-2 mt-4">
          {CATEGORIES.map(cat => (
            <button key={cat} onClick={() => setActiveCategory(cat)}
              className={`chip ${activeCategory === cat ? 'active' : ''}`}>
              {cat}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap gap-2 mt-3">
          {allTags.slice(0, 12).map(tag => (
            <button key={tag} onClick={() => setSearch(tag)}
              className="chip">{tag}</button>
          ))}
        </div>
      </div>

      {/* Model Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
        {loading ? (
          Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)
        ) : filtered.map(m => {
          const price = estimatePriceFromComputeReq(m.compute_req || '')
          return (
            <div key={m.id} className="glass rounded-xl p-5 card-hover cursor-pointer gradient-border relative" onClick={() => setSelectedModel(m)}>
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="text-base font-bold">{m.name}</h3>
                  <p className="text-[10px] text-slate-500 font-mono">{m.owner}</p>
                </div>
                <Badge text={m.license} colorClass={LICENSE_COLORS[m.license] || undefined} />
              </div>
              <p className="text-sm text-slate-400 mb-3 line-clamp-2">{m.description}</p>
              <div className="flex flex-wrap gap-1.5 mb-3">
                {m.parameters && <Badge text={m.parameters} colorClass="bg-cyan-500/10 text-cyan-400 border-cyan-500/20" />}
                {m.precision?.map(p => <Badge key={p} text={p} colorClass="bg-violet-500/10 text-violet-400 border-violet-500/20" />)}
                {m.category && <Badge text={m.category} colorClass="bg-emerald-500/10 text-emerald-400 border-emerald-500/20" />}
              </div>
              <div className="flex flex-wrap gap-1.5 mb-4">
                {m.tags.slice(0, 4).map(t => (
                  <span key={t} className="text-[10px] px-2 py-0.5 rounded-full bg-white/5 text-slate-400 border border-white/10">{t}</span>
                ))}
              </div>
              <div className="flex items-center justify-between text-xs text-slate-500 pt-3 border-t border-white/5">
                <div className="flex items-center gap-3">
                  <span className="flex items-center gap-1"><span className="material-symbols-outlined text-xs">favorite</span> {formatNumber(m.likes)}</span>
                  <span className="flex items-center gap-1"><span className="material-symbols-outlined text-xs">fork_right</span> {formatNumber(m.forks)}</span>
                  <span className="flex items-center gap-1"><span className="material-symbols-outlined text-xs">download</span> {formatNumber(m.downloads)}</span>
                </div>
                {m.compute_req && (
                  <div className="text-right">
                    <span className="text-[10px] text-amber-400 block">{m.compute_req}</span>
                    <span className="text-[10px] text-slate-600">{price.min.toFixed(1)}-{price.max.toFixed(1)} {price.currency}</span>
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {filtered.length === 0 && !loading && (
        <div className="text-center py-16">
          <span className="material-symbols-outlined text-4xl text-slate-600 mb-3">search_off</span>
          <p className="text-slate-500">No models found matching your filters.</p>
        </div>
      )}

      {/* Upload Modal */}
      {showUpload && (
        <div className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={e => { if (e.target === e.currentTarget) setShowUpload(false) }}>
          <div className="glass rounded-2xl p-8 w-full max-w-lg max-h-[85vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">Upload Model</h2>
            <form onSubmit={handleUpload} className="space-y-4">
              <input required placeholder="Model name" value={uploadForm.name}
                onChange={e => setUploadForm(f => ({ ...f, name: e.target.value }))}
                className="w-full bg-black/30 border border-white/10 rounded-lg px-4 py-3 text-sm focus:border-cyan-500/50 outline-none" />
              <textarea placeholder="Description" rows={2} value={uploadForm.description}
                onChange={e => setUploadForm(f => ({ ...f, description: e.target.value }))}
                className="w-full bg-black/30 border border-white/10 rounded-lg px-4 py-3 text-sm focus:border-cyan-500/50 outline-none" />
              <input placeholder="Tags (comma separated)" value={uploadForm.tags}
                onChange={e => setUploadForm(f => ({ ...f, tags: e.target.value }))}
                className="w-full bg-black/30 border border-white/10 rounded-lg px-4 py-3 text-sm focus:border-cyan-500/50 outline-none" />
              <select value={uploadForm.category}
                onChange={e => setUploadForm(f => ({ ...f, category: e.target.value }))}
                className="w-full bg-black/30 border border-white/10 rounded-lg px-4 py-3 text-sm text-slate-300 focus:border-cyan-500/50 outline-none">
                {CATEGORIES.filter(c => c !== 'All').map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              <input placeholder="License" value={uploadForm.license}
                onChange={e => setUploadForm(f => ({ ...f, license: e.target.value }))}
                className="w-full bg-black/30 border border-white/10 rounded-lg px-4 py-3 text-sm focus:border-cyan-500/50 outline-none" />
              <input placeholder="Compute requirements (e.g. 1× A100 80GB)" value={uploadForm.compute_req}
                onChange={e => setUploadForm(f => ({ ...f, compute_req: e.target.value }))}
                className="w-full bg-black/30 border border-white/10 rounded-lg px-4 py-3 text-sm focus:border-cyan-500/50 outline-none" />
              <textarea placeholder="README (markdown supported)" rows={4} value={uploadForm.readme}
                onChange={e => setUploadForm(f => ({ ...f, readme: e.target.value }))}
                className="w-full bg-black/30 border border-white/10 rounded-lg px-4 py-3 text-sm focus:border-cyan-500/50 outline-none" />
              <button type="submit" className="w-full py-3 rounded-xl bg-cyan-500 text-slate-950 font-bold hover:brightness-110 transition-all">
                Upload
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {selectedModel && (
        <div className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={e => { if (e.target === e.currentTarget) setSelectedModel(null) }}>
          <div className="glass rounded-2xl p-6 md:p-8 w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            {loading ? <SkeletonDetail /> : (
              <>
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h2 className="text-2xl font-bold">{selectedModel.name}</h2>
                      {selectedModel.versions && selectedModel.versions[0] && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 font-mono">
                          {selectedModel.versions[0].version}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-slate-500">by {selectedModel.owner} · {selectedModel.license}</p>
                  </div>
                  <button onClick={() => setSelectedModel(null)} className="text-slate-500 hover:text-white p-1">
                    <span className="material-symbols-outlined">close</span>
                  </button>
                </div>

                <p className="text-slate-300 mb-4">{selectedModel.description}</p>

                <div className="flex flex-wrap gap-2 mb-6">
                  {selectedModel.parameters && <Badge text={selectedModel.parameters} colorClass="bg-cyan-500/10 text-cyan-400 border-cyan-500/20" />}
                  {selectedModel.precision?.map(p => <Badge key={p} text={p} colorClass="bg-violet-500/10 text-violet-400 border-violet-500/20" />)}
                  {selectedModel.tags.map(t => (
                    <span key={t} className="text-xs px-3 py-1 rounded-full bg-white/5 text-slate-400 border border-white/10">{t}</span>
                  ))}
                </div>

                {/* GPU Requirements */}
                {selectedModel.compute_req && (
                  <div className="glass rounded-lg p-4 mb-6 border border-amber-500/20">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="material-symbols-outlined text-amber-400">memory</span>
                      <p className="text-xs uppercase tracking-wider text-slate-500">Compute Requirements</p>
                    </div>
                    <p className="text-sm font-semibold text-amber-400 mb-2">{selectedModel.compute_req}</p>
                    <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-amber-500 to-amber-300 rounded-full" style={{ width: selectedModel.compute_req.includes('70B') || selectedModel.compute_req.includes('2×') ? '85%' : selectedModel.compute_req.includes('A100') ? '70%' : '45%' }} />
                    </div>
                    <p className="text-[10px] text-slate-500 mt-1">Intensity: {selectedModel.compute_req.includes('70B') || selectedModel.compute_req.includes('2×') ? 'Very High' : selectedModel.compute_req.includes('A100') ? 'High' : 'Moderate'}</p>
                  </div>
                )}

                {/* Pricing */}
                {selectedModel.compute_req && (
                  <div className="glass rounded-lg p-4 mb-6">
                    <p className="text-xs uppercase tracking-wider text-slate-500 mb-2">Estimated Pricing</p>
                    <div className="flex items-center gap-4">
                      {(() => {
                        const price = estimatePriceFromComputeReq(selectedModel.compute_req)
                        return (
                          <>
                            <div className="text-center">
                              <p className="text-xl font-bold text-emerald-400">{price.min.toFixed(1)}-{price.max.toFixed(1)}</p>
                              <p className="text-[10px] text-slate-500 uppercase">{price.currency}</p>
                            </div>
                            <div className="h-8 w-px bg-white/10" />
                            <div className="text-center">
                              <p className="text-xl font-bold text-cyan-400">~{(price.min * 8).toFixed(0)}</p>
                              <p className="text-[10px] text-slate-500 uppercase">ALGO/day</p>
                            </div>
                          </>
                        )
                      })()}
                    </div>
                  </div>
                )}

                {/* Stats */}
                <div className="flex items-center gap-4 mb-6">
                  <div className="text-center flex-1 glass rounded-lg p-3">
                    <p className="text-2xl font-bold text-cyan-400">{formatNumber(selectedModel.likes)}</p>
                    <p className="text-[10px] text-slate-500 uppercase tracking-wider">Likes</p>
                  </div>
                  <div className="text-center flex-1 glass rounded-lg p-3">
                    <p className="text-2xl font-bold text-violet-400">{formatNumber(selectedModel.forks)}</p>
                    <p className="text-[10px] text-slate-500 uppercase tracking-wider">Forks</p>
                  </div>
                  <div className="text-center flex-1 glass rounded-lg p-3">
                    <p className="text-2xl font-bold text-emerald-400">{formatNumber(selectedModel.downloads)}</p>
                    <p className="text-[10px] text-slate-500 uppercase tracking-wider">Downloads</p>
                  </div>
                </div>

                {/* Benchmarks */}
                {selectedModel.benchmarks && selectedModel.benchmarks.length > 0 && (
                  <div className="mb-6">
                    <p className="text-xs uppercase tracking-wider text-slate-500 mb-3">Benchmarks</p>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      {selectedModel.benchmarks.map((b, i) => (
                        <div key={i} className="glass rounded-lg p-3 text-center">
                          <p className="text-lg font-bold text-cyan-400">{b.value}<span className="text-xs text-slate-500 ml-1">{b.unit}</span></p>
                          <p className="text-[10px] text-slate-500">{b.metric}</p>
                          <p className="text-[10px] text-slate-600 font-mono">{b.hardware}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Usage Example */}
                <div className="glass rounded-lg p-4 mb-6 overflow-hidden">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs uppercase tracking-wider text-slate-500">Usage Example</p>
                    <CopyButton text={getUsageExample(selectedModel)} />
                  </div>
                  <pre className="font-mono text-xs text-slate-400 bg-black/30 rounded-lg p-3 overflow-x-auto"><code>{getUsageExample(selectedModel)}</code></pre>
                </div>

                {/* README */}
                <div className="glass rounded-lg p-4 mb-6">
                  <p className="text-xs uppercase tracking-wider text-slate-500 mb-2">README</p>
                  <div className="max-h-48 overflow-y-auto pr-2">
                    <ReadmeRenderer readme={selectedModel.readme || '# No README provided'} />
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
                  <Link to={`/submit?template=${selectedModel.tags[0] || 'inference'}&model=${encodeURIComponent(selectedModel.name)}`}
                    onClick={() => setSelectedModel(null)}
                    className="py-3 rounded-xl bg-cyan-500 text-slate-950 font-bold text-center hover:brightness-110 transition-all flex items-center justify-center gap-2 text-sm">
                    <span className="material-symbols-outlined text-lg">rocket_launch</span>
                    Run Inference
                  </Link>
                  <Link to={`/submit?template=finetune&model=${encodeURIComponent(selectedModel.name)}`}
                    onClick={() => setSelectedModel(null)}
                    className="py-3 rounded-xl bg-violet-500/20 border border-violet-500/30 text-violet-300 font-bold text-center hover:bg-violet-500/30 transition-all flex items-center justify-center gap-2 text-sm">
                    <span className="material-symbols-outlined text-lg">tune</span>
                    Fine-tune
                  </Link>
                  <Link to={`/submit?template=api&model=${encodeURIComponent(selectedModel.name)}`}
                    onClick={() => setSelectedModel(null)}
                    className="py-3 rounded-xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 font-bold text-center hover:bg-emerald-500/30 transition-all flex items-center justify-center gap-2 text-sm">
                    <span className="material-symbols-outlined text-lg">api</span>
                    Deploy API
                  </Link>
                  <button onClick={async () => {
                    try {
                      const result = await fetchJson(`/models/${selectedModel.id}/fork`, {
                        method: 'POST',
                        body: JSON.stringify({ owner: 'user' })
                      })
                      alert(`✅ Model forked successfully! New model ID: ${result.id || 'created'}`)
                      loadModels()
                      setSelectedModel(null)
                    } catch (err: any) {
                      alert(`❌ Fork failed: ${err.message}`)
                    }
                  }} className="py-3 rounded-xl bg-white/5 border border-white/10 text-slate-300 font-bold hover:bg-white/10 transition-all flex items-center justify-center gap-2 text-sm">
                    <span className="material-symbols-outlined text-lg">fork_right</span>
                    Fork Model
                  </button>
                </div>

                {/* Similar Models */}
                {similarModels.length > 0 && (
                  <div>
                    <p className="text-xs uppercase tracking-wider text-slate-500 mb-3">Similar Models</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {similarModels.map(sm => (
                        <button key={sm.id} onClick={() => setSelectedModel(sm)}
                          className="glass rounded-lg p-3 text-left card-hover">
                          <p className="text-sm font-semibold">{sm.name}</p>
                          <p className="text-[10px] text-slate-500 line-clamp-1">{sm.description}</p>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
