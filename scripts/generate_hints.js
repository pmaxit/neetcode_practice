/**
 * generate_hints.js
 * ─────────────────
 * For each problem generates three things in one Gemini call:
 *   - guided_hints: 6-point plain-text blueprint (no code)
 *   - practice_scaffold: boilerplate-preserved Python with critical logic blanked out + # Think: prompts
 *   - pattern_hint: short algorithmic pattern phrase (e.g. "sliding window + hashmap")
 *
 * Usage:
 *   node scripts/generate_hints.js                  # process up to 10 problems missing any field
 *   node scripts/generate_hints.js --limit 50       # process up to 50
 *   node scripts/generate_hints.js --all            # process ALL problems missing any field
 *   node scripts/generate_hints.js --overwrite      # re-generate ALL (even existing)
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
        'SECTION 1 — Blueprint (plain text, no code):',
        'List every non-obvious decision a student would get stuck on when deriving this solution from scratch.',
        'One decision per line. Cover: data structure choice, key algorithmic moves, edge case handling, duplicate skipping, termination conditions — whatever is NOT obvious.',
        'Skip trivial steps (iterate, return result). Only include lines where a student would pause and think.',
        'Use as many lines as the problem needs. Simple problems: 1-2 lines. Hard problems: 4-6 lines.',
        'No punctuation, no grammar rules, no variable names, no filler words.',
        '',
        'Example for 3Sum:',
        '  "sort array first to enable two-pointer and duplicate skipping"',
        '  "fix one element, use two pointers on the rest to find pairs"',
        '  "stop outer loop early when fixed element is positive"',
        '  "skip duplicate values of the fixed element"',
        '  "after finding a triplet, advance both pointers and skip duplicate left values"',
        '',
        'Example for Contains Duplicate:',
        '  "hash set membership check before insert catches duplicates in O(1)"',
        '',
        'SECTION 2 — Practice Scaffold (valid Python):',
        'Copy the full reference solution but replace ONLY the critical/clever logic with:',
        '    # Think: <one Socratic question that nudges the student toward the insight>',
        '    # TODO: <one-line description of what to implement>',
        '    pass',
        'Keep ALL boilerplate: imports, class/method signatures, trivial loops, initializations, return statements.',
        'Replace at most 2 blanks. Do NOT wrap in markdown fences.',
        '',
        'SECTION 3 — Pattern (one short phrase only, e.g. "sliding window + hashmap" or "DFS + backtracking"):',
        'Name the core algorithmic technique(s) this problem uses. No explanation, just the phrase.',
        '',
        'Output format (nothing else):',
        '<1-line core insight fragment>',
        '---',
        '<practice scaffold python>',
        '---',
        '<pattern phrase>',
    ].join('\n');
}

function parseResponse(text) {
    const parts = text.split(/^---$/m);
    if (parts.length < 3) return null;
    return {
        guided_hints: parts[0].trim(),
        practice_scaffold: parts[1].trim(),
        pattern_hint: parts[2].trim(),
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

        const whereClause = overwrite
            ? {}
            : { [Op.or]: [{ guided_hints: null }, { practice_scaffold: null }, { pattern_hint: null }] };
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
