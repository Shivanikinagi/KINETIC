/**
 * Real Algorand Wallet Integration
 * Supports Pera Wallet
 */

// Import required packages
import { PeraWalletConnect } from '@perawallet/connect';
import algosdk from 'algosdk';
import { Buffer } from 'buffer';

// Make packages available globally
window.algosdk = algosdk;
window.Buffer = Buffer;

// Wallet state
let walletConnected = false;
let walletAddress = null;
let walletProvider = null;
let peraWallet = null;

// Initialize wallet on page load
async function initializeWallet() {
    try {
        // Initialize Pera Wallet
        peraWallet = new PeraWalletConnect({
            chainId: 416002, // TestNet chain ID (416001 for MainNet)
        });

        console.log('Pera Wallet SDK initialized');

        // Reconnect to session if exists
        try {
            const accounts = await peraWallet.reconnectSession();
            if (accounts && accounts.length > 0) {
                walletAddress = accounts[0];
                walletConnected = true;
                walletProvider = 'pera';
                updateWalletUI(true);
                console.log('Reconnected to Pera Wallet:', walletAddress);
            }
        } catch (reconnectError) {
            console.log('No previous session to reconnect');
        }

        // Listen for disconnect
        peraWallet.connector?.on('disconnect', handleDisconnect);
        
    } catch (error) {
        console.error('Error initializing wallet:', error);
        showNotification('Failed to load wallet SDK. Please refresh the page.', 'error');
    }
}

// Connect to Pera Wallet
async function connectPeraWallet() {
    try {
        if (!peraWallet) {
            // Try to initialize if not already done
            peraWallet = new PeraWalletConnect({
                chainId: 416002,
            });
        }

        console.log('Connecting to Pera Wallet...');
        const accounts = await peraWallet.connect();
        
        if (accounts && accounts.length > 0) {
            walletAddress = accounts[0];
            walletConnected = true;
            walletProvider = 'pera';
            
            updateWalletUI(true);
            
            console.log('Connected to Pera Wallet:', walletAddress);
            
            // Show success notification
            showNotification(`✅ Connected to Pera Wallet\n${formatAddress(walletAddress)}`, 'success');
            
            return walletAddress;
        }
    } catch (error) {
        console.error('Error connecting to Pera Wallet:', error);
        
        if (error.message && error.message.includes('rejected')) {
            showNotification('Wallet connection rejected', 'error');
        } else if (error.message && error.message.includes('SDK')) {
            showNotification('Pera Wallet SDK not loaded. Please refresh the page.', 'error');
        } else {
            showNotification('Failed to connect wallet. Please install Pera Wallet and try again.', 'error');
        }
        
        throw error;
    }
}

// Disconnect wallet
async function disconnectWallet() {
    try {
        if (walletProvider === 'pera' && peraWallet) {
            await peraWallet.disconnect();
        }
        
        walletConnected = false;
        walletAddress = null;
        walletProvider = null;
        
        updateWalletUI(false);
        
        console.log('Wallet disconnected');
        showNotification('Wallet disconnected', 'info');
    } catch (error) {
        console.error('Error disconnecting wallet:', error);
    }
}

// Handle disconnect event
function handleDisconnect() {
    walletConnected = false;
    walletAddress = null;
    walletProvider = null;
    updateWalletUI(false);
    console.log('Wallet disconnected by user');
}

// Update wallet UI
function updateWalletUI(connected) {
    const connectBtn = document.getElementById('connectWalletBtn');
    if (!connectBtn) return;
    
    if (connected && walletAddress) {
        connectBtn.innerHTML = `
            <span class="material-symbols-outlined text-sm">account_balance_wallet</span>
            ${formatAddress(walletAddress)}
        `;
        connectBtn.classList.remove('bg-gradient-to-br', 'from-primary', 'to-primary-container');
        connectBtn.classList.add('bg-green-500');
    } else {
        connectBtn.innerHTML = `
            <span class="material-symbols-outlined text-sm">account_balance_wallet</span>
            Connect Wallet
        `;
        connectBtn.classList.remove('bg-green-500');
        connectBtn.classList.add('bg-gradient-to-br', 'from-primary', 'to-primary-container');
    }
}

// Format address for display
function formatAddress(address) {
    if (!address) return '';
    return `${address.slice(0, 4)}...${address.slice(-4)}`;
}

// Sign transaction
async function signTransaction(txn) {
    if (!walletConnected || !walletAddress) {
        throw new Error('Wallet not connected');
    }
    
    try {
        if (walletProvider === 'pera' && peraWallet) {
            const signedTxn = await peraWallet.signTransaction([txn]);
            return signedTxn;
        }
        
        throw new Error('No wallet provider available');
    } catch (error) {
        console.error('Error signing transaction:', error);
        throw error;
    }
}

// Get wallet balance
async function getWalletBalance() {
    if (!walletConnected || !walletAddress) {
        return 0;
    }
    
    try {
        const algodClient = getAlgodClient();
        const accountInfo = await algodClient.accountInformation(walletAddress).do();
        return accountInfo.amount / 1000000; // Convert microAlgos to Algos
    } catch (error) {
        console.error('Error getting wallet balance:', error);
        return 0;
    }
}

// Get Algod client
function getAlgodClient() {
    const server = 'https://testnet-api.algonode.cloud';
    const port = '';
    const token = '';
    
    return new algosdk.Algodv2(token, server, port);
}

// Show notification
function showNotification(message, type = 'info') {
    // Create toast notification
    const toast = document.createElement('div');
    toast.className = `fixed top-4 right-4 z-50 p-4 rounded-lg shadow-lg max-w-sm animate-slide-in`;
    
    const bgColor = {
        'success': 'bg-green-500',
        'error': 'bg-red-500',
        'info': 'bg-cyan-400',
        'warning': 'bg-yellow-500'
    }[type] || 'bg-cyan-400';
    
    toast.classList.add(bgColor);
    toast.innerHTML = `
        <div class="flex items-start gap-3">
            <span class="material-symbols-outlined text-white">
                ${type === 'success' ? 'check_circle' : type === 'error' ? 'error' : 'info'}
            </span>
            <div class="flex-1">
                <p class="text-white font-medium text-sm whitespace-pre-line">${message}</p>
            </div>
            <button onclick="this.parentElement.parentElement.remove()" class="text-white hover:text-gray-200">
                <span class="material-symbols-outlined text-sm">close</span>
            </button>
        </div>
    `;
    
    document.body.appendChild(toast);
    
    // Auto remove after 5 seconds
    setTimeout(() => {
        toast.remove();
    }, 5000);
}

// Export functions
window.walletManager = {
    initialize: initializeWallet,
    connect: connectPeraWallet,
    disconnect: disconnectWallet,
    signTransaction,
    getBalance: getWalletBalance,
    isConnected: () => walletConnected,
    getAddress: () => walletAddress,
    getProvider: () => walletProvider,
    showNotification: showNotification
};

// Add CSS for animations
const style = document.createElement('style');
style.textContent = `
    @keyframes slide-in {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    .animate-slide-in {
        animation: slide-in 0.3s ease-out;
    }
`;
document.head.appendChild(style);
