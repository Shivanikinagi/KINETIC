import { API_BASE_URL } from './app.js';

const gridEl = document.getElementById('templateGrid');
const templateCountEl = document.getElementById('templateCount');
const consumerIdEl = document.getElementById('consumerId');
const templateIdEl = document.getElementById('templateId');
const tokenOverrideEl = document.getElementById('tokenOverride');
const deployBtn = document.getElementById('deployBtn');
const deployResultEl = document.getElementById('deployResult');

function safe(value) {
    return String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

function setTemplateCountLabel(text) {
    if (!templateCountEl) return;
    templateCountEl.textContent = text;
}

function renderTemplateCard(template) {
    return `
        <article class="card p-4 sm:p-5">
            <div class="flex items-start justify-between gap-3">
                <div>
                    <h3 class="text-xl font-semibold text-cyan-100">${safe(template.name)}</h3>
                    <p class="text-sm text-slate-300/85 mt-1">${safe(template.description)}</p>
                </div>
                <span class="text-[11px] uppercase tracking-[0.14em] text-emerald-200 bg-emerald-500/15 border border-emerald-300/35 rounded-full px-2 py-1">ready</span>
            </div>

            <p class="text-xs text-slate-400 mt-3">ID: <span class="font-mono text-slate-300">${safe(template.template_id)}</span></p>

            <div class="grid grid-cols-2 gap-2 mt-3 text-sm">
                <div class="card p-2.5"><p class="text-slate-400 text-xs">Use case</p><p class="text-cyan-100">${safe(template.use_case)}</p></div>
                <div class="card p-2.5"><p class="text-slate-400 text-xs">VRAM</p><p class="text-cyan-100">${safe(template.required_vram)} GB</p></div>
                <div class="card p-2.5"><p class="text-slate-400 text-xs">Base tokens</p><p class="text-cyan-100">${safe(template.base_tokens)}</p></div>
                <div class="card p-2.5"><p class="text-slate-400 text-xs">Usage</p><p class="text-cyan-100">${safe(template.usage_count)}</p></div>
            </div>

            <button data-fill-template="${safe(template.template_id)}" class="mt-4 w-full rounded-xl border border-slate-500/60 hover:border-cyan-300/60 px-3 py-2 text-sm font-semibold text-slate-200 hover:text-cyan-100 transition-all">Use this template</button>
        </article>
    `;
}

function attachTemplateFillButtons() {
    const buttons = document.querySelectorAll('[data-fill-template]');
    buttons.forEach((button) => {
        button.addEventListener('click', () => {
            templateIdEl.value = button.getAttribute('data-fill-template') || '';
        });
    });
}

async function loadTemplates() {
    gridEl.innerHTML = '<div class="card p-4 text-slate-300">Loading templates...</div>';
    setTemplateCountLabel('Loading templates...');
    try {
        const res = await fetch(`${API_BASE_URL}/hub/templates`);
        if (!res.ok) {
            gridEl.innerHTML = '<div class="card p-4 text-rose-200">Failed to load templates. Refresh to retry.</div>';
            setTemplateCountLabel('Load failed');
            return;
        }
        const data = await res.json();
        const templates = data.templates || [];
        if (!templates.length) {
            gridEl.innerHTML = '<div class="card p-5 text-slate-300">No templates found yet. Publish one to start your library.</div>';
            setTemplateCountLabel('0 templates');
            return;
        }

        gridEl.innerHTML = templates.map(renderTemplateCard).join('');
        setTemplateCountLabel(`${templates.length} templates`);
        attachTemplateFillButtons();
    } catch (error) {
        gridEl.innerHTML = '<div class="card p-4 text-rose-200">API is offline. Start backend on port 8000, then refresh.</div>';
        setTemplateCountLabel('API offline');
        deployResultEl.textContent = `Cannot reach API: ${error.message}`;
    }
}

deployBtn.addEventListener('click', async () => {
    const templateId = templateIdEl.value.trim();
    const consumerId = consumerIdEl.value.trim();
    const tokenOverride = Number(tokenOverrideEl.value || 0);

    if (!templateId || !consumerId) {
        deployResultEl.textContent = 'consumer_id and template_id are required.';
        return;
    }

    deployBtn.disabled = true;
    deployBtn.textContent = 'Deploying...';

    window.localStorage.setItem('kinetic_consumer_id', consumerId);

    const params = {};
    if (tokenOverride > 0) params.tokens = tokenOverride;

    try {
        const res = await fetch(`${API_BASE_URL}/hub/templates/${encodeURIComponent(templateId)}/deploy`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                consumer_id: consumerId,
                params,
            }),
        });

        const body = await res.json();
        deployResultEl.textContent = JSON.stringify(body, null, 2);
    } catch (error) {
        deployResultEl.textContent = `Deployment failed: ${error.message}`;
    } finally {
        deployBtn.disabled = false;
        deployBtn.textContent = 'Deploy Template';
    }
});

consumerIdEl.value = window.localStorage.getItem('kinetic_consumer_id') || '';
loadTemplates().catch((error) => {
    gridEl.innerHTML = '<div class="card p-4 text-rose-200">Unexpected error loading templates.</div>';
    setTemplateCountLabel('Load failed');
    deployResultEl.textContent = String(error?.message || error);
});
