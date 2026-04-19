/**
 * Fix problems with missing/empty statement fields.
 * Tries LeetCode GraphQL first, falls back to Anki-NeetCode GitHub JSON,
 * then generates a statement via Gemini for premium/unfetchable problems.
 *
 * Usage:
 *   node scripts/fix_missing_statements.js              # dry-run (no DB writes)
 *   node scripts/fix_missing_statements.js --execute    # update missing statements
 *   node scripts/fix_missing_statements.js --execute --limit 20
 */
import { Sequelize, DataTypes, Op } from 'sequelize';
import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';

dotenv.config();

const EXECUTE = process.argv.includes('--execute');
const LIMIT_IDX = process.argv.indexOf('--limit');
const LIMIT = LIMIT_IDX !== -1 ? parseInt(process.argv[LIMIT_IDX + 1], 10) : Infinity;

// ── DB Setup ───────────────────────────────────────────────────────────────────
const { DB_HOST, DB_USER, DB_PASS, DB_NAME, DB_PORT, INSTANCE_CONNECTION_NAME, K_SERVICE, GEMINI_API_KEY } = process.env;
const useSocket = INSTANCE_CONNECTION_NAME && K_SERVICE;
const sequelize = useSocket
    ? new Sequelize(DB_NAME, DB_USER, DB_PASS, {
        host: `/cloudsql/${INSTANCE_CONNECTION_NAME}`, dialect: 'mysql', logging: false,
        dialectOptions: { socketPath: `/cloudsql/${INSTANCE_CONNECTION_NAME}` }
    })
    : new Sequelize(DB_NAME, DB_USER, DB_PASS, {
        host: DB_HOST || '127.0.0.1', port: DB_PORT || 3306, dialect: 'mysql', logging: false
    });

const Problem = sequelize.define('Problem', {
    id: { type: DataTypes.INTEGER, primaryKey: true },
    title: DataTypes.STRING,
    category: DataTypes.STRING,
    difficulty: DataTypes.STRING,
    tag: { type: DataTypes.STRING, defaultValue: 'neetcode' },
    statement: DataTypes.TEXT,
    examples: DataTypes.JSON,
    python_code: DataTypes.TEXT,
    mnemonic: DataTypes.TEXT,
    guided_hints: DataTypes.TEXT,
    neetcode_url: DataTypes.STRING,
    leetcode_url: DataTypes.STRING,
    youtube_url: DataTypes.STRING
}, { timestamps: false, tableName: 'problems' });

// ── Gemini Setup ───────────────────────────────────────────────────────────────
if (!GEMINI_API_KEY) {
    console.error('❌  GEMINI_API_KEY not set in .env');
    process.exit(1);
}
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

// ── Helpers ────────────────────────────────────────────────────────────────────
function slugFromUrl(url) {
    if (!url) return null;
    return url.replace(/\/$/, '').split('/problems/')[1] || null;
}

async function fetchLeetCodeStatement(slug) {
    try {
        const res = await fetch('https://leetcode.com/graphql', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Referer': 'https://leetcode.com',
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
            },
            body: JSON.stringify({
                query: `query getQuestion($titleSlug: String!) {
                    question(titleSlug: $titleSlug) { content }
                }`,
                variables: { titleSlug: slug }
            })
        });
        if (!res.ok) return null;
        const json = await res.json();
        return json.data?.question?.content || null;
    } catch {
        return null;
    }
}

async function fetchAnkiStatement(slug) {
    try {
        const url = `https://raw.githubusercontent.com/krmanik/Anki-NeetCode/main/data/leetcode-json-data/${slug}.json`;
        const res = await fetch(url);
        if (!res.ok) return null;
        const data = await res.json();
        return data.content || null;
    } catch {
        return null;
    }
}

async function generateStatement(title, difficulty, category, leetcodeUrl) {
    const prompt = `You are writing the problem statement for the LeetCode problem titled "${title}" (difficulty: ${difficulty}, category: ${category}${leetcodeUrl ? `, URL: ${leetcodeUrl}` : ''}).

This is a well-known LeetCode coding interview problem. Write an accurate and complete problem statement exactly as it would appear on LeetCode, including:
- A clear problem description
- Input/output format
- Constraints
- 2-3 examples with Input, Output, and Explanation

Format the output as clean HTML using <p>, <ul>, <li>, <pre>, <strong>, <code> tags as LeetCode does. Do not include any markdown. Do not add any preamble or explanation — output only the HTML problem statement.`;

    const result = await model.generateContent(prompt);
    const text = result.response.text().trim();
    // Strip markdown code fences if Gemini wrapped it
    return text.replace(/^```html\n?/, '').replace(/\n?```$/, '').trim();
}

// ── Main ───────────────────────────────────────────────────────────────────────
async function main() {
    await sequelize.authenticate();
    console.log('✓ Database connected');

    const missing = await Problem.findAll({
        where: {
            tag: { [Op.ne]: 'ai' },
            [Op.or]: [
                { statement: null },
                { statement: '' }
            ]
        },
        attributes: ['id', 'title', 'difficulty', 'category', 'leetcode_url', 'tag'],
        order: [['id', 'ASC']]
    });

    console.log(`✓ Found ${missing.length} problems with missing statements\n`);

    if (missing.length === 0) {
        console.log('Nothing to fix!');
        await sequelize.close();
        return;
    }

    if (!EXECUTE) {
        console.log('DRY RUN — no changes written. Pass --execute to fix.\n');
        console.log('Problems with missing statements:');
        missing.slice(0, 30).forEach(p =>
            console.log(`  [${p.tag}] #${p.id} ${p.title} → ${p.leetcode_url || 'no leetcode_url'}`)
        );
        if (missing.length > 30) console.log(`  ... and ${missing.length - 30} more`);
        await sequelize.close();
        return;
    }

    const toProcess = missing.slice(0, LIMIT);
    console.log(`Fixing up to ${toProcess.length} problems (limit: ${LIMIT === Infinity ? 'none' : LIMIT})...\n`);

    let fixed = 0, fromLeetcode = 0, fromAnki = 0, fromGemini = 0, errored = 0;

    for (let i = 0; i < toProcess.length; i++) {
        const problem = toProcess[i];
        const slug = slugFromUrl(problem.leetcode_url);

        process.stdout.write(`[${i + 1}/${toProcess.length}] #${problem.id} ${problem.title}... `);

        let statement = null;
        let source = null;

        if (slug) {
            // 1. Try LeetCode GraphQL
            statement = await fetchLeetCodeStatement(slug);
            await new Promise(r => setTimeout(r, 600));
            if (statement) source = 'leetcode';

            // 2. Fallback: Anki-NeetCode GitHub JSON
            if (!statement) {
                statement = await fetchAnkiStatement(slug);
                await new Promise(r => setTimeout(r, 200));
                if (statement) source = 'anki';
            }
        }

        // 3. Fallback: Generate via Gemini
        if (!statement) {
            try {
                statement = await generateStatement(
                    problem.title,
                    problem.difficulty || 'Medium',
                    problem.category || 'General',
                    problem.leetcode_url
                );
                if (statement) source = 'gemini';
            } catch (err) {
                console.log(`✗ Gemini error: ${err.message}`);
                errored++;
                continue;
            }
        }

        if (!statement) {
            console.log('✗ all sources failed');
            errored++;
            continue;
        }

        await problem.update({ statement });
        if (source === 'leetcode') fromLeetcode++;
        else if (source === 'anki') fromAnki++;
        else fromGemini++;
        fixed++;
        console.log(`✓ [${source}] (${statement.length} chars)`);

        if ((i + 1) % 25 === 0) {
            console.log(`\n── Progress: ${fixed} fixed (lc:${fromLeetcode} anki:${fromAnki} gemini:${fromGemini}), ${errored} errors ──\n`);
        }
    }

    console.log(`\n${'─'.repeat(50)}`);
    console.log(`✅ Done!`);
    console.log(`   Fixed:       ${fixed} (LeetCode: ${fromLeetcode}, Anki: ${fromAnki}, Gemini: ${fromGemini})`);
    console.log(`   Errors:      ${errored}`);
    console.log(`   Remaining:   ${missing.length - fixed} still missing`);

    await sequelize.close();
}

main().catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
});
