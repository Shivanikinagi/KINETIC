/**
 * Activity Page - Real-time Agent Activity Monitoring
 */

import { connectActivityStream, connectMainStream, createActivityLogElement, formatTimestamp } from './realtime.js';

// Initialize on page load
document.addEventListener('DOMContentLoaded', async () => {
    console.log('Activity page initialized');
    
    // Connect to real-time streams
    connectToStreams();
    
    // Load initial data
    await loadInitialData();
    
    // Setup auto-refresh
    setupAutoRefresh();
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
        const response = await fetch('http://localhost:8000/jobs/recent');
        if (response.ok) {
            const jobs = await response.json();
            // Display initial jobs
            jobs.forEach(job => {
                addToTimeline({
                    status: job.status,
                    message: `Job ${job.job_id}: ${job.status}`,
                    timestamp: job.timestamp
                });
            });
        }
    } catch (error) {
        console.error('Error loading initial data:', error);
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
}

/**
 * Update stats display
 */
function updateStats(analytics) {
    if (analytics.total_jobs !== undefined) {
        const el = document.getElementById('jobsCompleted');
        if (el) el.textContent = analytics.total_jobs;
    }
    
    if (analytics.total_spent !== undefined) {
        const el = document.getElementById('algoSpent');
        if (el) el.textContent = analytics.total_spent.toFixed(4);
    }
    
    if (analytics.verifications !== undefined) {
        const el = document.getElementById('verificationsCount');
        if (el) el.textContent = analytics.verifications;
    }
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
