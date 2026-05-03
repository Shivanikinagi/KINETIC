// Providers page specific logic
import { provisionProvider, showNotification, API_BASE_URL } from './app.js';

document.addEventListener('DOMContentLoaded', async () => {
    // Wait for wallet manager
    const walletAvailable = await waitForWalletManager();
    
    // Initialize wallet
    if (walletAvailable && window.walletManager) {
        await window.walletManager.initialize();
    }
    
    await loadAllProviders();
    setupWalletConnection();
});

// Wait for wallet manager to be available
function waitForWalletManager() {
    return new Promise((resolve) => {
        if (window.walletManager) {
            resolve(true);
            return;
        }
        
        const checkInterval = setInterval(() => {
            if (window.walletManager) {
                clearInterval(checkInterval);
                resolve(true);
            }
        }, 100);
        
        // Timeout after 5 seconds
        setTimeout(() => {
            clearInterval(checkInterval);
            resolve(false);
        }, 5000);
    });
}

// Load all providers
async function loadAllProviders() {
    try {
        const response = await fetch(`${API_BASE_URL}/providers`);
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
        
        // Add event listeners to provision buttons
        attachProvisionButtonListeners();
    } catch (error) {
        console.error('Error loading providers:', error);
        const grid = document.getElementById('providerGrid');
        if (grid) {
            grid.innerHTML = '<p class="text-slate-400 col-span-3 text-center">Unable to load providers. Please try again later.</p>';
        }
    }
}

// Attach event listeners to provision buttons
function attachProvisionButtonListeners() {
    const buttons = document.querySelectorAll('[data-provider-id]');
    buttons.forEach(button => {
        button.addEventListener('click', function() {
            const providerId = this.getAttribute('data-provider-id');
            const providerName = this.getAttribute('data-provider-name');
            provisionProvider(providerId, providerName);
        });
    });
}

// Create detailed provider card
function createProviderCardDetailed(provider) {
    const isActive = provider.status === 'active';
    const statusClass = isActive ? 'bg-primary/10 border-primary/20 text-primary' : 'bg-error/10 border-error/20 text-error';
    const statusText = isActive ? 'Active' : 'Reserved';
    const pulseClass = isActive ? 'animate-pulse' : '';
    const orgBadge = provider.org_name
        ? `<span class="inline-flex items-center gap-1 px-2 py-0.5 border rounded bg-cyan-500/10 text-cyan-300 border-cyan-400/30"><span class="material-symbols-outlined text-xs" style="font-variation-settings: 'FILL' 1;">business</span>✓ ${provider.org_name}</span>`
        : '';
    const isVerifiedMember = provider.verified_member !== false;
    const verifiedText = isVerifiedMember ? 'Verified Member' : 'Unverified';
    const verifiedClass = isVerifiedMember
        ? 'bg-cyan-400/10 text-cyan-400 border-cyan-400/30'
        : 'bg-slate-700/30 text-slate-400 border-slate-600/40';

    const uptime = Number(provider.uptime || 0);
    const uptimePercent = Math.max(0, Math.min(100, uptime));
    const uptimeBarClass = uptimePercent >= 99 ? 'bg-green-400' : uptimePercent >= 95 ? 'bg-yellow-400' : 'bg-red-400';

    const buttonClass = isActive 
        ? 'px-8 py-3 bg-primary-container text-on-primary-container hover:scale-105 font-black rounded uppercase text-xs tracking-widest active:scale-95 transition-all'
        : 'px-8 py-3 bg-surface-container-highest text-slate-500 cursor-not-allowed font-black rounded uppercase text-xs tracking-widest';
    
    return `
        <div class="glass-panel border border-outline-variant/10 rounded-xl p-6 glow-hover transition-all relative overflow-hidden group">
            <div class="absolute top-0 right-0 p-3">
                <div class="flex items-center gap-1.5 px-2 py-1 ${statusClass} rounded-full border">
                    <span class="w-1.5 h-1.5 bg-current rounded-full ${pulseClass}"></span>
                    <span class="text-[10px] font-bold uppercase tracking-tight">${statusText}</span>
                </div>
            </div>
            <div class="flex gap-4 mb-6">
                <div class="w-14 h-14 rounded-lg bg-surface-container-highest flex items-center justify-center text-primary-container border border-primary-container/20 overflow-hidden">
                    ${provider.logo_url 
                        ? `<img src="${provider.logo_url}" class="w-full h-full object-contain p-2" alt="${provider.org_name || provider.name} logo">` 
                        : `<span class="material-symbols-outlined text-3xl">memory</span>`}
                </div>
                <div>
                    <h3 class="text-lg font-headline font-bold text-on-surface leading-tight">${provider.name}</h3>
                    <div class="flex items-center gap-2 text-[10px] font-mono mt-2 uppercase">
                        ${orgBadge}
                        <span class="inline-flex items-center gap-1 px-2 py-0.5 border rounded ${verifiedClass}">
                            <span class="material-symbols-outlined text-xs" style="font-variation-settings: 'FILL' 1;">school</span>
                            ${verifiedText}
                        </span>
                        <span class="text-slate-500">Campus Badge: ${provider.campus_badge || 'ARC3_SBT'}</span>
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
                    <div class="mt-2 h-1.5 rounded-full bg-surface-container-high overflow-hidden">
                        <div class="h-full ${uptimeBarClass}" style="width: ${uptimePercent}%;"></div>
                    </div>
                </div>
            </div>
            <div class="flex items-center justify-between">
                <div>
                    <span class="block text-xs text-slate-500">Hourly Rate</span>
                    <span class="text-2xl font-headline font-bold text-primary-container tracking-tight">$${provider.price_per_hour.toFixed(2)}<span class="text-xs text-slate-400 font-normal"> /hr</span></span>
                </div>
                <button 
                    class="${buttonClass}"
                    ${!isActive ? 'disabled' : ''}
                    data-provider-id="${provider.id}"
                    data-provider-name="${provider.name}"
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
        if (window.walletManager && window.walletManager.connect) {
            if (window.walletManager.isConnected()) {
                await window.walletManager.disconnect();
            } else {
                await window.walletManager.connect();
            }
        } else {
            showNotification('Autonomous agent mode is active. Wallet connection is optional.', 'info');
        }
    });
}
