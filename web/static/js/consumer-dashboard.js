import { API_BASE_URL } from './app.js';

const consumerIdEl = document.getElementById('consumerId');
const loadBtn = document.getElementById('loadBtn');
const summaryEl = document.getElementById('summary');
const jobsEl = document.getElementById('jobs');

const compareIdsEl = document.getElementById('compareIds');
const compareTokensEl = document.getElementById('compareTokens');
const compareBtn = document.getElementById('compareBtn');
const compareResultEl = document.getElementById('compareResult');

const createKeyBtn = document.getElementById('createKeyBtn');
const keyResultEl = document.getElementById('keyResult');

function safe(value) {
    return String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

function renderSummary(summary) {
    const cards = [
        ['Jobs Total', summary.jobs_total],
        ['Completed', summary.jobs_completed],
        ['Spent ALGO', Number(summary.spending_total_algo || 0).toFixed(4)],
        ['Avg Duration ms', Number(summary.average_duration_ms || 0).toFixed(0)],
    ];
    return cards
        .map(([k, v]) => `<article class="card p-3"><p class="text-slate-400 text-xs uppercase tracking-wide">${safe(k)}</p><p class="text-cyan-100 text-2xl font-bold mt-1">${safe(v)}</p></article>`)
        .join('');
}

function renderJob(job) {
    return `
        <article class="card p-3.5 text-sm">
            <div class="flex items-center justify-between gap-3">
                <p class="text-cyan-100 font-semibold">${safe(job.deployment_id)}</p>
                <p class="text-slate-200 text-xs uppercase tracking-wide">${safe(job.status)}</p>
            </div>
            <p class="text-slate-300/80 mt-1">Template: ${safe(job.template_id)} | Provider: ${safe(job.provider_id)}</p>
            <p class="text-slate-300/80">Cost: ${Number(job.estimated_cost_algo || 0).toFixed(6)} ALGO | Duration: ${safe(job.duration_ms || 0)} ms</p>
        </article>
    `;
}

async function loadDashboard() {
    const consumerId = consumerIdEl.value.trim();
    if (!consumerId) return;

    window.localStorage.setItem('kinetic_consumer_id', consumerId);

    loadBtn.disabled = true;
    loadBtn.textContent = 'Loading...';

    let res;
    try {
        res = await fetch(`${API_BASE_URL}/hub/consumers/${encodeURIComponent(consumerId)}/dashboard`);
    } catch (error) {
        summaryEl.innerHTML = `<p class="text-rose-200">Failed to load dashboard: ${safe(error.message)}</p>`;
        loadBtn.disabled = false;
        loadBtn.textContent = 'Load Dashboard';
        return;
    }

    if (!res.ok) {
        summaryEl.innerHTML = '<p class="text-slate-400">Failed to load dashboard.</p>';
        loadBtn.disabled = false;
        loadBtn.textContent = 'Load Dashboard';
        return;
    }

    const data = await res.json();
    summaryEl.innerHTML = renderSummary(data.summary || {});
    const jobs = data.jobs || [];
    jobsEl.innerHTML = jobs.length ? jobs.map(renderJob).join('') : '<div class="card p-4 text-slate-300">No jobs yet. Run a deployment from templates to populate this timeline.</div>';

    loadBtn.disabled = false;
    loadBtn.textContent = 'Load Dashboard';
}

loadBtn.addEventListener('click', loadDashboard);

compareBtn.addEventListener('click', async () => {
    const consumerId = consumerIdEl.value.trim();
    const providerIds = compareIdsEl.value.trim();
    const tokens = Number(compareTokensEl.value || 1000);

    if (!consumerId || !providerIds) {
        compareResultEl.textContent = 'consumer_id and provider_ids are required.';
        return;
    }

    compareBtn.disabled = true;
    compareBtn.textContent = 'Comparing...';

    const url = `${API_BASE_URL}/hub/consumers/${encodeURIComponent(consumerId)}/compare?provider_ids=${encodeURIComponent(providerIds)}&tokens=${encodeURIComponent(tokens)}`;
    try {
        const res = await fetch(url);
        const body = await res.json();
        compareResultEl.textContent = JSON.stringify(body, null, 2);
    } catch (error) {
        compareResultEl.textContent = `Comparison failed: ${error.message}`;
    } finally {
        compareBtn.disabled = false;
        compareBtn.textContent = 'Compare Providers';
    }
});

createKeyBtn.addEventListener('click', async () => {
    const consumerId = consumerIdEl.value.trim();
    if (!consumerId) {
        keyResultEl.textContent = 'Enter consumer ID first.';
        return;
    }

    createKeyBtn.disabled = true;
    createKeyBtn.textContent = 'Creating...';

    try {
        const res = await fetch(`${API_BASE_URL}/hub/consumers/${encodeURIComponent(consumerId)}/api-keys`, {
            method: 'POST',
        });
        const body = await res.json();
        keyResultEl.textContent = JSON.stringify(body, null, 2);
    } catch (error) {
        keyResultEl.textContent = `Key creation failed: ${error.message}`;
    } finally {
        createKeyBtn.disabled = false;
        createKeyBtn.textContent = 'Create API Key';
    }
});

consumerIdEl.value = window.localStorage.getItem('kinetic_consumer_id') || '';
if (consumerIdEl.value) {
    loadDashboard();
}
