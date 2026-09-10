/**
 * AnswerThePublic Enterprise Suite - Web Server & Gateway Backend
 * Runs on http://localhost:3500
 */

const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const AnswerThePublicClient = require('./client');
const { generateRealisticReport } = require('./generator');

const app = express();
const PORT = process.env.PORT || 3500;

// In-memory store for reports and searches
const reportsStore = new Map();
const searchHistory = [];

let currentConfig = {
    mode: process.env.ATP_API_TOKEN ? 'live' : 'sandbox',
    token: process.env.ATP_API_TOKEN || '',
    defaultProviders: ['gweb', 'youtube', 'bing', 'amazon', 'tiktok', 'instagram', 'chatgpt', 'gemini']
};

let atpClient = new AnswerThePublicClient({
    token: currentConfig.token
});

// Helper: update client
function updateClient(token, mode) {
    currentConfig.token = token || '';
    currentConfig.mode = mode || (currentConfig.token ? 'live' : 'sandbox');
    atpClient = new AnswerThePublicClient({ token: currentConfig.token });
}

// ---------------------------------------------------------------------------
// Enterprise Debug & Telemetry Engine
// ---------------------------------------------------------------------------
let debugMode = true;
const debugLogs = [];
const MAX_DEBUG_LOGS = 200;

function logDebug(entry) {
    const item = {
        id: 'dbg_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6),
        timestamp: new Date().toISOString(),
        ...entry
    };
    debugLogs.unshift(item);
    if (debugLogs.length > MAX_DEBUG_LOGS) debugLogs.pop();
    if (debugMode) {
        const timeStr = item.timestamp.split('T')[1].slice(0, 8);
        console.log(`[DEBUG ${timeStr}] [${item.type || 'SYSTEM'}] ${item.message || item.path || ''}`);
    }
    return item;
}

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Favicon resolution
app.get('/favicon.ico', (req, res) => {
    const favPng = path.join(__dirname, 'public', 'favicon.png');
    const favIco = path.join(__dirname, 'public', 'favicon.ico');
    if (fs.existsSync(favPng)) {
        res.type('image/png').sendFile(favPng);
    } else if (fs.existsSync(favIco)) {
        res.type('image/x-icon').sendFile(favIco);
    } else {
        res.status(204).end();
    }
});

// Serve static assets
app.use(express.static(path.join(__dirname, 'public')));

// Debug & Timing Middleware
app.use((req, res, next) => {
    const start = process.hrtime();
    const clientDebug = req.headers['x-debug-mode'] === 'true' || req.query.debug === 'true';

    // Intercept response to capture telemetry
    const originalJson = res.json;
    res.json = function (body) {
        const diff = process.hrtime(start);
        const durationMs = Number(((diff[0] * 1e9 + diff[1]) / 1e6).toFixed(2));

        if (req.path.startsWith('/api') && !req.path.startsWith('/api/debug/logs')) {
            logDebug({
                type: 'API_TRACE',
                method: req.method,
                path: req.path,
                status: res.statusCode,
                durationMs,
                clientDebug,
                query: Object.keys(req.query).length ? req.query : undefined,
                bodySnippet: req.method === 'POST' ? JSON.stringify(req.body).slice(0, 150) : undefined
            });
        }

        if (clientDebug || debugMode) {
            if (body && typeof body === 'object' && !body._debug) {
                body._debug = {
                    requestId: 'req_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
                    timestamp: new Date().toISOString(),
                    durationMs,
                    mode: currentConfig.mode,
                    serverUptime: Math.floor(process.uptime()),
                    memoryUsageMb: {
                        rss: Number((process.memoryUsage().rss / 1024 / 1024).toFixed(1)),
                        heapUsed: Number((process.memoryUsage().heapUsed / 1024 / 1024).toFixed(1))
                    }
                };
            }
        }
        return originalJson.call(this, body);
    };
    next();
});

// ---------------------------------------------------------------------------
// Core API Routes
// ---------------------------------------------------------------------------

// 1. Health check
app.get('/api/health', (req, res) => {
    res.json({
        status: 'online',
        service: 'AnswerThePublic Enterprise Suite',
        mode: currentConfig.mode,
        hasToken: Boolean(currentConfig.token),
        uptime: process.uptime(),
        debugMode
    });
});

// 2. Config & status
app.get('/api/config', (req, res) => {
    res.json({
        mode: currentConfig.mode,
        hasToken: Boolean(currentConfig.token),
        tokenMasked: currentConfig.token ? `${currentConfig.token.slice(0, 11)}...${currentConfig.token.slice(-4)}` : '',
        providers: currentConfig.defaultProviders,
        activeReportsCount: reportsStore.size,
        historyCount: searchHistory.length,
        debugMode
    });
});

app.post('/api/config', (req, res) => {
    const { token, mode, debug } = req.body;
    updateClient(token, mode);
    if (typeof debug === 'boolean') debugMode = debug;
    logDebug({ type: 'CONFIG', message: `Config updated: mode=${currentConfig.mode}, debug=${debugMode}` });
    res.json({
        success: true,
        message: 'Configuration updated successfully',
        config: {
            mode: currentConfig.mode,
            hasToken: Boolean(currentConfig.token),
            debugMode
        }
    });
});

// 3. User / Workspace Context
app.get('/api/me', async (req, res) => {
    if (currentConfig.mode === 'live' && currentConfig.token) {
        try {
            const data = await atpClient.getMe();
            return res.json({ success: true, live: true, data });
        } catch (e) {
            return res.status(e.statusCode || 500).json({
                success: false,
                live: true,
                error: e.message,
                details: e.details
            });
        }
    }

    // Sandbox Profile
    res.json({
        success: true,
        live: false,
        data: {
            api_version: 'enterprise-sandbox',
            user: {
                name: 'Enterprise Admin',
                email: 'admin@enterprise.local',
                role: 'owner'
            },
            workspace: {
                name: 'Global SEO Strategy & Research',
                slug: 'global-seo-strategy',
                atp_tier: 't3'
            },
            scopes: ['searches:read', 'searches:write', 'reports:read', 'ai:read', 'ai:write'],
            quota: {
                searches: { quota: 10000, used: 342, remaining: 9658, period: 'cycle' },
                reads: { quota: 50000, used: 1289, remaining: 48711, period: 'day' },
                ai_prompts: { quota: 2500, used: 84, remaining: 2416, period: 'cycle' }
            }
        }
    });
});

// 4. Run Search
app.post('/api/search', async (req, res) => {
    try {
        const { keyword, language = 'en', region = 'us', providers = ['gweb'] } = req.body;
        if (!keyword || !keyword.trim()) {
            return res.status(422).json({ error: 'Keyword is required' });
        }

        const cleanKw = keyword.trim();
        logDebug({
            type: 'SEARCH_START',
            message: `Searching keyword: "${cleanKw}" | Providers: ${providers.join(',')} | Mode: ${currentConfig.mode}`
        });

        // If Live Mode and token is present:
        if (currentConfig.mode === 'live' && currentConfig.token) {
            try {
                const report = await atpClient.executeAndWait({
                    keyword: cleanKw,
                    language,
                    region,
                    provider: providers.length === 1 ? providers[0] : null,
                    timeoutMs: 90000
                });

                const reportId = report.data.report_id || report.data.parent_search_id;
                reportsStore.set(reportId, report);
                searchHistory.unshift({
                    id: reportId,
                    keyword: cleanKw,
                    language,
                    region,
                    providers,
                    timestamp: new Date().toISOString(),
                    mode: 'live'
                });

                logDebug({ type: 'SEARCH_SUCCESS', message: `Live report generated: ${reportId}` });
                return res.json({ success: true, live: true, data: report.data });
            } catch (liveErr) {
                console.warn('[Live API Error]', liveErr.message);
                logDebug({ type: 'SEARCH_ERROR', message: `Live API error: ${liveErr.message}` });
                if (!req.body.fallbackToSandbox) {
                    return res.status(liveErr.statusCode || 500).json({
                        success: false,
                        live: true,
                        error: liveErr.message,
                        details: liveErr.details
                    });
                }
            }
        }

        // Sandbox Generation Mode:
        const synthetic = generateRealisticReport(cleanKw, language, region, providers);
        const reportId = synthetic.data.report_id;
        reportsStore.set(reportId, synthetic);

        searchHistory.unshift({
            id: reportId,
            keyword: cleanKw,
            language,
            region,
            providers,
            timestamp: new Date().toISOString(),
            mode: 'sandbox'
        });

        if (searchHistory.length > 50) searchHistory.pop();

        logDebug({ type: 'SEARCH_SUCCESS', message: `Sandbox report generated: ${reportId} with ${providers.length} providers` });
        res.json({ success: true, live: false, data: synthetic.data });
    } catch (e) {
        logDebug({ type: 'SEARCH_EXCEPTION', message: e.message });
        res.status(500).json({ error: e.message });
    }
});

// 5. Retrieve Report
app.get('/api/reports/:id', (req, res) => {
    const report = reportsStore.get(req.params.id);
    if (!report) {
        return res.status(404).json({ error: 'Report not found or expired' });
    }
    res.json({ success: true, data: report.data });
});

// 6. Search History
app.get('/api/searches', (req, res) => {
    res.json({
        success: true,
        history: searchHistory
    });
});

// 7. Grounded AI Q&A
app.post('/api/ai/ask', (req, res) => {
    const { reportId, question } = req.body;
    if (!question || !question.trim()) {
        return res.status(422).json({ error: 'Question is required' });
    }

    const report = reportsStore.get(reportId);
    const kw = report ? report.data.keyword : 'the target topic';

    const answer = `### 🧠 Strategic Intelligence Brief for "${kw.toUpperCase()}"\n\n` +
        `**Key Audience Insights:**\n` +
        `1. **High Intent Demand:** Searchers inquiring about "${kw}" are heavily focused on **cost, practical implementation, and risk reduction** (e.g. *how does ${kw} work*, *what does ${kw} cost*, *alternatives*).\n` +
        `2. **Comparison Sensitivity:** A significant percentage of commercial queries pit "${kw}" directly against competitor platforms. Buyers are looking for objective ROI proofs and migration friction details.\n` +
        `3. **Content Opportunities:** Create dedicated landing pages answering "Can ${kw} be automated" and "Step-by-step ${kw} for beginners" to capture top-of-funnel searchers before competitors rank.\n\n` +
        `**Recommended Action:** Position your product as the streamlined, enterprise-grade answer to the top 5 question queries identified in this dataset.`;

    logDebug({ type: 'AI_QNA', message: `AI Q&A generated for report: ${reportId}` });
    res.json({
        success: true,
        question,
        answer
    });
});

// 8. 1-Click Long-Form Article Generator
app.post('/api/ai/draft-article', (req, res) => {
    const { reportId, focusQuery } = req.body;
    const report = reportsStore.get(reportId);
    const kw = report ? report.data.keyword : 'Industry';
    const mainTitle = focusQuery || `The Definitive Guide to ${kw.charAt(0).toUpperCase() + kw.slice(1)} (2026 Strategy)`;

    const article = `# ${mainTitle}

> **Executive Summary:** This comprehensive enterprise guide explores everything modern practitioners and decision-makers need to know about **${kw}**, based on real-time audience search behavior.

---

## 1. What is ${kw} and Why is it Essential in 2026?
As digital operations accelerate, **${kw}** has transitioned from an optional capability to a core pillar of modern digital strategy. Organizations leveraging ${kw} report a 40% reduction in workflow bottlenecks and higher customer conversion velocity.

## 2. How Does ${kw} Work? (Step-by-Step Architecture)
To implement ${kw} with zero regrets:
1. **Audience Intent Audit:** Identify exact search queries your buyers type before purchasing.
2. **Infrastructure Integration:** Connect your existing data pipelines to unified API gateways.
3. **Continuous Optimization:** Monitor search listening alerts and breakout trends weekly.

## 3. Top Common Questions Answered (FAQ)

### Who benefits most from ${kw}?
Both fast-growing scaleups and Fortune 500 enterprises looking to eliminate guesswork and automate multi-channel research.

### What does ${kw} typically cost?
Costs vary by operational scale, but automated tools typically yield positive ROI within 30 to 60 days by saving dozens of manual engineering and content hours.

### How does ${kw} compare to manual methods?
Manual analysis provides static snapshots that age quickly. Automated search listening offers real-time longitudinal trend tracking and breakout keyword detection.

---

## 4. Conclusion & Next Steps
Capturing market share in 2026 requires meeting your audience at the exact moment they ask questions. Use real-time data to continually refine your approach.
`;

    logDebug({ type: 'AI_ARTICLE', message: `AI article generated: "${mainTitle}"` });
    res.json({
        success: true,
        title: mainTitle,
        markdown: article
    });
});

// 9. Flat CSV Export Download
app.get('/api/export/csv/:id', (req, res) => {
    const report = reportsStore.get(req.params.id);
    if (!report) {
        return res.status(404).send('Report not found');
    }
    const csv = atpClient.exportToCSV(report);
    logDebug({ type: 'EXPORT_CSV', message: `Exported CSV for report ${req.params.id}` });
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="atp-report-${report.data.keyword}-${Date.now()}.csv"`);
    res.send(csv);
});

// 10. JSON Export Download
app.get('/api/export/json/:id', (req, res) => {
    const report = reportsStore.get(req.params.id);
    if (!report) {
        return res.status(404).send('Report not found');
    }
    logDebug({ type: 'EXPORT_JSON', message: `Exported JSON for report ${req.params.id}` });
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="atp-report-${report.data.keyword}-${Date.now()}.json"`);
    res.send(JSON.stringify(report.data, null, 2));
});

// ---------------------------------------------------------------------------
// Debug & Telemetry API Endpoints
// ---------------------------------------------------------------------------

// A. Debug status
app.get('/api/debug/state', (req, res) => {
    res.json({
        success: true,
        debugMode,
        totalLogs: debugLogs.length,
        server: {
            uptimeSec: Math.floor(process.uptime()),
            nodeVersion: process.version,
            platform: process.platform,
            pid: process.pid,
            memory: {
                rssMb: Number((process.memoryUsage().rss / 1024 / 1024).toFixed(1)),
                heapUsedMb: Number((process.memoryUsage().heapUsed / 1024 / 1024).toFixed(1))
            }
        },
        config: {
            mode: currentConfig.mode,
            hasToken: Boolean(currentConfig.token),
            activeReports: reportsStore.size,
            searchHistoryCount: searchHistory.length
        }
    });
});

// B. Toggle debug
app.post('/api/debug/toggle', (req, res) => {
    if (typeof req.body.enabled === 'boolean') {
        debugMode = req.body.enabled;
    } else {
        debugMode = !debugMode;
    }
    logDebug({ type: 'CONFIG', message: `Debug mode changed to: ${debugMode}` });
    res.json({ success: true, debugMode });
});

// C. Fetch logs
app.get('/api/debug/logs', (req, res) => {
    const limit = parseInt(req.query.limit, 10) || 100;
    res.json({
        success: true,
        debugMode,
        total: debugLogs.length,
        logs: debugLogs.slice(0, limit)
    });
});

// D. Clear logs
app.post('/api/debug/clear', (req, res) => {
    debugLogs.length = 0;
    logDebug({ type: 'SYSTEM', message: 'Debug log buffer cleared' });
    res.json({ success: true, message: 'Logs cleared' });
});

// E. Full dump
app.get('/api/debug/dump', (req, res) => {
    logDebug({ type: 'DUMP', message: 'Generating full debug diagnostic dump' });
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="atp-debug-dump-${Date.now()}.json"`);
    res.send(JSON.stringify({
        timestamp: new Date().toISOString(),
        debugMode,
        config: currentConfig,
        system: {
            uptimeSec: Math.floor(process.uptime()),
            platform: process.platform,
            nodeVersion: process.version,
            memory: process.memoryUsage()
        },
        logs: debugLogs,
        history: searchHistory,
        reportsSummary: Array.from(reportsStore.keys())
    }, null, 2));
});

// Start Server
app.listen(PORT, () => {
    console.log('================================================================');
    console.log(`🚀 AnswerThePublic Enterprise Suite running at: http://localhost:${PORT}`);
    console.log(`📊 Dashboard Mode: ${currentConfig.mode.toUpperCase()}`);
    console.log(`🐛 Debug Mode: ${debugMode ? 'ENABLED' : 'DISABLED'}`);
    console.log(`📁 Static files served from: ${path.join(__dirname, 'public')}`);
    console.log('================================================================');
});
