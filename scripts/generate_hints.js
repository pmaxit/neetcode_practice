/**
 * generate_hints.js
 * ─────────────────
 * For each problem generates three things in one Gemini call:
 *   - guided_hints: 6-point plain-text blueprint (no code)
 *   - practice_scaffold: boilerplate-preserved Python with critical logic blanked out + # Think: prompts
 *   - pattern_hint: short algorithmic pattern phrase (e.g. "sliding window + hashmap")
 *
 * Usage:
 *   node scripts/generate_hints.js                       # process up to 10 problems missing any field
 *   node scripts/generate_hints.js --limit 50            # process up to 50
 *   node scripts/generate_hints.js --all                 # process ALL problems missing any field
 *   node scripts/generate_hints.js --overwrite           # re-generate ALL (even existing)
 *   node scripts/generate_hints.js --all --after 461     # process all problems with id > 461
 *   node scripts/generate_hints.js --overwrite --after 461  # re-generate all with id > 461
 */

import { Sequelize, DataTypes, Op } from 'sequelize';
import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config({ path: path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '.env') });

// ─── Parse CLI args ─────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const limitArg = args.includes('--limit') ? parseInt(args[args.indexOf('--limit') + 1]) : null;
const afterArg = args.includes('--after') ? parseInt(args[args.indexOf('--after') + 1]) : null;
const processAll = args.includes('--all');
const overwrite = args.includes('--overwrite');
const LIMIT = !processAll ? (limitArg || 10) : 9999;
const DELAY_MS = 400;

// ─── DB connection ───────────────────────────────────────────────────────────
const sequelize = new Sequelize(process.env.DB_NAME, process.env.DB_USER, process.env.DB_PASS, {
    host: process.env.DB_HOST || '127.0.0.1',
    port: process.env.DB_PORT || 3306,
    dialect: 'mysql',
    logging: false,
});

const Problem = sequelize.define('Problem', {
    id: { type: DataTypes.INTEGER, primaryKey: true },
    title: DataTypes.STRING,
    category: DataTypes.STRING,
    difficulty: DataTypes.STRING,
    python_code: DataTypes.TEXT,
    guided_hints: DataTypes.TEXT,
    practice_scaffold: DataTypes.TEXT,
    pattern_hint: DataTypes.TEXT,
    problem_format: DataTypes.TEXT,  // Problem statement summary (SECTION 1)
    solution_format: DataTypes.TEXT,  // Solution walkthrough (SECTION 2)
}, { timestamps: false, tableName: 'problems' });

// ─── Gemini setup ────────────────────────────────────────────────────────────
const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey || apiKey === 'your_gemini_api_key_here') {
    console.error('❌  GEMINI_API_KEY not set in .env');
    process.exit(1);
}
const genAI = new GoogleGenerativeAI(apiKey);
const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

// ─── Prompt ──────────────────────────────────────────────────────────────────
function buildPrompt(problem) {
    return [
        `You are a programming tutor for the LeetCode problem "${problem.title}" (${problem.category}, ${problem.difficulty}).`,
        '',
        `Reference Solution:`,
        problem.python_code || '# Code not available',
        '',
        'Produce THREE sections separated by exactly the line "---":',
        '',
        'SECTION 1 — Problem Format (plain text, no code):',
        'Write a clear, concise problem statement that includes:',
        '- Input format and constraints',
        '- Expected output with examples',
        '- Key edge cases to consider',
        '- Any special rules or termination conditions',
        'Keep it under 80 words. Use natural language, no markdown.',
        '',
        'IMPORTANT: Include guiding questions like "How do we approach this?" and "What data structure helps here?"',
        '',
        'Example:',
        '  "You are given an integer array nums and an integer target."',
        '  "Hint: How do we find two numbers that sum to target?"',
        '',
        'SECTION 2 — Solution Format (plain text explanation, no code):',
        'Write a step-by-step solution walkthrough using Socratic questioning. For EACH step, present the question THEN the answer.',
        'Structure as: "How do we...?" + answer, or "What if we try..." + insight.',
        '- Start with the KEY INSIGHT first (the big idea)',
        '- For each subsequent step, ask a guiding question, then give the answer',
        '- Include data structure choice reasoning',
        '- Include algorithm steps in logical order',
        '- Explain edge case handling',
        '- Add time and space complexity',
        'Use natural language explanations, no code blocks. Aim for 5-7 sentences.',
        '',
        'Example for Two Sum:',
        'KEY INSIGHT: Use a hash map to store each element as we traverse, allowing O(1) lookup of the complement (target - current).',
        '- How do we efficiently find the pair that sums to target? We can use a hash map to look up complements in O(1).',
        '- What should the hash map store? Each number and its index as we traverse.',
        '- As we iterate, what complement do we need? For nums[i], we need target - nums[i].',
        '- When do we find the answer? When the complement already exists in our map.',
        '- What is the fallback if no pair exists? Return [-1, -1].',
        'TIME COMPLEXITY: O(n) - single pass through array',
        'SPACE COMPLEXITY: O(n) - hash map stores at most n elements',
        '',
        'Example for Container With Most Water:',
        'KEY INSIGHT: Use two pointers starting at edges; the area is bounded by shorter height and distance between pointers.',
        '- How do we maximize area? Try both left and right boundaries, pick maximum.',
        '- When should we move a pointer? Move the shorter side inward (it\'s the bottleneck).',
        '- What terminates the search? Pointers meet at center.',
        'TIME COMPLEXITY: O(n) - two pointers traverse array once',
        'SPACE COMPLEXITY: O(1) - no extra space needed',
        '',
        'SECTION 3 — Practice Scaffold (valid Python):',
        'Copy the full reference solution but replace ONLY the critical/clever logic with:',
        '    # Think: <one Socratic question that nudges the student toward the insight>',
        '    # TODO: <one-line description of what to implement>',
        '    pass',
        'Keep ALL boilerplate: imports, class/method signatures, trivial loops, initializations, return statements.',
        'Replace at most 2 blanks. Do NOT wrap in markdown fences.',
        '',
        'SECTION 4 — Pattern (one short phrase only):',
        'Name the core algorithmic technique(s) this problem uses. No explanation, just the phrase.',
        '',
        'Output format (nothing else):',
        '<problem statement>',
        '---',
        '<solution explanation with questions and answers>',
        '---',
        '<practice scaffold python>',
        '---',
        '<pattern phrase>',
    ].join('\n');
}

function parseResponse(text) {
    const parts = text.split(/^---$/m);
    if (parts.length < 4) return null;

    // Ensure each section has content
    const section1 = parts[0].trim();
    const section2 = parts[1].trim();
    const section3 = parts[2].trim();
    const section4 = parts[3].trim();

    if (!section1 || !section2 || !section3 || !section4) return null;

    return {
        problem_format: section1,
        solution_format: section2,
        practice_scaffold: section3,
        pattern_hint: section4,
    };
}

// ─── Main ────────────────────────────────────────────────────────────────────
async function main() {
    try {
        await sequelize.authenticate();
        console.log('✅  Database connected\n');

        // Add pattern_hint column if it doesn't exist yet
        const [cols] = await sequelize.query(
            "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='problems' AND COLUMN_NAME='pattern_hint'"
        );
        if (cols.length === 0) {
            await sequelize.query("ALTER TABLE problems ADD COLUMN pattern_hint TEXT");
            console.log('✅  Added pattern_hint column\n');
        }

        // Add problem_format and solution_format columns if they don't exist
        const [cols1] = await sequelize.query(
            "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='problems' AND COLUMN_NAME='problem_format'"
        );
        if (cols1.length === 0) {
            await sequelize.query("ALTER TABLE problems ADD COLUMN problem_format TEXT");
            console.log('✅  Added problem_format column\n');
        }

        const [cols2] = await sequelize.query(
            "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='problems' AND COLUMN_NAME='solution_format'"
        );
        if (cols2.length === 0) {
            await sequelize.query("ALTER TABLE problems ADD COLUMN solution_format TEXT");
            console.log('✅  Added solution_format column\n');
        }

        const whereClause = overwrite
            ? (afterArg ? { id: { [Op.gt]: afterArg } } : {})
            : { [Op.and]: [
                ...(afterArg ? [{ id: { [Op.gt]: afterArg } }] : []),
                { [Op.or]: [{ guided_hints: null }, { practice_scaffold: null }, { pattern_hint: null }] }
              ] };
        const problems = await Problem.findAll({ where: whereClause, limit: LIMIT, order: [['id', 'ASC']] });

        if (problems.length === 0) {
            console.log('🎉  All problems already have blueprints, scaffolds, and patterns! Use --overwrite to regenerate.');
            process.exit(0);
        }

        console.log(`📋  Processing ${problems.length} problem(s)...\n`);

        let generated = 0;
        let failed = 0;

        for (const problem of problems) {
            process.stdout.write(`  [${problem.id}] ${problem.title}... `);
            try {
                const result = await model.generateContent(buildPrompt(problem));
                const parsed = parseResponse(result.response.text().trim());
                if (!parsed) throw new Error('Could not parse --- separator in response');

                await problem.update(parsed);
                generated++;
                console.log('✅');
            } catch (err) {
                failed++;
                console.log(`❌  ${err.message}`);
            }

            if (problems.indexOf(problem) < problems.length - 1) {
                await new Promise(r => setTimeout(r, DELAY_MS));
            }
        }

        console.log(`\n─────────────────────────────────────────`);
        console.log(`✅  Generated: ${generated}  |  ❌  Failed: ${failed}`);
        console.log(`─────────────────────────────────────────`);
    } catch (err) {
        console.error('Fatal error:', err);
    } finally {
        await sequelize.close();
    }
}

main();
