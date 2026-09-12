# Graph Report - atp-enterprise-api  (2026-09-10)

## Corpus Check
- 12 files · ~33,881 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 151 nodes · 230 edges · 10 communities (8 shown, 2 thin omitted)
- Extraction: 96% EXTRACTED · 4% INFERRED · 0% AMBIGUOUS · INFERRED: 10 edges (avg confidence: 0.5)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `7af4c99b`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- app.js
- package.json
- server.js
- AnswerThePublicClient
- 🚀 AnswerThePublic Enterprise Suite & Keyword Intelligence Platform
- 4. Public REST API Reference (`/api/public/v1`)
- generator.js
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
8. `renderTableRows()` - 7 edges
9. `AnswerThePublic Enterprise API Specification & Endpoints Catalog` - 7 edges
10. `🚀 AnswerThePublic Enterprise Suite & Keyword Intelligence Platform` - 7 edges

## Surprising Connections (you probably didn't know these)
- None detected - all connections are within the same source files.

## Import Cycles
- None detected.

## Communities (10 total, 2 thin omitted)

### Community 0 - "app.js"
Cohesion: 0.16
Nodes (35): addDebugLog(), apiFetch(), applyTableFilters(), closeSettingsModal(), downloadWheelSvg(), el(), escapeHtml(), fetchConfig() (+27 more)

### Community 1 - "package.json"
Cohesion: 0.11
Nodes (18): axios, cors, express, dependencies, axios, cors, express, yaml (+10 more)

### Community 2 - "server.js"
Cohesion: 0.10
Nodes (15): axios, AnswerThePublicClient, app, atpClient, cors, currentConfig, debugLogs, express (+7 more)

### Community 4 - "🚀 AnswerThePublic Enterprise Suite & Keyword Intelligence Platform"
Cohesion: 0.14
Nodes (12): 🚀 AnswerThePublic Enterprise Suite & Keyword Intelligence Platform, 🛠️ API Endpoints Reference, Enterprise Application Endpoints (`http://localhost:3500`), Installation & Run, 📸 Key Capabilities, 📄 License, Official Production OpenAPI Specifications, 🧪 Pre-Production Automated Verification (+4 more)

### Community 5 - "4. Public REST API Reference (`/api/public/v1`)"
Cohesion: 0.09
Nodes (23): 1. Executive Summary & Enterprise Architecture, 2. Authentication & Authorization, 3. Rate Limits & Quota Governance, 4.1 Token & Workspace Context, 4.2 Create Search (Fan-Out Research), 4.3 Poll Search Status, 4.4 List Searches, 4.5 Retrieve Structured Report Data (+15 more)

### Community 6 - "generator.js"
Cohesion: 0.36
Nodes (7): classifyIntent(), classifySentiment(), computeMetrics(), fetchGoogleSuggestions(), generateRealisticReport(), simpleHash(), { v4: uuidv4 }

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

- **Why does `AnswerThePublic Enterprise API Specification & Endpoints Catalog` connect `4. Public REST API Reference (`/api/public/v1`)` to `🚀 AnswerThePublic Enterprise Suite & Keyword Intelligence Platform`?**
  _High betweenness centrality (0.044) - this node is a cross-community bridge._
- **Why does `AnswerThePublicClient` connect `AnswerThePublicClient` to `server.js`?**
  _High betweenness centrality (0.041) - this node is a cross-community bridge._
- **Are the 9 inferred relationships involving `setupEventListeners()` (e.g. with `applyTableFilters()` and `closeSettingsModal()`) actually correct?**
  _`setupEventListeners()` has 9 INFERRED edges - model-reasoned connections that need verification._
- **What connects `axios`, `{ v4: uuidv4 }`, `name` to the rest of the system?**
  _60 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `package.json` be split into smaller, more focused modules?**
  _Cohesion score 0.10526315789473684 - nodes in this community are weakly interconnected._
- **Should `server.js` be split into smaller, more focused modules?**
  _Cohesion score 0.09523809523809523 - nodes in this community are weakly interconnected._
- **Should `🚀 AnswerThePublic Enterprise Suite & Keyword Intelligence Platform` be split into smaller, more focused modules?**
  _Cohesion score 0.14285714285714285 - nodes in this community are weakly interconnected._