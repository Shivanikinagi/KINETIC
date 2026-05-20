import { Link } from 'react-router-dom'

export default function Footer() {
  return (
    <footer className="border-t border-white/5 py-8">
      <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-6">
          <Link to="/" className="text-sm font-black italic gradient-text">KINETIC</Link>
          <span className="text-[10px] text-slate-600">2026 · Powered by Algorand</span>
        </div>
        <div className="flex items-center gap-4">
          <a href="https://github.com/Shivanikinagi/KINETIC" target="_blank" rel="noreferrer" className="text-[10px] text-slate-500 hover:text-cyan-400 transition-colors uppercase tracking-wider">GitHub</a>
          <a href="https://testnet.explorer.perawallet.app/application/758813563" target="_blank" rel="noreferrer" className="text-[10px] text-slate-500 hover:text-cyan-400 transition-colors uppercase tracking-wider">Contracts</a>
          <a href="#" className="text-[10px] text-slate-500 hover:text-cyan-400 transition-colors uppercase tracking-wider">Docs</a>
        </div>
      </div>
    </footer>
  )
}
