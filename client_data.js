/**
 * Client Data page: summary and trends by client
 * - Where we submit the most / win the most / lose the most / inactive the most
 * - Bar charts and submission trend
 */

(function () {
    const TOP_N = 10;
    const TREND_MONTHS = 12;
    let chartSubmit, chartWin, chartLost, chartInactive, chartTrend;
    let rawData = [];

    function getYearFromOpp(opp) {
        const d = opp.submitted_date || opp.encoded_date || opp.date_awarded_lost;
        if (!d) return null;
        const y = String(d).substring(0, 4);
        return /^\d{4}$/.test(y) ? y : null;
    }

    function getUniqueYears(data) {
        const set = new Set();
        (data || []).forEach(opp => {
            const y = getYearFromOpp(opp);
            if (y) set.add(y);
        });
        return Array.from(set).sort((a, b) => Number(b) - Number(a));
    }

    function getFilteredData() {
        const sel = document.getElementById('yearFilter');
        const year = sel ? sel.value : 'all';
        if (year === 'all') return rawData;
        return rawData.filter(opp => getYearFromOpp(opp) === year);
    }

    function getAuthHeaders() {
        const token = localStorage.getItem('authToken');
        return token ? { 'Authorization': 'Bearer ' + token } : null;
    }

    function normalizeClient(name) {
        return (name || '').trim() || '(No client)';
    }

    function parseAmount(val) {
        if (val == null || val === '') return 0;
        if (typeof val === 'number' && !isNaN(val)) return val;
        const s = String(val).replace(/[₱$,]/g, '').trim();
        const n = parseFloat(s);
        return isNaN(n) ? 0 : n;
    }

    function groupByClient(opportunities) {
        const byClient = {};
        opportunities.forEach(opp => {
            const client = normalizeClient(opp.client);
            if (!byClient[client]) {
                byClient[client] = {
                    client,
                    submitted: 0,
                    win: 0,
                    lost: 0,
                    inactive: 0,
                    winAmount: 0,
                    lostAmount: 0,
                    submittedAmount: 0,
                    // For win-rate denominator (includes submitted + inactive)
                    winRateCount: 0,
                    winRateSubmittedAmount: 0,
                    months: {}
                };
            }
            const r = byClient[client];
            const status = (opp.status || '').toLowerCase();
            const oppStatus = (opp.opp_status || '').toLowerCase();
            const decision = (opp.decision || '').toLowerCase();
            const amt = parseAmount(opp.final_amt);

            if (status === 'submitted') {
                r.submitted++;
                r.submittedAmount += amt;
                const d = opp.submitted_date || opp.encoded_date;
                if (d) {
                    const month = d.substring(0, 7);
                    r.months[month] = (r.months[month] || 0) + 1;
                }
            }
            if (oppStatus === 'op100') {
                r.win++;
                r.winAmount += amt;
            }
            if (decision === 'lost' || oppStatus === 'lost') {
                r.lost++;
                r.lostAmount += amt;
            }
            if (oppStatus === 'inactive') {
                r.inactive++;
            }

            // Win-rate denominator: consider both submitted and inactive as \"submissions\"
            if (status === 'submitted' || oppStatus === 'inactive') {
                r.winRateCount++;
                r.winRateSubmittedAmount += amt;
            }
        });
        return Object.values(byClient);
    }

    function getLast12Months() {
        const out = [];
        const d = new Date();
        for (let i = TREND_MONTHS - 1; i >= 0; i--) {
            const m = new Date(d.getFullYear(), d.getMonth() - i, 1);
            out.push(m.getFullYear() + '-' + String(m.getMonth() + 1).padStart(2, '0'));
        }
        return out;
    }

    function buildTrendData(data) {
        const months = getLast12Months();
        const byMonth = {};
        months.forEach(m => { byMonth[m] = 0; });
        (data || []).forEach(opp => {
            const status = (opp.status || '').toLowerCase();
            if (status !== 'submitted') return;
            const d = opp.submitted_date || opp.encoded_date;
            if (!d) return;
            const month = d.substring(0, 7);
            if (byMonth.hasOwnProperty(month)) byMonth[month]++;
        });
        return { labels: months.map(m => {
            const [y, mo] = m.split('-');
            const names = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
            return names[parseInt(mo, 10) - 1] + ' ' + y;
        }), values: months.map(m => byMonth[m] || 0) };
    }

    function renderLists(byClient) {
        const MIN_AMOUNT = 150000;      // filter out very small deals for totals
        const MIN_WINRATE_AMOUNT = 1_000_000; // only consider win-rate accounts with >= 1M total wins
        const MIN_SUBMITTED_AMOUNT_FOR_WINRATE = 1_000_000; // and >= 1M total submitted amount
        const sortNonZero = (arr, key) => {
            return [...arr].filter(r => (r[key] || 0) > 0).sort((a, b) => (b[key] || 0) - (a[key] || 0));
        };
        const fillList = (id, items, countKey, amountKey) => {
            const el = document.getElementById(id);
            if (!el) return;
            if (!items.length) {
                el.innerHTML = '<li class="opacity-60">No data</li>';
                return;
            }
            const rows = items.map((r, idx) => {
                const amt = amountKey && r[amountKey] ? ' ₱' + (r[amountKey] / 1e6).toFixed(2) + 'M' : '';
                return `<li><span>${idx + 1}. ${escapeHtml(r.client)}</span><span>${r[countKey] || 0}${amt}</span></li>`;
            });
            el.innerHTML = rows.join('');
        };

        const topSubmit = sortNonZero(byClient, 'submitted');
        const topLost = sortNonZero(
            byClient.filter(r => (r.lostAmount || 0) >= MIN_AMOUNT),
            'lost'
        );
        const topInactive = sortNonZero(byClient, 'inactive');
        const topWin = sortNonZero(
            byClient.filter(r => (r.winAmount || 0) >= MIN_AMOUNT),
            'win'
        );

        const topWinRate = [...byClient]
            // Only include accounts with 2 or more \"submissions\" (submitted + inactive)
            .filter(r => (r.winRateCount || 0) >= 2)
            // And meaningful totals: win amount >= 1M AND submitted amount >= 1M
            .filter(r => (r.winAmount || 0) >= MIN_WINRATE_AMOUNT)
            .filter(r => (r.winRateSubmittedAmount || 0) >= MIN_SUBMITTED_AMOUNT_FOR_WINRATE)
            .map(r => ({
                client: r.client,
                winRate: (r.win || 0) / (r.winRateCount || 1),
                win: r.win || 0,
                submitted: r.winRateCount || 0
            }))
            .sort((a, b) => b.winRate - a.winRate);

        const fillListWinRate = (id, items) => {
            const el = document.getElementById(id);
            if (!el) return;
            if (!items.length) {
                el.innerHTML = '<li class="opacity-60">No data</li>';
                return;
            }
            const rows = items.map((r, idx) => {
                const pct = Math.round(r.winRate * 100);
                const label = pct + '% (' + r.win + '/' + r.submitted + ')';
                return `<li><span>${idx + 1}. ${escapeHtml(r.client)}</span><span>${label}</span></li>`;
            });
            el.innerHTML = rows.join('');
        };

        fillList('topSubmitList', topSubmit, 'submitted');
        fillList('topWinList', topWin, 'win', 'winAmount');
        fillListWinRate('topWinRateList', topWinRate);
        fillList('topLostList', topLost, 'lost', 'lostAmount');
        fillList('topInactiveList', topInactive, 'inactive');
    }

    function escapeHtml(s) {
        const div = document.createElement('div');
        div.textContent = s;
        return div.innerHTML;
    }

    function chartColor(alpha) {
        const isDark = document.documentElement.classList.contains('dark');
        return isDark ? `rgba(148, 163, 184, ${alpha})` : `rgba(71, 85, 105, ${alpha})`;
    }

    function destroyCharts() {
        [chartSubmit, chartWin, chartLost, chartInactive, chartTrend].forEach(c => {
            if (c) c.destroy();
        });
    }

    function renderCharts(byClient, trendData) {
        destroyCharts();
        const isDark = document.documentElement.classList.contains('dark');
        const textColor = isDark ? '#e2e8f0' : '#334155';
        const gridColor = isDark ? 'rgba(148,163,184,0.2)' : 'rgba(148,163,184,0.3)';
        const barColor = isDark ? 'rgba(59, 130, 246, 0.8)' : 'rgba(59, 130, 246, 0.85)';
        const barColorWin = 'rgba(34, 197, 94, 0.8)';
        const barColorLost = 'rgba(239, 68, 68, 0.8)';
        const barColorInactive = 'rgba(148, 163, 184, 0.8)';

        const barOptions = (color) => ({
            indexAxis: 'y',
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: { backgroundColor: isDark ? '#1e293b' : '#fff', titleColor: textColor, bodyColor: textColor }
            },
            scales: {
                x: { grid: { color: gridColor }, ticks: { color: textColor } },
                y: { grid: { display: false }, ticks: { color: textColor, font: { size: 11 } } }
            }
        });

        const sortedSubmit = [...byClient].sort((a, b) => (b.submitted || 0) - (a.submitted || 0)).slice(0, TOP_N);
        const sortedWin = [...byClient].sort((a, b) => (b.win || 0) - (a.win || 0)).slice(0, TOP_N);
        const sortedLost = [...byClient].sort((a, b) => (b.lost || 0) - (a.lost || 0)).slice(0, TOP_N);
        const sortedInactive = [...byClient].sort((a, b) => (b.inactive || 0) - (a.inactive || 0)).slice(0, TOP_N);

        chartSubmit = new Chart(document.getElementById('chartSubmit'), {
            type: 'bar',
            data: {
                labels: sortedSubmit.map(r => r.client),
                datasets: [{ label: 'Submissions', data: sortedSubmit.map(r => r.submitted || 0), backgroundColor: barColor }]
            },
            options: barOptions(barColor)
        });
        chartWin = new Chart(document.getElementById('chartWin'), {
            type: 'bar',
            data: {
                labels: sortedWin.map(r => r.client),
                datasets: [{ label: 'Wins', data: sortedWin.map(r => r.win || 0), backgroundColor: barColorWin }]
            },
            options: barOptions(barColorWin)
        });
        chartLost = new Chart(document.getElementById('chartLost'), {
            type: 'bar',
            data: {
                labels: sortedLost.map(r => r.client),
                datasets: [{ label: 'Lost', data: sortedLost.map(r => r.lost || 0), backgroundColor: barColorLost }]
            },
            options: barOptions(barColorLost)
        });
        chartInactive = new Chart(document.getElementById('chartInactive'), {
            type: 'bar',
            data: {
                labels: sortedInactive.map(r => r.client),
                datasets: [{ label: 'Inactive', data: sortedInactive.map(r => r.inactive || 0), backgroundColor: barColorInactive }]
            },
            options: barOptions(barColorInactive)
        });

        chartTrend = new Chart(document.getElementById('chartTrend'), {
            type: 'line',
            data: {
                labels: trendData.labels,
                datasets: [{
                    label: 'Submissions',
                    data: trendData.values,
                    borderColor: 'rgb(59, 130, 246)',
                    backgroundColor: 'rgba(59, 130, 246, 0.1)',
                    fill: true,
                    tension: 0.2
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: { backgroundColor: isDark ? '#1e293b' : '#fff', titleColor: textColor, bodyColor: textColor }
                },
                scales: {
                    x: { grid: { color: gridColor }, ticks: { color: textColor } },
                    y: { grid: { color: gridColor }, ticks: { color: textColor } }
                }
            }
        });
    }

    function populateYearFilter() {
        const sel = document.getElementById('yearFilter');
        if (!sel) return;
        const years = getUniqueYears(rawData);
        const current = sel.value;
        sel.innerHTML = '<option value="all">All years</option>' +
            years.map(y => '<option value="' + escapeHtml(y) + '">' + escapeHtml(y) + '</option>').join('');
        if (years.indexOf(current) >= 0) sel.value = current;
        else if (current !== 'all') sel.value = 'all';
    }

    function renderWithFilter() {
        const data = getFilteredData();
        const byClient = groupByClient(data);
        const trendData = buildTrendData(data);
        renderLists(byClient);
        renderCharts(byClient, trendData);
    }

    async function fetchAndRender() {
        const token = localStorage.getItem('authToken');
        if (!token) {
            document.getElementById('authLoadingScreen').style.display = 'flex';
            document.getElementById('authLoadingRedirect').style.display = 'block';
            document.querySelector('.auth-loading-spinner').style.display = 'none';
            document.querySelector('.auth-loading-message').textContent = 'Please log in.';
            return;
        }
        try {
            const res = await fetch(getApiUrl('/api/opportunities'), { headers: getAuthHeaders() });
            if (res.status === 403) {
                localStorage.removeItem('authToken');
                window.location.href = 'login.html';
                return;
            }
            if (!res.ok) throw new Error('Failed to load data: ' + res.status);
            rawData = await res.json();
            if (!Array.isArray(rawData)) rawData = [];
            populateYearFilter();
            const yearEl = document.getElementById('yearFilter');
            if (yearEl && !yearEl.hasAttribute('data-client-data-listener')) {
                yearEl.setAttribute('data-client-data-listener', '1');
                yearEl.addEventListener('change', renderWithFilter);
            }
            renderWithFilter();
        } catch (e) {
            const main = document.querySelector('.main-content');
            if (main) main.innerHTML = '<div class="p-6 text-red-500">Failed to load client data. ' + escapeHtml(e.message) + '</div>';
        }
    }

    function initAuth() {
        const authScreen = document.getElementById('authLoadingScreen');
        const appContent = document.getElementById('appContent');
        const redirectDiv = document.getElementById('authLoadingRedirect');
        const spinner = authScreen && authScreen.querySelector('.auth-loading-spinner');
        const msg = authScreen && authScreen.querySelector('.auth-loading-message');

        if (!localStorage.getItem('authToken')) {
            if (redirectDiv) redirectDiv.style.display = 'block';
            if (spinner) spinner.style.display = 'none';
            if (msg) msg.textContent = 'Authentication required';
            const btn = document.getElementById('authLoginRedirectBtn');
            if (btn) btn.addEventListener('click', () => { window.location.href = 'login.html'; });
            return;
        }
        if (authScreen) authScreen.style.display = 'none';
        if (appContent) appContent.style.display = 'block';
        fetchAndRender();
    }

    document.addEventListener('DOMContentLoaded', function () {
        initAuth();
    });
})();
