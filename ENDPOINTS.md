# AnswerThePublic Enterprise API Specification & Endpoints Catalog

> **Version**: `1.0.0-alpha`  
> **Source of Truth**: Official OpenAPI 3.0.1 Specification (`https://api.answerthepublic.com/api-docs/public/spec.yaml`) & Extracted Web Application Bundles (`atp-cdn.neilpatelapi.com`)  
> **Production Base URL**: `https://api.answerthepublic.com`  
> **Internal Base URL**: `https://api.answerthepublic.com/api/v1` / `https://app.neilpatel.com`  

---

## 1. Executive Summary & Enterprise Architecture

AnswerThePublic (ATP by NP Digital) operates a dual-layer API infrastructure:
1. **Public REST API (`/api/public/v1`)**: High-performance, token-authenticated (`atp_pk_live_*`) programmatic API designed for automated pipelines, external platforms, and MCP / AI integrations.
2. **Internal App Engine (`/api/v1/{workspace_id}`)**: Comprehensive backend providing real-time search dispatching, People Also Ask (PaaS) crawling, Google Shopping product discovery, Google Trends velocity tracking, Content Studio (Composeo) auto-drafting, and workspace collaboration.

---

## 2. Authentication & Authorization

### Personal Access Tokens (PAT)
* **Header Format**: `Authorization: Bearer atp_pk_live_<token>`
* **Token Properties**: Bound to a specific user and workspace; inherits the workspace's plan privileges and rate limit ceilings.

### API Scopes
| Scope | Privilege | Target Endpoints |
| :--- | :--- | :--- |
| `searches:read` | Query & retrieve parent/child search status | `GET /api/public/v1/searches`, `GET /api/public/v1/searches/{id}` |
| `searches:write` | Create new searches (consumes search credits) | `POST /api/public/v1/searches` |
| `reports:read` | Fetch structured keyword rows, volumes & CPC | `GET /api/public/v1/reports/{id}` |
| `ai:read` | Retrieve AI prompt lists & poll generated answers | `POST /api/public/v1/reports/{id}/ai/prompts`, `POST /api/public/v1/reports/{id}/ai/answer` |
| `ai:write` | Enqueue AI answer generation (consumes credits) | `POST /api/public/v1/reports/{id}/ai/answer_request` |

---

## 3. Rate Limits & Quota Governance

| Limit Dimension | Threshold | Behavior on Breach |
| :--- | :--- | :--- |
| **Per-Token Rate** | 60 requests / minute | HTTP `429 Too Many Requests` with `Retry-After: 60` |
| **Per-Workspace Rate** | 240 requests / minute | Shared across all tokens in workspace |
| **Per-IP Rate** | 300 requests / minute | Protects edge infrastructure |
| **AI Generation Rate** | 10 requests / minute | Strict throttle on LLM generation endpoints |
| **Search Allowance** | Per billing cycle (Plan-dependent) | HTTP `429` with `resets_at` and plan quota details |
| **Daily Read Allowance** | Per 24-hour UTC window | HTTP `429` (`read_quota_exceeded`); resets at 00:00 UTC |
| **24-Hour Dedupe Window** | Automatic cache match | Identical keyword+region+language requests within 24h are **free of charge** |

---

## 4. Public REST API Reference (`/api/public/v1`)

### 4.1 Token & Workspace Context
* **Endpoint**: `GET /api/public/v1/me`
* **Scope**: `searches:read` or `reports:read`
* **Description**: Returns workspace slug, plan tier (`t1`, `t2`, `t3`, `lifetime`), remaining search credits, and daily read quota.

### 4.2 Create Search (Fan-Out Research)
* **Endpoint**: `POST /api/public/v1/searches`
* **Scope**: `searches:write`
* **Cost**: 1 search credit (unless caught in 24-hour dedupe cache)
* **Request Body**:
```json
{
  "search": {
    "keyword": "marketing automation",
    "language": "en",
    "region": "us",
    "provider": "gweb" 
  }
}
```
*(Providers: `gweb` (Google Web), `youtube`, `bing`, `amazon`, `tiktok`, `instagram`, `chatgpt`, `gemini`. Passing `null` or omitting `provider` fans out across all 8 platforms).*

### 4.3 Poll Search Status
* **Endpoint**: `GET /api/public/v1/searches/{id}`
* **Scope**: `searches:read`
* **Returns**: `status` (`pending` | `loading` | `completed` | `failed`), child searches, and inlined snapshot data upon completion.

### 4.4 List Searches
* **Endpoint**: `GET /api/public/v1/searches`
* **Query Parameters**:
  * `page` (default 1), `per_page` (max 500)
  * `sort_by`: `asc` | `desc`
  * `provider`: Filter by provider
  * `region`, `language`
  * `q`: Prefix-aware keyword search

### 4.5 Retrieve Structured Report Data
* **Endpoint**: `GET /api/public/v1/reports/{id}`
* **Scope**: `reports:read`
* **Query Parameters**:
  * `providers`: Comma-separated (e.g., `gweb,youtube,chatgpt`)
  * `grouped`: `true` (dashboard visual tree) | `false` (flat list)
  * `source_name`: `questions`, `prepositions`, `comparisons`, `alphabeticals`, `related`
  * `category`: e.g. `who`, `what`, `where`, `when`, `why`, `how`, `vs`, `like`
  * `sort_by`: `volume`, `cost_per_click`, `keyword`
  * `sort_order`: `asc` | `desc`
  * `range_start_volume`, `range_end_volume`
  * `range_start_cost`, `range_end_cost`
  * `intents`: `informational,commercial,transactional,navigational`
  * `sentiments`: `positive,neutral,negative`

### 4.6 AI Prompts Discovery
* **Endpoint**: `POST /api/public/v1/reports/{id}/ai/prompts`
* **Scope**: `ai:read`
* **Description**: Returns pre-engineered prompts tailored to the research topic. First call generates prompts on demand; subsequent calls read cached prompts.

### 4.7 Request AI Answer
* **Endpoint**: `POST /api/public/v1/reports/{id}/ai/answer_request`
* **Scope**: `ai:write`
* **Request Body**:
```json
{
  "ai_prompt_id": "uuid-of-canned-prompt"
}
```
*or for custom prompt:*
```json
{
  "question": "What are the most common pricing objections buyers have regarding marketing automation?"
}
```
* **Response**: `{ "task_id": "uuid-task" }`

### 4.8 Poll AI Answer
* **Endpoint**: `POST /api/public/v1/reports/{id}/ai/answer`
* **Scope**: `ai:read`
* **Request Body**: `{ "task_id": "uuid-task" }`
* **Response**: Returns `status: "processing"` until `completed`, whereupon `ai_answer` text is returned.

---

## 5. Internal Web Application & Extended Endpoints Catalog

In addition to the public API, the AnswerThePublic web engine exposes 143+ enterprise routes across workspace subsystems:

### 5.1 Real-Time Signal Enrichment Endpoints
| HTTP Method | Route | Description |
| :--- | :--- | :--- |
| `POST` | `/api/v1/{workspace}/reports/{id}/paas` | Triggers People Also Ask (PaaS) extraction |
| `GET` | `/api/v1/{workspace}/reports/{id}/paas/status` | Status and payload of PaaS crawl |
| `POST` | `/api/v1/{workspace}/reports/{id}/shopping_products` | Crawls top 10 Google Shopping ranked products |
| `GET` | `/api/v1/{workspace}/reports/{id}/shopping_products/status` | Status and pricing/merchant attributes |
| `POST` | `/api/v1/{workspace}/reports/{id}/trends` | Fetches Google Trends 30-day velocity & Breakout alerts |
| `GET` | `/api/v1/{workspace}/reports/{id}/trends/status` | Real-time status of Trends compute |
| `GET` | `/api/v1/{workspace}/comparisons` | Query comparative volume changes across date ranges |
| `GET` | `/api/v1/{workspace}/comparisons/timeline` | Longitudinal trend timelines |

### 5.2 Content Studio ("Composeo") AI Publishing
| HTTP Method | Route | Description |
| :--- | :--- | :--- |
| `POST` | `/api/v1/ai/batch_prompts` | Batch generate AI content prompts across keyword sets |
| `GET` | `/api/v1/{workspace}/composeo/article_count` | Retrieves generated articles & publishing quota |
| `POST` | WordPress REST Proxy | Auto-publishes generated articles directly to `/wp-json/` |

### 5.3 Workspace Organization, Collections & Tagging
| HTTP Method | Route | Description |
| :--- | :--- | :--- |
| `GET / POST` | `/api/v1/{workspace}/collections` | Create and list Keyword Collections / Lists |
| `POST` | `/api/v1/{workspace}/collections/{id}/archive` | Archive collection |
| `POST` | `/api/v1/{workspace}/collections/bulk_move_to_project` | Move bulk queries into dedicated project |
| `GET / POST` | `/api/v1/{workspace}/tags` | Custom tagging for sentiment, campaign, or cluster |
| `POST` | `/api/v1/{workspace}/suggestion_tags/bulk` | Bulk apply tags to suggestions |
| `GET / POST` | `/api/v1/{workspace}/alerts` | Setup automated Search Listening frequency alerts |

### 5.4 Account, API Token & Access Management
| HTTP Method | Route | Description |
| :--- | :--- | :--- |
| `GET / POST` | `/api/v1/{workspace}/personal_access_tokens` | Generate and list Personal Access Tokens |
| `DELETE` | `/api/v1/{workspace}/personal_access_tokens/{id}` | Revoke specific Personal Access Token |
| `GET` | `/api/v1/{workspace}/credit_usage` | Detailed audit log of credit burn by user and endpoint |
| `GET / POST` | `/api/v1/{workspace}/memberships` | Manage team invitations, roles, and seat allocation |

---

## 6. Enterprise Data Schemas

### 6.1 Keyword Record Data Model
```typescript
interface KeywordRecord {
  keyword: string;
  source: 'questions' | 'prepositions' | 'comparisons' | 'alphabeticals' | 'related';
  category: string; // e.g. 'who', 'what', 'where', 'vs', 'can', 'a', 'b'
  provider: 'gweb' | 'youtube' | 'bing' | 'amazon' | 'tiktok' | 'instagram' | 'chatgpt' | 'gemini';
  search_volume?: number;
  cpc?: number; // Cost per click in USD
  search_intent?: 'informational' | 'commercial' | 'transactional' | 'navigational';
  sentiment?: 'positive' | 'neutral' | 'negative';
  rank?: number;
}
```

### 6.2 Full Report Payload Model
```typescript
interface ReportData {
  report_id: string;
  parent_search_id: string;
  keyword: string;
  language: string;
  region: string;
  created_at: string;
  providers: Record<string, {
    status: 'loading' | 'completed' | 'failed';
    total_results: number;
    results: {
      questions?: Record<string, KeywordRecord[]>;
      prepositions?: Record<string, KeywordRecord[]>;
      comparisons?: Record<string, KeywordRecord[]>;
      alphabeticals?: Record<string, KeywordRecord[]>;
      related?: KeywordRecord[];
    };
    trends?: {
      trending_keywords: Array<{
        keyword: string;
        search_increase: number | 'BREAKOUT';
        search_interest: number;
      }>;
    };
    shopping_products?: Array<{
      title: string;
      merchant: string;
      price: string;
      rating?: number;
      product_url: string;
    }>;
  }>;
}
```
