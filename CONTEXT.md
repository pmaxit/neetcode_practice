# Interview Practice App

A coding interview practice platform where users solve algorithm problems with progressive assistance, scaffolded editors, and mode-based difficulty control.

## Language

### Problem & Content

**Blueprint**:
A single short fragment (3-7 words) naming the one key algorithmic move that makes the solution work. No grammar, no explanation. Stored in `guided_hints`. Shown as Card 1 of the Hint Card sequence.
_Avoid_: hints, steps, guided hints, multi-line blueprint

**Pattern Hint**:
A short phrase naming the algorithmic technique(s) a problem uses (e.g., "sliding window + hashmap"). Shown as Level 2 of the Stuck flow.
_Avoid_: category, tag, technique label

**Scaffold**:
A valid Python file with real boilerplate preserved and 1-2 critical logic sections replaced with `# TODO:` + `pass`. The starting editor state in Beginner mode.
_Avoid_: template, starter code, skeleton

**Think Comment**:
A `# Think:` comment embedded in the scaffold above a critical TODO, posing a Socratic question to nudge the user before they reach the hint system.
_Avoid_: prompt, inline hint, question comment

### Hint System

**Hint Card Sequence**:
The 4-card progressive assistance flow navigated with Next/Previous buttons: Card 1 (Blueprint) → Card 2 (Pattern Hint) → Card 3 (Scaffold) → Card 4 (Reference Solution). One card visible at a time. Previous walks back and removes cards.
_Avoid_: hint system, hint panel, stuck flow, progressive hints

**Hint Nav Button**:
The Next/Previous button pair that drives the Hint Card Sequence. "Next →" advances; "← Previous" retreats. When no card is showing, only "Next →" is visible.
_Avoid_: stuck button, hint button, help button

### Modes

**Practice Mode** (view):
One of four view options (alongside Reference, Visualize, Edit) controlling what is displayed in the main panel. Independent of Assistance Mode.
_Avoid_: don't confuse with Assistance Mode

**Assistance Mode**:
A session-level setting (Beginner / Interview / Challenge) that controls hint availability and editor starting state. Persisted via localStorage across problems.
_Avoid_: difficulty mode, hint mode

**Beginner Mode**:
Assistance Mode where the editor starts with the Scaffold pre-loaded and all 4 Stuck Flow levels are accessible.

**Interview Mode**:
Assistance Mode where the editor starts blank and the Stuck Button is hidden by default.

**Challenge Mode**:
Assistance Mode where the editor starts blank and the Stuck Button is completely absent.

## Relationships

- A **Problem** has one **Blueprint**, one **Pattern Hint**, one **Scaffold**, and one Reference Solution
- The **Scaffold** embeds zero or more **Think Comments** above critical TODOs
- The **Stuck Button** drives the **Stuck Flow**, which surfaces Blueprint → Pattern Hint → Scaffold → Reference Solution in order
- **Assistance Mode** determines the editor's starting state and whether the **Stuck Button** is visible
- **Practice Mode** (view) and **Assistance Mode** are independent axes — both are active simultaneously

## Example dialogue

> **Dev:** "In Interview Mode, does the user see the Scaffold?"
> **Domain expert:** "No — the editor starts blank. The Scaffold only appears if they reach Level 3 of the Stuck Flow, and in Interview Mode the Stuck Button is hidden anyway."
> **Dev:** "So they can never see hints in Interview Mode?"
> **Domain expert:** "Correct. That's the point — it simulates real interview conditions."

## Flagged ambiguities

- "hints" was used to mean both the Blueprint (6 lines) and the Stuck Flow broadly — resolved: Blueprint refers to the content, Stuck Flow refers to the mechanism.
- "mode" was ambiguous between view mode (Reference/Visualize/Practice/Edit) and assistance level (Beginner/Interview/Challenge) — resolved: these are now called **Practice Mode** (view) and **Assistance Mode** respectively.
