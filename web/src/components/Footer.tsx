import { Link } from 'react-router-dom'
import { useState } from 'react'

export default function Footer() {
  const [email, setEmail] = useState('')
  const [subscribed, setSubscribed] = useState(false)

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault()
    if (email) {
      setSubscribed(true)
      setEmail('')
      setTimeout(() => setSubscribed(false), 4000)
    }
  }

  return (
    <footer className="border-t border-white/5 py-12">
      <div className="max-w-7xl mx-auto px-6">
        {/* Top Section */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-8 mb-10">
          {/* Brand */}
          <div className="lg:col-span-2">
            <Link to="/" className="text-xl font-black italic gradient-text mb-3 inline-block">KINETIC</Link>
            <p className="text-xs text-slate-500 leading-relaxed max-w-xs mb-4">
              Decentralized GPU compute marketplace on Algorand. Run AI workloads globally with cryptographic proof-of-compute verification.
            </p>
            {/* Social Links */}
            <div className="flex items-center gap-3">
              {[
                { href: 'https://github.com/Shivanikinagi/KINETIC', icon: 'code', label: 'GitHub' },
                { href: '#', icon: 'chat', label: 'Discord' },
                { href: '#', icon: 'forum', label: 'Twitter' },
                { href: '#', icon: 'mail', label: 'Email' },
              ].map(social => (
                <a
                  key={social.label}
                  href={social.href}
                  target={social.href.startsWith('http') ? '_blank' : undefined}
                  rel={social.href.startsWith('http') ? 'noreferrer' : undefined}
                  className="w-9 h-9 rounded-lg bg-white/[0.03] border border-white/5 flex items-center justify-center text-slate-500 hover:text-cyan-400 hover:border-cyan-500/20 hover:bg-cyan-500/5 transition-all"
                  aria-label={social.label}
                >
                  <span className="material-symbols-outlined text-sm">{social.icon}</span>
                </a>
              ))}
            </div>
          </div>

          {/* Product */}
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">Product</p>
            <div className="space-y-2">
              {['Explore GPUs', 'Model Hub', 'Dataset Hub', 'Spaces', 'API'].map(item => (
                <Link key={item} to={`/${item.toLowerCase().replace(/ /g, '-')}`} className="block text-xs text-slate-400 hover:text-cyan-400 transition-colors">{item}</Link>
              ))}
            </div>
          </div>

          {/* Resources */}
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">Resources</p>
            <div className="space-y-2">
              {[
                { label: 'Documentation', href: '#' },
                { label: 'GitHub', href: 'https://github.com/Shivanikinagi/KINETIC' },
                { label: 'Contracts', href: 'https://testnet.explorer.perawallet.app/application/758813563' },
                { label: 'Provider Guide', href: 'https://github.com/Shivanikinagi/KINETIC/blob/main/docs/PROVIDER_GUIDE.md' },
              ].map(item => (
                <a key={item.label} href={item.href} target={item.href.startsWith('http') ? '_blank' : undefined} rel="noreferrer" className="block text-xs text-slate-400 hover:text-cyan-400 transition-colors">{item.label}</a>
              ))}
            </div>
          </div>

          {/* Newsletter */}
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">Stay Updated</p>
            <p className="text-xs text-slate-500 mb-3">Get the latest on GPU availability and new models.</p>
            <form onSubmit={handleSubscribe} className="space-y-2">
              <div className="relative">
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  className="w-full bg-white/[0.03] border border-white/10 rounded-lg px-3 py-2 text-xs text-slate-200 placeholder:text-slate-600 focus:border-cyan-500/30 focus:outline-none focus:bg-white/[0.05] transition-all"
                />
              </div>
              <button
                type="submit"
                className="w-full py-2 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-xs font-bold hover:bg-cyan-500/20 transition-all flex items-center justify-center gap-1.5"
              >
                <span className="material-symbols-outlined text-sm">send</span>
                {subscribed ? 'Subscribed!' : 'Subscribe'}
              </button>
            </form>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-8 border-t border-white/5">
          <p className="text-[10px] text-slate-600">2026 Kinetic Marketplace · Powered by Algorand</p>
          <div className="flex items-center gap-4">
            <a href="https://testnet.explorer.perawallet.app/application/758813563" target="_blank" rel="noreferrer" className="text-[10px] text-slate-500 hover:text-cyan-400 transition-colors">Registry</a>
            <a href="https://testnet.explorer.perawallet.app/application/758813574" target="_blank" rel="noreferrer" className="text-[10px] text-slate-500 hover:text-cyan-400 transition-colors">Escrow</a>
            <a href="https://testnet.explorer.perawallet.app/application/758813562" target="_blank" rel="noreferrer" className="text-[10px] text-slate-500 hover:text-cyan-400 transition-colors">Badge Minter</a>
          </div>
        </div>
      </div>
    </footer>
  )
}
