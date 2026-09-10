/**
 * Realistic ATP Data Generator for Enterprise Sandbox Mode
 * Generates exact 1:1 schema-compliant data matching AnswerThePublic OpenAPI models.
 */

const { v4: uuidv4 } = { v4: () => 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0;
    return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
})};

function generateRealisticReport(keyword, language = 'en', region = 'us', providers = ['gweb']) {
    const cleanKw = keyword.trim().toLowerCase();
    const parentId = uuidv4();
    const reportId = uuidv4();
    const now = new Date().toISOString();

    const allProviders = providers && providers.length > 0 ? providers : ['gweb', 'youtube', 'bing', 'amazon', 'tiktok', 'instagram', 'chatgpt', 'gemini'];

    const questionWords = ['who', 'what', 'where', 'when', 'why', 'how', 'which', 'are', 'can', 'will'];
    const prepositions = ['for', 'can', 'with', 'without', 'near', 'to', 'like'];
    const comparisons = ['vs', 'versus', 'or', 'and', 'compared to'];
    const alphabets = 'abcdefghijklmnopqrstuvwxyz'.split('');

    const questionTemplates = {
        who: ['who makes the best {kw}', 'who needs {kw}', 'who benefits from {kw}', 'who uses {kw} in business', 'who should buy {kw}'],
        what: ['what is {kw}', 'what does {kw} cost', 'what is the best {kw}', 'what are {kw} alternatives', 'what to look for in {kw}', 'what makes {kw} good'],
        where: ['where to buy {kw}', 'where to learn {kw}', 'where is {kw} used', 'where to find cheap {kw}', 'where does {kw} come from'],
        when: ['when to use {kw}', 'when was {kw} invented', 'when is {kw} necessary', 'when to upgrade {kw}', 'when to hire a {kw}'],
        why: ['why is {kw} important', 'why use {kw}', 'why is {kw} so expensive', 'why does {kw} fail', 'why choose {kw}'],
        how: ['how to use {kw}', 'how does {kw} work', 'how to choose {kw}', 'how to optimize {kw}', 'how to implement {kw} step by step'],
        which: ['which {kw} is best', 'which {kw} should i choose', 'which companies use {kw}', 'which {kw} has best roi'],
        are: ['are {kw} worth it', 'are {kw} safe', 'are {kw} free', 'are {kw} hard to learn'],
        can: ['can {kw} replace humans', 'can {kw} save money', 'can {kw} be automated', 'can i do {kw} myself'],
        will: ['will {kw} increase revenue', 'will {kw} work on mobile', 'will {kw} continue to grow in 2026']
    };

    const prepTemplates = {
        for: ['{kw} for beginners', '{kw} for enterprise', '{kw} for small business', '{kw} for ecommerce', '{kw} for teams'],
        with: ['{kw} with ai', '{kw} with api access', '{kw} with automated reporting', '{kw} with real time sync'],
        without: ['{kw} without coding', '{kw} without subscription', '{kw} without credit card', '{kw} without ads'],
        near: ['{kw} near me', '{kw} agencies near me', '{kw} consultants near me'],
        to: ['{kw} to increase sales', '{kw} to grow website traffic', '{kw} to improve workflow'],
        like: ['tools like {kw}', 'platforms like {kw}', 'software like {kw}']
    };

    const compTemplates = {
        vs: ['{kw} vs competitors', '{kw} vs manual process', '{kw} vs pro tools', '{kw} vs enterprise solutions'],
        versus: ['{kw} versus free tools', '{kw} versus traditional methods'],
        or: ['{kw} or custom build', '{kw} or agency', '{kw} or in house'],
        and: ['{kw} and marketing strategy', '{kw} and conversion tracking', '{kw} and lead generation']
    };

    const providerData = {};

    allProviders.forEach((prov) => {
        const questions = {};
        questionWords.forEach(q => {
            const list = (questionTemplates[q] || []).map(t => {
                const queryText = t.replace('{kw}', cleanKw);
                const vol = Math.floor(Math.random() * 8500) + 120;
                const cpc = Number((Math.random() * 4.5 + 0.35).toFixed(2));
                const intents = ['informational', 'commercial', 'transactional', 'navigational'];
                const sentiments = ['positive', 'neutral', 'neutral', 'neutral', 'negative'];
                return {
                    keyword: queryText,
                    source: 'questions',
                    category: q,
                    provider: prov,
                    search_volume: vol,
                    cpc: cpc,
                    search_intent: (q === 'where' || q === 'what' && Math.random() > 0.5) ? 'commercial' : 'informational',
                    sentiment: sentiments[Math.floor(Math.random() * sentiments.length)]
                };
            });
            questions[q] = list;
        });

        const preps = {};
        prepositions.forEach(p => {
            const list = (prepTemplates[p] || []).map(t => {
                const queryText = t.replace('{kw}', cleanKw);
                const vol = Math.floor(Math.random() * 5200) + 80;
                const cpc = Number((Math.random() * 5.2 + 0.45).toFixed(2));
                return {
                    keyword: queryText,
                    source: 'prepositions',
                    category: p,
                    provider: prov,
                    search_volume: vol,
                    cpc: cpc,
                    search_intent: p === 'for' ? 'commercial' : 'informational',
                    sentiment: 'neutral'
                };
            });
            preps[p] = list;
        });

        const comps = {};
        comparisons.forEach(c => {
            const list = (compTemplates[c] || []).map(t => {
                const queryText = t.replace('{kw}', cleanKw);
                const vol = Math.floor(Math.random() * 4100) + 90;
                const cpc = Number((Math.random() * 6.5 + 0.85).toFixed(2));
                return {
                    keyword: queryText,
                    source: 'comparisons',
                    category: c,
                    provider: prov,
                    search_volume: vol,
                    cpc: cpc,
                    search_intent: 'commercial',
                    sentiment: 'neutral'
                };
            });
            comps[c] = list;
        });

        const alphaMap = {};
        alphabets.slice(0, 12).forEach(letter => {
            alphaMap[letter] = [
                {
                    keyword: `${cleanKw} ${letter}dvanced guide`,
                    source: 'alphabeticals',
                    category: letter,
                    provider: prov,
                    search_volume: Math.floor(Math.random() * 1800) + 40,
                    cpc: Number((Math.random() * 2.5 + 0.2).toFixed(2)),
                    search_intent: 'informational',
                    sentiment: 'neutral'
                },
                {
                    keyword: `${cleanKw} ${letter}utomation system`,
                    source: 'alphabeticals',
                    category: letter,
                    provider: prov,
                    search_volume: Math.floor(Math.random() * 2400) + 50,
                    cpc: Number((Math.random() * 3.8 + 0.5).toFixed(2)),
                    search_intent: 'commercial',
                    sentiment: 'positive'
                }
            ];
        });

        const related = [
            { keyword: `${cleanKw} reviews 2026`, source: 'related', category: 'related', provider: prov, search_volume: 3800, cpc: 2.10, search_intent: 'commercial', sentiment: 'neutral' },
            { keyword: `${cleanKw} pricing plans`, source: 'related', category: 'related', provider: prov, search_volume: 4200, cpc: 4.80, search_intent: 'transactional', sentiment: 'neutral' },
            { keyword: `best ${cleanKw} tools`, source: 'related', category: 'related', provider: prov, search_volume: 6100, cpc: 3.90, search_intent: 'commercial', sentiment: 'positive' },
            { keyword: `${cleanKw} free trial`, source: 'related', category: 'related', provider: prov, search_volume: 2900, cpc: 1.75, search_intent: 'transactional', sentiment: 'positive' }
        ];

        let totalResults = 0;
        Object.values(questions).forEach(arr => totalResults += arr.length);
        Object.values(preps).forEach(arr => totalResults += arr.length);
        Object.values(comps).forEach(arr => totalResults += arr.length);
        Object.values(alphaMap).forEach(arr => totalResults += arr.length);
        totalResults += related.length;

        providerData[prov] = {
            status: 'completed',
            total_results: totalResults,
            results: {
                questions,
                prepositions: preps,
                comparisons: comps,
                alphabeticals: alphaMap,
                related
            },
            trends: {
                trending_keywords: [
                    { keyword: `${cleanKw} ai automation`, search_increase: 'BREAKOUT', search_interest: 100 },
                    { keyword: `best ${cleanKw} for enterprise`, search_increase: 380, search_interest: 84 },
                    { keyword: `${cleanKw} api integration`, search_increase: 220, search_interest: 72 },
                    { keyword: `how to scale with ${cleanKw}`, search_increase: 140, search_interest: 58 }
                ]
            },
            shopping_products: [
                { title: `Enterprise ${keyword.toUpperCase()} Suite License`, merchant: 'CloudMart Direct', price: '$99.00', rating: 4.8, product_url: 'https://example.com/p1' },
                { title: `Pro ${keyword} Onboarding Blueprint`, merchant: 'TechHub Online', price: '$49.00', rating: 4.6, product_url: 'https://example.com/p2' },
                { title: `Ultimate Handbook on ${keyword}`, merchant: 'BookShop Press', price: '$19.99', rating: 4.9, product_url: 'https://example.com/p3' }
            ]
        };
    });

    const searches = allProviders.map(p => ({
        id: uuidv4(),
        provider: p,
        status: 'completed',
        created_at: now,
        updated_at: now
    }));

    return {
        message: 'Report retrieved successfully',
        data: {
            report_id: reportId,
            parent_search_id: parentId,
            keyword: cleanKw,
            language,
            region,
            created_at: now,
            status: 'completed',
            searches,
            providers: providerData
        }
    };
}

module.exports = { generateRealisticReport };
