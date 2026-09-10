const axios = require('axios');
const fs = require('fs');

async function verifyFullEndToEnd() {
    console.log('================================================================');
    console.log('  ANSWERTHEPUBLIC ENTERPRISE SUITE - MASTER E2E VERIFICATION   ');
    console.log('================================================================\n');

    const api = axios.create({
        baseURL: 'http://localhost:3500',
        timeout: 15000,
        headers: {
            'X-Debug-Mode': 'true'
        }
    });

    let passed = 0;
    let total = 0;

    async function step(name, fn) {
        total++;
        try {
            process.stdout.write(`Step ${total}: ${name} ... `);
            const res = await fn();
            passed++;
            console.log('PASSED ' + (res ? `(${res})` : ''));
        } catch (e) {
            console.log('FAILED: ' + e.message);
            throw e;
        }
    }

    // 1. Health Check
    await step('GET /api/health', async () => {
        const res = await api.get('/api/health');
        if (res.data.status !== 'online') throw new Error('Status not online');
        if (typeof res.data.debugMode !== 'boolean') throw new Error('Debug mode flag missing');
        return `status: ${res.data.status}, mode: ${res.data.mode}, debug: ${res.data.debugMode}`;
    });

    // 2. Favicon & PNG Asset
    await step('GET /favicon.ico and /favicon.png', async () => {
        const ico = await api.get('/favicon.ico', { responseType: 'arraybuffer' });
        if (ico.status !== 200) throw new Error('favicon.ico returned ' + ico.status);
        const png = await api.get('/favicon.png', { responseType: 'arraybuffer' });
        if (png.status !== 200 || png.data.length < 100) throw new Error('favicon.png invalid');
        return `favicon size: ${png.data.length} bytes, content-type: ${png.headers['content-type']}`;
    });

    // 3. API Config & Providers
    await step('GET /api/config', async () => {
        const res = await api.get('/api/config');
        if (!res.data.providers || res.data.providers.length !== 8) throw new Error('Missing providers');
        return `${res.data.providers.length} providers registered: ${res.data.providers.join(', ')}`;
    });

    // 4. Debug State Inspection
    await step('GET /api/debug/state', async () => {
        const res = await api.get('/api/debug/state');
        if (!res.data.success || !res.data.server) throw new Error('Invalid debug state response');
        return `node: ${res.data.server.nodeVersion}, pid: ${res.data.server.pid}, mem: ${res.data.server.memory.rssMb}MB`;
    });

    // 5. Multi-Provider Intelligence Search
    let reportId = null;
    await step('POST /api/search with 8 providers', async () => {
        const res = await api.post('/api/search', {
            keyword: 'automated seo testing',
            language: 'en',
            region: 'us',
            providers: ['gweb', 'youtube', 'bing', 'amazon', 'tiktok', 'instagram', 'chatgpt', 'gemini']
        });
        if (!res.data.success || !res.data.data.report_id) throw new Error('Search failed to return report');
        reportId = res.data.data.report_id;
        const provs = Object.keys(res.data.data.providers);
        return `reportId: ${reportId}, providers returned: ${provs.length}, debug requestId: ${res.data._debug.requestId}`;
    });

    // 6. Report Retrieval & Question Hierarchy
    await step('GET /api/reports/:id', async () => {
        const res = await api.get(`/api/reports/${reportId}`);
        const gweb = res.data.data.providers.gweb.results;
        if (!gweb.questions.how || gweb.questions.how.length === 0) throw new Error('Questions missing in report');
        return `verified 'how' branch: "${gweb.questions.how[0].keyword}" (Vol: ${gweb.questions.how[0].search_volume}, CPC: $${gweb.questions.how[0].cpc})`;
    });

    // 7. Telemetry & Log Inspection
    await step('GET /api/debug/logs', async () => {
        const res = await api.get('/api/debug/logs');
        if (!res.data.success || !Array.isArray(res.data.logs)) throw new Error('Logs array missing');
        if (res.data.logs.length === 0) throw new Error('Expected logs to be recorded');
        return `${res.data.logs.length} telemetry logs captured in buffer`;
    });

    // 8. Grounded AI Strategy Q&A
    await step('POST /api/ai/ask', async () => {
        const res = await api.post('/api/ai/ask', {
            reportId,
            question: 'What are the top 3 commercial intent search opportunities?'
        });
        if (!res.data.success || !res.data.answer) throw new Error('AI answer missing');
        return `generated brief length: ${res.data.answer.length} chars`;
    });

    // 9. 1-Click AI SEO Article Generator
    await step('POST /api/ai/draft-article', async () => {
        const res = await api.post('/api/ai/draft-article', {
            reportId,
            focusQuery: 'The Complete Enterprise Automated SEO Testing Guide'
        });
        if (!res.data.success || !res.data.markdown) throw new Error('Article markdown missing');
        return `generated article: "${res.data.title}" (${res.data.markdown.length} chars)`;
    });

    // 10. Flat CSV Export
    await step('GET /api/export/csv/:id', async () => {
        const res = await api.get(`/api/export/csv/${reportId}`);
        if (typeof res.data !== 'string' || !res.data.startsWith('Keyword,Source,Category')) {
            throw new Error('CSV output header invalid');
        }
        const lines = res.data.trim().split('\n');
        return `CSV validated: ${lines.length} lines`;
    });

    // 11. JSON Export
    await step('GET /api/export/json/:id', async () => {
        const res = await api.get(`/api/export/json/${reportId}`);
        if (!res.data.report_id || !res.data.providers) throw new Error('JSON export payload invalid');
        return `JSON validated with report_id: ${res.data.report_id}`;
    });

    // 12. Diagnostic Dump Export
    await step('GET /api/debug/dump', async () => {
        const res = await api.get('/api/debug/dump');
        if (!res.data.timestamp || !res.data.system || !Array.isArray(res.data.logs)) {
            throw new Error('Diagnostic dump missing expected structure');
        }
        return `diagnostic dump verified: ${res.data.logs.length} logs included`;
    });

    // 13. UI Markup & Debug Console Assets
    await step('Verify Frontend UI & Debug Elements in HTML/CSS/JS', async () => {
        const html = fs.readFileSync('C:\\Users\\ydtva\\atp-enterprise-api\\public\\index.html', 'utf8');
        if (!html.includes('favicon.png')) throw new Error('favicon missing in index.html');
        if (!html.includes('id="debugDock"')) throw new Error('debugDock missing in index.html');
        if (!html.includes('id="btnToggleDebug"')) throw new Error('btnToggleDebug missing in index.html');

        const css = fs.readFileSync('C:\\Users\\ydtva\\atp-enterprise-api\\public\\style.css', 'utf8');
        if (!css.includes('.debug-dock')) throw new Error('.debug-dock missing in style.css');

        const js = fs.readFileSync('C:\\Users\\ydtva\\atp-enterprise-api\\public\\app.js', 'utf8');
        if (!js.includes('apiFetch')) throw new Error('apiFetch client missing in app.js');
        if (!js.includes('recordDebugTrace')) throw new Error('recordDebugTrace missing in app.js');
        return 'HTML, CSS, and JS static assets fully contain debug and favicon components';
    });

    console.log('\n================================================================');
    console.log(`  ALL ${passed}/${total} END-TO-END VERIFICATION CHECKS PASSED! `);
    console.log('================================================================\n');
}

verifyFullEndToEnd().catch(err => {
    console.error('\nVerification Suite Failed:', err.message);
    process.exit(1);
});
