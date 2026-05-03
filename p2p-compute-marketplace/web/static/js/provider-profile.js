import { API_BASE_URL } from './app.js';

const params = new URLSearchParams(window.location.search);
const providerId = params.get('id');

const providerNameEl = document.getElementById('providerName');
const providerMetaEl = document.getElementById('providerMeta');
const repScoreEl = document.getElementById('repScore');
const successRateEl = document.getElementById('successRate');
const benchmarkEl = document.getElementById('benchmark');
const reviewAvgEl = document.getElementById('reviewAvg');
const reviewsEl = document.getElementById('reviews');

const reviewerIdEl = document.getElementById('reviewerId');
const ratingEl = document.getElementById('rating');
const commentEl = document.getElementById('comment');
const submitReviewBtn = document.getElementById('submitReview');
const reviewStatusEl = document.getElementById('reviewStatus');

function renderReview(review) {
    return `
        <article class="card p-3">
            <div class="flex items-center justify-between gap-2">
                <p class="text-sm text-cyan-300 font-semibold">${review.reviewer_id}</p>
                <p class="text-sm text-amber-300">${'★'.repeat(Math.max(1, Number(review.rating || 0)))}</p>
            </div>
            <p class="text-sm text-slate-300 mt-2">${review.comment || ''}</p>
            <p class="text-xs text-slate-500 mt-2">${review.created_at || ''}</p>
        </article>
    `;
}

async function loadProfile() {
    if (!providerId) {
        providerNameEl.textContent = 'Missing provider id';
        return;
    }

    const res = await fetch(`${API_BASE_URL}/hub/providers/${encodeURIComponent(providerId)}/profile`);
    if (!res.ok) {
        providerNameEl.textContent = 'Provider not found';
        return;
    }

    const data = await res.json();
    const provider = data.provider || {};
    const trust = data.trust || {};

    providerNameEl.textContent = provider.name || provider.id || providerId;
    providerMetaEl.textContent = `${provider.gpu_model || ''} • ${provider.vram_gb || 0}GB • ${provider.region || 'Global'} • $${Number(provider.price_per_hour || 0).toFixed(2)}/hr`;

    repScoreEl.textContent = Number(trust.reputation_score || 0).toFixed(2);
    successRateEl.textContent = `${Number(trust.success_rate || 0).toFixed(1)}%`;
    benchmarkEl.textContent = Number(trust.benchmark_score || 0).toFixed(1);
    reviewAvgEl.textContent = Number(trust.review_avg || 0).toFixed(2);

    const reviews = data.reviews || [];
    reviewsEl.innerHTML = reviews.length ? reviews.map(renderReview).join('') : '<p class="text-slate-400 text-sm">No reviews yet.</p>';
}

submitReviewBtn.addEventListener('click', async () => {
    if (!providerId) return;

    const payload = {
        reviewer_id: reviewerIdEl.value.trim(),
        rating: Number(ratingEl.value || 5),
        comment: commentEl.value.trim(),
    };

    if (!payload.reviewer_id) {
        reviewStatusEl.textContent = 'Reviewer ID is required.';
        return;
    }

    const res = await fetch(`${API_BASE_URL}/hub/providers/${encodeURIComponent(providerId)}/reviews`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
    });

    if (!res.ok) {
        reviewStatusEl.textContent = 'Failed to submit review.';
        return;
    }

    reviewStatusEl.textContent = 'Review submitted.';
    commentEl.value = '';
    await loadProfile();
});

loadProfile();
