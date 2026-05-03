/**
 * Organisation Registration Page Logic
 * Handles form submission, wallet connection, live org listing, and logo preview.
 */
const queryApiBase = new URLSearchParams(window.location.search).get('apiBase');
const API_BASE_URL = (queryApiBase && queryApiBase.trim()) ||
    (window.KINETIC_API_BASE_URL && String(window.KINETIC_API_BASE_URL).trim()) ||
    (window.location.origin.includes('localhost') || window.location.origin.includes('127.0.0.1')
        ? 'http://localhost:8000'
        : window.location.origin);

const connectWalletBtn = document.getElementById('connectWalletBtn');
const useConnectedWalletBtn = document.getElementById('useConnectedWalletBtn');
const ownerWalletInput = document.getElementById('ownerWallet');
const orgRegisterForm = document.getElementById('orgRegisterForm');
const registerStatus = document.getElementById('registerStatus');
const submitBtn = document.getElementById('submitBtn');
const orgList = document.getElementById('orgList');
const orgCount = document.getElementById('orgCount');
const logoUrlInput = document.getElementById('logoUrl');
const logoPreview = document.getElementById('logoPreview');
const descTextarea = document.getElementById('orgDescription');
const descCharCount = document.getElementById('descCharCount');

function notify(message, type = 'info') {
    if (window.walletManager && window.walletManager.showNotification) {
        window.walletManager.showNotification(message, type);
        return;
    }
    if (registerStatus) registerStatus.textContent = message;
}

function setStatusHtml(html) {
    if (registerStatus) registerStatus.innerHTML = html;
}

// ── Logo preview ──
if (logoUrlInput && logoPreview) {
    logoUrlInput.addEventListener('input', () => {
        const url = logoUrlInput.value.trim();
        if (url) {
            logoPreview.innerHTML = `<img src="${url}" class="w-full h-full object-cover" onerror="this.parentElement.innerHTML='<span class=\\'material-symbols-outlined text-red-400 text-xl\\'>broken_image</span>'" alt="Logo preview"/>`;
        } else {
            logoPreview.innerHTML = '<span class="material-symbols-outlined text-slate-600 text-xl">image</span>';
        }
    });
}

// ── Character counter ──
if (descTextarea && descCharCount) {
    descTextarea.addEventListener('input', () => {
        descCharCount.textContent = String(descTextarea.value.length);
    });
}

// ── Wallet ──
async function initializeWallet() {
    if (!window.walletManager) {
        if (registerStatus) registerStatus.textContent = 'Wallet manager not loaded — paste the owner wallet manually.';
        return;
    }

    await window.walletManager.initialize();
    if (window.walletManager.isConnected()) {
        ownerWalletInput.value = window.walletManager.getAddress() || '';
    }
}

async function toggleWalletConnection() {
    if (!window.walletManager) { notify('Wallet manager unavailable', 'error'); return; }

    if (window.walletManager.isConnected()) {
        await window.walletManager.disconnect();
        ownerWalletInput.value = '';
    } else {
        await window.walletManager.connect();
        ownerWalletInput.value = window.walletManager.getAddress() || '';
    }
}

// ── Load existing organisations ──
async function loadOrgs() {
    try {
        const response = await fetch(`${API_BASE_URL}/orgs`);
        if (!response.ok) throw new Error('Failed to fetch organisations');
        const orgs = await response.json();

        if (orgCount) orgCount.textContent = `${orgs.length} org${orgs.length !== 1 ? 's' : ''}`;

        if (!orgs.length) {
            orgList.innerHTML = '<p class="text-slate-500 text-sm text-center py-4">No organisations registered yet. Be the first!</p>';
            return;
        }

        orgList.innerHTML = orgs.map((org) => {
            const verified = Boolean(org.verified);
            const badgeHtml = verified
                ? '<span class="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 text-[10px] uppercase">Verified</span>'
                : '';
            const logoHtml = org.logo_url
                ? `<img src="${org.logo_url}" class="w-9 h-9 rounded-lg object-cover bg-white/5" onerror="this.style.display='none'" alt="${org.org_name}"/>`
                : `<div class="w-9 h-9 rounded-lg bg-gradient-to-br from-cyan-500/20 to-blue-500/20 flex items-center justify-center text-cyan-400 font-bold text-xs">${org.org_name.charAt(0).toUpperCase()}</div>`;

            return `
                <a href="/org-dashboard.html?org_id=${encodeURIComponent(org.org_id)}" class="org-card flex items-center gap-3 p-3 rounded-xl border border-white/5 bg-white/[0.02] hover:bg-white/[0.05] transition-all cursor-pointer">
                    ${logoHtml}
                    <div class="min-w-0 flex-1">
                        <div class="flex items-center gap-2">
                            <h4 class="text-sm font-semibold truncate">${org.org_name}</h4>
                            ${badgeHtml}
                        </div>
                        <p class="text-[11px] text-slate-500 truncate">${org.resources?.length || 0} resources · ${org.jobs_completed || 0} jobs</p>
                    </div>
                    <span class="material-symbols-outlined text-slate-600 text-sm">chevron_right</span>
                </a>
            `;
        }).join('');
    } catch (error) {
        console.error('Failed to load orgs:', error);
        if (orgList) orgList.innerHTML = '<p class="text-slate-500 text-sm">Could not load organisations.</p>';
    }
}

// ── Submit registration ──
async function submitOrgRegistration(event) {
    event.preventDefault();

    const payload = {
        org_name: document.getElementById('orgName').value.trim(),
        description: document.getElementById('orgDescription').value.trim(),
        logo_url: (document.getElementById('logoUrl').value || '').trim(),
        owner_wallet: ownerWalletInput.value.trim(),
    };

    if (!payload.org_name || payload.org_name.length < 2) {
        notify('Organisation name must be at least 2 characters.', 'error');
        return;
    }
    if (!payload.owner_wallet || payload.owner_wallet.length !== 58) {
        notify('Please provide a valid 58-character Algorand wallet address.', 'error');
        return;
    }

    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span class="material-symbols-outlined text-lg animate-spin">progress_activity</span> Registering...';
    setStatusHtml('<span class="text-cyan-300">Submitting organisation registration to API & Algorand...</span>');

    try {
        const response = await fetch(`${API_BASE_URL}/orgs/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });

        const responseBody = await response.json();
        if (!response.ok) {
            throw new Error(responseBody.detail || 'Registration failed');
        }

        const org = responseBody.organisation;
        localStorage.setItem('kineticOrgId', org.org_id);

        const txNotice = responseBody.on_chain_tx_id
            ? `<a href="https://testnet.explorer.perawallet.app/tx/${responseBody.on_chain_tx_id}" target="_blank" class="text-cyan-300 underline">View on Algorand →</a>`
            : '<span class="text-slate-400">On-chain write queued (registry app not configured)</span>';

        setStatusHtml(`
            <div class="p-4 rounded-xl bg-emerald-500/10 border border-emerald-400/20 space-y-2">
                <div class="flex items-center gap-2 text-emerald-300 font-semibold">
                    <span class="material-symbols-outlined text-lg" style="font-variation-settings: 'FILL' 1;">check_circle</span>
                    Organisation Registered!
                </div>
                <p class="text-xs text-slate-300">${org.org_name} · <code class="text-[11px] text-slate-400">${org.org_id}</code></p>
                <p class="text-xs">${txNotice}</p>
            </div>
        `);
        notify(`Organisation registered: ${org.org_name}`, 'success');

        await loadOrgs();

        window.setTimeout(() => {
            window.location.href = `/org-dashboard.html?org_id=${encodeURIComponent(org.org_id)}`;
        }, 1500);
    } catch (error) {
        console.error(error);
        setStatusHtml(`<span class="text-red-400">Registration error: ${String(error.message || error)}</span>`);
        notify(`Registration failed: ${String(error.message || error)}`, 'error');
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<span class="material-symbols-outlined text-lg">rocket_launch</span> Register Organisation';
    }
}

// ── Event listeners ──
if (connectWalletBtn) {
    connectWalletBtn.addEventListener('click', toggleWalletConnection);
}

if (useConnectedWalletBtn) {
    useConnectedWalletBtn.addEventListener('click', () => {
        if (!window.walletManager || !window.walletManager.isConnected()) {
            notify('Connect your wallet first', 'warning');
            return;
        }
        ownerWalletInput.value = window.walletManager.getAddress() || '';
        notify('Wallet address filled', 'success');
    });
}

if (orgRegisterForm) {
    orgRegisterForm.addEventListener('submit', submitOrgRegistration);
}

// ── Initialize ──
Promise.resolve()
    .then(initializeWallet)
    .then(loadOrgs)
    .catch((error) => {
        console.error(error);
    });
