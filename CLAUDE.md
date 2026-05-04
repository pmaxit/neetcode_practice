## 1. Pre-Flight & Memory (Anti-Regression)
- **Check Memory:** BEFORE proposing any solution, read `MEMORY.md`. Look for "Mistake Logs" related to the current modules to avoid repeating past errors.
- **Consult the Graph:** Run `graphify-out/` tools to verify you aren't violating existing architectural boundaries.
- **Directory Harness:** Check the target directory for a local `README.md` or `.rules` file. You MUST follow directory-specific coding standards (e.g., `/api` rules may differ from `/ui` rules).

## 2. TDD Design Philosophy (Hard Rule)
- **Test-Driven Development:** You are prohibited from writing implementation code first. 
- **The Workflow:**
    1. Create/Update a test file (Jest/Cypress).
    2. Run the test and confirm it FAILS.
    3. Write the MINIMAL implementation to make it pass.
    4. Refactor only while tests stay green.
- **Verification:** If a change cannot be tested, you must explain why before proceeding.

## 3. Think Before Coding & Graphify
- **Navigation:** Use `graphify-out/GRAPH_REPORT.md`. If `graphify-out/wiki/index.md` exists, use it as the source of truth for flow and logic.
- **Relational Queries:** Use `graphify query`, `path`, or `explain`. Do not guess dependencies.
- **Push Back:** If the requested change violates a pattern in `MEMORY.md` or the Graphify structure, push back and suggest a simpler alternative.

## 4. Simplicity & Surgical Changes
- **No Speculation:** Only solve the immediate problem. 
- **Library Guardrails:** Check `package.json` versions for Sequelize/Vite before using specific syntax to avoid "version hallucination."
- **Minimal Diffs:** Touch only the necessary lines. Match the existing indentation and naming conventions exactly.

## 5. Maintenance & Feedback Loop
- **Graph Sync:** Run `graphify update .` after every code change.
- **Capture Learnings:**
    - **Failures:** If a build fails or you hit a bug, log the root cause in `MEMORY.md` under `# Mistake Log`.
    - **Patterns:** If you find a superior way to handle a Sequelize hook or React state, log it in `# Recommended Patterns`.
- **Post-Mortem:** After completion, state: "Learning captured: [X]" to confirm the memory has been updated.

## Project-Specific Details
- **Build:** `npm run build` | **Unit:** `npx jest` | **E2E:** `npx cypress run`
- **Stack:** Vite, React, Express, Sequelize (MySQL), Vanilla CSS
- **Skills:** Read `src/.rules` for UI/Frontend or `.backend.rules` for API/Backend.

## CLI COMMANDS
- Build: `npm run build`
- Unit Tests: `npx jest`
- E2E Tests: `npx cypress run`
- Dev Environment: `./run_local.sh`
- Graph Update: `graphify update .`

## DIRECTORY MAP
- Frontend/UI: `src/` (Follows `src/.rules`)
- Backend/API: `server/` (Follows `.backend.rules`)
- Knowledge Base: `graphify-out/` and `MEMORY.md`