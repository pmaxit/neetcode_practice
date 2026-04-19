/**
 * Sync LeetCode problems from questions.md into the database.
 *
 * Usage:
 *   node scripts/sync_leetcode_questions.js              # dry-run (no DB writes)
 *   node scripts/sync_leetcode_questions.js --execute    # insert new problems
 *   node scripts/sync_leetcode_questions.js --execute --limit 20  # insert first 20 new
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { Sequelize, DataTypes } from 'sequelize';
import dotenv from 'dotenv';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const EXECUTE = process.argv.includes('--execute');
const LIMIT_IDX = process.argv.indexOf('--limit');
const LIMIT = LIMIT_IDX !== -1 ? parseInt(process.argv[LIMIT_IDX + 1], 10) : Infinity;

// ── DB Setup ───────────────────────────────────────────────────────────────────
const { DB_HOST, DB_USER, DB_PASS, DB_NAME, DB_PORT, INSTANCE_CONNECTION_NAME, K_SERVICE } = process.env;
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

// ── Parse questions.md ─────────────────────────────────────────────────────────
function parseQuestionsFile() {
    const filePath = path.join(__dirname, '..', 'questions.md');
    const lines = fs.readFileSync(filePath, 'utf8').split('\n');
    const ROW_RE = /^\|\s*(\d+)\s*\|\s*\[([^\]]+)\]\((https:\/\/leetcode\.com\/problems\/[^)]+)\)[^|]*\|\s*\[python3\]\((https:\/\/github\.com\/[^)]+)\)/;
    const problems = [];
    for (const line of lines) {
        const m = line.match(ROW_RE);
        if (!m) continue;
        const [, lcNumber, title, leetcodeUrl, githubUrl] = m;
        // Normalize URL to always end with /
        const normalizedUrl = leetcodeUrl.endsWith('/') ? leetcodeUrl : leetcodeUrl + '/';
        problems.push({ lcNumber: parseInt(lcNumber), title: title.trim(), leetcodeUrl: normalizedUrl, githubUrl });
    }
    return problems;
}

// ── LeetCode GraphQL ───────────────────────────────────────────────────────────
function slugFromUrl(url) {
    // https://leetcode.com/problems/two-sum/ → two-sum
    return url.replace(/\/$/, '').split('/problems/')[1];
}

async function fetchLeetCodeProblem(slug) {
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
                    question(titleSlug: $titleSlug) {
                        questionId title difficulty content
                        topicTags { name }
                        exampleTestcases
                    }
                }`,
                variables: { titleSlug: slug }
            })
        });
        if (!res.ok) return null;
        const json = await res.json();
        return json.data?.question || null;
    } catch {
        return null;
    }
}

function stripHtml(html) {
    if (!html) return '';
    return html
        .replace(/<[^>]+>/g, ' ')
        .replace(/&nbsp;/g, ' ')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&amp;/g, '&')
        .replace(/&quot;/g, '"')
        .replace(/\s+/g, ' ')
        .trim();
}

// ── GitHub Raw Solution ────────────────────────────────────────────────────────
async function fetchGithubSolution(githubUrl) {
    try {
        // Convert blob URL to raw URL
        const rawUrl = githubUrl
            .replace('github.com', 'raw.githubusercontent.com')
            .replace('/blob/', '/');
        const res = await fetch(rawUrl);
        if (!res.ok) return '';
        return await res.text();
    } catch {
        return '';
    }
}

// ── Main ───────────────────────────────────────────────────────────────────────
async function main() {
    await sequelize.authenticate();
    console.log('✓ Database connected');

    // Ensure tag column exists (add it if not)
    try {
        await sequelize.query("ALTER TABLE problems ADD COLUMN tag VARCHAR(255) DEFAULT 'neetcode'");
        console.log('✓ Added tag column to problems table');
    } catch (e) {
        if (!e.message?.includes('Duplicate column')) throw e;
        // Column already exists — fine
    }

    // Backfill existing neetcode problems
    const [backfilled] = await sequelize.query(
        "UPDATE problems SET tag = 'neetcode' WHERE tag IS NULL"
    );
    if (backfilled.affectedRows > 0) {
        console.log(`✓ Backfilled ${backfilled.affectedRows} existing problems with tag=neetcode`);
    }

    // Load existing leetcode_urls into a Set for O(1) lookup
    const existing = await Problem.findAll({ attributes: ['leetcode_url', 'title'] });
    const existingUrls = new Set(
        existing.map(p => p.leetcode_url?.endsWith('/') ? p.leetcode_url : (p.leetcode_url || '') + '/')
    );
    const existingTitles = new Set(existing.map(p => p.title?.toLowerCase()));
    console.log(`✓ ${existing.length} problems already in DB`);

    // Parse questions.md
    const allProblems = parseQuestionsFile();
    console.log(`✓ Parsed ${allProblems.length} problems from questions.md`);

    // Find new ones
    const newProblems = allProblems.filter(p =>
        !existingUrls.has(p.leetcodeUrl) && !existingTitles.has(p.title.toLowerCase())
    );
    console.log(`✓ ${newProblems.length} new problems to add (${allProblems.length - newProblems.length} already exist)\n`);

    if (!EXECUTE) {
        console.log('DRY RUN — no changes written. Pass --execute to insert.\n');
        console.log('First 20 new problems that would be added:');
        newProblems.slice(0, 20).forEach(p => console.log(`  #${p.lcNumber} ${p.title} → ${p.leetcodeUrl}`));
        if (newProblems.length > 20) console.log(`  ... and ${newProblems.length - 20} more`);
        await sequelize.close();
        return;
    }

    // Get next available ID
    const [[{ maxId }]] = await sequelize.query('SELECT MAX(id) as maxId FROM problems');
    let nextId = (maxId || 150) + 1;

    const toProcess = newProblems.slice(0, LIMIT);
    console.log(`Inserting up to ${toProcess.length} problems (limit: ${LIMIT === Infinity ? 'none' : LIMIT})...\n`);

    let inserted = 0, skippedPremium = 0, skippedError = 0;

    for (let i = 0; i < toProcess.length; i++) {
        const { lcNumber, title, leetcodeUrl, githubUrl } = toProcess[i];
        const slug = slugFromUrl(leetcodeUrl);

        process.stdout.write(`[${i + 1}/${toProcess.length}] #${lcNumber} ${title}... `);

        // Fetch from LeetCode GraphQL
        const lcData = await fetchLeetCodeProblem(slug);
        await new Promise(r => setTimeout(r, 600));

        if (!lcData) {
            console.log('⚠ skipped (premium or not found)');
            skippedPremium++;
            continue;
        }

        // Fetch Python solution from GitHub
        const python_code = await fetchGithubSolution(githubUrl);
        await new Promise(r => setTimeout(r, 200));

        const category = lcData.topicTags?.[0]?.name || 'General';
        const statement = stripHtml(lcData.content);

        try {
            await Problem.create({
                id: nextId,
                title: lcData.title || title,
                category,
                difficulty: lcData.difficulty || 'Medium',
                tag: 'leetcode',
                statement,
                examples: [],
                python_code,
                mnemonic: '',
                guided_hints: null,
                neetcode_url: null,
                leetcode_url: leetcodeUrl,
                youtube_url: null
            });
            console.log(`✓ (id=${nextId}, ${lcData.difficulty}, ${category})`);
            nextId++;
            inserted++;
        } catch (err) {
            console.log(`✗ DB error: ${err.message}`);
            skippedError++;
        }

        // Progress report every 25
        if ((i + 1) % 25 === 0) {
            console.log(`\n── Progress: ${inserted} inserted, ${skippedPremium} premium/skip, ${skippedError} errors ──\n`);
        }
    }

    console.log(`\n${'─'.repeat(50)}`);
    console.log(`✅ Done!`);
    console.log(`   Inserted:       ${inserted}`);
    console.log(`   Premium/skip:   ${skippedPremium}`);
    console.log(`   Errors:         ${skippedError}`);
    console.log(`   Total in DB:    ${existing.length + inserted}`);

    await sequelize.close();
}

main().catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
});
