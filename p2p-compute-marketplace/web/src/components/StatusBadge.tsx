type Status = 'completed' | 'failed' | 'pending' | 'running'

const styles: Record<Status, string> = {
  completed: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  failed: 'bg-red-500/10 text-red-400 border-red-500/20',
  pending: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  running: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
}

export default function StatusBadge({ status }: { status?: string }) {
  const s = (status || 'pending') as Status
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${styles[s] || styles.pending}`}>
      {s === 'completed' && <span className="material-symbols-outlined text-[10px]">check_circle</span>}
      {s === 'failed' && <span className="material-symbols-outlined text-[10px]">error</span>}
      {s === 'running' && <span className="material-symbols-outlined text-[10px]">schedule</span>}
      {s === 'pending' && <span className="material-symbols-outlined text-[10px]">hourglass_empty</span>}
      {s}
    </span>
  )
}
