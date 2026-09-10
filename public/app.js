/**
 * AnswerThePublic Enterprise Suite - Frontend Client Application
 */

// Application State
const state = {
    config: { mode: 'sandbox', hasToken: false },
    activeTab: 'wheel',
    activeWheelSource: 'questions',
    activeCluster: 'questions',
    currentReport: null,
    tableRows: [],
    filteredRows: [],
    sortColumn: 'search_volume',
    sortAsc: false,
    selectedProviders: ['gweb', 'youtube', 'bing', 'amazon', 'tiktok', 'instagram', 'chatgpt', 'gemini']
};

// DOM References
const el = (id) => document.getElementById(id);


// ==========================================================================
// Enterprise Telemetry & Debug Subsystem
// ==========================================================================
state.debug = {
    enabled: true,
    dockCollapsed: false,
    activeTab: 'tab-traces',
    traces: [],
    logs: [],
    activeFilter: 'ALL',
    autoScroll: true
};

function addDebugLog(type, message) {
    const entry = {
        id: 'log_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
        time: new Date().toLocaleTimeString(),
        type: type || 'INFO',
        message: message || ''
    };
    state.debug.logs.unshift(entry);
    if (state.debug.logs.length > 200) state.debug.logs.pop();

    renderStreamLogEntry(entry);
    const streamBadge = el('streamCount');
    if (streamBadge) streamBadge.innerText = state.debug.logs.length;
}

function renderStreamLogEntry(entry) {
    const container = el('debugStreamLogs');
    if (!container) return;

    if (state.debug.activeFilter !== 'ALL' && !entry.type.includes(state.debug.activeFilter)) {
        return;
    }

    const row = document.createElement('div');
    row.className = 'log-entry';
    row.innerHTML = `<span class="log-time">${entry.time}</span><span class="log-type type-${entry.type}">${entry.type}</span><span class="log-msg">${escapeHtml(entry.message)}</span>`;
    container.insertBefore(row, container.firstChild);

    const autoScroll = el('chkAutoScroll');
    if (autoScroll && autoScroll.checked) {
        container.scrollTop = 0;
    }
}

function escapeHtml(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
}

function recordDebugTrace(trace) {
    state.debug.traces.unshift(trace);
    if (state.debug.traces.length > 60) state.debug.traces.pop();

    const latencyEl = el('dockLatency');
    if (latencyEl) latencyEl.innerText = `Latency: ${trace.durationMs}ms`;

    const countEl = el('dockReqCount');
    if (countEl) countEl.innerText = `Requests: ${state.debug.traces.length}`;

    const traceCountBadge = el('traceCount');
    if (traceCountBadge) traceCountBadge.innerText = state.debug.traces.length;

    renderTracesTable();

    // Update system tab if debug metadata returned
    if (trace.debugMeta) {
        if (el('sysUptime')) el('sysUptime').innerText = trace.debugMeta.serverUptime + 's';
        if (trace.debugMeta.memoryUsageMb) {
            if (el('sysMemoryRss')) el('sysMemoryRss').innerText = trace.debugMeta.memoryUsageMb.rss + ' MB';
            if (el('sysMemoryHeap')) el('sysMemoryHeap').innerText = trace.debugMeta.memoryUsageMb.heapUsed + ' MB';
        }
    }
}

function renderTracesTable() {
    const tbody = el('debugTracesBody');
    if (!tbody) return;

    if (state.debug.traces.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="empty-state-cell">No API calls recorded yet.</td></tr>';
        return;
    }

    tbody.innerHTML = state.debug.traces.map(t => {
        const methodClass = t.method === 'POST' ? 'method-post' : 'method-get';
        let statusClass = 'status-200';
        if (typeof t.status === 'number') {
            if (t.status >= 500) statusClass = 'status-5xx';
            else if (t.status >= 400) statusClass = 'status-4xx';
        } else {
            statusClass = 'status-5xx';
        }

        return `<tr>
            <td>${t.time}</td>
            <td><span class="method-tag ${methodClass}">${t.method}</span></td>
            <td style="font-weight:600; color:#fff;">${t.url}</td>
            <td><span class="status-badge ${statusClass}">${t.status}</span></td>
            <td>${t.durationMs}ms</td>
            <td><button class="btn-inspect-trace" onclick="inspectTrace('${t.id}')">Inspect</button></td>
        </tr>`;
    }).join('');
}

window.inspectTrace = function(traceId) {
    const trace = state.debug.traces.find(t => t.id === traceId);
    if (!trace) return;

    // Switch to raw JSON tab
    switchDebugTab('tab-rawjson');
    el('rawJsonSourceLabel').innerText = `Trace: ${trace.method} ${trace.url} (${trace.status})`;
    el('rawJsonViewer').innerText = JSON.stringify({
        trace_id: trace.id,
        timestamp: trace.time,
        method: trace.method,
        url: trace.url,
        duration_ms: trace.durationMs,
        request_body: trace.reqBody ? (typeof trace.reqBody === 'string' ? JSON.parse(trace.reqBody) : trace.reqBody) : null,
        response_payload: trace.responseData,
        error: trace.error || null
    }, null, 2);
};

function switchDebugTab(tabId) {
    state.debug.activeTab = tabId;
    document.querySelectorAll('.debug-tab').forEach(b => {
        if (b.getAttribute('data-debug-tab') === tabId) b.classList.add('active');
        else b.classList.remove('active');
    });
    document.querySelectorAll('.debug-tab-content').forEach(c => {
        if (c.id === tabId) c.classList.add('active');
        else c.classList.remove('active');
    });
}

// Enterprise central API fetch client
async function apiFetch(url, options = {}) {
    const start = performance.now();
    const headers = Object.assign({}, options.headers || {}, {
        'X-Debug-Mode': 'true'
    });
    if (options.body && typeof options.body === 'object' && !(options.body instanceof FormData)) {
        headers['Content-Type'] = 'application/json';
        options.body = JSON.stringify(options.body);
    }
    options.headers = headers;
    const method = (options.method || 'GET').toUpperCase();

    addDebugLog('API_TRACE', `${method} ${url} initiated`);

    try {
        const res = await fetch(url, options);
        const durationMs = Number((performance.now() - start).toFixed(1));
        const contentType = res.headers.get('content-type') || '';
        let data;
        if (contentType.includes('application/json')) {
            data = await res.json();
        } else {
            data = await res.text();
        }

        const trace = {
            id: 'tr_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
            time: new Date().toLocaleTimeString(),
            method,
            url,
            status: res.status,
            durationMs,
            reqBody: options.body,
            responseData: data,
            debugMeta: data && data._debug ? data._debug : null
        };
        recordDebugTrace(trace);
        addDebugLog(res.ok ? 'API_TRACE' : 'SEARCH_ERROR', `${method} ${url} returned ${res.status} (${durationMs}ms)`);
        return { ok: res.ok, status: res.status, data };
    } catch (err) {
        const durationMs = Number((performance.now() - start).toFixed(1));
        const trace = {
            id: 'tr_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
            time: new Date().toLocaleTimeString(),
            method,
            url,
            status: 'ERR',
            durationMs,
            reqBody: options.body,
            error: err.message
        };
        recordDebugTrace(trace);
        addDebugLog('SEARCH_ERROR', `${method} ${url} Network Error: ${err.message}`);
        throw err;
    }
}

// --- Initialization ---
document.addEventListener('DOMContentLoaded', async () => {
    await fetchConfig();
    setupEventListeners();

    // Auto-run an initial search for an instant live enterprise showcase
    el('keywordInput').value = 'seo automation';
    runSearch('seo automation', 'en', 'us', state.selectedProviders);
});

async function fetchConfig() {
    try {
        const { ok, data } = await apiFetch('/api/config');
        if (ok && data) {
            state.config = data;
            updateModePill();
            addDebugLog('CONFIG', `Loaded configuration. Mode: ${data.mode}, Providers: ${data.providers ? data.providers.length : 0}`);
            fetchDebugState();
        }
    } catch (e) {
        addDebugLog('CONFIG', 'Failed to load config: ' + e.message);
    }
}

async function fetchDebugState() {
    try {
        const { ok, data } = await apiFetch('/api/debug/state');
        if (ok && data && data.server) {
            if (el('sysStatus')) el('sysStatus').innerText = 'Online';
            if (el('sysMode')) el('sysMode').innerText = (data.config.mode || 'SANDBOX').toUpperCase();
            if (el('sysUptime')) el('sysUptime').innerText = data.server.uptimeSec + 's';
            if (el('sysNodeVer')) el('sysNodeVer').innerText = data.server.nodeVersion;
            if (data.server.memory) {
                if (el('sysMemoryRss')) el('sysMemoryRss').innerText = data.server.memory.rssMb + ' MB';
                if (el('sysMemoryHeap')) el('sysMemoryHeap').innerText = data.server.memory.heapUsedMb + ' MB';
            }
        }
    } catch (e) {
        console.warn('Debug state error:', e);
    }
}

function updateModePill() {
    const pill = el('modePill');
    const text = el('modeText');
    if (state.config.mode === 'live' && state.config.hasToken) {
        pill.className = 'mode-pill pill-live';
        text.innerText = 'Live Gateway Active';
    } else {
        pill.className = 'mode-pill pill-sandbox';
        text.innerText = 'Enterprise Sandbox';
    }
}

// --- Event Listeners ---
function setupEventListeners() {
    // Mode Pill & Settings Modal
    el('modePill').addEventListener('click', openSettingsModal);
    el('btnSettings').addEventListener('click', openSettingsModal);
    el('btnCloseSettings').addEventListener('click', closeSettingsModal);
    el('settingsModal').addEventListener('click', (e) => {
        if (e.target === el('settingsModal')) closeSettingsModal();
    });

    el('btnTestToken').addEventListener('click', testToken);
    el('btnSaveSettings').addEventListener('click', saveSettings);
    // Debug Console Dock Controls
    const btnToggleDebug = el('btnToggleDebug');
    if (btnToggleDebug) {
        btnToggleDebug.addEventListener('click', () => {
            const dock = el('debugDock');
            if (dock.classList.contains('hidden')) {
                dock.classList.remove('hidden');
                dock.classList.remove('collapsed');
                el('debugPillBadge').innerText = 'ON';
                el('debugPillBadge').className = 'badge-tag badge-cyan';
                fetchDebugState();
            } else if (dock.classList.contains('collapsed')) {
                dock.classList.remove('collapsed');
            } else {
                dock.classList.add('hidden');
                el('debugPillBadge').innerText = 'OFF';
                el('debugPillBadge').className = 'badge-tag';
            }
        });
    }

    const btnDockClose = el('btnDockClose');
    if (btnDockClose) {
        btnDockClose.addEventListener('click', () => {
            el('debugDock').classList.add('hidden');
            if (el('debugPillBadge')) {
                el('debugPillBadge').innerText = 'OFF';
                el('debugPillBadge').className = 'badge-tag';
            }
        });
    }

    const btnDockToggleSize = el('btnDockToggleSize');
    if (btnDockToggleSize) {
        btnDockToggleSize.addEventListener('click', () => {
            const dock = el('debugDock');
            if (dock.classList.contains('maximized')) {
                dock.classList.remove('maximized');
                btnDockToggleSize.innerHTML = '&#x25B2;';
            } else {
                dock.classList.add('maximized');
                btnDockToggleSize.innerHTML = '&#x25BC;';
            }
        });
    }

    const btnDockClear = el('btnDockClear');
    if (btnDockClear) {
        btnDockClear.addEventListener('click', async () => {
            state.debug.traces = [];
            state.debug.logs = [];
            renderTracesTable();
            if (el('debugStreamLogs')) el('debugStreamLogs').innerHTML = '';
            if (el('traceCount')) el('traceCount').innerText = '0';
            if (el('streamCount')) el('streamCount').innerText = '0';
            await apiFetch('/api/debug/clear', { method: 'POST' });
            addDebugLog('SYSTEM', 'Debug logs and traces cleared');
        });
    }

    const btnDockDump = el('btnDockDump');
    if (btnDockDump) {
        btnDockDump.addEventListener('click', () => {
            window.location.href = '/api/debug/dump';
            addDebugLog('SYSTEM', 'Initiated diagnostic dump download');
        });
    }

    // Debug tabs click
    document.querySelectorAll('.debug-tab').forEach(tabBtn => {
        tabBtn.addEventListener('click', () => {
            const tabId = tabBtn.getAttribute('data-debug-tab');
            switchDebugTab(tabId);
        });
    });

    // Stream filters
    document.querySelectorAll('.stream-filter').forEach(filterBtn => {
        filterBtn.addEventListener('click', () => {
            document.querySelectorAll('.stream-filter').forEach(b => b.classList.remove('active'));
            filterBtn.classList.add('active');
            state.debug.activeFilter = filterBtn.getAttribute('data-filter');
            const streamBox = el('debugStreamLogs');
            if (streamBox) streamBox.innerHTML = '';
            state.debug.logs.forEach(renderStreamLogEntry);
        });
    });

    // Copy Raw JSON
    const btnCopyRawJson = el('btnCopyRawJson');
    if (btnCopyRawJson) {
        btnCopyRawJson.addEventListener('click', () => {
            const text = el('rawJsonViewer').innerText;
            navigator.clipboard.writeText(text);
            btnCopyRawJson.innerText = 'Copied!';
            setTimeout(() => btnCopyRawJson.innerText = 'Copy JSON', 2000);
        });
    }


    // Provider selection pills
    const pills = document.querySelectorAll('.provider-pills .pill');
    pills.forEach(pill => {
        pill.addEventListener('click', () => {
            pill.classList.toggle('active');
            const prov = pill.getAttribute('data-provider');
            if (pill.classList.contains('active')) {
                if (!state.selectedProviders.includes(prov)) state.selectedProviders.push(prov);
            } else {
                state.selectedProviders = state.selectedProviders.filter(p => p !== prov);
            }
        });
    });

    el('btnToggleAllProviders').addEventListener('click', () => {
        const allActive = state.selectedProviders.length === 8;
        state.selectedProviders = allActive ? ['gweb'] : ['gweb', 'youtube', 'bing', 'amazon', 'tiktok', 'instagram', 'chatgpt', 'gemini'];
        pills.forEach(p => {
            const prov = p.getAttribute('data-provider');
            if (state.selectedProviders.includes(prov)) p.classList.add('active');
            else p.classList.remove('active');
        });
    });

    // Search Form
    el('searchForm').addEventListener('submit', (e) => {
        e.preventDefault();
        const kw = el('keywordInput').value.trim();
        const lang = el('langSelect').value;
        const country = el('countrySelect').value;
        if (kw) runSearch(kw, lang, country, state.selectedProviders);
    });

    // Navigation Tabs
    const tabBtns = document.querySelectorAll('.nav-tabs .tab-btn');
    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            tabBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            const tabName = btn.getAttribute('data-tab');
            switchTab(tabName);
        });
    });

    // Wheel source selectors
    const wheelBtns = document.querySelectorAll('.wheel-type-selector .wheel-btn');
    wheelBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            wheelBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            state.activeWheelSource = btn.getAttribute('data-wheel-source');
            renderWheel(state.activeWheelSource);
        });
    });

    // Cluster subnav buttons
    const clusterBtns = document.querySelectorAll('.cluster-subnav .subnav-btn');
    clusterBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            clusterBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            state.activeCluster = btn.getAttribute('data-cluster');
            renderClusterCards(state.activeCluster);
        });
    });

    // Table Filters & Sorting
    el('tableSearchInput').addEventListener('input', applyTableFilters);
    el('filterSource').addEventListener('change', applyTableFilters);
    el('filterIntent').addEventListener('change', applyTableFilters);
    el('filterProvider').addEventListener('change', applyTableFilters);

    document.querySelectorAll('#matrixTable th[data-sort]').forEach(th => {
        th.addEventListener('click', () => {
            const col = th.getAttribute('data-sort');
            if (state.sortColumn === col) {
                state.sortAsc = !state.sortAsc;
            } else {
                state.sortColumn = col;
                state.sortAsc = false;
            }
            sortTable();
        });
    });

    // Downloads
    el('btnDownloadCsv').addEventListener('click', () => {
        if (!state.currentReport) return;
        const id = state.currentReport.report_id || state.currentReport.parent_search_id;
        window.location.href = `/api/export/csv/${id}`;
    });

    el('btnDownloadJson').addEventListener('click', () => {
        if (!state.currentReport) return;
        const id = state.currentReport.report_id || state.currentReport.parent_search_id;
        window.location.href = `/api/export/json/${id}`;
    });

    el('btnDownloadSvg').addEventListener('click', downloadWheelSvg);

    // AI Grounded Studio
    el('btnAskAi').addEventListener('click', handleAskAi);
    document.querySelectorAll('.preset-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            el('aiQuestionInput').value = btn.getAttribute('data-q');
            handleAskAi();
        });
    });
    el('btnCopyAiAnswer').addEventListener('click', () => {
        const text = el('aiAnswerContent').innerText;
        navigator.clipboard.writeText(text);
        el('btnCopyAiAnswer').innerText = 'Copied!';
        setTimeout(() => el('btnCopyAiAnswer').innerText = 'Copy Brief', 2000);
    });

    // Article Draft Modal
    el('btnOpenArticleModal').addEventListener('click', () => {
        if (!state.currentReport) return;
        el('articleTitleInput').value = `The Ultimate Guide to ${state.currentReport.keyword.toUpperCase()} (2026 Strategy)`;
        el('articleModal').classList.remove('hidden');
    });
    el('btnCloseArticle').addEventListener('click', () => el('articleModal').classList.add('hidden'));
    el('articleModal').addEventListener('click', (e) => {
        if (e.target === el('articleModal')) el('articleModal').classList.add('hidden');
    });
    el('btnGenerateArticle').addEventListener('click', handleGenerateArticle);
    el('btnCopyArticle').addEventListener('click', () => {
        const text = el('articlePreview').innerText;
        navigator.clipboard.writeText(text);
        el('btnCopyArticle').innerText = 'Copied Markdown!';
        setTimeout(() => el('btnCopyArticle').innerText = 'Copy Markdown', 2000);
    });
}

// --- Search Pipeline ---
async function runSearch(keyword, language, region, providers) {
    const btnText = el('btnSearchText');
    const spinner = el('searchSpinner');
    const statusBar = el('statusBar');
    const progressBar = el('progressBar');
    const statusMessage = el('statusMessage');
    const statusTimer = el('statusTimer');

    btnText.innerText = 'Analyzing...';
    spinner.classList.remove('hidden');
    statusBar.classList.remove('hidden');

    const startTime = Date.now();
    const timerInterval = setInterval(() => {
        statusTimer.innerText = ((Date.now() - startTime) / 1000).toFixed(1) + 's';
    }, 100);

    const steps = [
        { progress: 25, msg: 'Dispatching multi-provider crawler (Google, YouTube, Amazon, TikTok, ChatGPT)...' },
        { progress: 50, msg: 'Extracting Questions, Prepositions & Comparisons...' },
        { progress: 75, msg: 'Enriching Search Volume, CPC & Intent classifications...' },
        { progress: 90, msg: 'Synthesizing Visual Search Wheels & Google Trends...' }
    ];

    let stepIdx = 0;
    const progressInterval = setInterval(() => {
        if (stepIdx < steps.length) {
            progressBar.style.width = steps[stepIdx].progress + '%';
            statusMessage.innerText = steps[stepIdx].msg;
            stepIdx++;
        }
    }, 450);

    try {
        const { ok, status, data: json } = await apiFetch('/api/search', {
            method: 'POST',
            body: { keyword, language, region, providers, fallbackToSandbox: true }
        });

        clearInterval(progressInterval);
        clearInterval(timerInterval);

        if (!ok || !json || !json.success) {
            throw new Error((json && json.error) || 'Failed to complete search research');
        }

        progressBar.style.width = '100%';
        statusMessage.innerText = 'Search Complete! Rendering workspace...';

        setTimeout(() => {
            statusBar.classList.add('hidden');
            btnText.innerText = 'Run Intelligence Search';
            spinner.classList.add('hidden');
        }, 500);

        state.currentReport = json.data;
        renderResultsDashboard(json.data);
    } catch (e) {
        clearInterval(progressInterval);
        clearInterval(timerInterval);
        btnText.innerText = 'Run Intelligence Search';
        spinner.classList.add('hidden');
        statusMessage.innerText = 'Error: ' + e.message;
        progressBar.style.background = '#ef4444';
        alert('Search error: ' + e.message);
    }
}

// --- Render Dashboard ---
function renderResultsDashboard(report) {
    el('resultsSection').classList.remove('hidden');

    // Extract all rows flat for table and KPI calculations
    const allRows = [];
    if (report.providers) {
        Object.entries(report.providers).forEach(([providerKey, pData]) => {
            if (!pData.results) return;
            Object.entries(pData.results).forEach(([sourceKey, categories]) => {
                if (typeof categories === 'object' && !Array.isArray(categories)) {
                    Object.entries(categories).forEach(([categoryKey, items]) => {
                        if (Array.isArray(items)) {
                            items.forEach(it => allRows.push({ ...it, provider: providerKey, source: sourceKey, category: categoryKey }));
                        }
                    });
                } else if (Array.isArray(categories)) {
                    categories.forEach(it => allRows.push({ ...it, provider: providerKey, source: sourceKey, category: 'general' }));
                }
            });
        });
    }

    state.tableRows = allRows;

    // Update Debug Raw JSON viewer
    if (el('rawJsonViewer')) {
        el('rawJsonViewer').innerText = JSON.stringify(report, null, 2);
        if (el('rawJsonSourceLabel')) el('rawJsonSourceLabel').innerText = 'Payload: Active Report (' + (report.keyword || 'Search') + ')';
    }
    addDebugLog('SEARCH_SUCCESS', 'Rendered results dashboard for "' + (report.keyword || '') + '" with ' + allRows.length + ' keyword variations');

    // Calculate KPIs
    const totalQueries = allRows.length;
    const totalVol = allRows.reduce((sum, r) => sum + (r.search_volume || 0), 0);
    const validCpc = allRows.filter(r => typeof r.cpc === 'number');
    const avgCpc = validCpc.length ? (validCpc.reduce((sum, r) => sum + r.cpc, 0) / validCpc.length).toFixed(2) : '0.00';
    const highIntentCount = allRows.filter(r => r.search_intent === 'commercial' || r.search_intent === 'transactional').length;
    const highIntentPct = totalQueries ? Math.round((highIntentCount / totalQueries) * 100) : 0;
    const activeProviders = Object.keys(report.providers || {});

    el('kpiTotalQueries').innerText = totalQueries.toLocaleString();
    el('kpiTotalVolume').innerText = totalVol.toLocaleString();
    el('kpiAvgCpc').innerText = '$' + avgCpc;
    el('kpiHighIntent').innerText = highIntentPct + '%';
    el('kpiProvidersCount').innerText = activeProviders.length;
    el('kpiProvidersList').innerText = activeProviders.join(', ');

    // Update cluster counts
    updateClusterCounts(allRows);

    // Render active views
    renderWheel(state.activeWheelSource);
    renderClusterCards(state.activeCluster);
    applyTableFilters();
    renderTrendsAndShopping(report);
}

function updateClusterCounts(rows) {
    el('countClusterQ').innerText = rows.filter(r => r.source === 'questions').length;
    el('countClusterP').innerText = rows.filter(r => r.source === 'prepositions').length;
    el('countClusterC').innerText = rows.filter(r => r.source === 'comparisons').length;
    el('countClusterA').innerText = rows.filter(r => r.source === 'alphabeticals').length;
    el('countClusterR').innerText = rows.filter(r => r.source === 'related').length;
}

function switchTab(tabName) {
    state.activeTab = tabName;
    document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
    const target = el('tab-' + tabName);
    if (target) target.classList.add('active');

    if (tabName === 'wheel') renderWheel(state.activeWheelSource);
}

// --- Dynamic Visual Wheel SVG Generator ---
function renderWheel(sourceName) {
    const container = el('wheelContainer');
    if (!state.currentReport) {
        container.innerHTML = '<p class="text-muted">No active report data.</p>';
        return;
    }

    const kw = state.currentReport.keyword.toUpperCase();
    
    // Aggregate queries for this source
    const categoriesMap = {};
    Object.values(state.currentReport.providers || {}).forEach(pData => {
        const sourceObj = (pData.results || {})[sourceName];
        if (sourceObj) {
            Object.entries(sourceObj).forEach(([cat, list]) => {
                if (!categoriesMap[cat]) categoriesMap[cat] = [];
                if (Array.isArray(list)) {
                    list.forEach(item => {
                        if (!categoriesMap[cat].some(x => x.keyword === item.keyword)) {
                            categoriesMap[cat].push(item);
                        }
                    });
                }
            });
        }
    });

    const categoryKeys = Object.keys(categoriesMap);
    if (categoryKeys.length === 0) {
        container.innerHTML = `<div style="text-align:center; padding:40px; color:var(--text-muted);">No queries found for ${sourceName}.</div>`;
        return;
    }

    // SVG Canvas Configuration
    const size = 960;
    const center = size / 2;
    const centerRadius = 65;
    const innerRingRadius = 180;
    const outerRingRadius = 360;

    let svg = `<svg id="wheelSvg" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg" style="font-family:var(--font-sans); user-select:none;">`;
    svg += `<defs>
      <linearGradient id="centerGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#ff6b00" />
        <stop offset="100%" stop-color="#ff944d" />
      </linearGradient>
      <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
        <feDropShadow dx="0" dy="4" stdDeviation="6" flood-color="#ff6b00" flood-opacity="0.35"/>
      </filter>
    </defs>`;

    // Background guide circles
    svg += `<circle cx="${center}" cy="${center}" r="${innerRingRadius}" fill="none" stroke="rgba(255,255,255,0.06)" stroke-dasharray="4,4"/>`;
    svg += `<circle cx="${center}" cy="${center}" r="${outerRingRadius}" fill="none" stroke="rgba(255,255,255,0.04)" />`;

    // Total leaves calculation
    let totalLeaves = 0;
    categoryKeys.forEach(cat => totalLeaves += Math.max(categoriesMap[cat].length, 1));
    let leafIndex = 0;

    categoryKeys.forEach((cat, catIdx) => {
        const catAngle = (2 * Math.PI / categoryKeys.length) * catIdx;
        const catX = center + innerRingRadius * Math.cos(catAngle);
        const catY = center + innerRingRadius * Math.sin(catAngle);

        // Line from center to category node
        svg += `<line x1="${center}" y1="${center}" x2="${catX}" y2="${catY}" stroke="rgba(255, 107, 0, 0.4)" stroke-width="1.5" />`;

        // Category node circle
        svg += `<circle cx="${catX}" cy="${catY}" r="22" fill="#181d28" stroke="#ff6b00" stroke-width="2"/>`;
        svg += `<text x="${catX}" y="${catY + 4}" font-size="10" font-weight="700" fill="#ff6b00" text-anchor="middle">${cat.toUpperCase()}</text>`;

        // Render leaf query branches
        const leaves = categoriesMap[cat];
        leaves.forEach((item) => {
            const leafAngle = (2 * Math.PI / totalLeaves) * leafIndex;
            const leafX = center + outerRingRadius * Math.cos(leafAngle);
            const leafY = center + outerRingRadius * Math.sin(leafAngle);

            // Connect category to leaf
            svg += `<line x1="${catX}" y1="${catY}" x2="${leafX}" y2="${leafY}" stroke="rgba(255,255,255,0.12)" stroke-width="1" />`;

            // Node dot
            svg += `<circle cx="${leafX}" cy="${leafY}" r="4" fill="#3b82f6" />`;

            // Query text rotation & anchor
            let deg = (leafAngle * 180 / Math.PI);
            let textAnchor = 'start';
            let labelX = leafX + 8;
            let labelY = leafY + 4;

            if (deg > 90 && deg < 270) {
                deg += 180;
                textAnchor = 'end';
                labelX = leafX - 8;
            }

            const truncated = item.keyword.length > 34 ? item.keyword.slice(0, 32) + '...' : item.keyword;
            svg += `<g style="cursor:pointer;" onclick="copyQueryText('${item.keyword.replace(/'/g, "\\'")}')">`;
            svg += `<title>${item.keyword} (Vol: ${item.search_volume || 'N/A'}, CPC: $${item.cpc || '0.00'}) - Click to copy</title>`;
            svg += `<text transform="rotate(${deg} ${leafX} ${leafY})" x="${labelX}" y="${labelY}" font-size="9" fill="#e2e8f0" text-anchor="${textAnchor}">${truncated}</text>`;
            svg += `</g>`;

            leafIndex++;
        });
    });

    // Center Node (Target Keyword)
    svg += `<circle cx="${center}" cy="${center}" r="${centerRadius}" fill="url(#centerGrad)" filter="url(#glow)"/>`;
    svg += `<text x="${center}" y="${center - 6}" font-size="12" font-weight="800" fill="#fff" text-anchor="middle" letter-spacing="0.05em">${kw.slice(0, 18)}</text>`;
    svg += `<text x="${center}" y="${center + 14}" font-size="9" font-weight="700" fill="rgba(255,255,255,0.8)" text-anchor="middle">${sourceName.toUpperCase()}</text>`;

    svg += `</svg>`;
    container.innerHTML = svg;
}

window.copyQueryText = function(text) {
    navigator.clipboard.writeText(text);
    alert(`Copied query to clipboard:\n"${text}"`);
};

function downloadWheelSvg() {
    const svgEl = el('wheelSvg');
    if (!svgEl) return;
    const serializer = new XMLSerializer();
    const source = serializer.serializeToString(svgEl);
    const blob = new Blob([source], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `answerthepublic-${(state.currentReport?.keyword || 'wheel')}-${state.activeWheelSource}.svg`;
    a.click();
    URL.revokeObjectURL(url);
}

// --- Structured Clusters ---
function renderClusterCards(clusterSource) {
    const grid = el('clusterCardsGrid');
    if (!state.currentReport) return;

    // Collect queries for active source
    const groups = {};
    state.tableRows.filter(r => r.source === clusterSource).forEach(row => {
        if (!groups[row.category]) groups[row.category] = [];
        groups[row.category].push(row);
    });

    const entries = Object.entries(groups);
    if (entries.length === 0) {
        grid.innerHTML = `<p class="text-muted">No clusters found for ${clusterSource}.</p>`;
        return;
    }

    grid.innerHTML = entries.map(([category, items]) => {
        const itemsHtml = items.map(it => `
          <li class="cluster-item" onclick="copyQueryText('${it.keyword.replace(/'/g, "\\'")}')" title="Click to copy query">
            <span class="cluster-item-text">${it.keyword}</span>
            <div class="cluster-item-metrics">
              <span>${it.search_volume ? it.search_volume.toLocaleString() + ' /mo' : ''}</span>
              ${it.cpc ? `<span style="color:#34d399;">$${it.cpc}</span>` : ''}
            </div>
          </li>
        `).join('');

        return `
          <div class="cluster-card">
            <div class="cluster-card-header">
              <span class="cluster-title">${category}</span>
              <span class="cluster-badge">${items.length} queries</span>
            </div>
            <ul class="cluster-list">${itemsHtml}</ul>
          </div>
        `;
    }).join('');
}

// --- Data Matrix Table & Filtering ---
function applyTableFilters() {
    const textFilter = el('tableSearchInput').value.toLowerCase().trim();
    const sourceFilter = el('filterSource').value;
    const intentFilter = el('filterIntent').value;
    const providerFilter = el('filterProvider').value;

    state.filteredRows = state.tableRows.filter(row => {
        if (textFilter && !row.keyword.toLowerCase().includes(textFilter)) return false;
        if (sourceFilter !== 'all' && row.source !== sourceFilter) return false;
        if (intentFilter !== 'all' && row.search_intent !== intentFilter) return false;
        if (providerFilter !== 'all' && row.provider !== providerFilter) return false;
        return true;
    });

    sortTable();
}

function sortTable() {
    const col = state.sortColumn;
    const asc = state.sortAsc;

    state.filteredRows.sort((a, b) => {
        let valA = a[col] ?? '';
        let valB = b[col] ?? '';

        if (typeof valA === 'string') valA = valA.toLowerCase();
        if (typeof valB === 'string') valB = valB.toLowerCase();

        if (valA < valB) return asc ? -1 : 1;
        if (valA > valB) return asc ? 1 : -1;
        return 0;
    });

    renderTableRows();
}

function renderTableRows() {
    const tbody = el('tableBody');
    const rows = state.filteredRows;
    el('tableRowCount').innerText = rows.length.toLocaleString();

    if (rows.length === 0) {
        tbody.innerHTML = '<tr><td colspan="9" style="text-align:center; padding:30px; color:var(--text-muted);">No queries match the selected filters.</td></tr>';
        return;
    }

    // Render first 250 rows for top performance
    const slice = rows.slice(0, 250);
    tbody.innerHTML = slice.map(r => {
        const intentBadge = r.search_intent ? `<span class="badge badge-${r.search_intent}">${r.search_intent}</span>` : '-';
        const sentimentClass = r.sentiment === 'positive' ? 'badge-pos' : r.sentiment === 'negative' ? 'badge-neg' : 'badge-neu';

        return `
          <tr>
            <td class="table-kw">${r.keyword}</td>
            <td><span style="text-transform:capitalize;">${r.source}</span></td>
            <td><code>${r.category}</code></td>
            <td>${r.search_volume ? r.search_volume.toLocaleString() : '-'}</td>
            <td>${r.cpc ? '$' + Number(r.cpc).toFixed(2) : '-'}</td>
            <td>${intentBadge}</td>
            <td><span class="${sentimentClass}" style="text-transform:capitalize;">${r.sentiment || 'neutral'}</span></td>
            <td><span style="font-family:var(--font-mono); font-size:0.75rem; text-transform:uppercase;">${r.provider}</span></td>
            <td>
              <button class="btn btn-outline btn-sm" onclick="copyQueryText('${r.keyword.replace(/'/g, "\\'")}')">Copy</button>
            </td>
          </tr>
        `;
    }).join('');
}

// --- Google Trends & Shopping ---
function renderTrendsAndShopping(report) {
    const trendsList = el('trendsList');
    const shoppingList = el('shoppingList');

    let allTrends = [];
    let allShopping = [];

    Object.values(report.providers || {}).forEach(pData => {
        if (pData.trends && pData.trends.trending_keywords) {
            allTrends.push(...pData.trends.trending_keywords);
        }
        if (pData.shopping_products) {
            allShopping.push(...pData.shopping_products);
        }
    });

    // Unique trends
    const uniqueTrends = [];
    allTrends.forEach(t => {
        if (!uniqueTrends.some(x => x.keyword === t.keyword)) uniqueTrends.push(t);
    });

    trendsList.innerHTML = uniqueTrends.map(t => {
        const isBreakout = t.search_increase === 'BREAKOUT';
        const badge = isBreakout ? '<span class="breakout-badge">BREAKOUT</span>' : `<span class="growth-badge">+${t.search_increase}%</span>`;
        return `
          <div class="trend-card">
            <span class="trend-kw">${t.keyword}</span>
            <div style="display:flex; align-items:center; gap:10px;">
              <span style="font-size:0.75rem; color:var(--text-muted);">Interest: ${t.search_interest}/100</span>
              ${badge}
            </div>
          </div>
        `;
    }).join('') || '<p class="text-muted">No trending queries recorded for this timeframe.</p>';

    // Shopping products
    shoppingList.innerHTML = allShopping.slice(0, 8).map(p => `
      <div class="shopping-card">
        <div class="shop-meta">
          <span class="shop-title">${p.title}</span>
          <span class="shop-merchant">Merchant: ${p.merchant} ${p.rating ? '★ ' + p.rating : ''}</span>
        </div>
        <span class="shop-price">${p.price}</span>
      </div>
    `).join('') || '<p class="text-muted">No shopping products detected for this query.</p>';
}

// --- AI Studio Handlers ---
async function handleAskAi() {
    const question = el('aiQuestionInput').value.trim();
    if (!question || !state.currentReport) return;

    const btn = el('btnAskAi');
    const btnText = el('btnAskAiText');
    const spinner = el('aiSpinner');
    const box = el('aiAnswerBox');
    const content = el('aiAnswerContent');

    btnText.innerText = 'Analyzing Data...';
    spinner.classList.remove('hidden');

    try {
        const res = await fetch('/api/ai/ask', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                reportId: state.currentReport.report_id || state.currentReport.parent_search_id,
                question
            })
        });
        const data = await res.json();
        btnText.innerText = 'Generate Strategic Brief';
        spinner.classList.add('hidden');

        box.classList.remove('hidden');
        content.innerHTML = renderSimpleMarkdown(data.answer);
    } catch (e) {
        btnText.innerText = 'Generate Strategic Brief';
        spinner.classList.add('hidden');
        alert('AI Generation Error: ' + e.message);
    }
}

async function handleGenerateArticle() {
    if (!state.currentReport) return;
    const focusQuery = el('articleTitleInput').value.trim();

    const btnText = el('btnGenerateArticleText');
    const spinner = el('articleSpinner');
    const preview = el('articlePreview');
    const copyBtn = el('btnCopyArticle');

    btnText.innerText = 'Drafting Comprehensive Article...';
    spinner.classList.remove('hidden');

    try {
        const res = await fetch('/api/ai/draft-article', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                reportId: state.currentReport.report_id || state.currentReport.parent_search_id,
                focusQuery
            })
        });
        const data = await res.json();

        btnText.innerText = 'Draft Article from High-Intent Questions';
        spinner.classList.add('hidden');

        preview.classList.remove('hidden');
        copyBtn.classList.remove('hidden');
        preview.innerHTML = renderSimpleMarkdown(data.markdown);
    } catch (e) {
        btnText.innerText = 'Draft Article from High-Intent Questions';
        spinner.classList.add('hidden');
        alert('Article Drafting Error: ' + e.message);
    }
}

function renderSimpleMarkdown(text) {
    if (!text) return '';
    return text
        .replace(/^### (.*$)/gim, '<h3>$1</h3>')
        .replace(/^## (.*$)/gim, '<h2>$1</h2>')
        .replace(/^# (.*$)/gim, '<h1>$1</h1>')
        .replace(/^> (.*$)/gim, '<blockquote style="border-left:3px solid var(--accent-orange); padding-left:12px; margin:10px 0; color:var(--text-secondary);">$1</blockquote>')
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.*?)\*/g, '<em>$1</em>')
        .replace(/\n/g, '<br/>');
}

// --- Settings Modal Logic ---
function openSettingsModal() {
    el('tokenInput').value = state.config.token || '';
    if (state.config.mode === 'live') {
        el('modeRadioLive').checked = true;
    } else {
        el('modeRadioSandbox').checked = true;
    }
    el('tokenVerifyStatus').className = 'token-status-box hidden';
    el('settingsModal').classList.remove('hidden');
}

function closeSettingsModal() {
    el('settingsModal').classList.add('hidden');
}

async function testToken() {
    const token = el('tokenInput').value.trim();
    const statusBox = el('tokenVerifyStatus');
    statusBox.className = 'token-status-box';
    statusBox.classList.remove('hidden');
    statusBox.innerText = 'Testing authentication against https://api.answerthepublic.com...';

    try {
        const { ok, data: json } = await apiFetch('/api/me');
        if (json.success && json.live) {
            statusBox.className = 'token-status-box success';
            statusBox.innerText = `✔ Connected successfully! Workspace: ${json.data.workspace.name} (Plan: ${json.data.workspace.atp_tier})`;
        } else if (json.success && !json.live) {
            statusBox.className = 'token-status-box success';
            statusBox.innerText = '✔ Sandbox environment active and responsive (10,000 quota simulation).';
        } else {
            statusBox.className = 'token-status-box error';
            statusBox.innerText = '✖ Connection failed: ' + (json.error || 'Unauthorized');
        }
    } catch (e) {
        statusBox.className = 'token-status-box error';
        statusBox.innerText = '✖ Network error: ' + e.message;
    }
}

async function saveSettings() {
    const token = el('tokenInput').value.trim();
    const mode = document.querySelector('input[name="apiMode"]:checked').value;

    try {
        const debugChecked = el('chkVerboseDebug') ? el('chkVerboseDebug').checked : true;
        const { ok, data } = await apiFetch('/api/config', {
            method: 'POST',
            body: { token, mode, debug: debugChecked }
        });
        state.config = { mode, hasToken: Boolean(token), token };
        updateModePill();
        closeSettingsModal();
        alert('Settings saved successfully!');
    } catch (e) {
        alert('Failed saving settings: ' + e.message);
    }
}
