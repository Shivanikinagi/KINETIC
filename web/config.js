// Dynamic API configuration for Vercel deployment
(function() {
    // Detect if running on Vercel
    const isVercel = window.location.hostname.includes('vercel.app') || 
                     window.location.hostname.includes('vercel.com');
    
    // Set API base URL
    if (isVercel) {
        // On Vercel, API is at /api
        window.KINETIC_API_BASE_URL = window.location.origin + '/api';
        window.KINETIC_AGENT_BRIDGE_URL = window.location.origin + '/api/agent';
    } else {
        // Local development
        window.KINETIC_API_BASE_URL = 'http://localhost:8000';
        window.KINETIC_AGENT_BRIDGE_URL = 'http://localhost:3001';
    }
    
    console.log('Kinetic Config:', {
        api: window.KINETIC_API_BASE_URL,
        agent: window.KINETIC_AGENT_BRIDGE_URL,
        environment: isVercel ? 'production' : 'development'
    });
})();
