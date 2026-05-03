# Graph Report - practice-app  (2026-05-03)

## Corpus Check
- 42 files · ~46,387 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 190 nodes · 183 edges · 14 communities detected
- Extraction: 97% EXTRACTED · 3% INFERRED · 0% AMBIGUOUS · INFERRED: 5 edges (avg confidence: 0.82)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Community 0|Community 0]]
- [[_COMMUNITY_Community 1|Community 1]]
- [[_COMMUNITY_Community 2|Community 2]]
- [[_COMMUNITY_Community 3|Community 3]]
- [[_COMMUNITY_Community 4|Community 4]]
- [[_COMMUNITY_Community 6|Community 6]]
- [[_COMMUNITY_Community 7|Community 7]]
- [[_COMMUNITY_Community 8|Community 8]]
- [[_COMMUNITY_Community 9|Community 9]]
- [[_COMMUNITY_Community 12|Community 12]]
- [[_COMMUNITY_Community 13|Community 13]]
- [[_COMMUNITY_Community 14|Community 14]]
- [[_COMMUNITY_Community 16|Community 16]]
- [[_COMMUNITY_Community 45|Community 45]]

## God Nodes (most connected - your core abstractions)
1. `CanvasDrawingEngine` - 20 edges
2. `TraceRunner` - 8 edges
3. `ImageRendererService` - 6 edges
4. `main()` - 6 edges
5. `NeetCode Practice App` - 6 edges
6. `main()` - 5 edges
7. `generate_trace()` - 5 edges
8. `App.jsx (Single-page UI)` - 5 edges
9. `server.js (Express API)` - 5 edges
10. `run()` - 4 edges

## Surprising Connections (you probably didn't know these)
- `/api/health Endpoint` --conceptually_related_to--> `server.js (Express API)`  [INFERRED]
  DEPLOYMENT_SKILL.md → MEMORY.md
- `NeetCode Practice Deployment` --conceptually_related_to--> `NeetCode Practice App`  [INFERRED]
  DEPLOYMENT_SKILL.md → README.md
- `Google Cloud Run` --references--> `NeetCode Practice App`  [EXTRACTED]
  DEPLOYMENT_SKILL.md → README.md
- `App.jsx (Single-page UI)` --references--> `NeetPractice PWA Entry Point`  [EXTRACTED]
  MEMORY.md → index.html
- `Dashboard View` --conceptually_related_to--> `Gamification Plan`  [INFERRED]
  MEMORY.md → plans/gamification.md

## Hyperedges (group relationships)
- **Cloud Deployment Stack** — deployment_skill_cloud_run, deployment_skill_cloud_sql, deployment_skill_gcr, readme_github_actions_cicd, deployment_skill_deploy_sh [EXTRACTED 0.95]
- **App MVC Data Flow** — memory_app_jsx, memory_server_js, memory_problems_table, memory_user_progress_table [INFERRED 0.90]
- **Daily Practice System** — memory_day_assignment_formula, memory_spaced_repetition, memory_dashboard_view, memory_neetcode_250 [INFERRED 0.85]

## Communities

### Community 0 - "Community 0"
Cohesion: 0.14
Nodes (1): CanvasDrawingEngine

### Community 1 - "Community 1"
Cohesion: 0.14
Nodes (12): create_traced_code(), extract_function_and_class(), generate_trace(), get_sample_input(), AST visitor to identify key lines for tracing., Extract function/method name and class name from code., Wrap code with tracing functionality., Execute code and capture output. (+4 more)

### Community 2 - "Community 2"
Cohesion: 0.13
Nodes (2): parseSystemDesignContent(), SystemDesignDetail()

### Community 3 - "Community 3"
Cohesion: 0.2
Nodes (11): /api/health Endpoint, Google Cloud Run, Cloud SQL (MySQL), deploy.sh Script, Google Container Registry, NeetCode Practice Deployment, Express.js Backend, GitHub Actions CI/CD (+3 more)

### Community 4 - "Community 4"
Cohesion: 0.18
Nodes (11): Gamification Plan, NeetPractice PWA Entry Point, GET /api/problems Endpoint, POST /api/progress Endpoint, App.jsx (Single-page UI), Browse View, Calendar View, Dashboard View (+3 more)

### Community 6 - "Community 6"
Cohesion: 0.43
Nodes (1): ImageRendererService

### Community 7 - "Community 7"
Cohesion: 0.52
Nodes (6): fetchGithubSolution(), fetchLeetCodeProblem(), main(), parseQuestionsFile(), slugFromUrl(), stripHtml()

### Community 8 - "Community 8"
Cohesion: 0.6
Nodes (5): fetchAnkiStatement(), fetchLeetCodeStatement(), generateStatement(), main(), slugFromUrl()

### Community 9 - "Community 9"
Cohesion: 0.53
Nodes (4): critiqueExplanation(), generateExplanation(), main(), runAgenticFlow()

### Community 12 - "Community 12"
Cohesion: 0.7
Nodes (4): columnExists(), indexExists(), run(), tableExists()

### Community 13 - "Community 13"
Cohesion: 0.83
Nodes (3): buildPrompt(), main(), parseResponse()

### Community 14 - "Community 14"
Cohesion: 0.67
Nodes (2): computeTodayDayFromPlan(), main()

### Community 16 - "Community 16"
Cohesion: 1.0
Nodes (3): Day Assignment Formula, NeetCode 250 Problem Set, Spaced Repetition (Revision Selection)

### Community 45 - "Community 45"
Cohesion: 1.0
Nodes (1): Graphify Rules (CLAUDE.md)

## Knowledge Gaps
- **20 isolated node(s):** `AST visitor to identify key lines for tracing.`, `Get sample input based on problem type.`, `Extract function/method name and class name from code.`, `Wrap code with tracing functionality.`, `Execute code and capture output.` (+15 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **Thin community `Community 0`** (21 nodes): `CanvasDrawingEngine`, `._bindEvents()`, `.clear()`, `.constructor()`, `.destroy()`, `._erase()`, `.exportToBase64()`, `._getPoint()`, `._initContext()`, `._onMouseDown()`, `._onMouseMove()`, `._onMouseUp()`, `._onTouchEnd()`, `._onTouchMove()`, `._onTouchStart()`, `.setBackgroundImage()`, `.setColor()`, `.setEraserRadius()`, `.setLineWidth()`, `.setTool()`, `canvasDrawingEngine.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 2`** (16 nodes): `apiFetch()`, `App()`, `highlightPython()`, `App.jsx`, `LoginView()`, `parseSystemDesignContent()`, `PythonEditor()`, `RequirementCard()`, `SectionHeader()`, `SessionSelectView()`, `SolutionToggle()`, `StatsSummary()`, `StudyPlanSettings()`, `SVGProgressChart()`, `SystemDesignDetail()`, `SystemDesignView()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 6`** (7 nodes): `ImageRendererService`, `.constructor()`, `._ensureContainer()`, `._removeContainer()`, `.renderCodeToHtml()`, `.renderToBase64()`, `imageRenderer.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 14`** (4 nodes): `computeTodayDayFromPlan()`, `getArg()`, `generate_daily_problem.js`, `main()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 45`** (1 nodes): `Graphify Rules (CLAUDE.md)`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `server.js (Express API)` connect `Community 4` to `Community 3`?**
  _High betweenness centrality (0.008) - this node is a cross-community bridge._
- **What connects `AST visitor to identify key lines for tracing.`, `Get sample input based on problem type.`, `Extract function/method name and class name from code.` to the rest of the system?**
  _20 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.14 - nodes in this community are weakly interconnected._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.14 - nodes in this community are weakly interconnected._
- **Should `Community 2` be split into smaller, more focused modules?**
  _Cohesion score 0.13 - nodes in this community are weakly interconnected._