import type { Provider } from '../lib/api'

export default function ProviderCard({ provider, onDeploy }: { provider: Provider; onDeploy?: () => void }) {
  const price = typeof provider.price_per_hour === 'number' ? provider.price_per_hour.toFixed(2) : provider.price_per_hour
  const uptime = Number(provider.uptime || 0)
  const uptimeColor = uptime >= 99 ? 'text-emerald-400' : uptime >= 95 ? 'text-amber-400' : 'text-red-400'
  const verified = provider.verified_member || provider.org_verified

  return (
    <div className="glass rounded-xl overflow-hidden card-hover">
      <div className="p-5 space-y-4">
        <div className="flex items-start justify-between">
          <div className="min-w-0">
            <h3 className="font-bold text-sm truncate">{provider.name || provider.id}</h3>
            <p className="text-xs text-slate-500 font-mono mt-0.5">{provider.gpu_model || 'GPU'}</p>
            {provider.org_name ? (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-300 border border-cyan-500/20 inline-block mt-1">
                {provider.org_name}
              </span>
            ) : null}
          </div>
          <div className="flex flex-col items-end gap-1 shrink-0">
            {verified ? (
              <span className="material-symbols-outlined text-emerald-400 text-sm">verified</span>
            ) : null}
          </div>
        </div>
        <div className="grid grid-cols-4 gap-2">
          <div className="text-center">
            <p className="text-[9px] text-slate-500 uppercase">VRAM</p>
            <p className="font-bold text-xs">{provider.vram_gb || '?'}GB</p>
          </div>
          <div className="text-center">
            <p className="text-[9px] text-slate-500 uppercase">Price</p>
            <p className="font-bold text-xs">{price} A</p>
          </div>
          <div className="text-center">
            <p className="text-[9px] text-slate-500 uppercase">Uptime</p>
            <p className={`font-bold text-xs ${uptimeColor}`}>{uptime}%</p>
          </div>
          <div className="text-center">
            <p className="text-[9px] text-slate-500 uppercase">Score</p>
            <p className="font-bold text-xs text-cyan-400">
              {provider.trust?.reputation_score?.toFixed(0) || (verified ? '80' : '—')}
            </p>
          </div>
        </div>
        {onDeploy ? (
          <button
            onClick={onDeploy}
            className="w-full py-2.5 rounded-lg bg-cyan-500/10 text-cyan-400 text-sm font-semibold hover:bg-cyan-500/20 transition-all border border-cyan-500/20 flex items-center justify-center gap-1.5"
          >
            <span className="material-symbols-outlined text-sm">rocket_launch</span>
            Deploy
          </button>
        ) : null}
      </div>
    </div>
  )
}
