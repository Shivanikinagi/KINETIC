/**
 * Real-time updates via Server-Sent Events (SSE)
 * Connects to backend SSE endpoints for live activity streaming
 */

// API Configuration
const API_BASE_URL = window.location.origin.includes('localhost') || window.location.origin.includes('127.0.0.1')
    ? 'http://localhost:8000'
    : window.location.origin;

// Event source connections
let activityStream = null;
let providerStream = null;
let mainStream = null;

// Activity log storage
const activityLogs = [];
const MAX_LOGS = 100;

/**
 * Connect to real-time activity stream
 */
export function connectActivityStream(onEvent) {
    if (activityStream) {
        activityStream.close();
    }
    
    activityStream = new EventSource(`${API_BASE_URL}/realtime/activity/stream`);
    
    activityStream.onopen = () => {
        console.log('✅ Connected to activity stream');
    };
    
    activityStream.addEventListener('connected', (event) => {
        const data = JSON.parse(event.data);
        console.log('Activity stream connected:', data.message);
    });
    
    activityStream.addEventListener('activity', (event) => {
        const data = JSON.parse(event.data);
        addActivityLog(data);
        if (onEvent) {
            onEvent('activity', data);
        }
    });
    
    activityStream.onerror = (error) => {
        console.error('Activity stream error:', error);
        // Attempt reconnection after 5 seconds
        setTimeout(() => {
            console.log('Reconnecting to activity stream...');
            connectActivityStream(onEvent);
        }, 5000);
    };
    
    return activityStream;
}

/**
 * Connect to real-time provider stream
 */
export function connectProviderStream(onEvent) {
    if (providerStream) {
        providerStream.close();
    }
    
    providerStream = new EventSource(`${API_BASE_URL}/realtime/providers/stream`);
    
    providerStream.onopen = () => {
        console.log('✅ Connected to provider stream');
    };
    
    providerStream.addEventListener('connected', (event) => {
        const data = JSON.parse(event.data);
        console.log('Provider stream connected:', data.message);
    });
    
    providerStream.addEventListener('provider', (event) => {
        const data = JSON.parse(event.data);
        if (onEvent) {
            onEvent('provider', data);
        }
    });
    
    providerStream.onerror = (error) => {
        console.error('Provider stream error:', error);
        // Attempt reconnection after 5 seconds
        setTimeout(() => {
            console.log('Reconnecting to provider stream...');
            connectProviderStream(onEvent);
        }, 5000);
    };
    
    return providerStream;
}

/**
 * Connect to main event stream (all events)
 */
export function connectMainStream(onEvent) {
    if (mainStream) {
        mainStream.close();
    }
    
    mainStream = new EventSource(`${API_BASE_URL}/realtime/stream`);
    
    mainStream.onopen = () => {
        console.log('✅ Connected to main event stream');
    };
    
    mainStream.addEventListener('connected', (event) => {
        const data = JSON.parse(event.data);
        console.log('Main stream connected:', data.message);
    });
    
    // Listen for all event types
    const eventTypes = ['agent_status', 'job_update', 'provider_update', 'payment', 'proof', 'agent_log'];
    
    eventTypes.forEach(eventType => {
        mainStream.addEventListener(eventType, (event) => {
            const data = JSON.parse(event.data);
            if (onEvent) {
                onEvent(eventType, data);
            }
        });
    });
    
    mainStream.onerror = (error) => {
        console.error('Main stream error:', error);
        // Attempt reconnection after 5 seconds
        setTimeout(() => {
            console.log('Reconnecting to main stream...');
            connectMainStream(onEvent);
        }, 5000);
    };
    
    return mainStream;
}

/**
 * Disconnect all streams
 */
export function disconnectAllStreams() {
    if (activityStream) {
        activityStream.close();
        activityStream = null;
    }
    if (providerStream) {
        providerStream.close();
        providerStream = null;
    }
    if (mainStream) {
        mainStream.close();
        mainStream = null;
    }
    console.log('Disconnected from all real-time streams');
}

/**
 * Add activity log entry
 */
function addActivityLog(data) {
    const logEntry = {
        ...data,
        timestamp: new Date().toISOString()
    };
    
    activityLogs.unshift(logEntry);
    
    // Keep only last MAX_LOGS entries
    if (activityLogs.length > MAX_LOGS) {
        activityLogs.pop();
    }
}

/**
 * Get activity logs
 */
export function getActivityLogs() {
    return [...activityLogs];
}

/**
 * Clear activity logs
 */
export function clearActivityLogs() {
    activityLogs.length = 0;
}

/**
 * Format timestamp for display
 */
export function formatTimestamp(timestamp) {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHour = Math.floor(diffMin / 60);
    
    if (diffSec < 60) {
        return `${diffSec}s ago`;
    } else if (diffMin < 60) {
        return `${diffMin}m ago`;
    } else if (diffHour < 24) {
        return `${diffHour}h ago`;
    } else {
        return date.toLocaleDateString();
    }
}

/**
 * Create activity log HTML element
 */
export function createActivityLogElement(log) {
    const timeAgo = formatTimestamp(log.timestamp);
    
    let iconClass = 'info';
    let bgClass = 'bg-cyan-400/10';
    let textClass = 'text-cyan-400';
    
    if (log.status === 'error' || log.level === 'error') {
        iconClass = 'error';
        bgClass = 'bg-red-500/10';
        textClass = 'text-red-400';
    } else if (log.status === 'success' || log.status === 'completed') {
        iconClass = 'check_circle';
        bgClass = 'bg-green-500/10';
        textClass = 'text-green-400';
    } else if (log.status === 'running' || log.status === 'processing') {
        iconClass = 'pending';
        bgClass = 'bg-yellow-500/10';
        textClass = 'text-yellow-400';
    }
    
    const message = log.message || log.details?.message || log.status || 'Activity update';
    
    return `
        <div class="flex items-start gap-4 p-4 ${bgClass} rounded-lg border border-white/5 hover:border-white/10 transition-all">
            <div class="flex-shrink-0">
                <span class="material-symbols-outlined ${textClass}">${iconClass}</span>
            </div>
            <div class="flex-1 min-w-0">
                <p class="text-sm ${textClass} font-medium">${message}</p>
                ${log.details ? `<p class="text-xs text-slate-500 mt-1">${JSON.stringify(log.details)}</p>` : ''}
            </div>
            <div class="flex-shrink-0">
                <span class="text-xs text-slate-500">${timeAgo}</span>
            </div>
        </div>
    `;
}

// Auto-reconnect on page visibility change
document.addEventListener('visibilitychange', () => {
    if (!document.hidden) {
        console.log('Page visible, checking stream connections...');
        // Streams will auto-reconnect via their error handlers
    }
});

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
    disconnectAllStreams();
});
