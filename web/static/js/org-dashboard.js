/**
 * Organisation Dashboard — full two-sided participation view.
 * Resources, jobs (provided & consumed), verification, modals for listing + renting.
 */
const queryApiBase = new URLSearchParams(window.location.search).get('apiBase');
const API_BASE_URL = (queryApiBase && queryApiBase.trim()) ||
    (window.KINETIC_API_BASE_URL && String(window.KINETIC_API_BASE_URL).trim()) ||
    (window.location.origin.includes('localhost') || window.location.origin.includes('127.0.0.1')
        ? 'http://localhost:8000'
        : window.location.origin);

const params = new URLSearchParams(window.location.search);
const orgId = params.get('org_id') || localStorage.getItem('kineticOrgId') || '';

// ── DOM refs ──
const orgTitle = document.getElementById('orgTitle');
const orgMeta = document.getElementById('orgMeta');
const orgLogo = document.getElementById('orgLogo');
const verifiedBadge = document.getElementById('verifiedBadge');
const verificationProgressLabel = document.getElementById('verificationProgressLabel');
const verificationProgressBar = document.getElementById('verificationProgressBar');

const totalEarned = document.getElementById('totalEarned');
const totalSpent = document.getElementById('totalSpent');
const netBalance = document.getElementById('netBalance');
const resourcesActive = document.getElementById('resourcesActive');
const uptimeAvg = document.getElementById('uptimeAvg');

const resourcesList = document.getElementById('resourcesList');
const resourceCount = document.getElementById('resourceCount');
const consumedJobsList = document.getElementById('consumedJobsList');
const allJobsList = document.getElementById('allJobsList');
const totalJobsCount = document.getElementById('totalJobsCount');

const connectWalletBtn = document.getElementById('connectWalletBtn');
const listResourceBtn = document.getElementById('listResourceBtn');
const rentComputeBtn = document.getElementById('rentComputeBtn');

const resourceModal = document.getElementById('resourceModal');
const resourceForm = document.getElementById('resourceForm');
const submitResourceBtn = document.getElementById('submitResourceBtn');
const rentModal = document.getElementById('rentModal');
const rentForm = document.getElementById('rentForm');
const submitRentBtn = document.getElementById('submitRentBtn');
const rentStatus = document.getElementById('rentStatus');

let dashboardCache = null;

function notify(message, type = 'info') {
    if (window.walletManager && window.walletManager.showNotification) {
        window.walletManager.showNotification(message, type);
        return;
    }
    console.log(`[${type}] ${message}`);
}

// ── Modal helpers (exposed globally for inline onclick) ──
window.closeResourceModal = () => { resourceModal.classList.add('hidden'); };
window.closeRentModal = () => { rentModal.classList.add('hidden'); };

function openResourceModal() { resourceModal.classList.remove('hidden'); }
function openRentModal() { rentModal.classList.remove('hidden'); }

// ── Rendering ──
function renderResources(resources) {
    if (!resources.length) {
        resourcesList.innerHTML = '<p class="text-slate-500 text-sm text-center py-6">No resources listed yet. Click "List New Resource" to get started.</p>';
        resourceCount.textContent = '0 resources';
        return;
    }

    resourceCount.textContent = `${resources.length} resource${resources.length !== 1 ? 's' : ''}`;
    resourcesList.innerHTML = resources.map((res) => {
        const statusClass = res.status === 'active'
            ? 'bg-emerald-500/15 text-emerald-300 border-emerald-400/20'
            : 'bg-slate-700/40 text-slate-400 border-slate-600/20';
        const earnings = Number(res.earnings || 0).toFixed(4);
        const rate = Number(res.price_per_hour || 0).toFixed(2);
        const uptime = Number(res.uptime || 0);
        const uptimeBarClass = uptime >= 99 ? 'bg-emerald-400' : uptime >= 95 ? 'bg-yellow-400' : 'bg-red-400';

        return `
            <article class="res-card rounded-xl border border-white/8 p-4 space-y-3">
                <div class="flex justify-between gap-3">
                    <div class="min-w-0">
                        <h3 class="font-semibold text-sm truncate">${res.name}</h3>
                        <p class="text-xs text-slate-400 mt-0.5">${res.gpu_count}x ${res.gpu_model} · ${res.vram_gb} GB · ${res.region}</p>
                    </div>
                    <span class="text-[10px] uppercase px-2 py-1 rounded-full border ${statusClass} whitespace-nowrap h-fit">${res.status}</span>
                </div>
                <div class="grid grid-cols-4 gap-2 text-xs">
                    <div>
                        <span class="text-slate-500 block">Running</span>
                        <span class="text-cyan-300 font-medium">${res.jobs_running} jobs</span>
                    </div>
                    <div>
                        <span class="text-slate-500 block">Earnings</span>
                        <span class="text-cyan-300 font-medium">${earnings}</span>
                    </div>
                    <div>
                        <span class="text-slate-500 block">Rate</span>
                        <span class="text-cyan-300 font-medium">${rate}/hr</span>
                    </div>
                    <div>
                        <span class="text-slate-500 block">Uptime</span>
                        <span class="font-medium">${uptime}%</span>
                        <div class="mt-1 h-1 rounded-full bg-slate-800 overflow-hidden">
                            <div class="h-full ${uptimeBarClass}" style="width: ${Math.min(100, uptime)}%"></div>
                        </div>
                    </div>
                </div>
            </article>
        `;
    }).join('');
}

function renderJobs(jobs) {
    const consumed = jobs.filter(j => j.role === 'consumer');
    const provided = jobs.filter(j => j.role === 'provider');

    if (totalJobsCount) totalJobsCount.textContent = `${jobs.length} job${jobs.length !== 1 ? 's' : ''}`;

    // Consumed jobs
    consumedJobsList.innerHTML = consumed.length
        ? consumed.map(job => renderJobCard(job, 'consumer')).join('')
        : '<p class="text-slate-500 text-sm text-center py-6">No consumed jobs yet. Submit a compute job to get started.</p>';

    // All jobs
    allJobsList.innerHTML = jobs.length
        ? jobs.map(job => renderJobCard(job, job.role)).join('')
        : '<p class="text-slate-500 text-sm text-center py-6">No jobs recorded yet.</p>';
}

function renderJobCard(job, role) {
    const statusColor = job.status === 'completed' ? 'text-emerald-300' : job.status === 'failed' ? 'text-red-400' : 'text-orange-300';
    const roleColor = role === 'provider' ? 'bg-cyan-500/15 text-cyan-300 border-cyan-400/20' : 'bg-orange-500/15 text-orange-300 border-orange-400/20';
    const cost = Number(job.cost_algo || 0).toFixed(6);
    const icon = role === 'provider' ? 'cloud_upload' : 'cloud_download';

    return `
        <article class="res-card rounded-xl border border-white/8 p-4">
            <div class="flex justify-between items-start gap-3">
                <div class="flex items-center gap-2 min-w-0">
                    <span class="material-symbols-outlined text-sm ${role === 'provider' ? 'text-cyan-400' : 'text-orange-400'}">${icon}</span>
                    <span class="font-mono text-xs truncate">${job.job_id}</span>
                </div>
                <div class="flex items-center gap-2 shrink-0">
                    <span class="text-[10px] uppercase px-2 py-0.5 rounded-full border ${roleColor}">${role}</span>
                    <span class="${statusColor} text-[10px] uppercase font-medium">${job.status}</span>
                </div>
            </div>
            <div class="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-400">
                <span>${job.task_type}</span>
                <span>${job.tokens} tokens</span>
                <span class="${role === 'provider' ? 'text-cyan-300' : 'text-orange-300'}">${cost} ALGO</span>
            </div>
        </article>
    `;
}

function renderDashboard(dashboard, resources, jobs) {
    dashboardCache = dashboard;

    orgTitle.textContent = dashboard.org_name || 'Organisation Dashboard';
    orgMeta.textContent = `ID: ${dashboard.org_id}`;

    const verified = Boolean(dashboard.verified);
    verifiedBadge.innerHTML = verified
        ? '<span class="material-symbols-outlined text-sm" style="font-variation-settings: \'FILL\' 1;">verified</span> Verified'
        : '<span class="material-symbols-outlined text-sm">shield</span> Unverified';
    verifiedBadge.className = verified
        ? 'px-4 py-1.5 rounded-full text-xs uppercase tracking-wider bg-emerald-500/15 text-emerald-300 border border-emerald-400/25 flex items-center gap-1.5 shrink-0'
        : 'px-4 py-1.5 rounded-full text-xs uppercase tracking-wider bg-slate-700/50 text-slate-400 border border-slate-600/30 flex items-center gap-1.5 shrink-0';

    const progress = Number(dashboard.verification_progress || 0);
    const threshold = Number(dashboard.verification_threshold || 50);
    const percent = Math.min(100, (progress / Math.max(threshold, 1)) * 100);

    verificationProgressLabel.textContent = `${progress} / ${threshold} jobs`;
    verificationProgressBar.style.width = `${percent}%`;

    const earned = Number(dashboard.total_earned || 0);
    const spent = Number(dashboard.total_spent || 0);
    const net = earned - spent;

    totalEarned.textContent = earned.toFixed(4);
    totalSpent.textContent = spent.toFixed(4);
    netBalance.textContent = net.toFixed(4);
    netBalance.className = `text-2xl font-bold font-mono tracking-tight ${net >= 0 ? 'text-emerald-300' : 'text-red-400'}`;

    resourcesActive.textContent = String(dashboard.resources_active || 0);
    uptimeAvg.textContent = `${Number(dashboard.resource_uptime_avg || 0).toFixed(1)}%`;

    renderResources(resources);
    renderJobs(jobs);
}

// ── API Helpers ──
async function fetchJson(url, options) {
    const response = await fetch(url, options);
    const body = await response.json();
    if (!response.ok) {
        throw new Error(body.detail || `Request failed (${response.status})`);
    }
    return body;
}

async function loadDashboard() {
    if (!orgId) {
        orgMeta.textContent = 'No organisation selected. Register one first.';
        return;
    }

    localStorage.setItem('kineticOrgId', orgId);

    const [dashboard, resources, jobs] = await Promise.all([
        fetchJson(`${API_BASE_URL}/orgs/${orgId}/dashboard`),
        fetchJson(`${API_BASE_URL}/orgs/${orgId}/resources`),
        fetchJson(`${API_BASE_URL}/orgs/${orgId}/jobs`),
    ]);

    renderDashboard(dashboard, resources, jobs);
}

// ── List Resource (Modal) ──
async function handleAddResource(event) {
    event.preventDefault();
    if (!orgId) { notify('No organisation selected', 'error'); return; }

    submitResourceBtn.disabled = true;
    submitResourceBtn.innerHTML = '<span class="material-symbols-outlined text-lg animate-spin">progress_activity</span> Listing...';

    try {
        await fetchJson(`${API_BASE_URL}/orgs/${orgId}/resources`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                name: document.getElementById('resName').value.trim(),
                gpu_model: document.getElementById('resGpuModel').value,
                gpu_count: Number(document.getElementById('resGpuCount').value || 1),
                vram_gb: Number(document.getElementById('resVram').value || 80),
                price_per_hour: Number(document.getElementById('resPrice').value || 0.8),
                uptime: Number(document.getElementById('resUptime').value || 99.0),
                status: 'active',
                region: document.getElementById('resRegion').value,
                endpoint: window.location.origin,
            }),
        });

        notify('Resource listed successfully!', 'success');
        closeResourceModal();
        resourceForm.reset();
        await loadDashboard();
    } catch (error) {
        console.error(error);
        notify(`Could not list resource: ${String(error.message || error)}`, 'error');
    } finally {
        submitResourceBtn.disabled = false;
        submitResourceBtn.innerHTML = '<span class="material-symbols-outlined text-lg">cloud_upload</span> List Resource';
    }
}

// ── Rent Compute (Modal) ──
async function handleRentSubmit(event) {
    event.preventDefault();
    if (!orgId) { notify('No organisation selected', 'error'); return; }

    submitRentBtn.disabled = true;
    submitRentBtn.innerHTML = '<span class="material-symbols-outlined text-lg animate-spin">progress_activity</span> Submitting...';
    if (rentStatus) rentStatus.innerHTML = '<span class="text-cyan-300">Matching provider and executing job...</span>';

    try {
        const result = await fetchJson(`${API_BASE_URL}/orgs/${orgId}/rent`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                task_type: document.getElementById('rentTaskType').value,
                tokens: Number(document.getElementById('rentTokens').value || 300),
                required_vram: Number(document.getElementById('rentVram').value || 16),
                payload: document.getElementById('rentPayload').value.trim() || `org-rent-${Date.now()}`,
            }),
        });

        const cost = result.cost_breakdown;
        if (rentStatus) {
            rentStatus.innerHTML = `
                <div class="p-3 rounded-lg bg-emerald-500/10 border border-emerald-400/20 space-y-1">
                    <p class="text-emerald-300 font-semibold text-sm flex items-center gap-1.5">
                        <span class="material-symbols-outlined text-sm" style="font-variation-settings: 'FILL' 1;">check_circle</span>
                        Job Completed
                    </p>
                    <p class="text-xs text-slate-300">ID: <code>${result.job_id}</code></p>
                    <p class="text-xs text-slate-300">Provider: ${result.provider?.name || 'auto-matched'}</p>
                    <p class="text-xs text-slate-300">Cost: ${cost?.estimated_cost_algo?.toFixed(6) || '0'} ALGO (${cost?.tokens || 0} tokens)</p>
                </div>
            `;
        }
        notify(`Job completed: ${result.job_id}`, 'success');
        await loadDashboard();
    } catch (error) {
        console.error(error);
        if (rentStatus) rentStatus.innerHTML = `<span class="text-red-400 text-sm">${String(error.message || error)}</span>`;
        notify(`Job failed: ${String(error.message || error)}`, 'error');
    } finally {
        submitRentBtn.disabled = false;
        submitRentBtn.innerHTML = '<span class="material-symbols-outlined text-lg">play_circle</span> Submit Job';
    }
}

// ── SSE real-time refresh ──
function startSseRefresh() {
    if (!orgId) return;

    const source = new EventSource(`${API_BASE_URL}/stream`);

    source.addEventListener('job_update', async () => {
        try { await loadDashboard(); } catch (err) { console.error('SSE refresh error', err); }
    });

    source.onerror = () => {
        source.close();
        setTimeout(startSseRefresh, 5000);
    };
}

// ── Wallet ──
async function initializeWallet() {
    if (!window.walletManager) return;
    await window.walletManager.initialize();
}

async function toggleWalletConnection() {
    if (!window.walletManager) { notify('Wallet manager unavailable', 'error'); return; }
    if (window.walletManager.isConnected()) {
        await window.walletManager.disconnect();
    } else {
        await window.walletManager.connect();
    }
}

// ── Wire events ──
if (connectWalletBtn) connectWalletBtn.addEventListener('click', toggleWalletConnection);
if (listResourceBtn) listResourceBtn.addEventListener('click', openResourceModal);
if (rentComputeBtn) rentComputeBtn.addEventListener('click', openRentModal);
if (resourceForm) resourceForm.addEventListener('submit', handleAddResource);
if (rentForm) rentForm.addEventListener('submit', handleRentSubmit);

// ── Boot ──
Promise.resolve()
    .then(initializeWallet)
    .then(loadDashboard)
    .then(startSseRefresh)
    .catch((error) => {
        console.error(error);
        notify(String(error.message || error), 'error');
    });
