/**
 * generate_hints.js
 * ─────────────────
 * For each problem generates two things in one Gemini call:
 *   - guided_hints: 6-point plain-text blueprint (no code)
 *   - practice_scaffold: boilerplate-preserved Python with only the critical logic blanked out
 *
 * Usage:
 *   node scripts/generate_hints.js                  # process up to 10 problems missing both fields
 *   node scripts/generate_hints.js --limit 50       # process up to 50
 *   node scripts/generate_hints.js --all            # process ALL problems missing either field
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
        'Produce TWO sections separated by exactly the line "---":',
        '',
        'SECTION 1 — Solution Blueprint (plain text, no code):',
        'Exactly 6 numbered lines:',
        '1. State definition: what to store',
        '2. Base case',
        '3. Core transition (the key algorithmic decision)',
        '4. Iteration strategy (high-level only)',
        '5. Initialization',
        '6. Where to find the final answer',
        'Rules: no code, no pseudocode, no variable names, 1-2 lines per point.',
        '',
        'SECTION 2 — Practice Scaffold (valid Python):',
        'Copy the full reference solution but replace ONLY the critical/clever logic with:',
        '    # TODO: <one-line description of what to implement>',
        '    pass',
        'Keep ALL boilerplate: imports, class/method signatures, trivial loops, initializations, return statements.',
        'Replace at most 2 blanks. Do NOT wrap in markdown fences.',
        '',
        'Output format (nothing else):',
        '<6 blueprint lines>',
        '---',
        '<practice scaffold python>',
    ].join('\n');
}

function parseResponse(text) {
    const parts = text.split(/^---$/m);
    if (parts.length < 2) return null;
    return {
        guided_hints: parts[0].trim(),
        practice_scaffold: parts[1].trim(),
    };
}

// ─── Main ────────────────────────────────────────────────────────────────────
async function main() {
    try {
        await sequelize.authenticate();
        console.log('✅  Database connected\n');

        const whereClause = overwrite
            ? {}
            : { [Op.or]: [{ guided_hints: null }, { practice_scaffold: null }] };
        const problems = await Problem.findAll({ where: whereClause, limit: LIMIT, order: [['id', 'ASC']] });

        if (problems.length === 0) {
            console.log('🎉  All problems already have blueprints and scaffolds! Use --overwrite to regenerate.');
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
