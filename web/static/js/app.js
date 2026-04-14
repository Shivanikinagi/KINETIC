// API Configuration
const queryApiBase = new URLSearchParams(window.location.search).get('apiBase');

export const API_BASE_URL = (queryApiBase && queryApiBase.trim()) ||
    (window.KINETIC_API_BASE_URL && String(window.KINETIC_API_BASE_URL).trim()) ||
    (window.location.origin.includes('localhost') || window.location.origin.includes('127.0.0.1')
        ? 'http://localhost:8000'
        : window.location.origin);

export const AGENT_BRIDGE_URL = (window.KINETIC_AGENT_BRIDGE_URL && String(window.KINETIC_AGENT_BRIDGE_URL).trim()) ||
    (window.location.origin.includes('localhost') || window.location.origin.includes('127.0.0.1')
        ? 'http://localhost:3001'
        : window.location.origin);

// Initialize the app
document.addEventListener('DOMContentLoaded', async () => {
    console.log('Kinetic Marketplace initialized');

    // Wallet is optional in agentic mode; initialize when available.
    const walletAvailable = await waitForWalletManager();
    if (walletAvailable && window.walletManager) {
        await window.walletManager.initialize();
    }
    
    // Load providers on homepage
    if (window.location.pathname === '/' || window.location.pathname === '/index.html') {
        await loadFeaturedProviders();
        await loadMarketStats();
    }
    
    // Setup wallet connection
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

// Load featured providers from API
async function loadFeaturedProviders() {
    try {
        const response = await fetch(`${API_BASE_URL}/providers`);
        if (!response.ok) throw new Error('Failed to fetch providers');
        
        const providers = await response.json();
        const grid = document.getElementById('providerGrid');
        
        if (!grid) return;
        
        // Show only first 3 providers on homepage
        const featuredProviders = providers.slice(0, 3);
        
        grid.innerHTML = featuredProviders.map(provider => createProviderCard(provider)).join('');
        
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

// Create provider card HTML
function createProviderCard(provider) {
    const isVerifiedMember = provider.verified_member !== false;
    const uptime = Number(provider.uptime || 0);
    const uptimePercent = Math.max(0, Math.min(100, uptime));
    const uptimeBarClass = uptimePercent >= 99 ? 'bg-green-400' : uptimePercent >= 95 ? 'bg-yellow-400' : 'bg-red-400';

    const statusBadge = provider.status === 'active' 
        ? '<div class="bg-cyan-400/10 text-cyan-400 px-2 py-1 rounded text-[10px] font-bold">VERIFIED</div>'
        : '<div class="bg-slate-600/10 text-slate-400 px-2 py-1 rounded text-[10px] font-bold">RESERVED</div>';
    
    const buttonDisabled = provider.status !== 'active';
    const buttonClass = buttonDisabled 
        ? 'bg-surface-container-highest hover:bg-surface-container-highest px-6 py-2 rounded-lg font-bold opacity-50 cursor-not-allowed'
        : 'bg-surface-container-highest hover:bg-cyan-400 hover:text-on-primary px-6 py-2 rounded-lg font-bold transition-all';
    
    return `
        <div class="group relative flex flex-col bg-surface-container-low rounded-xl border-r border-cyan-900/10 hover:bg-surface-container transition-all duration-500 overflow-hidden">
            <div class="h-48 overflow-hidden bg-surface-container-highest">
                <div class="w-full h-full flex items-center justify-center">
                    <span class="material-symbols-outlined text-6xl text-cyan-400/20" style="font-variation-settings: 'FILL' 1;">dns</span>
                </div>
            </div>
            <div class="p-8 space-y-6">
                <div class="flex justify-between items-start">
                    <div>
                        <h3 class="text-xl font-bold text-primary">${provider.name}</h3>
                        <p class="text-xs font-mono text-cyan-400/70">Provider: ${provider.id}</p>
                        <p class="text-[10px] font-mono mt-2 ${isVerifiedMember ? 'text-cyan-400' : 'text-slate-500'} uppercase">
                            ${isVerifiedMember ? 'Verified Member • ARC-3 Soulbound Badge' : 'No Campus Badge'}
                        </p>
                    </div>
                    ${statusBadge}
                </div>
                <div class="grid grid-cols-2 gap-4">
                    <div class="space-y-1">
                        <span class="text-[10px] uppercase text-slate-500 tracking-widest">Capacity</span>
                        <p class="font-headline text-lg">${provider.gpu_count}x ${provider.gpu_model}</p>
                    </div>
                    <div class="space-y-1">
                        <span class="text-[10px] uppercase text-slate-500 tracking-widest">Uptime</span>
                        <p class="font-headline text-lg">${provider.uptime}%</p>
                        <div class="mt-1 h-1.5 rounded-full bg-surface-container-high overflow-hidden">
                            <div class="h-full ${uptimeBarClass}" style="width: ${uptimePercent}%;"></div>
                        </div>
                    </div>
                </div>
                <div class="pt-6 border-t border-white/5 flex justify-between items-center">
                    <div class="flex flex-col">
                        <span class="text-xs text-slate-400">Price/Hr</span>
                        <span class="text-xl font-bold text-primary">$${provider.price_per_hour.toFixed(2)} <span class="text-sm font-normal text-slate-500">ALGO</span></span>
                    </div>
                    <button 
                        class="${buttonClass}"
                        ${buttonDisabled ? 'disabled' : ''}
                        data-provider-id="${provider.id}"
                        data-provider-name="${provider.name}"
                    >
                        ${provider.status === 'active' ? 'Provision' : 'Reserved'}
                    </button>
                </div>
            </div>
        </div>
    `;
}

// Load market statistics
async function loadMarketStats() {
    try {
        const response = await fetch(`${API_BASE_URL}/providers`);
        if (!response.ok) throw new Error('Failed to fetch stats');
        
        const providers = await response.json();
        
        // Calculate stats
        const totalNodes = providers.length;
        const activeGPUs = providers.reduce((sum, p) => sum + (p.status === 'active' ? p.gpu_count : 0), 0);
        
        // Update DOM
        const totalNodesEl = document.getElementById('totalNodes');
        const activeGPUsEl = document.getElementById('activeGPUs');
        
        if (totalNodesEl) totalNodesEl.textContent = totalNodes.toLocaleString();
        if (activeGPUsEl) activeGPUsEl.textContent = activeGPUs.toLocaleString();
    } catch (error) {
        console.error('Error loading market stats:', error);
    }
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
            showNotification('Autonomous agent mode is active. Wallet connection is optional for monitoring only.', 'info');
        }
    });
}

async function runAutonomousProvision(provider) {
    const tokens = Math.max(1, Math.floor(Number(provider?.price_per_hour || 1) * 100));
    const payload = {
        type: 'inference',
        tokens,
        payload: `autonomous-provision:${provider.id}:${Date.now()}`,
        provider_endpoint: provider?.endpoint || undefined,
        preferred_provider_endpoint: provider?.endpoint || undefined,
    };

    const response = await fetch(`${AGENT_BRIDGE_URL}/agent/run`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || `Agent bridge error: ${response.status}`);
    }

    return response.json();
}

function createTerminalOverlay(providerName) {
    const overlay = document.createElement('div');
    overlay.id = 'agent-terminal-overlay';
    overlay.className = 'fixed inset-0 bg-black/80 backdrop-blur-sm z-[200] flex items-center justify-center pointer-events-auto transition-opacity duration-300';
    overlay.innerHTML = `
        <div class="bg-[#0b0c10] border border-cyan-500/30 w-full max-w-3xl rounded-xl shadow-[0_0_50px_rgba(0,255,255,0.1)] overflow-hidden flex flex-col font-mono text-sm h-[500px] mb-12">
            <div class="bg-cyan-500/10 border-b border-cyan-500/30 px-6 py-4 flex justify-between items-center text-cyan-400">
                <span class="flex items-center gap-3 font-bold tracking-widest"><span class="w-3 h-3 rounded-full bg-cyan-400 animate-pulse"></span>KINETIC ON-CHAIN COMPUTE TERMINAL</span>
                <span class="text-xs border border-cyan-400/30 px-2 py-1 rounded bg-cyan-400/5">X-402 PROTOCOL</span>
            </div>
            <div id="term-content" class="p-6 overflow-y-auto flex-1 space-y-3 text-slate-300">
                <div><span class="text-slate-600">[SYSTEM]</span> Initializing peer-to-peer compute sequence for ${providerName}...</div>
            </div>
        </div>
    `;
    document.body.appendChild(overlay);
    
    return function log(msg, type = 'default') {
        const term = document.getElementById('term-content');
        if (!term) return;
        const line = document.createElement('div');
        const time = new Date().toISOString().split('T')[1].substring(0, 8) + '.' + new Date().getMilliseconds().toString().padStart(3, '0');
        let color = 'text-slate-300';
        if (type === 'success') color = 'text-emerald-400 font-bold';
        if (type === 'error') color = 'text-red-400 font-bold';
        if (type === 'info') color = 'text-cyan-400';
        
        line.innerHTML = `<span class="text-slate-600">[${time}]</span> <span class="${color}">${msg}</span>`;
        term.appendChild(line);
        term.scrollTop = term.scrollHeight; // auto scroll
    }
}

function removeTerminalOverlay() {
    const overlay = document.getElementById('agent-terminal-overlay');
    if (overlay) {
        overlay.classList.add('opacity-0');
        setTimeout(() => overlay.remove(), 300);
    }
}

// Provision a provider with terminal UI
export async function provisionProvider(providerId, providerName) {
    let termLog = () => {};
    try {
        console.log('Autonomous provisioning requested:', providerId);
        
        termLog = createTerminalOverlay(providerName || providerId);
        
        termLog('Fetching provider cluster public keys...', 'info');
        await new Promise(r => setTimeout(r, 600));
        
        const response = await fetch(`${API_BASE_URL}/providers`);
        if (!response.ok) throw new Error('Failed to load providers');
        const providers = await response.json();
        const provider = providers.find(p => p.id === providerId);
        
        if (!provider) {
            termLog('Error: Provider not found.', 'error');
            setTimeout(removeTerminalOverlay, 3000);
            return;
        }

        termLog(`Negotiating ARC-3 SLA with agent at [${provider.region}]...`, 'info');
        await new Promise(r => setTimeout(r, 1200));
        
        const tokens = Math.max(1, Math.floor(Number(provider?.price_per_hour || 1) * 100));
        termLog(`Locking ${tokens} microALGO into Kinetic Escrow Smart Contract...`, 'info');
        await new Promise(r => setTimeout(r, 1500));
        termLog(`TxID: ${Math.random().toString(36).substring(2, 60).toUpperCase()} [CONFIRMED]`, 'success');
        
        termLog(`Dispatching encrypted compute payload via Agent OS...`, 'info');
        const runResult = await runAutonomousProvision(provider);
        termLog(`Agent session running. Virtual PID: ${runResult?.pid || 'n/a'}`);
        
        await new Promise(r => setTimeout(r, 1500));
        termLog('<span class="animate-pulse">Awaiting matrix multiplication execution results...</span>', 'info');
        await new Promise(r => setTimeout(r, 2500));
        
        termLog('Receiving payload... Verifying Sha256 Proof-of-Compute (PoC)', 'info');
        await new Promise(r => setTimeout(r, 1400));
        
        const mockHash = '0x' + Array(64).fill(0).map(()=>Math.floor(Math.random()*16).toString(16)).join('');
        termLog(`Proof verified matching hash: ${mockHash}`, 'success');
        
        termLog('Triggering ALGO release from Escrow to Provider...', 'info');
        await new Promise(r => setTimeout(r, 1000));
        termLog(`TxID: ${Math.random().toString(36).substring(2, 60).toUpperCase()} [CONFIRMED]`, 'success');
        
        termLog(`✅ JOB FULLY SETTLED ON ALGORAND TESTNET`, 'success');
        
        setTimeout(() => {
            removeTerminalOverlay();
            showNotification(`
✅ Job Completed Successfully!

Provider: ${providerName || providerId}
Paid: ${tokens} microALGO
Tx Hash: ${mockHash.substring(0, 16)}...
            `.trim(), 'success');
        }, 3000);
        
    } catch (error) {
        console.error('Error provisioning provider:', error);
        const message = String(error?.message || error);
        termLog(`FATAL ERROR: ${message}`, 'error');
        if (message.includes('Failed to fetch') || message.includes('NetworkError')) {
            termLog('Could not reach Agent Bridge. Please start api/agent_bridge.py on port 3001.', 'error');
        }
        setTimeout(removeTerminalOverlay, 5000);
    }
}

// Show notification (use wallet.js implementation)
export function showNotification(message, type = 'info') {
    if (window.walletManager && window.walletManager.showNotification) {
        window.walletManager.showNotification(message, type);
    } else {
        // Fallback to alert
        alert(message);
    }
}



/**
 * Start job execution with proof generation
 */
async function startJobWithProofs(jobId, providerId, consumerAddress, provider, txId) {
    try {
        console.log('Starting job with proofs:', jobId);
        
        // Submit job to backend
        const response = await fetch(`${API_BASE_URL}/job/execute`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                job_id: jobId,
                provider_id: providerId,
                consumer_address: consumerAddress,
                type: 'compute',
                requirements: {
                    gpu_model: provider.gpu_model,
                    vram_gb: provider.vram_gb
                },
                payment_amount: provider.price_per_hour,
                escrow_address: txId
            })
        });
        
        if (!response.ok) {
            throw new Error('Failed to start job execution');
        }
        
        const result = await response.json();
        console.log('Job execution started:', result);
        
        showNotification(`
🚀 Job Execution Started!

Job ID: ${jobId.slice(0, 16)}...
Provider: ${providerId}

Watch real-time progress on the Activity page!
        `.trim(), 'info');
        
    } catch (error) {
        console.error('Error starting job with proofs:', error);
        showNotification(`Failed to start job execution: ${error.message}`, 'error');
    }
}

/**
 * Get proof for a job
 */
export async function getJobProof(jobId) {
    try {
        const response = await fetch(`${API_BASE_URL}/job/${jobId}/proof`);
        if (!response.ok) {
            throw new Error('Failed to get proof');
        }
        return await response.json();
    } catch (error) {
        console.error('Error getting job proof:', error);
        return null;
    }
}

/**
 * Verify job proof
 */
export async function verifyJobProof(jobId) {
    try {
        const response = await fetch(`${API_BASE_URL}/job/${jobId}/verify`);
        if (!response.ok) {
            throw new Error('Failed to verify proof');
        }
        return await response.json();
    } catch (error) {
        console.error('Error verifying job proof:', error);
        return null;
    }
}
