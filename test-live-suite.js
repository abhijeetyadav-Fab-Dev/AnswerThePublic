const fs = require('fs');
const axios = require('axios');

async function runLiveSuite() {
    console.log('====================================================');
    console.log('  ATP Enterprise Suite - Live Verification Protocol ');
    console.log('====================================================\n');

    const api = axios.create({
        baseURL: 'http://localhost:3500',
        timeout: 10000
    });

    // Test 1: Health Check
    console.log('✔ Test 1: GET /api/health');
    const health = await api.get('/api/health');
    if (health.data.status !== 'online') throw new Error('Health check failed');
    console.log('  - Status: online, Mode: ' + health.data.mode);

    // Test 2: Configuration
    console.log('\n✔ Test 2: GET /api/config');
    const config = await api.get('/api/config');
    if (!config.data.providers || config.data.providers.length !== 8) throw new Error('Provider list incomplete');
    console.log('  - Providers registered: ' + config.data.providers.join(', '));

    // Test 3: Workspace Context
    console.log('\n✔ Test 3: GET /api/me');
    const me = await api.get('/api/me');
    if (!me.data.data.workspace) throw new Error('Workspace profile missing');
    console.log('  - Workspace: ' + me.data.data.workspace.name + ' (Tier: ' + me.data.data.workspace.atp_tier + ')');

    // Test 4: Run Intelligence Search
    console.log('\n✔ Test 4: POST /api/search');
    const searchRes = await api.post('/api/search', {
        keyword: 'growth hacking',
        language: 'en',
        region: 'us',
        providers: ['gweb', 'youtube', 'chatgpt']
    });
    if (!searchRes.data.success || !searchRes.data.data.report_id) throw new Error('Search failed');
    const reportId = searchRes.data.data.report_id;
    console.log('  - Report generated successfully: ' + reportId);
    const provKeys = Object.keys(searchRes.data.data.providers);
    console.log('  - Active providers returned: ' + provKeys.join(', '));

    // Test 5: Retrieve Report
    console.log('\n✔ Test 5: GET /api/reports/' + reportId);
    const report = await api.get('/api/reports/' + reportId);
    if (!report.data.data.providers.gweb.results.questions.how) throw new Error('Question branches missing');
    const howQuestions = report.data.data.providers.gweb.results.questions.how;
    console.log('  - Extracted "how" questions sample: "' + howQuestions[0].keyword + '" (Vol: ' + howQuestions[0].search_volume + ', CPC: $' + howQuestions[0].cpc + ')');

    // Test 6: AI Grounded Q&A
    console.log('\n✔ Test 6: POST /api/ai/ask');
    const aiRes = await api.post('/api/ai/ask', {
        reportId,
        question: 'What are the top 3 commercial intent queries?'
    });
    if (!aiRes.data.answer) throw new Error('AI answer missing');
    console.log('  - AI Brief generated successfully (' + aiRes.data.answer.length + ' chars)');

    // Test 7: 1-Click SEO Article Generator
    console.log('\n✔ Test 7: POST /api/ai/draft-article');
    const articleRes = await api.post('/api/ai/draft-article', {
        reportId,
        focusQuery: 'The Definitive Growth Hacking Playbook'
    });
    if (!articleRes.data.markdown) throw new Error('Article markdown missing');
    console.log('  - Article generated: "' + articleRes.data.title + '" (' + articleRes.data.markdown.length + ' chars)');

    // Test 8: CSV Export Stream
    console.log('\n✔ Test 8: GET /api/export/csv/' + reportId);
    const csvRes = await api.get('/api/export/csv/' + reportId);
    if (!csvRes.data.includes('Keyword,Source,Category')) throw new Error('CSV invalid header');
    const lineCount = csvRes.data.split('\n').length;
    console.log('  - CSV export verified: ' + lineCount + ' rows generated');

    // Test 9: UI Static Assets
    console.log('\n✔ Test 9: Static UI files check');
    const htmlRes = await api.get('/');
    if (!htmlRes.data.includes('AnswerThePublic')) throw new Error('Index HTML missing');
    const cssRes = await api.get('/style.css');
    if (!cssRes.data.includes('--accent-orange')) throw new Error('CSS missing');
    const jsRes = await api.get('/app.js');
    if (!jsRes.data.includes('renderWheel')) throw new Error('JS missing');
    console.log('  - UI HTML, CSS, and JS verified successfully.');

    console.log('\n====================================================');
    console.log('  ALL 9 PRE-PRODUCTION VERIFICATION TESTS PASSED!   ');
    console.log('====================================================\n');
}

runLiveSuite().catch(e => {
    console.error('Verification Failed:', e.message);
    process.exit(1);
});
