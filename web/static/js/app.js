// API Configuration
const API_BASE_URL = window.location.origin.includes('localhost') || window.location.origin.includes('127.0.0.1')
    ? 'http://localhost:8000'
    : window.location.origin;

// Initialize the app
document.addEventListener('DOMContentLoaded', async () => {
    console.log('Kinetic Marketplace initialized');
    
    // Wait for wallet manager to be available
    await waitForWalletManager();
    
    // Initialize real wallet
    if (window.walletManager) {
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
            resolve();
            return;
        }
        
        const checkInterval = setInterval(() => {
            if (window.walletManager) {
                clearInterval(checkInterval);
                resolve();
            }
        }, 100);
        
        // Timeout after 5 seconds
        setTimeout(() => {
            clearInterval(checkInterval);
            resolve();
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
        if (window.walletManager) {
            if (window.walletManager.isConnected()) {
                await window.walletManager.disconnect();
            } else {
                await window.walletManager.connect();
            }
        } else {
            showNotification('Wallet SDK not loaded. Please refresh the page.', 'error');
        }
    });
}

// Provision a provider
async function provisionProvider(providerId, providerName) {
    if (!window.walletManager || !window.walletManager.isConnected()) {
        showNotification('Please connect your wallet first', 'warning');
        return;
    }
    
    try {
        console.log('Provisioning provider:', providerId);
        
        // Get provider details
        const response = await fetch(`${API_BASE_URL}/providers`);
        const providers = await response.json();
        const provider = providers.find(p => p.id === providerId);
        
        if (!provider) {
            showNotification('Provider not found', 'error');
            return;
        }
        
        // Show loading notification
        showNotification(`Preparing transaction for ${providerName || providerId}...`, 'info');
        
        // Create payment transaction
        const walletAddress = window.walletManager.getAddress();
        const algodClient = getAlgodClient();
        const params = await algodClient.getTransactionParams().do();
        
        // Calculate amount (price per hour in ALGO)
        const amountInAlgos = provider.price_per_hour;
        const amountInMicroAlgos = Math.floor(amountInAlgos * 1000000);
        
        // Create transaction
        const txn = window.algosdk.makePaymentTxnWithSuggestedParamsFromObject({
            from: walletAddress,
            to: 'ESCROW_ADDRESS_PLACEHOLDER', // TODO: Replace with actual escrow contract address
            amount: amountInMicroAlgos,
            note: new Uint8Array(Buffer.from(`Provision:${providerId}`)),
            suggestedParams: params
        });
        
        // Sign transaction with wallet
        const signedTxn = await window.walletManager.signTransaction([{txn: txn, signers: [walletAddress]}]);
        
        // Send transaction
        const { txId } = await algodClient.sendRawTransaction(signedTxn).do();
        
        showNotification(`
✅ Transaction Submitted!

Provider: ${providerName || providerId}
Amount: ${amountInAlgos} ALGO
Transaction ID: ${txId.slice(0, 8)}...

Waiting for confirmation...
        `.trim(), 'success');
        
        // Wait for confirmation
        const confirmedTxn = await window.algosdk.waitForConfirmation(algodClient, txId, 4);
        
        showNotification(`
✅ Provisioning Complete!

Provider: ${providerName || providerId}
Block: ${confirmedTxn['confirmed-round']}
Transaction: ${txId}

Your compute resources are being allocated.
        `.trim(), 'success');
        
        console.log('Transaction confirmed:', confirmedTxn);
        
    } catch (error) {
        console.error('Error provisioning provider:', error);
        
        if (error.message.includes('rejected')) {
            showNotification('Transaction rejected by user', 'error');
        } else if (error.message.includes('insufficient')) {
            showNotification('Insufficient balance in wallet', 'error');
        } else {
            showNotification(`Failed to provision: ${error.message}`, 'error');
        }
    }
}

// Get Algod client
function getAlgodClient() {
    const server = 'https://testnet-api.algonode.cloud';
    const port = '';
    const token = '';
    
    return new window.algosdk.Algodv2(token, server, port);
}

// Show notification (use wallet.js implementation)
function showNotification(message, type = 'info') {
    if (window.walletManager && window.walletManager.showNotification) {
        window.walletManager.showNotification(message, type);
    } else {
        // Fallback to alert
        alert(message);
    }
}

// Export functions for use in other pages
window.kineticApp = {
    API_BASE_URL,
    loadFeaturedProviders,
    loadMarketStats,
    provisionProvider,
    getAlgodClient,
    showNotification
};
