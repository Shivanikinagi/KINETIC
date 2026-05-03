const LOCAL_ROADMAP = {
    title: 'KINETIC Hub execution plan',
    total_weeks: 18,
    phases: [
        {
            id: 0,
            name: 'Foundation',
            subtitle: 'clean up and solidify KINETIC core',
            start_week: 1,
            end_week: 2,
            color: '#7F77DD',
            status: 'active',
            deliverable: 'Stable, tested KINETIC core running on TestNet. Ready to build on top of.',
            tracks: [
                {
                    title: 'Backend',
                    items: [
                        'Stabilise existing FastAPI routes',
                        'Add proper error handling and logging',
                        'Write tests for core job flow',
                        'Document all existing API endpoints',
                    ],
                },
                {
                    title: 'Smart contracts',
                    items: [
                        'Test provider registry on TestNet',
                        'Test escrow contract end-to-end',
                        'Fix any proof-of-compute gaps',
                        'Write deploy scripts for all contracts',
                    ],
                },
                {
                    title: 'Frontend',
                    items: [
                        'Fix any broken UI flows',
                        'Ensure SSE real-time updates work reliably',
                        'Mobile-responsive check',
                    ],
                },
                {
                    title: 'Infrastructure',
                    items: [
                        'Set up proper staging environment',
                        'Configure Vercel env variables cleanly',
                        'Add basic monitoring (uptime and errors)',
                    ],
                },
            ],
        },
        {
            id: 1,
            name: 'Organisations',
            subtitle: 'register, provide and rent',
            start_week: 3,
            end_week: 5,
            color: '#1D9E75',
            status: 'planned',
            deliverable: 'Companies can register, list compute, and rent from others. Org badge visible on marketplace.',
            tracks: [
                {
                    title: 'contracts/org_registry.py',
                    items: [
                        'Register org on-chain',
                        'Store name, wallet, verified flag',
                        'Auto-verify after 50 jobs',
                        'Deploy to TestNet',
                    ],
                },
                {
                    title: 'api/orgs.py',
                    items: [
                        'POST /orgs/register',
                        'GET /orgs and GET /orgs/{id}',
                        'POST /orgs/{id}/resources',
                        'POST /orgs/{id}/rent',
                        'GET /orgs/{id}/dashboard',
                    ],
                },
                {
                    title: 'web/org-register.html',
                    items: [
                        'Org name, description, and logo',
                        'Pera Wallet connect',
                        'On-chain registration call',
                    ],
                },
                {
                    title: 'web/org-dashboard.html',
                    items: [
                        'Resources listed with status',
                        'Jobs as provider and consumer',
                        'Earnings and spending stats',
                        'Verified badge progress',
                    ],
                },
            ],
        },
        {
            id: 2,
            name: 'Hub core',
            subtitle: 'explore, provider profiles and trust signals',
            start_week: 6,
            end_week: 9,
            color: '#D85A30',
            status: 'planned',
            deliverable: 'KINETIC Hub Explore page live. Consumers can browse, compare providers, and read trust signals before hiring.',
            tracks: [
                {
                    title: 'Explore page',
                    items: [
                        'Browse by use case (LLM, rendering, inference)',
                        'Filter by price, GPU type, uptime, and verified',
                        'Sort by rating, price, and availability',
                        'Search by org name or resource spec',
                    ],
                },
                {
                    title: 'Provider profile pages',
                    items: [
                        'Public page per provider or org',
                        'Full resource listings',
                        'Uptime history chart (30 and 90 days)',
                        'Jobs completed and average completion time',
                        'Verified badge and reputation score',
                    ],
                },
                {
                    title: 'Trust signal system (backend)',
                    items: [
                        'Uptime tracker per provider',
                        'Reputation score algorithm',
                        'Benchmark runner for standardised jobs',
                        'Store scores on-chain via BadgeMinter',
                    ],
                },
                {
                    title: 'Consumer reviews',
                    items: [
                        'Leave review after job completes',
                        'Star rating and text comment',
                        'Stored on-chain (tamper-proof)',
                        'Display on provider profile',
                    ],
                },
            ],
        },
        {
            id: 3,
            name: 'Job templates',
            subtitle: 'one-click compute deployment',
            start_week: 10,
            end_week: 12,
            color: '#BA7517',
            status: 'planned',
            deliverable: 'Consumers can deploy common workloads in one click without setup. Orgs can publish their own templates.',
            tracks: [
                {
                    title: 'Template system (backend)',
                    items: [
                        'Template schema (name, params, resource requirements)',
                        'POST /templates (publish a template)',
                        'GET /templates (browse templates)',
                        'POST /templates/{id}/deploy',
                    ],
                },
                {
                    title: 'Built-in templates to ship with',
                    items: [
                        'Fine-tune an LLM',
                        'Run Stable Diffusion batch',
                        'Train image classifier',
                        'Render 3D scene',
                        'Run Python data pipeline',
                    ],
                },
                {
                    title: 'Template UI',
                    items: [
                        'Template cards with use case tags',
                        'Parameter form per template',
                        'Auto-match to best provider',
                        'Cost estimate before deploying',
                    ],
                },
                {
                    title: 'Community templates',
                    items: [
                        'Orgs can publish their own templates',
                        'Fork existing templates',
                        'Usage count and rating per template',
                        'Template creator gets attribution',
                    ],
                },
            ],
        },
        {
            id: 4,
            name: 'Consumer dashboard',
            subtitle: 'history, analytics and compare',
            start_week: 13,
            end_week: 16,
            color: '#378ADD',
            status: 'planned',
            deliverable: 'Full consumer experience live: dashboard, compare tool, API access, and notifications all working.',
            tracks: [
                {
                    title: 'Personal dashboard',
                    items: [
                        'All past jobs with cost and duration',
                        'Re-run any past job in one click',
                        'Spending analytics over time',
                        'Saved providers list',
                        'Favourite templates',
                    ],
                },
                {
                    title: 'Compare tool',
                    items: [
                        'Select two to three providers to compare',
                        'Side-by-side: price, speed, uptime, reviews',
                        'Estimated cost for your workload',
                        'Recommendation highlight',
                    ],
                },
                {
                    title: 'API access for consumers',
                    items: [
                        'API key generation per consumer',
                        'Programmatic job submission',
                        'Webhook for job completion',
                        'SDK (Python) thin wrapper on REST API',
                    ],
                },
                {
                    title: 'Notifications',
                    items: [
                        'Job started, completed, failed',
                        'Provider goes offline mid-job',
                        'Price drop on saved providers',
                        'Via SSE (existing) and email',
                    ],
                },
            ],
        },
        {
            id: 5,
            name: 'Launch',
            subtitle: 'onboard first orgs and consumers',
            start_week: 17,
            end_week: 18,
            color: '#639922',
            status: 'planned',
            deliverable: 'KINETIC Hub live on MainNet with real orgs providing, real consumers renting, and real ALGO flowing.',
            tracks: [
                {
                    title: 'Provider side',
                    items: [
                        'Manually onboard 5-10 GPU orgs',
                        'Run benchmark tests on each',
                        'Give early orgs verified badge',
                        'Collect feedback on org dashboard',
                    ],
                },
                {
                    title: 'Consumer side',
                    items: [
                        'Find 10 companies that need compute',
                        'Walk them through job templates',
                        'Watch them use the compare tool',
                        'Collect feedback on friction points',
                    ],
                },
                {
                    title: 'Move to MainNet',
                    items: [
                        'Deploy all contracts to Algorand MainNet',
                        'Real ALGO transactions',
                        'Security audit on escrow and registry',
                    ],
                },
                {
                    title: 'Growth loops',
                    items: [
                        'Org referral program with fee share',
                        'Template leaderboard (most used)',
                        'Public provider rankings',
                        'Submit to Algorand ecosystem directory',
                    ],
                },
            ],
        },
    ],
};

const API_BASE = window.location.port === '3000' ? 'http://localhost:8000' : '';

function makeSafe(value) {
    return String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

function normalizeRoadmap(payload) {
    if (!payload || !Array.isArray(payload.phases) || payload.phases.length === 0) {
        return LOCAL_ROADMAP;
    }

    const byId = new Map(payload.phases.map((phase) => [Number(phase.id), phase]));
    const mergedPhases = LOCAL_ROADMAP.phases.map((localPhase) => {
        const remote = byId.get(localPhase.id) || {};
        const tracks = Array.isArray(remote.tracks) && remote.tracks.length > 0 ? remote.tracks : localPhase.tracks;
        return {
            ...localPhase,
            ...remote,
            tracks,
            deliverable: remote.deliverable || localPhase.deliverable,
        };
    });

    return {
        ...LOCAL_ROADMAP,
        ...payload,
        phases: mergedPhases,
        total_weeks: Number(payload.total_weeks || LOCAL_ROADMAP.total_weeks),
    };
}

async function loadRoadmap() {
    try {
        const response = await fetch(`${API_BASE}/roadmap`);
        if (!response.ok) {
            throw new Error(`Roadmap API status ${response.status}`);
        }
        const payload = await response.json();
        return normalizeRoadmap(payload);
    } catch (error) {
        console.warn('Using local roadmap fallback:', error.message);
        return LOCAL_ROADMAP;
    }
}

function renderTimeline(roadmap) {
    const track = document.getElementById('timelineTrack');
    const labels = document.getElementById('timelineLabels');
    if (!track || !labels) return;

    track.innerHTML = roadmap.phases.map((phase) => {
        const start = Number(phase.start_week || 1);
        const end = Number(phase.end_week || start);
        const duration = Math.max(1, (end - start) + 1);
        return `<div class="timeline-segment" style="flex:${duration};background:${makeSafe(phase.color || '#5b6780')};"></div>`;
    }).join('');

    labels.innerHTML = roadmap.phases.map((phase) => (
        `<div>Wk ${makeSafe(phase.start_week)}-${makeSafe(phase.end_week)}</div>`
    )).join('');
}

function renderTracks(tracks) {
    if (!Array.isArray(tracks) || tracks.length === 0) {
        return '<p class="text-slate-400 text-sm mb-3">Detailed tasks will appear here as this phase activates.</p>';
    }

    const cards = tracks.map((track) => {
        const items = (track.items || []).map((item) => `<li>${makeSafe(item)}</li>`).join('');
        return `
            <article class="task-card">
                <h4>${makeSafe(track.title || 'Workstream')}</h4>
                <ul>${items}</ul>
            </article>
        `;
    }).join('');

    return `<div class="task-grid">${cards}</div>`;
}

function phaseAccentStyles(phase) {
    const color = phase.color || '#5b6780';
    return {
        badge: `background:${color}26;color:${color};border:1px solid ${color}6f;`,
        deliverable: `background:${color}1f;border-color:${color}66;`,
    };
}

function renderPhases(roadmap) {
    const phaseList = document.getElementById('phaseList');
    const health = document.getElementById('roadmapHealth');
    if (!phaseList) return;

    const activePhase = roadmap.phases.find((phase) => phase.status === 'active') || roadmap.phases[0];
    if (health) {
        health.textContent = `Current phase: ${activePhase ? activePhase.name : 'N/A'}`;
    }

    phaseList.innerHTML = roadmap.phases.map((phase, index) => {
        const isOpen = index === 0;
        const accent = phaseAccentStyles(phase);
        return `
            <article class="phase-item ${isOpen ? 'open' : ''}" data-phase-id="${makeSafe(phase.id)}">
                <button class="phase-toggle" type="button" aria-expanded="${isOpen}">
                    <div class="phase-title-row">
                        <span class="chev">▶</span>
                        <span class="phase-badge" style="${accent.badge}">Phase ${makeSafe(phase.id)}</span>
                        <span class="phase-title">${makeSafe(phase.name)} - ${makeSafe(phase.subtitle || '')}</span>
                    </div>
                    <span class="phase-weeks">Weeks ${makeSafe(phase.start_week)}-${makeSafe(phase.end_week)}</span>
                </button>

                <div class="phase-panel">
                    <div class="phase-panel-inner">
                        ${renderTracks(phase.tracks)}
                        ${phase.deliverable ? `
                            <div class="deliverable" style="${accent.deliverable}">
                                <strong>Deliverable:</strong>
                                <span>${makeSafe(phase.deliverable)}</span>
                            </div>
                        ` : ''}
                    </div>
                </div>
            </article>
        `;
    }).join('');

    phaseList.querySelectorAll('.phase-toggle').forEach((button) => {
        button.addEventListener('click', () => {
            const phaseItem = button.closest('.phase-item');
            if (!phaseItem) return;
            const isOpen = phaseItem.classList.contains('open');
            phaseItem.classList.toggle('open', !isOpen);
            button.setAttribute('aria-expanded', String(!isOpen));
        });
    });
}

document.addEventListener('DOMContentLoaded', async () => {
    const roadmap = await loadRoadmap();
    renderTimeline(roadmap);
    renderPhases(roadmap);
});
