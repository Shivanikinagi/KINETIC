import { useEffect, useState } from 'react'
import { fetchJson } from '../lib/api'

interface ApiKey {
  key_id: string
  prefix: string
  usage_count: number
  revoked: boolean
  created_at: number
}

export default function ApiKeys() {
  const [keys, setKeys] = useState<ApiKey[]>([])
  const [newKey, setNewKey] = useState<string | null>(null)
  const [endpoints] = useState([
    { path: '/api/v1/run/{model_id}', method: 'POST', desc: 'Run inference on a deployed model', status: 'active' },
    { path: '/api/v1/jobs', method: 'GET', desc: 'List your compute jobs', status: 'active' },
    { path: '/api/v1/providers', method: 'GET', desc: 'List available GPU providers', status: 'active' },
    { path: '/api/v1/models', method: 'GET', desc: 'List models in the hub', status: 'active' },
  ])

  useEffect(() => { loadKeys() }, [])

  const loadKeys = async () => {
    const data = await fetchJson('/api-keys').catch(() => ({ keys: [] }))
    setKeys(data.keys || [])
  }

  const handleCreate = async () => {
    const data = await fetchJson('/api-keys', { method: 'POST', body: JSON.stringify({ owner: 'user' }) }).catch(() => null)
    if (data) {
      setNewKey(data.api_key)
      loadKeys()
    }
  }

  const handleRevoke = async (key_id: string) => {
    await fetchJson(`/api-keys/${key_id}/revoke`, { method: 'POST', body: JSON.stringify({ owner: 'user' }) }).catch(() => {})
    loadKeys()
  }

  const formatDate = (ts: number) => new Date(ts * 1000).toLocaleDateString()

  return (
    <div>
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">API Deployment</h1>
          <p className="text-slate-500 text-sm mt-1">Deploy models as inference endpoints and manage API access</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* API Keys */}
        <div className="lg:col-span-2 space-y-6">
          <div className="glass rounded-xl p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold">API Keys</h2>
              <button onClick={handleCreate}
                className="px-4 py-2 rounded-lg bg-cyan-500 text-slate-950 text-sm font-bold hover:brightness-110 transition-all flex items-center gap-2">
                <span className="material-symbols-outlined text-sm">add</span> New Key
              </button>
            </div>

            {newKey && (
              <div className="mb-6 p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                <p className="text-sm font-semibold text-emerald-400 mb-2 flex items-center gap-2">
                  <span className="material-symbols-outlined text-sm">check_circle</span> Key Created
                </p>
                <p className="text-xs text-slate-500 mb-2">Copy this now. It will not be shown again.</p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 bg-black/50 rounded-lg px-3 py-2 text-sm font-mono text-cyan-400 break-all">{newKey}</code>
                  <button onClick={() => { navigator.clipboard.writeText(newKey); setNewKey(null) }}
                    className="px-3 py-2 rounded-lg bg-white/5 text-slate-300 text-sm hover:bg-white/10 transition-all">
                    Copy
                  </button>
                </div>
              </div>
            )}

            {keys.length === 0 ? (
              <div className="text-center py-8 text-slate-500">
                <span className="material-symbols-outlined text-3xl mb-2">key</span>
                <p className="text-sm">No API keys yet.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {keys.map(k => (
                  <div key={k.key_id} className="flex items-center justify-between p-4 rounded-lg bg-white/[0.03]">
                    <div className="flex items-center gap-3">
                      <span className="material-symbols-outlined text-slate-500">key</span>
                      <div>
                        <p className="text-sm font-mono">{k.prefix}...</p>
                        <p className="text-[10px] text-slate-500">Created {formatDate(k.created_at)} · {k.usage_count} requests</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {k.revoked ? (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-500/10 text-red-400 border border-red-500/20">Revoked</span>
                      ) : (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">Active</span>
                      )}
                      {!k.revoked && (
                        <button onClick={() => handleRevoke(k.key_id)}
                          className="text-xs text-red-400 hover:text-red-300 px-2 py-1 rounded hover:bg-red-500/10 transition-all">
                          Revoke
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Endpoints */}
          <div className="glass rounded-xl p-6">
            <h2 className="text-lg font-bold mb-4">Endpoints</h2>
            <div className="space-y-3">
              {endpoints.map(ep => (
                <div key={ep.path} className="p-4 rounded-lg bg-white/[0.03]">
                  <div className="flex items-center gap-3 mb-2">
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                      ep.method === 'GET' ? 'bg-cyan-500/10 text-cyan-400' : 'bg-violet-500/10 text-violet-400'
                    }`}>{ep.method}</span>
                    <code className="text-sm font-mono text-slate-300">{ep.path}</code>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">{ep.status}</span>
                  </div>
                  <p className="text-xs text-slate-500">{ep.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Usage Stats */}
        <div className="space-y-6">
          <div className="glass rounded-xl p-6">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500 mb-4">Usage Stats</h2>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-400">Requests (24h)</span>
                  <span className="text-slate-300">{keys.reduce((s, k) => s + k.usage_count, 0)}</span>
                </div>
                <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                  <div className="h-full bg-cyan-400 rounded-full" style={{ width: '45%' }} />
                </div>
              </div>
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-400">Tokens Processed</span>
                  <span className="text-slate-300">12.4K</span>
                </div>
                <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                  <div className="h-full bg-violet-400 rounded-full" style={{ width: '62%' }} />
                </div>
              </div>
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-400">Avg Latency</span>
                  <span className="text-slate-300">340ms</span>
                </div>
                <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-400 rounded-full" style={{ width: '28%' }} />
                </div>
              </div>
            </div>
          </div>

          <div className="glass rounded-xl p-6">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500 mb-4">Quick Start</h2>
            <div className="bg-black/50 rounded-lg p-4 font-mono text-xs text-slate-400 overflow-x-auto border border-white/5">
              <p className="text-slate-500 mb-2"># Run inference</p>
              <p>curl -X POST \</p>
              <p className="pl-4">http://localhost:8000/api/v1/run/llama3 \</p>
              <p className="pl-4">-H "X-API-Key: &lt;your-key&gt;" \</p>
              <p className="pl-4">{'-d \'{"prompt": "Hello"}\''}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
