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
import { callLLM } from './llm_helper.js';

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
        'TIME COMPLEXITY: O(n) - single pass through array',
        'SPACE COMPLEXITY: O(n) - hash map stores at most n elements',
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
        'SECTION 5 — Blueprint (6 concise points):',
        'Provide a high-density, technical blueprint of the solution. STRICTLY AVOID generic steps like "initialize a variable", "loop through the array", or "return the result".',
        'Focus on the CORE ALGORITHMIC ENGINE and the "trick". Each point must contain a specific technical insight or optimization.',
        'Example for Two Sum:',
        '1. Use a hash map to reduce search complexity from O(n) to O(1).',
        '2. Store previously seen values as keys to enable backward-looking complement checks.',
        '3. Calculate the required complement (target - current) at each step.',
        '4. Instantaneous map lookups replace the need for a nested search loop.',
        '5. The single-pass approach ensures O(n) time complexity.',
        '6. Space complexity is O(n) to store the value-to-index mapping.',
        '',
        'Example for Trapping Rain Water:',
        '1. Use two pointers at the boundaries to bound the possible water level.',
        '2. Maintain left_max and right_max to track the elevation bottleneck at each side.',
        '3. Move the pointer pointing to the smaller maximum to process the current bottleneck.',
        '4. Water trapped at any bar is determined by the minimum of the two boundary heights.',
        '5. This greedy approach ensures we only process each bar once (O(n)).',
        '6. Constant space (O(1)) is achieved by not storing auxiliary prefix/suffix arrays.',
        '',
        'Output format (nothing else, NO markdown fences around the whole response):',
        'SECTION 1: <problem statement - MAX 50 WORDS>',
        '---',
        'SECTION 2: <solution explanation>',
        '---',
        'SECTION 3: <practice scaffold python>',
        '---',
        'SECTION 4: <pattern phrase>',
        '---',
        'SECTION 5: <6-point blueprint>',
        '',
        'STRICTLY follow the format. Use "---" on its own line as the ONLY separator.',
    ].join('\n');
}

function parseResponse(text) {
    // Strip markdown code blocks if the model wrapped the whole thing
    const cleanedText = text.replace(/^```[a-z]*\n/i, '').replace(/\n```$/m, '').trim();
    
    // Landmark detection: find where each section starts
    const findPos = (label) => {
        const regex = new RegExp(`SECTION ${label}:?`, 'i');
        const match = cleanedText.match(regex);
        return match ? match.index : -1;
    };

    const p1 = findPos(1);
    const p2 = findPos(2);
    const p4 = findPos(4);
    const p5 = findPos(5);

    // If we can't find the main anchor points, something is wrong
    if (p1 === -1 || p2 === -1 || p4 === -1 || p5 === -1) {
        // Fallback to simple dash split if anchors fail
        const parts = cleanedText.split(/\n?\s*---\s*\n?/m).map(s => s.trim()).filter(Boolean);
        if (parts.length >= 5) return {
            problem_format: parts[0],
            solution_format: parts[1],
            practice_scaffold: parts[2],
            pattern_hint: parts[3],
            guided_hints: parts[4]
        };
        return null;
    }

    // Extract sections based on landmarks
    const getClean = (start, end) => {
        let chunk = end !== -1 ? cleanedText.substring(start, end) : cleanedText.substring(start);
        // Remove the label itself from the start
        chunk = chunk.replace(/^SECTION \d+:?/i, '').trim();
        // Remove trailing/leading dashes
        chunk = chunk.replace(/^---+\s*/, '').replace(/\s*---+\s*$/, '').trim();
        return chunk;
    };

    const s1 = getClean(p1, p2);
    const s2 = getClean(p2, p4); 
    
    // Section 3 is everything between the end of Section 2 and the start of Section 4
    // But s2 currently includes Section 2 + Section 3. Let's fix that.
    // Actually, it's easier to find the separator after Section 2.
    const s2Content = s2.split(/\n?\s*---\s*\n?/m);
    
    let section2, section3;
    if (s2Content.length >= 2) {
        section2 = s2Content[0];
        section3 = s2Content[1];
    } else {
        // Fallback: if no dash, assume the last 1/3 is code or vice versa? 
        // Better: look for 'class Solution' or 'def ' as a marker for start of Section 3
        const codeMarker = s2.search(/\n(class |def |import )/);
        if (codeMarker !== -1) {
            section2 = s2.substring(0, codeMarker).trim();
            section3 = s2.substring(codeMarker).trim();
        } else {
            section2 = s2;
            section3 = "# Error: Could not isolate code section";
        }
    }

    const section4 = getClean(p4, p5);
    const section5 = getClean(p5, -1);

    return {
        problem_format: s1,
        solution_format: section2,
        practice_scaffold: section3,
        pattern_hint: section4,
        guided_hints: section5
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
                const responseText = await callLLM(buildPrompt(problem));
                const parsed = parseResponse(responseText.trim());
                if (!parsed) {
                    console.log('\n--- DEBUG: RAW RESPONSE (FULL) ---');
                    console.log(responseText);
                    console.log('----------------------------------\n');
                    throw new Error('Could not parse --- separator in response');
                }

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
