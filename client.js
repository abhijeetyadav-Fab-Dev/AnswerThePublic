/**
 * AnswerThePublic Enterprise API Client
 * Enterprise-grade client with automated backoff, rate-limit governance,
 * polling pipelines, and schema enrichment.
 */

const axios = require('axios');

class AnswerThePublicClient {
    /**
     * @param {Object} options
     * @param {string} [options.token] - Personal Access Token (atp_pk_live_*)
     * @param {string} [options.baseURL='https://api.answerthepublic.com'] - API Gateway Base URL
     * @param {number} [options.timeout=30000] - Request timeout in milliseconds
     * @param {number} [options.maxRetries=3] - Maximum retry attempts on transient failures/429
     * @param {number} [options.defaultPollInterval=2500] - Interval between polling attempts
     */
    constructor(options = {}) {
        this.token = options.token || process.env.ATP_API_TOKEN;
        this.baseURL = options.baseURL || 'https://api.answerthepublic.com';
        this.timeout = options.timeout || 30000;
        this.maxRetries = options.maxRetries !== undefined ? options.maxRetries : 3;
        this.defaultPollInterval = options.defaultPollInterval || 2500;

        this.http = axios.create({
            baseURL: this.baseURL,
            timeout: this.timeout,
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'User-Agent': 'ATP-Enterprise-Client/1.0.0 (Node.js)'
            }
        });

        // Attach bearer token if present
        this.http.interceptors.request.use((config) => {
            if (this.token) {
                config.headers['Authorization'] = `Bearer ${this.token}`;
            }
            return config;
        });

        // Attach retry / backoff interceptor
        this.http.interceptors.response.use(
            (response) => response,
            async (error) => {
                const config = error.config;
                if (!config || !config._retryCount) {
                    config._retryCount = 0;
                }

                const status = error.response ? error.response.status : null;

                // Handle 429 Rate Limiting with Retry-After
                if (status === 429 && config._retryCount < this.maxRetries) {
                    config._retryCount++;
                    const retryAfterHeader = error.response.headers['retry-after'];
                    const delaySeconds = retryAfterHeader ? parseInt(retryAfterHeader, 10) : Math.pow(2, config._retryCount);
                    console.warn(`[ATP RateLimit] 429 detected. Backing off for ${delaySeconds}s (attempt ${config._retryCount}/${this.maxRetries})...`);
                    await new Promise((r) => setTimeout(r, delaySeconds * 1000));
                    return this.http(config);
                }

                // Handle 5xx Transient Server Errors
                if (status >= 500 && status < 600 && config._retryCount < this.maxRetries) {
                    config._retryCount++;
                    const delayMs = Math.pow(2, config._retryCount) * 1000;
                    console.warn(`[ATP ServerError] ${status} received. Retrying in ${delayMs}ms...`);
                    await new Promise((r) => setTimeout(r, delayMs));
                    return this.http(config);
                }

                return Promise.reject(this._formatError(error));
            }
        );
    }

    /**
     * Standardize error responses into unified enterprise structure
     * @private
     */
    _formatError(error) {
        if (error.response && error.response.data) {
            const data = error.response.data;
            const errObj = data.error || data;
            const customError = new Error(errObj.message || error.message);
            customError.statusCode = error.response.status;
            customError.errorCode = errObj.error_code || null;
            customError.details = errObj.details || null;
            customError.raw = data;
            return customError;
        }
        return error;
    }

    /**
     * 1. Inspect active token, workspace, and rate quota limits
     * @returns {Promise<Object>} Workspace metadata and quota status
     */
    async getMe() {
        const res = await this.http.get('/api/public/v1/me');
        return res.data;
    }

    /**
     * 2. Submit keyword query to initiate research across providers
     * @param {Object} params
     * @param {string} params.keyword - Query string to analyze
     * @param {string} [params.language='en'] - ISO 639-1 code (e.g. 'en', 'es', 'de')
     * @param {string} [params.region='us'] - ISO 3166-1 alpha-2 code (e.g. 'us', 'gb', 'in')
     * @param {string} [params.provider] - 'gweb' | 'youtube' | 'bing' | 'amazon' | 'tiktok' | 'instagram' | 'chatgpt' | 'gemini' (null fans out to all)
     * @returns {Promise<Object>} Parent search metadata and status
     */
    async createSearch({ keyword, language = 'en', region = 'us', provider = null }) {
        const payload = {
            search: {
                keyword: keyword.trim(),
                language,
                region,
                provider
            }
        };
        const res = await this.http.post('/api/public/v1/searches', payload);
        return res.data;
    }

    /**
     * 3. Poll individual or parent search snapshot status
     * @param {string} searchId - Search UUID
     * @returns {Promise<Object>}
     */
    async getSearch(searchId) {
        const res = await this.http.get(`/api/public/v1/searches/${searchId}`);
        return res.data;
    }

    /**
     * 4. List workspace parent searches with pagination and filters
     * @param {Object} [params={}]
     * @param {number} [params.page=1]
     * @param {number} [params.per_page=20]
     * @param {string} [params.sort_by] - 'asc' | 'desc'
     * @param {string} [params.provider]
     * @param {string} [params.region]
     * @param {string} [params.language]
     * @param {string} [params.q] - Keyword search
     * @returns {Promise<Object>}
     */
    async listSearches(params = {}) {
        const res = await this.http.get('/api/public/v1/searches', { params });
        return res.data;
    }

    /**
     * 5. Retrieve full structured keyword report
     * @param {string} reportId - Parent or child search UUID
     * @param {Object} [options={}]
     * @param {string} [options.providers] - Comma-delimited providers (e.g. 'gweb,youtube')
     * @param {boolean} [options.grouped=true] - Group into questions/prepositions/comparisons
     * @param {string} [options.source_name] - 'questions' | 'prepositions' | 'comparisons' | 'alphabeticals' | 'related'
     * @param {string} [options.category] - Question trigger (e.g. 'who', 'what', 'how')
     * @param {number} [options.page=1]
     * @param {number} [options.per_page=100]
     * @param {string} [options.sort_by='volume']
     * @param {string} [options.sort_order='desc']
     * @returns {Promise<Object>}
     */
    async getReport(reportId, options = {}) {
        const res = await this.http.get(`/api/public/v1/reports/${reportId}`, { params: options });
        return res.data;
    }

    /**
     * 6. High-level workflow: Execute search, poll until completed, and retrieve final report
     * @param {Object} params
     * @param {string} params.keyword
     * @param {string} [params.language='en']
     * @param {string} [params.region='us']
     * @param {string} [params.provider]
     * @param {number} [params.timeoutMs=120000] - Max polling wait time
     * @param {Function} [params.onProgress] - Optional status callback
     * @returns {Promise<Object>} Completed report object
     */
    async executeAndWait({ keyword, language = 'en', region = 'us', provider = null, timeoutMs = 120000, onProgress }) {
        const initial = await this.createSearch({ keyword, language, region, provider });
        const parentSearchId = initial.data ? initial.data.parent_search_id : initial.parent_search_id;

        const startTime = Date.now();
        let isDone = false;

        while (!isDone) {
            if (Date.now() - startTime > timeoutMs) {
                throw new Error(`Search execution timed out after ${timeoutMs}ms for keyword: ${keyword}`);
            }

            const current = await this.getSearch(parentSearchId);
            const status = current.data ? current.data.status : current.status;

            if (onProgress) {
                onProgress({ status, searchId: parentSearchId, elapsedMs: Date.now() - startTime });
            }

            if (status === 'completed') {
                isDone = true;
                break;
            } else if (status === 'failed') {
                throw new Error(`Search failed processing for keyword: ${keyword}`);
            }

            await new Promise((r) => setTimeout(r, this.defaultPollInterval));
        }

        // Fetch final populated report
        return this.getReport(parentSearchId, { grouped: true });
    }

    /**
     * 7. Fetch or generate AI Prompts for ChatGPT / Gemini reports
     * @param {string} reportId
     * @returns {Promise<Object>}
     */
    async getAIPrompts(reportId) {
        const res = await this.http.post(`/api/public/v1/reports/${reportId}/ai/prompts`);
        return res.data;
    }

    /**
     * 8. Request AI Answer generation
     * @param {string} reportId
     * @param {Object} target - Either { ai_prompt_id } or { question }
     * @returns {Promise<Object>} { task_id }
     */
    async requestAIAnswer(reportId, target) {
        const res = await this.http.post(`/api/public/v1/reports/${reportId}/ai/answer_request`, target);
        return res.data;
    }

    /**
     * 9. Poll AI Answer task until complete
     * @param {string} reportId
     * @param {string} taskId
     * @param {number} [timeoutMs=60000]
     * @returns {Promise<Object>}
     */
    async pollAIAnswer(reportId, taskId, timeoutMs = 60000) {
        const startTime = Date.now();
        while (Date.now() - startTime < timeoutMs) {
            const res = await this.http.post(`/api/public/v1/reports/${reportId}/ai/answer`, { task_id: taskId });
            const data = res.data;
            if (data.status === 'completed') {
                return data;
            } else if (data.status === 'failed') {
                throw new Error(`AI generation task ${taskId} failed`);
            }
            await new Promise((r) => setTimeout(r, 2000));
        }
        throw new Error(`AI generation polling timed out after ${timeoutMs}ms`);
    }

    /**
     * 10. End-to-end AI prompt helper
     * @param {string} reportId
     * @param {string} questionOrPromptId
     * @returns {Promise<string>} Answer text
     */
    async askAI(reportId, questionOrPromptId) {
        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(questionOrPromptId);
        const req = isUuid ? { ai_prompt_id: questionOrPromptId } : { question: questionOrPromptId };
        const { task_id } = await this.requestAIAnswer(reportId, req);
        const result = await this.pollAIAnswer(reportId, task_id);
        return result.ai_answer || result.answer;
    }

    /**
     * 11. Helper: Convert JSON Report into Flat CSV
     * @param {Object} reportData
     * @returns {string} CSV string
     */
    exportToCSV(reportData) {
        const headers = ['Keyword', 'Source', 'Category', 'Volume', 'CPC', 'Intent', 'Sentiment', 'Provider'];
        const rows = [headers.join(',')];

        const extractRows = (items, source, category, provider) => {
            if (!Array.isArray(items)) return;
            for (const item of items) {
                const kw = (typeof item === 'string' ? item : item.keyword || '').replace(/"/g, '""');
                const vol = item.search_volume || item.volume || '';
                const cpc = item.cpc || item.cost_per_click || '';
                const intent = item.search_intent || item.intent || '';
                const sentiment = item.sentiment || '';
                rows.push(`"${kw}",${source},${category},${vol},${cpc},${intent},${sentiment},${provider}`);
            }
        };

        const data = reportData.data || reportData;
        if (data.providers) {
            for (const [provider, pData] of Object.entries(data.providers)) {
                if (!pData.results) continue;
                for (const [source, categories] of Object.entries(pData.results)) {
                    if (typeof categories === 'object' && !Array.isArray(categories)) {
                        for (const [cat, items] of Object.entries(categories)) {
                            extractRows(items, source, cat, provider);
                        }
                    } else if (Array.isArray(categories)) {
                        extractRows(categories, source, 'general', provider);
                    }
                }
            }
        }

        return rows.join('\n');
    }
}

module.exports = AnswerThePublicClient;

// Defensive bootstrap: if client.js is invoked directly as the application entry point (e.g. by Render auto-detect)
if (require.main === module) {
    console.log('[BOOTSTRAP] client.js invoked directly as main entrypoint. Delegating to server.js...');
    require('./server.js');
}
