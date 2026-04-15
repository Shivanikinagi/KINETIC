/**
 * Activity Page - Real-time Agent Activity Monitoring
 */

import { connectActivityStream, connectMainStream, createActivityLogElement, formatTimestamp } from './realtime.js';

const API_BASE_URL = window.location.origin.includes('localhost') || window.location.origin.includes('127.0.0.1')
    ? 'http://localhost:8000'
    : window.location.origin;

/**
 * Check if backend is available
 */
async function checkBackendConnectivity() {
    try {
        const response = await fetch(`${API_BASE_URL}/health`, { 
            method: 'GET',
            signal: AbortSignal.timeout(5000) // 5 second timeout
        });
        return response.ok;
    } catch (error) {
        console.error('Backend connectivity check failed:', error);
        return false;
    }
}

/**
 * Show backend error message
 */
function showBackendError() {
    const timeline = document.getElementById('activityTimeline');
    if (timeline) {
        timeline.innerHTML = `
            <div class="p-6 bg-red-500/10 rounded-lg border border-red-500/20">
                <p class="text-red-400 font-bold mb-2">⚠️ Backend Not Available</p>
                <p class="text-sm text-slate-400">Cannot connect to API at ${API_BASE_URL}</p>
                <p class="text-xs text-slate-500 mt-2">Make sure the backend is running:</p>
                <code class="text-xs bg-black/30 px-2 py-1 rounded mt-1 block">python -m uvicorn api.main:app --reload</code>
            </div>
        `;
    }
    
    const logs = document.getElementById('kernelLogs');
    if (logs) {
        logs.innerHTML = '<p class="text-red-400">Backend connection failed. Start the API server to see logs.</p>';
    }
    
    const proofList = document.getElementById('proofList');
    if (proofList) {
        proofList.innerHTML = '<p class="text-red-400 text-xs">Backend offline</p>';
    }
}

/**
 * Setup test job button
 */
function setupTestJobButton() {
    const btn = document.getElementById('runTestJobBtn');
    if (btn) {
        btn.addEventListener('click', async () => {
            btn.disabled = true;
            btn.textContent = 'Running...';
            
            try {
                // Trigger a test job via the agent bridge (autonomous mode)
                addToKernelLogs({
                    message: '🚀 Starting autonomous test job...',
                    timestamp: new Date().toISOString()
                });
                
                const response = await fetch('http://localhost:3001/agent/run', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        type: 'inference',
                        tokens: 100,
                        payload: 'test-job-' + Date.now(),
                        provider_endpoint: 'http://localhost:8000'
                    })
                });
                
                if (response.ok) {
                    const result = await response.json();
                    addToKernelLogs({
                        message: `✅ Test job dispatched! PID: ${result.pid || 'N/A'}`,
                        timestamp: new Date().toISOString()
                    });
                    addToKernelLogs({
                        message: `📊 Job will process ${result.tokens} tokens autonomously`,
                        timestamp: new Date().toISOString()
                    });
                    
                    // Show success notification
                    if (window.walletManager && window.walletManager.showNotification) {
                        window.walletManager.showNotification('Test job started! Check logs for progress.', 'success');
                    }
                } else {
                    const errorText = await response.text();
                    addToKernelLogs({
                        message: `❌ Test job failed: ${response.status} - ${errorText}`,
                        timestamp: new Date().toISOString()
                    });
                }
            } catch (error) {
                console.error('Test job error:', error);
                addToKernelLogs({
                    message: `❌ Test job error: ${error.message}`,
                    timestamp: new Date().toISOString()
                });
                
                if (error.message.includes('Failed to fetch')) {
                    addToKernelLogs({
                        message: '⚠️ Agent Bridge not reachable. Make sure it\'s running on port 3001',
                        timestamp: new Date().toISOString()
                    });
                }
            } finally {
                btn.disabled = false;
                btn.textContent = 'Run Test Job';
            }
        });
    }
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', async () => {
    console.log('Activity page initialized');
    
    // Check backend connectivity first
    const isBackendAvailable = await checkBackendConnectivity();
    
    if (isBackendAvailable) {
        // Connect to real-time streams
        connectToStreams();
        
        // Load initial data
        await loadInitialData();
        
        // Setup auto-refresh
        setupAutoRefresh();
    } else {
        showBackendError();
    }
    
    // Setup test job button
    setupTestJobButton();
});

/**
 * Connect to real-time event streams
 */
function connectToStreams() {
    // Connect to activity stream
    connectActivityStream((eventType, data) => {
        console.log('Activity event:', eventType, data);
        handleActivityEvent(data);
    });
    
    // Connect to main stream for all events
    connectMainStream((eventType, data) => {
        console.log('Main event:', eventType, data);
        handleMainEvent(eventType, data);
    });
    
    // Connect to agent logs via polling (faster refresh)
    startLogPolling();
}

/**
 * Start polling agent logs every 2 seconds
 */
function startLogPolling() {
    // Initial load
    refreshAgentLogs();
    
    // Poll every 2 seconds for real-time feel
    setInterval(refreshAgentLogs, 2000);
}

/**
 * Refresh agent logs from bridge
 */
async function refreshAgentLogs() {
    try {
        const logsResponse = await fetch('http://localhost:3001/agent/log');
        if (logsResponse.ok) {
            const logs = await logsResponse.json();
            const kernelLogs = document.getElementById('kernelLogs');
            if (kernelLogs && logs && logs.length > 0) {
                // Store current scroll position
                const wasAtBottom = kernelLogs.scrollHeight - kernelLogs.scrollTop <= kernelLogs.clientHeight + 50;
                
                kernelLogs.innerHTML = logs.slice(0, 50).reverse().map(log => {
                    const time = new Date(log.timestamp).toLocaleTimeString();
                    const msg = log.message || '';
                    let color = 'text-slate-300';
                    let icon = '';
                    
                    if (msg.includes('ESCROW_LOCKED')) {
                        color = 'text-green-400 font-bold';
                        icon = '🔒 ';
                    } else if (msg.includes('ESCROW_RELEASE')) {
                        color = 'text-green-400 font-bold';
                        icon = '✅ ';
                    } else if (msg.includes('Payment submitted')) {
                        color = 'text-cyan-400 font-bold';
                        icon = '💰 ';
                    } else if (msg.includes('failure') || msg.includes('Error')) {
                        color = 'text-red-400';
                        icon = '❌ ';
                    } else if (msg.includes('starting job')) {
                        color = 'text-cyan-400';
                        icon = '🚀 ';
                    } else if (msg.includes('selected')) {
                        color = 'text-yellow-400';
                        icon = '📡 ';
                    } else if (msg.includes('Job completed')) {
                        color = 'text-green-400';
                        icon = '✅ ';
                    }
                    
                    return `<div class="${color} text-xs font-mono hover:text-cyan-300 transition-colors leading-relaxed"><span class="text-slate-600">[${time}]</span> ${icon}${msg}</div>`;
                }).join('');
                
                // Auto-scroll to bottom if user was already at bottom
                if (wasAtBottom) {
                    kernelLogs.scrollTop = kernelLogs.scrollHeight;
                }
            }
        }
    } catch (error) {
        console.error('Error refreshing logs:', error);
    }
}

/**
 * Handle activity events
 */
function handleActivityEvent(data) {
    // Add to activity timeline
    addToTimeline(data);
    
    // Update kernel logs
    addToKernelLogs(data);
    
    // Update stats if relevant
    if (data.status === 'completed') {
        incrementJobsCompleted();
    }
}

/**
 * Handle main stream events
 */
function handleMainEvent(eventType, data) {
    switch (eventType) {
        case 'agent_status':
            updateAgentStatus(data);
            break;
        case 'job_update':
            updateJobStatus(data);
            break;
        case 'payment':
            addPaymentToTimeline(data);
            updateAlgoSpent(data.amount);
            break;
        case 'proof':
            addProofToTimeline(data);
            incrementVerifications();
            break;
        case 'agent_log':
            addToKernelLogs(data);
            break;
    }
}

/**
 * Add event to timeline
 */
function addToTimeline(data) {
    const timeline = document.getElementById('activityTimeline');
    if (!timeline) return;
    
    const timeAgo = formatTimestamp(data.timestamp || new Date().toISOString());
    
    let badgeClass = 'bg-cyan-400/10 text-cyan-400';
    let badgeText = 'Agent event';
    let icon = 'info';
    
    if (data.status === 'completed' || data.status === 'success') {
        badgeClass = 'bg-green-500/10 text-green-400';
        badgeText = 'Output verified';
        icon = 'check_circle';
    } else if (data.status === 'running' || data.status === 'processing') {
        badgeClass = 'bg-yellow-500/10 text-yellow-400';
        badgeText = 'Agent starting';
        icon = 'pending';
    } else if (data.status === 'error' || data.status === 'failed') {
        badgeClass = 'bg-red-500/10 text-red-400';
        badgeText = 'Error';
        icon = 'error';
    }
    
    const message = data.message || data.details?.message || JSON.stringify(data.details || {});
    
    const eventHtml = `
        <div class="flex items-start gap-4 p-6 bg-surface-container-low rounded-lg border border-white/5 hover:border-cyan-400/20 transition-all animate-slide-in">
            <div class="flex-shrink-0">
                <div class="${badgeClass} px-3 py-1 rounded-full border border-current/20 flex items-center gap-2">
                    <span class="material-symbols-outlined text-sm">${icon}</span>
                    <span class="text-xs font-bold uppercase">${badgeText}</span>
                </div>
            </div>
            <div class="flex-1 min-w-0">
                <p class="text-sm text-on-surface font-mono">${message}</p>
            </div>
            <div class="flex-shrink-0">
                <span class="text-xs text-slate-500">${timeAgo}</span>
            </div>
        </div>
    `;
    
    timeline.insertAdjacentHTML('afterbegin', eventHtml);
    
    // Keep only last 20 events
    const events = timeline.children;
    if (events.length > 20) {
        timeline.removeChild(events[events.length - 1]);
    }
}

/**
 * Add payment to timeline
 */
function addPaymentToTimeline(data) {
    const timeline = document.getElementById('activityTimeline');
    if (!timeline) return;
    
    const timeAgo = formatTimestamp(data.timestamp || new Date().toISOString());
    
    const eventHtml = `
        <div class="flex items-start gap-4 p-6 bg-surface-container-low rounded-lg border border-white/5 hover:border-cyan-400/20 transition-all animate-slide-in">
            <div class="flex-shrink-0">
                <div class="bg-primary/10 text-primary px-3 py-1 rounded-full border border-primary/20 flex items-center gap-2">
                    <span class="material-symbols-outlined text-sm">payments</span>
                    <span class="text-xs font-bold uppercase">Payment</span>
                </div>
            </div>
            <div class="flex-1 min-w-0">
                <p class="text-sm text-on-surface font-mono">Payment: ${data.amount} ALGO</p>
                <p class="text-xs text-slate-500 mt-1">TX: ${data.tx_id?.slice(0, 16)}...</p>
            </div>
            <div class="flex-shrink-0">
                <span class="text-xs text-slate-500">${timeAgo}</span>
            </div>
        </div>
    `;
    
    timeline.insertAdjacentHTML('afterbegin', eventHtml);
}

/**
 * Add proof to timeline
 */
function addProofToTimeline(data) {
    const timeline = document.getElementById('activityTimeline');
    if (!timeline) return;
    
    const timeAgo = formatTimestamp(data.timestamp || new Date().toISOString());
    
    const eventHtml = `
        <div class="flex items-start gap-4 p-6 bg-surface-container-low rounded-lg border border-white/5 hover:border-cyan-400/20 transition-all animate-slide-in">
            <div class="flex-shrink-0">
                <div class="bg-green-500/10 text-green-400 px-3 py-1 rounded-full border border-green-400/20 flex items-center gap-2">
                    <span class="material-symbols-outlined text-sm">verified</span>
                    <span class="text-xs font-bold uppercase">Proof Verified</span>
                </div>
            </div>
            <div class="flex-1 min-w-0">
                <p class="text-sm text-on-surface font-mono">Proof of compute verified</p>
                ${data.details ? `<p class="text-xs text-slate-500 mt-1">${JSON.stringify(data.details)}</p>` : ''}
            </div>
            <div class="flex-shrink-0">
                <span class="text-xs text-slate-500">${timeAgo}</span>
            </div>
        </div>
    `;
    
    timeline.insertAdjacentHTML('afterbegin', eventHtml);
}

/**
 * Add to kernel logs
 */
function addToKernelLogs(data) {
    const kernelLogs = document.getElementById('kernelLogs');
    if (!kernelLogs) return;
    
    const timeAgo = formatTimestamp(data.timestamp || new Date().toISOString());
    const message = data.message || data.details?.message || JSON.stringify(data);
    
    const logHtml = `
        <div class="text-xs font-mono text-slate-400 hover:text-cyan-400 transition-colors animate-slide-in">
            <span class="text-slate-600">[${timeAgo}]</span> ${message}
        </div>
    `;
    
    kernelLogs.insertAdjacentHTML('afterbegin', logHtml);
    
    // Keep only last 50 logs
    const logs = kernelLogs.children;
    if (logs.length > 50) {
        kernelLogs.removeChild(logs[logs.length - 1]);
    }
}

/**
 * Update agent status
 */
function updateAgentStatus(data) {
    // Update status indicator if exists
    const statusEl = document.getElementById('agentStatus');
    if (statusEl) {
        statusEl.textContent = data.status || 'active';
    }
}

/**
 * Update job status
 */
function updateJobStatus(data) {
    // Update job progress if exists
    const progressEl = document.getElementById(`job-${data.job_id}-progress`);
    if (progressEl && data.progress !== undefined) {
        progressEl.style.width = `${data.progress}%`;
    }
}

/**
 * Increment jobs completed counter
 */
function incrementJobsCompleted() {
    const counterEl = document.getElementById('jobsCompleted');
    if (counterEl) {
        const current = parseInt(counterEl.textContent) || 0;
        counterEl.textContent = current + 1;
    }
}

/**
 * Increment verifications counter
 */
function incrementVerifications() {
    const counterEl = document.getElementById('verificationsCount');
    if (counterEl) {
        const current = parseInt(counterEl.textContent) || 0;
        counterEl.textContent = current + 1;
    }
}

/**
 * Update ALGO spent
 */
function updateAlgoSpent(amount) {
    const spentEl = document.getElementById('algoSpent');
    if (spentEl) {
        const current = parseFloat(spentEl.textContent) || 0;
        spentEl.textContent = (current + amount).toFixed(4);
    }
}

/**
 * Load initial data
 */
async function loadInitialData() {
    try {
        // Load recent jobs from API
        const response = await fetch(`${API_BASE_URL}/jobs?limit=10`);
        if (response.ok) {
            const jobs = await response.json();
            
            if (jobs && jobs.length > 0) {
                // Display initial jobs
                jobs.forEach(job => {
                    addToTimeline({
                        status: job.status,
                        message: `Job ${job.job_id}: ${job.task_type}`,
                        timestamp: job.created_at
                    });
                });
            } else {
                // Show empty state
                const timeline = document.getElementById('activityTimeline');
                if (timeline) {
                    timeline.innerHTML = `
                        <div class="p-6 bg-surface-container-low rounded-lg border border-white/5 text-center">
                            <span class="material-symbols-outlined text-4xl text-slate-600 mb-2">inbox</span>
                            <p class="text-slate-400 text-sm">No activity yet</p>
                            <p class="text-slate-500 text-xs mt-1">Run a test job or provision a provider to see real-time updates</p>
                        </div>
                    `;
                }
            }
        }
        
        // Load analytics
        const analyticsResponse = await fetch(`${API_BASE_URL}/analytics`);
        if (analyticsResponse.ok) {
            const analytics = await analyticsResponse.json();
            updateStats(analytics);
        }
        
        // Load proofs from agent bridge
        try {
            const proofsResponse = await fetch('http://localhost:3001/agent/proofs');
            if (proofsResponse.ok) {
                const proofsData = await proofsResponse.json();
                updateProofsListFromAgent(proofsData);
            } else {
                // Show empty state if endpoint not available
                updateProofsList([]);
            }
        } catch (error) {
            console.log('Proofs endpoint not available:', error);
            updateProofsList([]);
        }
        
        // Add initial kernel log
        try {
            const logsResponse = await fetch('http://localhost:3001/agent/log');
            if (logsResponse.ok) {
                const logs = await logsResponse.json();
                const kernelLogs = document.getElementById('kernelLogs');
                if (kernelLogs && logs && logs.length > 0) {
                    kernelLogs.innerHTML = logs.slice(0, 30).reverse().map(log => {
                        const time = new Date(log.timestamp).toLocaleTimeString();
                        const msg = log.message || '';
                        let color = 'text-slate-300';
                        
                        if (msg.includes('ESCROW_LOCKED') || msg.includes('ESCROW_RELEASE')) {
                            color = 'text-green-400';
                        } else if (msg.includes('failure') || msg.includes('Error')) {
                            color = 'text-red-400';
                        } else if (msg.includes('starting') || msg.includes('selected')) {
                            color = 'text-cyan-400';
                        }
                        
                        return `<div class="${color} text-xs font-mono hover:text-cyan-300 transition-colors"><span class="text-slate-600">[${time}]</span> ${msg}</div>`;
                    }).join('');
                } else {
                    addToKernelLogs({
                        message: '🚀 Kinetic Agent OS initialized. Waiting for compute requests...',
                        timestamp: new Date().toISOString()
                    });
                }
            }
        } catch (error) {
            console.log('Could not load agent logs:', error);
            addToKernelLogs({
                message: '🚀 Kinetic Agent OS initialized. Waiting for compute requests...',
                timestamp: new Date().toISOString()
            });
        }
        
    } catch (error) {
        console.error('Error loading initial data:', error);
        // Show placeholder message
        const timeline = document.getElementById('activityTimeline');
        if (timeline) {
            timeline.innerHTML = `
                <div class="p-6 bg-surface-container-low rounded-lg border border-white/5 text-center">
                    <span class="material-symbols-outlined text-4xl text-slate-600 mb-2">cloud_off</span>
                    <p class="text-slate-400 text-sm">Unable to load activity data</p>
                    <p class="text-slate-500 text-xs mt-1">Check that the backend is running</p>
                </div>
            `;
        }
        const logs = document.getElementById('kernelLogs');
        if (logs) {
            logs.innerHTML = '<p class="text-slate-500">⏳ Connecting to agent kernel...</p>';
        }
    }
}

/**
 * Setup auto-refresh for stats
 */
function setupAutoRefresh() {
    // Refresh stats every 30 seconds
    setInterval(async () => {
        try {
            const response = await fetch('http://localhost:8000/analytics');
            if (response.ok) {
                const analytics = await response.json();
                // Update stats
                updateStats(analytics);
            }
        } catch (error) {
            console.error('Error refreshing stats:', error);
        }
    }, 30000);
    
    // Refresh proofs every 15 seconds
    setInterval(async () => {
        try {
            const proofsResponse = await fetch('http://localhost:3001/agent/proofs');
            if (proofsResponse.ok) {
                const proofsData = await proofsResponse.json();
                updateProofsListFromAgent(proofsData);
            }
        } catch (error) {
            console.error('Error refreshing proofs:', error);
        }
    }, 15000);
}

/**
 * Update stats display
 */
function updateStats(analytics) {
    if (analytics.total_jobs !== undefined) {
        const el = document.getElementById('metricJobs');
        if (el) el.textContent = analytics.total_jobs;
    }
    
    if (analytics.total_algo_spent !== undefined) {
        const el = document.getElementById('metricSpent');
        if (el) el.textContent = analytics.total_algo_spent.toFixed(4) + ' ALGO';
    }
    
    if (analytics.total_jobs !== undefined) {
        const el = document.getElementById('metricVerified');
        if (el) el.textContent = analytics.total_jobs; // Assuming all completed jobs are verified
    }
    
    // Fraud detection would be a separate metric
    const fraudEl = document.getElementById('metricFraud');
    if (fraudEl) fraudEl.textContent = '0';
}

/**
 * Update proofs list
 */
function updateProofsList(proofs) {
    const proofList = document.getElementById('proofList');
    if (!proofList) return;
    
    if (!proofs || proofs.length === 0) {
        proofList.innerHTML = `
            <div class="text-center py-4">
                <span class="material-symbols-outlined text-3xl text-slate-600 mb-2">shield_with_heart</span>
                <p class="text-slate-500 text-xs">No active proofs yet</p>
                <p class="text-slate-600 text-[10px] mt-1">Run a job to generate proofs</p>
            </div>
        `;
        return;
    }
    
    proofList.innerHTML = proofs.slice(0, 5).map(proof => `
        <div class="p-3 bg-surface-container-lowest rounded-lg border border-white/5 hover:border-cyan-400/20 transition-all cursor-pointer">
            <div class="flex items-center justify-between mb-2">
                <span class="text-xs font-mono text-cyan-400">${proof.job_id?.slice(0, 12) || 'N/A'}...</span>
                <span class="text-[10px] px-2 py-0.5 rounded-full bg-green-500/10 text-green-400">VERIFIED</span>
            </div>
            <p class="text-[10px] text-slate-500">${proof.steps?.length || 0} proof steps</p>
        </div>
    `).join('');
}

/**
 * Update proofs list from agent bridge format
 */
function updateProofsListFromAgent(proofsData) {
    const proofList = document.getElementById('proofList');
    if (!proofList) return;
    
    const proofs = proofsData.proofs || [];
    
    if (proofs.length === 0) {
        proofList.innerHTML = `
            <div class="text-center py-4">
                <span class="material-symbols-outlined text-3xl text-slate-600 mb-2">shield_with_heart</span>
                <p class="text-slate-500 text-xs">No on-chain proofs yet</p>
                <p class="text-slate-600 text-[10px] mt-1">Complete a job to see proofs</p>
            </div>
        `;
        return;
    }
    
    proofList.innerHTML = proofs.slice(0, 5).map(proof => {
        const label = proof.label || proof.kind || 'Proof';
        const txId = proof.tx_id || 'N/A';
        const shortTx = txId.slice(0, 8) + '...' + txId.slice(-4);
        
        return `
            <a href="${proof.url || '#'}" target="_blank" class="block p-3 bg-surface-container-lowest rounded-lg border border-white/5 hover:border-cyan-400/20 transition-all">
                <div class="flex items-center justify-between mb-2">
                    <span class="text-xs font-bold text-cyan-400">${label}</span>
                    <span class="text-[10px] px-2 py-0.5 rounded-full bg-green-500/10 text-green-400">
                        <span class="material-symbols-outlined text-[10px]" style="font-size: 10px;">verified</span>
                    </span>
                </div>
                <p class="text-[10px] text-slate-500 font-mono">${shortTx}</p>
                ${proof.round ? `<p class="text-[9px] text-slate-600 mt-1">Round: ${proof.round}</p>` : ''}
            </a>
        `;
    }).join('');
}

// Add CSS for animations
const style = document.createElement('style');
style.textContent = `
    @keyframes slide-in {
        from {
            transform: translateY(-10px);
            opacity: 0;
        }
        to {
            transform: translateY(0);
            opacity: 1;
        }
    }
    .animate-slide-in {
        animation: slide-in 0.3s ease-out;
    }
`;
document.head.appendChild(style);
