// Providers page specific logic
document.addEventListener('DOMContentLoaded', async () => {
    await loadAllProviders();
    setupWalletConnection();
});

// Load all providers
async function loadAllProviders() {
    try {
        const response = await fetch(`${window.kineticApp.API_BASE_URL}/providers`);
        if (!response.ok) throw new Error('Failed to fetch providers');
        
        const providers = await response.json();
        const grid = document.getElementById('providerGrid');
        const nodesOnlineEl = document.getElementById('nodesOnline');
        
        if (!grid) return;
        
        // Update nodes online count
        if (nodesOnlineEl) {
            const activeCount = providers.filter(p => p.status === 'active').length;
            nodesOnlineEl.textContent = activeCount.toLocaleString();
        }
        
        // Render all provider cards
        grid.innerHTML = providers.map(provider => createProviderCardDetailed(provider)).join('');
    } catch (error) {
        console.error('Error loading providers:', error);
        const grid = document.getElementById('providerGrid');
        if (grid) {
            grid.innerHTML = '<p class="text-slate-400 col-span-3 text-center">Unable to load providers. Please try again later.</p>';
        }
    }
}

// Create detailed provider card
function createProviderCardDetailed(provider) {
    const isActive = provider.status === 'active';
    const statusClass = isActive ? 'bg-primary/10 border-primary/20 text-primary' : 'bg-error/10 border-error/20 text-error';
    const statusText = isActive ? 'Active' : 'Reserved';
    const pulseClass = isActive ? 'animate-pulse' : '';
    
    return `
        <div class="glass-panel border border-outline-variant/10 rounded-xl p-6 glow-hover transition-all relative overflow-hidden group">
            <div class="absolute top-0 right-0 p-3">
                <div class="flex items-center gap-1.5 px-2 py-1 ${statusClass} rounded-full border">
                    <span class="w-1.5 h-1.5 bg-current rounded-full ${pulseClass}"></span>
                    <span class="text-[10px] font-bold uppercase tracking-tight">${statusText}</span>
                </div>
            </div>
            <div class="flex gap-4 mb-6">
                <div class="w-14 h-14 rounded-lg bg-surface-container-highest flex items-center justify-center text-primary-container border border-primary-container/20">
                    <span class="material-symbols-outlined text-3xl">memory</span>
                </div>
                <div>
                    <h3 class="text-lg font-headline font-bold text-on-surface leading-tight">${provider.name}</h3>
                    <div class="flex items-center gap-2 text-[10px] font-mono text-slate-500 mt-1 uppercase">
                        <span>Verified Provider</span>
                        <span class="material-symbols-outlined text-xs text-primary-container" style="font-variation-settings: 'FILL' 1;">verified</span>
                    </div>
                </div>
            </div>
            <div class="grid grid-cols-2 gap-4 mb-8 bg-surface-container-lowest/50 p-4 rounded-lg ${!isActive ? 'opacity-50' : ''}">
                <div>
                    <span class="block text-[10px] text-slate-500 font-bold uppercase">GPU Model</span>
                    <span class="text-primary font-headline">${provider.gpu_model} x ${provider.gpu_count}</span>
                </div>
                <div>
                    <span class="block text-[10px] text-slate-500 font-bold uppercase">VRAM</span>
                    <span class="text-primary font-headline">${provider.vram_gb}GB Total</span>
                </div>
                <div>
                    <span class="block text-[10px] text-slate-500 font-bold uppercase">Region</span>
                    <span class="text-on-surface-variant text-xs">${provider.region}</span>
                </div>
                <div>
                    <span class="block text-[10px] text-slate-500 font-bold uppercase">Uptime</span>
                    <span class="text-on-surface-variant text-xs">${provider.uptime}%</span>
                </div>
            </div>
            <div class="flex items-center justify-between">
                <div>
                    <span class="block text-xs text-slate-500">Hourly Rate</span>
                    <span class="text-2xl font-headline font-bold text-primary-container tracking-tight">$${provider.price_per_hour.toFixed(2)}<span class="text-xs text-slate-400 font-normal"> /hr</span></span>
                </div>
                <button 
                    class="px-8 py-3 ${isActive ? 'bg-primary-container text-on-primary-container hover:scale-105' : 'bg-surface-container-highest text-slate-500 cursor-not-allowed'} font-black rounded uppercase text-xs tracking-widest active:scale-95 transition-all"
                    ${!isActive ? 'disabled' : ''}
                    onclick="window.kineticApp.provisionProvider('${provider.id}')"
                >
                    ${isActive ? 'Rent' : 'In Use'}
                </button>
            </div>
        </div>
    `;
}

// Setup wallet connection
function setupWalletConnection() {
    const connectBtn = document.getElementById('connectWalletBtn');
    if (!connectBtn) return;
    
    connectBtn.addEventListener('click', async () => {
        if (window.kineticApp.walletConnected()) {
            window.kineticApp.disconnectWallet();
        } else {
            await window.kineticApp.connectWallet();
        }
    });
}
