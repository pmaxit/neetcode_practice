# Graph Report - .  (2026-04-28)

## Corpus Check
- Corpus is ~40,369 words - fits in a single context window. You may not need a graph.

## Summary
- 143 nodes · 134 edges · 12 communities detected
- Extraction: 96% EXTRACTED · 4% INFERRED · 0% AMBIGUOUS · INFERRED: 5 edges (avg confidence: 0.82)
- Token cost: 3,200 input · 1,100 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Trace Generator|Trace Generator]]
- [[_COMMUNITY_React App UI|React App UI]]
- [[_COMMUNITY_Cloud Deployment|Cloud Deployment]]
- [[_COMMUNITY_App Memory & Plans|App Memory & Plans]]
- [[_COMMUNITY_LeetCode Sync|LeetCode Sync]]
- [[_COMMUNITY_Fix Missing Statements|Fix Missing Statements]]
- [[_COMMUNITY_AI Visualization Generator|AI Visualization Generator]]
- [[_COMMUNITY_Multi-tenant Migration|Multi-tenant Migration]]
- [[_COMMUNITY_Daily Problem Generator|Daily Problem Generator]]
- [[_COMMUNITY_Hints Generator|Hints Generator]]
- [[_COMMUNITY_Spaced Repetition Logic|Spaced Repetition Logic]]
- [[_COMMUNITY_Graphify Config|Graphify Config]]

## God Nodes (most connected - your core abstractions)
1. `TraceRunner` - 8 edges
2. `main()` - 6 edges
3. `NeetCode Practice App` - 6 edges
4. `main()` - 5 edges
5. `generate_trace()` - 5 edges
6. `App.jsx (Single-page UI)` - 5 edges
7. `server.js (Express API)` - 5 edges
8. `run()` - 4 edges
9. `runAgenticFlow()` - 4 edges
10. `create_traced_code()` - 4 edges

## Surprising Connections (you probably didn't know these)
- `/api/health Endpoint` --conceptually_related_to--> `server.js (Express API)`  [INFERRED]
  DEPLOYMENT_SKILL.md → MEMORY.md
- `NeetCode Practice Deployment` --conceptually_related_to--> `NeetCode Practice App`  [INFERRED]
  DEPLOYMENT_SKILL.md → README.md
- `NeetCode Practice App` --references--> `Google Cloud Run`  [EXTRACTED]
  README.md → DEPLOYMENT_SKILL.md
- `NeetPractice PWA Entry Point` --references--> `App.jsx (Single-page UI)`  [EXTRACTED]
  index.html → MEMORY.md
- `Gamification Plan` --conceptually_related_to--> `Dashboard View`  [INFERRED]
  plans/gamification.md → MEMORY.md

## Hyperedges (group relationships)
- **Cloud Deployment Stack** — deployment_skill_cloud_run, deployment_skill_cloud_sql, deployment_skill_gcr, readme_github_actions_cicd, deployment_skill_deploy_sh [EXTRACTED 0.95]
- **App MVC Data Flow** — memory_app_jsx, memory_server_js, memory_problems_table, memory_user_progress_table [INFERRED 0.90]
- **Daily Practice System** — memory_day_assignment_formula, memory_spaced_repetition, memory_dashboard_view, memory_neetcode_250 [INFERRED 0.85]

## Communities

### Community 0 - "Trace Generator"
Cohesion: 0.14
Nodes (12): create_traced_code(), extract_function_and_class(), generate_trace(), get_sample_input(), AST visitor to identify key lines for tracing., Extract function/method name and class name from code., Wrap code with tracing functionality., Execute code and capture output. (+4 more)

### Community 1 - "React App UI"
Cohesion: 0.14
Nodes (2): parseSystemDesignContent(), SystemDesignDetail()

### Community 2 - "Cloud Deployment"
Cohesion: 0.2
Nodes (11): /api/health Endpoint, Google Cloud Run, Cloud SQL (MySQL), deploy.sh Script, Google Container Registry, NeetCode Practice Deployment, Express.js Backend, GitHub Actions CI/CD (+3 more)

### Community 3 - "App Memory & Plans"
Cohesion: 0.18
Nodes (11): Gamification Plan, NeetPractice PWA Entry Point, GET /api/problems Endpoint, POST /api/progress Endpoint, App.jsx (Single-page UI), Browse View, Calendar View, Dashboard View (+3 more)

### Community 5 - "LeetCode Sync"
Cohesion: 0.52
Nodes (6): fetchGithubSolution(), fetchLeetCodeProblem(), main(), parseQuestionsFile(), slugFromUrl(), stripHtml()

### Community 6 - "Fix Missing Statements"
Cohesion: 0.6
Nodes (5): fetchAnkiStatement(), fetchLeetCodeStatement(), generateStatement(), main(), slugFromUrl()

### Community 7 - "AI Visualization Generator"
Cohesion: 0.53
Nodes (4): critiqueExplanation(), generateExplanation(), main(), runAgenticFlow()

### Community 9 - "Multi-tenant Migration"
Cohesion: 0.7
Nodes (4): columnExists(), indexExists(), run(), tableExists()

### Community 10 - "Daily Problem Generator"
Cohesion: 0.67
Nodes (2): computeTodayDayFromPlan(), main()

### Community 11 - "Hints Generator"
Cohesion: 1.0
Nodes (2): buildPrompt(), main()

### Community 12 - "Spaced Repetition Logic"
Cohesion: 1.0
Nodes (3): Day Assignment Formula, NeetCode 250 Problem Set, Spaced Repetition (Revision Selection)

### Community 34 - "Graphify Config"
Cohesion: 1.0
Nodes (1): Graphify Rules (CLAUDE.md)

## Knowledge Gaps
- **20 isolated node(s):** `AST visitor to identify key lines for tracing.`, `Get sample input based on problem type.`, `Extract function/method name and class name from code.`, `Wrap code with tracing functionality.`, `Execute code and capture output.` (+15 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **Thin community `React App UI`** (15 nodes): `apiFetch()`, `App()`, `App.jsx`, `LoginView()`, `parseSystemDesignContent()`, `PythonEditor()`, `RequirementCard()`, `SectionHeader()`, `SessionSelectView()`, `SolutionToggle()`, `StatsSummary()`, `StudyPlanSettings()`, `SVGProgressChart()`, `SystemDesignDetail()`, `SystemDesignView()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Daily Problem Generator`** (4 nodes): `computeTodayDayFromPlan()`, `getArg()`, `generate_daily_problem.js`, `main()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Hints Generator`** (3 nodes): `buildPrompt()`, `generate_hints.js`, `main()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Graphify Config`** (1 nodes): `Graphify Rules (CLAUDE.md)`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `server.js (Express API)` connect `App Memory & Plans` to `Cloud Deployment`?**
  _High betweenness centrality (0.013) - this node is a cross-community bridge._
- **Why does `/api/health Endpoint` connect `Cloud Deployment` to `App Memory & Plans`?**
  _High betweenness centrality (0.011) - this node is a cross-community bridge._
- **What connects `AST visitor to identify key lines for tracing.`, `Get sample input based on problem type.`, `Extract function/method name and class name from code.` to the rest of the system?**
  _20 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Trace Generator` be split into smaller, more focused modules?**
  _Cohesion score 0.14 - nodes in this community are weakly interconnected._
- **Should `React App UI` be split into smaller, more focused modules?**
  _Cohesion score 0.14 - nodes in this community are weakly interconnected._