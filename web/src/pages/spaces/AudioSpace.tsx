import { useState, useRef, useEffect } from 'react'
import { fetchJson } from '../../lib/api'

export default function AudioSpace() {
  const [mode, setMode] = useState<'tts' | 'stt'>('tts')
  const [text, setText] = useState('')
  const [result, setResult] = useState('')
  const [loading, setLoading] = useState(false)
  const [isRecording, setIsRecording] = useState(false)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [selectedVoice, setSelectedVoice] = useState<SpeechSynthesisVoice | null>(null)
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([])
  const [history, setHistory] = useState<Array<{mode: string, input: string, output: string, jobId: string, txUrl?: string}>>([])
  const recognitionRef = useRef<any>(null)
  const synthRef = useRef<SpeechSynthesis | null>(null)

  useEffect(() => {
    const synth = window.speechSynthesis
    synthRef.current = synth

    const loadVoices = () => {
      const available = synth.getVoices().filter(v => v.lang.startsWith('en'))
      setVoices(available)
      if (available.length > 0 && !selectedVoice) {
        setSelectedVoice(available[0])
      }
    }

    loadVoices()
    synth.onvoiceschanged = loadVoices

    return () => {
      synth.cancel()
    }
  }, [])

  // ── Text-to-Speech ──────────────────────────────────────────────────────
  const handleSpeak = async () => {
    if (!text.trim() || !synthRef.current) return

    setLoading(true)
    setResult('')

    try {
      // Submit compute job for proof
      const res = await fetchJson('/job', {
        method: 'POST',
        body: JSON.stringify({
          type: 'audio',
          tokens: 600,
          payload: JSON.stringify({
            name: 'Text-to-Speech',
            description: 'Convert text to spoken audio',
            text: text.trim(),
            action: 'tts',
            language: 'en',
            voice: selectedVoice?.name || 'default'
          })
        })
      })

      // Play audio via Web Speech API
      const utterance = new SpeechSynthesisUtterance(text.trim())
      if (selectedVoice) utterance.voice = selectedVoice
      utterance.rate = 1
      utterance.pitch = 1
      utterance.onstart = () => setIsSpeaking(true)
      utterance.onend = () => setIsSpeaking(false)
      utterance.onerror = () => setIsSpeaking(false)
      synthRef.current.speak(utterance)

      const output = `TTS generated: "${text.trim().slice(0, 60)}${text.length > 60 ? '...' : ''}"`
      const newItem = {
        mode: 'Text-to-Speech',
        input: text.trim(),
        output,
        jobId: res.job_id || '',
        txUrl: res.explorer_url
      }
      setResult(output)
      setHistory(prev => [newItem, ...prev])
    } catch (err: any) {
      setResult(`Error: ${err.message || 'TTS failed'}`)
    } finally {
      setLoading(false)
    }
  }

  const handleStopSpeaking = () => {
    if (synthRef.current) {
      synthRef.current.cancel()
      setIsSpeaking(false)
    }
  }

  // ── Speech-to-Text ──────────────────────────────────────────────────────
  const startRecording = async () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SpeechRecognition) {
      setResult('Error: Speech recognition not supported in this browser. Try Chrome.')
      return
    }

    const recognition = new SpeechRecognition()
    recognition.lang = 'en-US'
    recognition.continuous = false
    recognition.interimResults = false
    recognitionRef.current = recognition

    recognition.onstart = () => setIsRecording(true)
    recognition.onend = () => setIsRecording(false)
    recognition.onerror = (event: any) => {
      setIsRecording(false)
      setResult(`Error: ${event.error}`)
    }

    recognition.onresult = async (event: any) => {
      const transcript = event.results[0][0].transcript
      setText(transcript)

      try {
        const res = await fetchJson('/job', {
          method: 'POST',
          body: JSON.stringify({
            type: 'audio',
            tokens: 600,
            payload: JSON.stringify({
              name: 'Speech-to-Text',
              description: 'Transcribe speech to text',
              text: transcript,
              action: 'stt',
              language: 'en'
            })
          })
        })

        const output = `Transcription: "${transcript}"`
        const newItem = {
          mode: 'Speech-to-Text',
          input: '[voice input]',
          output,
          jobId: res.job_id || '',
          txUrl: res.explorer_url
        }
        setResult(output)
        setHistory(prev => [newItem, ...prev])
      } catch (err: any) {
        setResult(`Error: ${err.message || 'STT failed'}`)
      }
    }

    recognition.start()
  }

  const stopRecording = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop()
      setIsRecording(false)
    }
  }

  return (
    <div className="max-w-5xl mx-auto px-6 py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">Audio Studio</h1>
        <p className="text-slate-500 text-sm mt-1">Text-to-Speech and Speech-to-Text powered by browser-native Web Speech API</p>
      </div>

      {/* Mode Toggle */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setMode('tts')}
          className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${
            mode === 'tts'
              ? 'bg-cyan-500 text-slate-950'
              : 'bg-white/5 text-slate-400 hover:text-slate-300 hover:bg-white/10'
          }`}>
          <span className="material-symbols-outlined text-sm align-text-bottom mr-1">volume_up</span>
          Text to Speech
        </button>
        <button
          onClick={() => setMode('stt')}
          className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${
            mode === 'stt'
              ? 'bg-cyan-500 text-slate-950'
              : 'bg-white/5 text-slate-400 hover:text-slate-300 hover:bg-white/10'
          }`}>
          <span className="material-symbols-outlined text-sm align-text-bottom mr-1">mic</span>
          Speech to Text
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Input Panel */}
        <div className="space-y-6">
          <div className="glass rounded-xl p-6">
            <h2 className="text-lg font-bold mb-4">
              {mode === 'tts' ? 'Input Text' : 'Transcription Result'}
            </h2>

            {/* TTS: Voice selector */}
            {mode === 'tts' && voices.length > 0 && (
              <select
                value={selectedVoice?.name || ''}
                onChange={e => setSelectedVoice(voices.find(v => v.name === e.target.value) || null)}
                className="w-full mb-4 bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-sm text-slate-300 focus:border-cyan-500/50 focus:outline-none">
                {voices.map(v => (
                  <option key={v.name} value={v.name}>
                    {v.name} ({v.lang})
                  </option>
                ))}
              </select>
            )}

            <textarea
              value={text}
              onChange={e => setText(e.target.value)}
              placeholder={
                mode === 'tts'
                  ? "Enter text to speak...\n\nExample: Hello, welcome to the decentralized compute network."
                  : "Click the microphone to start speaking, or type text here..."
              }
              rows={8}
              className="w-full bg-black/30 border border-white/10 rounded-lg px-4 py-3 text-sm placeholder:text-slate-600 focus:border-cyan-500/50 focus:outline-none resize-none"
            />

            <div className="flex items-center justify-between mt-4">
              <span className="text-xs text-slate-500">{text.length} chars</span>

              {mode === 'tts' ? (
                <div className="flex gap-2">
                  {isSpeaking ? (
                    <button
                      onClick={handleStopSpeaking}
                      className="px-6 py-2.5 rounded-lg bg-red-500 text-white font-bold hover:brightness-110 transition-all flex items-center gap-2">
                      <span className="material-symbols-outlined text-sm">stop</span>
                      Stop
                    </button>
                  ) : (
                    <button
                      onClick={handleSpeak}
                      disabled={loading || !text.trim()}
                      className="px-6 py-2.5 rounded-lg bg-cyan-500 text-slate-950 font-bold hover:brightness-110 transition-all disabled:opacity-50 flex items-center gap-2">
                      {loading ? (
                        <>
                          <span className="animate-spin material-symbols-outlined text-sm">progress_activity</span>
                          Processing...
                        </>
                      ) : (
                        <>
                          <span className="material-symbols-outlined text-sm">volume_up</span>
                          Speak
                        </>
                      )}
                    </button>
                  )}
                </div>
              ) : (
                <button
                  onClick={isRecording ? stopRecording : startRecording}
                  className={`px-6 py-2.5 rounded-lg font-bold transition-all flex items-center gap-2 ${
                    isRecording
                      ? 'bg-red-500 text-white hover:brightness-110'
                      : 'bg-cyan-500 text-slate-950 hover:brightness-110'
                  }`}>
                  {isRecording ? (
                    <>
                      <span className="animate-pulse material-symbols-outlined text-sm">mic</span>
                      Stop Recording
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-sm">mic</span>
                      Record
                    </>
                  )}
                </button>
              )}
            </div>
          </div>

          {/* Quick Examples */}
          {mode === 'tts' && (
            <div className="glass rounded-xl p-6">
              <h3 className="text-sm font-bold mb-3 text-slate-400">Quick Examples</h3>
              <div className="space-y-2">
                {[
                  'Hello, welcome to the decentralized compute network.',
                  'The future of AI is peer-to-peer and trustless.',
                  'Algorand enables fast, secure, and scalable smart contracts.',
                  'Kinetic connects GPU providers with AI developers worldwide.'
                ].map((ex, i) => (
                  <button
                    key={i}
                    onClick={() => setText(ex)}
                    className="w-full text-left text-xs px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-slate-400 hover:text-slate-300 hover:bg-white/10 transition-all">
                    {ex}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Output Panel */}
        <div className="space-y-6">
          <div className="glass rounded-xl p-6">
            <h2 className="text-lg font-bold mb-4">
              {mode === 'tts' ? 'Audio Output' : 'Transcription Result'}
            </h2>
            {result ? (
              <div className="space-y-4">
                <div className="bg-black/30 border border-white/10 rounded-lg p-4">
                  <p className="text-sm text-slate-300 whitespace-pre-wrap">{result}</p>
                </div>

                {/* TTS: Audio visualizer placeholder */}
                {mode === 'tts' && isSpeaking && (
                  <div className="flex items-center justify-center gap-1 h-12">
                    {[...Array(8)].map((_, i) => (
                      <div
                        key={i}
                        className="w-1.5 bg-cyan-400 rounded-full animate-pulse"
                        style={{
                          height: `${Math.random() * 100}%`,
                          animationDelay: `${i * 0.1}s`
                        }}
                      />
                    ))}
                  </div>
                )}

                <div className="flex gap-2">
                  <button
                    onClick={() => navigator.clipboard.writeText(result)}
                    className="flex-1 py-2 rounded-lg bg-white/5 border border-white/10 text-slate-300 text-sm font-bold hover:bg-white/10 transition-all flex items-center justify-center gap-1">
                    <span className="material-symbols-outlined text-sm">content_copy</span> Copy
                  </button>
                  <button
                    onClick={() => { setText(''); setResult('') }}
                    className="flex-1 py-2 rounded-lg bg-white/5 border border-white/10 text-slate-300 text-sm font-bold hover:bg-white/10 transition-all flex items-center justify-center gap-1">
                    <span className="material-symbols-outlined text-sm">refresh</span> New
                  </button>
                </div>
              </div>
            ) : (
              <div className="h-48 rounded-lg border-2 border-dashed border-white/10 flex items-center justify-center">
                <div className="text-center text-slate-500">
                  <span className="material-symbols-outlined text-4xl mb-2 block">
                    {mode === 'tts' ? 'volume_up' : 'transcribe'}
                  </span>
                  <p className="text-sm">
                    {mode === 'tts'
                      ? 'Enter text and click Speak to hear audio'
                      : 'Click Record and speak to see transcription'}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* History */}
          {history.length > 0 && (
            <div className="glass rounded-xl p-6">
              <h3 className="text-sm font-bold mb-3 text-slate-400">History</h3>
              <div className="space-y-3 max-h-64 overflow-y-auto">
                {history.map((h, i) => (
                  <div key={i} className="bg-black/20 rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${
                        h.mode === 'Text-to-Speech'
                          ? 'bg-cyan-500/20 text-cyan-400'
                          : 'bg-purple-500/20 text-purple-400'
                      }`}>
                        {h.mode}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mb-1">Input: <span className="text-slate-400">{h.input.slice(0, 50)}...</span></p>
                    <p className="text-xs text-slate-300">{h.output.slice(0, 60)}...</p>
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
