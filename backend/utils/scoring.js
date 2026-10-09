/**
 * Developer portfolio scoring (max 100).
 *
 * Two curve families:
 *  1. logisticLog  - for heavy-tailed "popularity" metrics (stars, forks, followers)
 *  2. expSaturate  - for bounded "effort" metrics (repo counts, recent repos)
 *
 * Both are calibrated with human-readable anchors instead of magic multipliers.
 */

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const nonNeg = (v) => (Number.isFinite(v) && v > 0 ? v : 0);

function logisticLog(x, { mid, elite, elitePct = 0.95 }) {
    x = nonNeg(x);
    const k = Math.log(elitePct / (1 - elitePct)) / Math.log((1 + elite) / (1 + mid));
    const raw = (v) => 1 / (1 + Math.pow((1 + v) / (1 + mid), -k));
    const r0 = raw(0);
    return (raw(x) - r0) / (1 - r0);
}

function expSaturate(x, tau) {
    return 1 - Math.exp(-nonNeg(x) / tau);
}

function impactScore({ totalStars, totalForks }) {
    const stars = 28 * logisticLog(totalStars, { mid: 150, elite: 15000 });
    const forks = 12 * logisticLog(totalForks, { mid: 40, elite: 2500 });
    return clamp(stars + forks, 0, 40);
}

function activityScore({ publicReposCount, recentReposCount }) {
    const recent = 18 * expSaturate(recentReposCount, 4);
    const total = 12 * expSaturate(publicReposCount, 20);
    return clamp(recent + total, 0, 30);
}

function networkScore({ followers }) {
    return 15 * logisticLog(followers, { mid: 50, elite: 5000 });
}

function profileScore({ bio, location, blog, company, email }) {
    return [bio, location, blog, company, email].filter((v) => v && String(v).trim()).length * 3;
}

function scoreDeveloper(m) {
    const impact = impactScore(m);
    const activity = activityScore(m);
    const network = networkScore(m);
    const profile = profileScore(m);
    const r1 = (n) => Math.round(n * 10) / 10;
    return {
        total: r1(clamp(impact + activity + network + profile, 0, 100)),
        impact: r1(impact),
        activity: r1(activity),
        network: r1(network),
        profile,
    };
}

module.exports = { scoreDeveloper };
