# Graph Report - atp-enterprise-api  (2026-09-10)

## Corpus Check
- 12 files · ~33,303 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 140 nodes · 210 edges · 11 communities (9 shown, 2 thin omitted)
- Extraction: 95% EXTRACTED · 5% INFERRED · 0% AMBIGUOUS · INFERRED: 10 edges (avg confidence: 0.5)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `ed5c0bd5`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- app.js
- package.json
- server.js
- AnswerThePublicClient
- 🚀 AnswerThePublic Enterprise Suite & Keyword Intelligence Platform
- AnswerThePublic Enterprise API Specification & Endpoints Catalog
- 4. Public REST API Reference (`/api/public/v1`)
- client.js
- test-master-e2e.js
- test-server-e2e.js
- test-live-suite.js

## God Nodes (most connected - your core abstractions)
1. `el()` - 24 edges
2. `setupEventListeners()` - 21 edges
3. `AnswerThePublicClient` - 14 edges
4. `apiFetch()` - 9 edges
5. `renderResultsDashboard()` - 9 edges
6. `4. Public REST API Reference (`/api/public/v1`)` - 9 edges
7. `addDebugLog()` - 7 edges
8. `AnswerThePublic Enterprise API Specification & Endpoints Catalog` - 7 edges
9. `🚀 AnswerThePublic Enterprise Suite & Keyword Intelligence Platform` - 7 edges
10. `saveSettings()` - 6 edges

## Surprising Connections (you probably didn't know these)
- None detected - all connections are within the same source files.

## Import Cycles
- None detected.

## Communities (11 total, 2 thin omitted)

### Community 0 - "app.js"
Cohesion: 0.20
Nodes (31): addDebugLog(), apiFetch(), applyTableFilters(), closeSettingsModal(), downloadWheelSvg(), el(), escapeHtml(), fetchConfig() (+23 more)

### Community 1 - "package.json"
Cohesion: 0.11
Nodes (18): axios, cors, express, dependencies, axios, cors, express, yaml (+10 more)

### Community 2 - "server.js"
Cohesion: 0.12
Nodes (14): generateRealisticReport(), { v4: uuidv4 }, AnswerThePublicClient, app, atpClient, cors, currentConfig, debugLogs (+6 more)

### Community 4 - "🚀 AnswerThePublic Enterprise Suite & Keyword Intelligence Platform"
Cohesion: 0.14
Nodes (12): 🚀 AnswerThePublic Enterprise Suite & Keyword Intelligence Platform, 🛠️ API Endpoints Reference, Enterprise Application Endpoints (`http://localhost:3500`), Installation & Run, 📸 Key Capabilities, 📄 License, Official Production OpenAPI Specifications, 🧪 Pre-Production Automated Verification (+4 more)

### Community 5 - "AnswerThePublic Enterprise API Specification & Endpoints Catalog"
Cohesion: 0.14
Nodes (14): 1. Executive Summary & Enterprise Architecture, 2. Authentication & Authorization, 3. Rate Limits & Quota Governance, 5.1 Real-Time Signal Enrichment Endpoints, 5.2 Content Studio ("Composeo") AI Publishing, 5.3 Workspace Organization, Collections & Tagging, 5.4 Account, API Token & Access Management, 5. Internal Web Application & Extended Endpoints Catalog (+6 more)

### Community 6 - "4. Public REST API Reference (`/api/public/v1`)"
Cohesion: 0.22
Nodes (9): 4.1 Token & Workspace Context, 4.2 Create Search (Fan-Out Research), 4.3 Poll Search Status, 4.4 List Searches, 4.5 Retrieve Structured Report Data, 4.6 AI Prompts Discovery, 4.7 Request AI Answer, 4.8 Poll AI Answer (+1 more)

### Community 7 - "client.js"
Cohesion: 0.33
Nodes (3): axios, AnswerThePublicClient, fs

### Community 8 - "test-master-e2e.js"
Cohesion: 0.40
Nodes (3): axios, fs, verifyFullEndToEnd()

### Community 9 - "test-server-e2e.js"
Cohesion: 0.50
Nodes (4): axios, runE2ETests(), sleep(), { spawn }

## Knowledge Gaps
- **60 isolated node(s):** `axios`, `{ v4: uuidv4 }`, `name`, `version`, `description` (+55 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **2 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `AnswerThePublic Enterprise API Specification & Endpoints Catalog` connect `AnswerThePublic Enterprise API Specification & Endpoints Catalog` to `🚀 AnswerThePublic Enterprise Suite & Keyword Intelligence Platform`, `4. Public REST API Reference (`/api/public/v1`)`?**
  _High betweenness centrality (0.051) - this node is a cross-community bridge._
- **Why does `AnswerThePublicClient` connect `AnswerThePublicClient` to `client.js`?**
  _High betweenness centrality (0.040) - this node is a cross-community bridge._
- **Are the 9 inferred relationships involving `setupEventListeners()` (e.g. with `applyTableFilters()` and `closeSettingsModal()`) actually correct?**
  _`setupEventListeners()` has 9 INFERRED edges - model-reasoned connections that need verification._
- **What connects `axios`, `{ v4: uuidv4 }`, `name` to the rest of the system?**
  _60 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `package.json` be split into smaller, more focused modules?**
  _Cohesion score 0.10526315789473684 - nodes in this community are weakly interconnected._
- **Should `server.js` be split into smaller, more focused modules?**
  _Cohesion score 0.11764705882352941 - nodes in this community are weakly interconnected._
- **Should `🚀 AnswerThePublic Enterprise Suite & Keyword Intelligence Platform` be split into smaller, more focused modules?**
  _Cohesion score 0.14285714285714285 - nodes in this community are weakly interconnected._