import { API_BASE_URL } from './app.js';

const qEl = document.getElementById('q');
const gpuEl = document.getElementById('gpu');
const maxPriceEl = document.getElementById('maxPrice');
const sortByEl = document.getElementById('sortBy');
const refreshBtn = document.getElementById('refreshBtn');
const metaEl = document.getElementById('resultsMeta');
const gridEl = document.getElementById('providerGrid');

function safe(value) {
    return String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

function renderProviderCard(provider) {
    const trust = provider.trust || {};
    const isVerified = provider.verified_member ? 'Verified' : 'Unverified';
    const reputation = Number(trust.reputation_score || 0).toFixed(1);
    const review = Number(trust.review_avg || 0).toFixed(2);
    const price = Number(provider.price_per_hour || 0).toFixed(2);
    const uptime = Number(provider.uptime || 0).toFixed(2);

    return `
        <article class="card p-4 sm:p-5">
            <div class="flex items-start justify-between gap-3">
                <div>
                    <h3 class="text-xl font-semibold text-cyan-100">${safe(provider.name)}</h3>
                    <p class="text-sm text-slate-300/80">${safe(provider.gpu_model)} | ${safe(provider.vram_gb)} GB VRAM | ${safe(provider.region || 'Global')}</p>
                    <p class="text-xs text-slate-400 mt-1">${safe(provider.org_name || provider.id)} | ${isVerified}</p>
                </div>
                <span class="text-sm font-semibold text-emerald-200 bg-emerald-500/15 border border-emerald-200/35 rounded-full px-2 py-1">$${price}/hr</span>
            </div>

            <div class="grid grid-cols-3 gap-2 mt-4 text-sm">
                <div class="card p-2.5">
                    <p class="text-slate-400 text-xs uppercase tracking-wide">Reputation</p>
                    <p class="text-cyan-100 font-bold">${reputation}</p>
                </div>
                <div class="card p-2.5">
                    <p class="text-slate-400 text-xs uppercase tracking-wide">Rating</p>
                    <p class="text-cyan-100 font-bold">${review}</p>
                </div>
                <div class="card p-2.5">
                    <p class="text-slate-400 text-xs uppercase tracking-wide">Uptime</p>
                    <p class="text-cyan-100 font-bold">${uptime}%</p>
                </div>
            </div>

            <div class="mt-4 flex gap-2">
                <a class="rounded-xl bg-cyan-500 text-slate-950 px-3 py-2 text-sm font-semibold" href="/provider-profile.html?id=${encodeURIComponent(provider.id)}">Open Profile</a>
                <button class="rounded-xl border border-slate-500/70 hover:border-cyan-300/70 px-3 py-2 text-sm text-slate-100" data-save-provider="${safe(provider.id)}">Save</button>
            </div>
        </article>
    `;
}

async function loadProviders() {
    metaEl.textContent = 'Loading providers...';
    gridEl.innerHTML = '<div class="card p-4 text-slate-300">Fetching provider catalog...</div>';

    try {
        const params = new URLSearchParams();
        if (qEl.value.trim()) params.set('q', qEl.value.trim());
        if (gpuEl.value.trim()) params.set('gpu_model', gpuEl.value.trim());
        if (maxPriceEl.value) params.set('max_price', maxPriceEl.value);
        if (sortByEl.value) params.set('sort_by', sortByEl.value);

        const url = `${API_BASE_URL}/hub/explore?${params.toString()}`;
        const res = await fetch(url);

        if (!res.ok) {
            metaEl.textContent = 'Failed to load providers.';
            gridEl.innerHTML = '<div class="card p-4 text-rose-200">Provider service unavailable. Please refresh.</div>';
            return;
        }

        const data = await res.json();
        const providers = data.providers || [];
        metaEl.textContent = `${providers.length} providers matched`;

        if (!providers.length) {
            gridEl.innerHTML = '<div class="card p-5 text-slate-300">No providers found for current filters. Try a wider price range or clear GPU search.</div>';
            return;
        }

        gridEl.innerHTML = providers.map(renderProviderCard).join('');
        attachSaveButtons();
    } catch (error) {
        metaEl.textContent = 'Failed to load providers.';
        gridEl.innerHTML = '<div class="card p-4 text-rose-200">API is offline. Start backend on port 8000, then refresh.</div>';
    }
}

function attachSaveButtons() {
    const buttons = document.querySelectorAll('[data-save-provider]');
    buttons.forEach((button) => {
        button.addEventListener('click', async () => {
            const providerId = button.getAttribute('data-save-provider');
            const consumerId = window.localStorage.getItem('kinetic_consumer_id') || prompt('Enter consumer ID to save provider');
            if (!providerId || !consumerId) return;
            window.localStorage.setItem('kinetic_consumer_id', consumerId);
            const res = await fetch(`${API_BASE_URL}/hub/consumers/${encodeURIComponent(consumerId)}/saved-providers/${encodeURIComponent(providerId)}`, {
                method: 'POST',
            });
            button.textContent = res.ok ? 'Saved' : 'Save failed';
        });
    });
}

refreshBtn.addEventListener('click', () => {
    loadProviders();
});

[qEl, gpuEl, maxPriceEl, sortByEl].forEach((el) => {
    el.addEventListener('change', () => loadProviders());
});

loadProviders();
