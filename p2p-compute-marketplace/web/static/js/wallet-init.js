import '/static/js/wallet.js';

// Initialize wallet and bind connect button
document.addEventListener('DOMContentLoaded', async () => {
  if (window.walletManager) {
    await window.walletManager.initialize();
  }

  const btn = document.getElementById('connectWalletBtn');
  if (!btn) return;

  btn.addEventListener('click', async () => {
    if (!window.walletManager) {
      // Fallback if wallet SDK not loaded
      const toast = document.createElement('div');
      toast.className = 'fixed top-6 right-6 z-[9999] px-5 py-3 rounded-xl border border-cyan-500/40 bg-cyan-950/90 text-cyan-200 text-sm font-medium shadow-2xl';
      toast.textContent = 'Install Pera Wallet to connect';
      document.body.appendChild(toast);
      setTimeout(() => toast.remove(), 3000);
      return;
    }

    try {
      if (window.walletManager.isConnected()) {
        await window.walletManager.disconnect();
      } else {
        await window.walletManager.connect();
      }
    } catch (e) {
      console.log('Wallet error:', e);
    }
  });
});
