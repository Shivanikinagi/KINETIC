export default function Footer() {
  return (
    <footer className="w-full py-6 border-t border-white/5 mt-auto" style={{ background: '#08090b' }}>
      <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="flex items-center gap-6">
          <span className="font-bold text-cyan-400 text-sm tracking-tight" style={{ fontFamily: "'Space Grotesk',sans-serif" }}>
            KINETIC
          </span>
          <p className="text-[10px] uppercase tracking-widest text-slate-600">
            &copy; 2026 Kinetic Marketplace &middot; Powered by Algorand
          </p>
        </div>
        <div className="flex gap-6 text-[10px] uppercase tracking-widest text-slate-600">
          <a className="hover:text-cyan-300 transition-colors" href="https://github.com/Shivanikinagi/KINETIC" target="_blank" rel="noreferrer">
            GitHub
          </a>
          <a className="hover:text-cyan-300 transition-colors" href="/docs">
            Docs
          </a>
        </div>
      </div>
    </footer>
  )
}
