/**
 * generate_hints.js
 * ─────────────────
 * One-time script to generate tailored step-by-step guided hints for each
 * LeetCode problem in the DB using Gemini, then persist them as `guided_hints`.
 *
 * Usage:
 *   node scripts/generate_hints.js                  # process up to 10 problems with no hints
 *   node scripts/generate_hints.js --limit 50       # process up to 50
 *   node scripts/generate_hints.js --all            # process ALL problems missing hints
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
const DELAY_MS = 400; // avoid Gemini rate limits

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
    statement: DataTypes.TEXT,
    python_code: DataTypes.TEXT,
    guided_hints: DataTypes.TEXT,
}, { timestamps: false, tableName: 'problems' });

// ─── Gemini setup ────────────────────────────────────────────────────────────
const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey || apiKey === 'your_gemini_api_key_here') {
    console.error('❌  GEMINI_API_KEY not set in .env');
    process.exit(1);
}
const genAI = new GoogleGenerativeAI(apiKey);
const model = genAI.getGenerativeModel({ model: 'gemini-flash-latest' });

// ─── Hint generation prompt ──────────────────────────────────────────────────
function buildPrompt(problem) {
    const cleanStatement = (problem.statement || '')
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .substring(0, 800);

    return [
        `You are an elite Lead Engineer acting as a mentor. Your task is to generate a "High-Impact Scaffold" for the LeetCode problem: "${problem.title}".`,
        `Category: ${problem.category}, Difficulty: ${problem.difficulty}`,
        '',
        `Problem Statement: ${cleanStatement}`,
        '',
        `Full Reference Solution:`,
        '```python',
        problem.python_code || '# Code not available',
        '```',
        '',
        'TASK:',
        'Identify the most "critical" or "clever" part of the solution (the algorithmic pivot).',
        'Generate a Python code snippet that includes the full class and method structure, preserving ALL "trivial" parts (loops, basic initializations, return statements).',
        '',
        'RULES:',
        '1. Replace ONLY the critical/clever logic with a single, high-quality descriptive comment and a "pass".',
        '2. The descriptive comment should start with "# GUIDED HINT: " and clearly explain the logic the candidate needs to implement here without giving the code away.',
        '3. Ensure the scaffold is valid Python syntax.',
        '4. DO NOT provide a list of steps. Provide EXACTLY ONE high-impact hint/blank unless the problem is truly multi-phase (maximum 2).',
        '5. Preserve the setup (e.g., if it uses a hash set, include "seen = set()").',
        '6. Output ONLY the resulting Python code block.',
        '7. DO NOT wrap in markdown fences (no ```).',
    ].join('\n');
}

// ─── Main ────────────────────────────────────────────────────────────────────
async function main() {
    try {
        await sequelize.authenticate();
        console.log('✅  Database connected\n');

        const whereClause = overwrite ? {} : { guided_hints: null };
        const problems = await Problem.findAll({ where: whereClause, limit: LIMIT, order: [['id', 'ASC']] });

        if (problems.length === 0) {
            console.log('🎉  All problems already have hints! Use --overwrite to regenerate.');
            process.exit(0);
        }

        console.log(`📋  Processing ${problems.length} problem(s)...\n`);

        let generated = 0;
        let failed = 0;

        for (const problem of problems) {
            process.stdout.write(`  [${problem.id}] ${problem.title}... `);
            try {
                const prompt = buildPrompt(problem);
                const result = await model.generateContent(prompt);
                const hints = result.response.text().trim();

                await problem.update({ guided_hints: hints });
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
