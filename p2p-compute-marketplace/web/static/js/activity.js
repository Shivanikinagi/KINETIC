import { AGENT_BRIDGE_URL, showNotification } from './app.js';

function escapeHtml(text) {
    return String(text)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

function relativeTime(isoTimestamp) {
    if (!isoTimestamp) return 'just now';
    const diffMs = Date.now() - new Date(isoTimestamp).getTime();
    if (Number.isNaN(diffMs) || diffMs < 1000) return 'just now';

    const seconds = Math.floor(diffMs / 1000);
    if (seconds < 60) return `${seconds}s ago`;

    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;

    const hours = Math.floor(minutes / 60);
    return `${hours}h ago`;
}

function txFromMessage(message) {
    const match = String(message).match(/tx_id=([A-Z0-9]+)/i);
    return match ? match[1] : null;
}

function txExplorerUrl(txId) {
    return `https://testnet.explorer.perawallet.app/tx/${txId}`;
}

function stageFromMessage(message) {
    const msg = String(message || '');

    if (msg.includes('Agent starting job dispatch')) {
        return { icon: 'smart_toy', label: 'Agent starting', badgeClass: 'bg-cyan-400/15 text-cyan-400 border-cyan-400/30' };
    }
    if (msg.includes('requested') && msg.includes('microALGO')) {
        return { icon: 'request_quote', label: 'Provider quote requested', badgeClass: 'bg-yellow-400/15 text-yellow-300 border-yellow-400/30' };
    }
    if (msg.includes('Payment submitted')) {
        return { icon: 'payments', label: 'x402 payment submitted', badgeClass: 'bg-cyan-400/15 text-cyan-400 border-cyan-400/30' };
    }
    if (msg.includes('ESCROW_LOCKED')) {
        return { icon: 'lock', label: 'Escrow locked', badgeClass: 'bg-indigo-400/15 text-indigo-300 border-indigo-400/30' };
    }
    if (msg.includes('Job completed')) {
        return { icon: 'task_alt', label: 'Output verified', badgeClass: 'bg-green-400/15 text-green-300 border-green-400/30' };
    }
    if (msg.includes('ESCROW_RELEASED') || msg.includes('ESCROW_RELEASE_REQUESTED')) {
        return { icon: 'verified', label: 'Escrow released', badgeClass: 'bg-green-400/15 text-green-300 border-green-400/30' };
    }
    if (msg.includes('FRAUD_DETECTED')) {
        return { icon: 'gpp_bad', label: 'Fraud caught', badgeClass: 'bg-red-400/15 text-red-300 border-red-400/30' };
    }
    if (msg.includes('Budget exceeded')) {
        return { icon: 'money_off', label: 'Budget cap enforced', badgeClass: 'bg-red-400/15 text-red-300 border-red-400/30' };
    }

    return { icon: 'radio_button_checked', label: 'Agent event', badgeClass: 'bg-slate-600/40 text-slate-300 border-slate-500/30' };
}

function renderMetrics(status, logs) {
    const jobsEl = document.getElementById('metricJobs');
    const spentEl = document.getElementById('metricSpent');
    const verifiedEl = document.getElementById('metricVerified');
    const fraudEl = document.getElementById('metricFraud');
    const statusEl = document.getElementById('agentStatusPill');

    const fraudCaught = logs.filter((item) => String(item.message).includes('FRAUD_DETECTED')).length;

    if (jobsEl) jobsEl.textContent = String(status.jobs_today ?? 0);
    if (spentEl) spentEl.textContent = `${Number(status.algo_spent_today || 0).toFixed(4)} ALGO`;
    if (verifiedEl) verifiedEl.textContent = String(status.verifications_passed ?? 0);
    if (fraudEl) fraudEl.textContent = String(fraudCaught);

    if (statusEl) {
        const statusText = String(status.status || 'idle').toUpperCase();
        statusEl.textContent = `AGENT ${statusText}`;
        statusEl.className = 'px-3 py-1 rounded-full text-[10px] font-mono border';
        if (status.status === 'running') {
            statusEl.classList.add('bg-cyan-400/15', 'text-cyan-300', 'border-cyan-400/30');
        } else if (status.status === 'error') {
            statusEl.classList.add('bg-red-400/15', 'text-red-300', 'border-red-400/30');
        } else {
            statusEl.classList.add('bg-slate-600/40', 'text-slate-300', 'border-slate-500/30');
        }
    }
}

function renderTimeline(logs) {
    const timeline = document.getElementById('activityTimeline');
    if (!timeline) return;

    const events = logs.slice(0, 18);
    if (events.length === 0) {
        timeline.innerHTML = '<p class="text-slate-400 text-sm">No agent events yet. Click Run Test Job to generate live x402 flow.</p>';
        return;
    }

    timeline.innerHTML = events.map((entry) => {
        const stage = stageFromMessage(entry.message);
        const txId = txFromMessage(entry.message);
        const txLink = txId
            ? `<a class="text-cyan-400 hover:text-cyan-300 underline underline-offset-2" href="${txExplorerUrl(txId)}" target="_blank" rel="noreferrer">${txId.slice(0, 8)}...${txId.slice(-6)}</a>`
            : '';

        return `
            <article class="glass-panel p-4 rounded-lg border border-outline-variant/10">
                <div class="flex items-start justify-between gap-3 mb-2">
                    <span class="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-mono border rounded ${stage.badgeClass}">
                        <span class="material-symbols-outlined text-xs" style="font-variation-settings: 'FILL' 1;">${stage.icon}</span>
                        ${stage.label}
                    </span>
                    <span class="text-[10px] font-mono text-slate-500">${relativeTime(entry.timestamp)}</span>
                </div>
                <p class="text-sm text-slate-200 mb-2">${escapeHtml(entry.message)}</p>
                ${txLink ? `<div class="text-xs font-mono">Tx: ${txLink}</div>` : ''}
            </article>
        `;
    }).join('');
}

function renderLogs(logs) {
    const logsPanel = document.getElementById('kernelLogs');
    if (!logsPanel) return;

    const items = logs.slice(0, 80);
    if (items.length === 0) {
        logsPanel.innerHTML = '<p class="text-slate-500">No logs captured yet.</p>';
        return;
    }

    logsPanel.innerHTML = items.map((entry) => {
        const txId = txFromMessage(entry.message);
        const txPart = txId ? ` <a class="text-cyan-400 hover:text-cyan-300" href="${txExplorerUrl(txId)}" target="_blank" rel="noreferrer">[${txId.slice(0, 8)}]</a>` : '';
        return `<p><span class="text-slate-500">[${relativeTime(entry.timestamp)}]</span> ${escapeHtml(entry.message)}${txPart}</p>`;
    }).join('');
}

function renderProofs(proofsPayload) {
    const proofsList = document.getElementById('proofList');
    if (!proofsList) return;

    const proofs = proofsPayload?.proofs || [];
    if (proofs.length === 0) {
        proofsList.innerHTML = '<p class="text-slate-500 text-xs">No on-chain proofs found yet.</p>';
        return;
    }

    proofsList.innerHTML = proofs.slice(0, 8).map((proof) => {
        const url = proof.url || '#';
        const txId = proof.tx_id || '';
        const short = txId ? `${txId.slice(0, 8)}...${txId.slice(-6)}` : 'view';
        return `
            <div class="flex items-center justify-between gap-2 text-xs">
                <span class="text-slate-300">${escapeHtml(proof.label || proof.kind || 'Proof')}</span>
                <a class="text-cyan-400 hover:text-cyan-300 underline underline-offset-2" href="${url}" target="_blank" rel="noreferrer">${short}</a>
            </div>
        `;
    }).join('');
}

async function fetchJson(path) {
    const response = await fetch(`${AGENT_BRIDGE_URL}${path}`);
    if (!response.ok) {
        throw new Error(`Bridge request failed: ${response.status}`);
    }
    return response.json();
}

async function refreshFeed() {
    try {
        const [status, logs, proofs] = await Promise.all([
            fetchJson('/agent/status'),
            fetchJson('/agent/log'),
            fetchJson('/agent/proofs'),
        ]);

        renderMetrics(status, logs);
        renderTimeline(logs);
        renderLogs(logs);
        renderProofs(proofs);
    } catch (error) {
        console.error('Activity refresh failed:', error);
        const timeline = document.getElementById('activityTimeline');
        if (timeline) {
            timeline.innerHTML = '<p class="text-red-300 text-sm">Could not load Agent Bridge data. Ensure api.agent_bridge is running on port 3001.</p>';
        }
    }
}

async function runTestJob() {
    const runBtn = document.getElementById('runTestJobBtn');
    if (runBtn) {
        runBtn.disabled = true;
        runBtn.textContent = 'Dispatching...';
    }

    try {
        const response = await fetch(`${AGENT_BRIDGE_URL}/agent/run`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                type: 'inference',
                tokens: 120,
                payload: `judge-demo-${Date.now()}`,
            }),
        });

        if (!response.ok) {
            throw new Error(`Run failed with status ${response.status}`);
        }

        const data = await response.json();
        showNotification(`Agent test job dispatched (PID ${data.pid || 'n/a'}). Watch timeline for x402 payment and escrow release.`, 'success');
        await refreshFeed();
    } catch (error) {
        console.error('Run test job failed:', error);
        showNotification(`Failed to run test job: ${error.message}`, 'error');
    } finally {
        if (runBtn) {
            runBtn.disabled = false;
            runBtn.textContent = 'Run Test Job';
        }
    }
}

document.addEventListener('DOMContentLoaded', async () => {
    const runBtn = document.getElementById('runTestJobBtn');
    if (runBtn) {
        runBtn.addEventListener('click', runTestJob);
    }

    await refreshFeed();
    setInterval(refreshFeed, 3000);
});
