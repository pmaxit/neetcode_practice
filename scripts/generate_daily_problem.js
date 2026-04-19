/**
 * Generate one new AI-authored LeetCode-style problem based on the topics
 * covered in a specific day of a user's study plan.
 *
 * Usage:
 *   node scripts/generate_daily_problem.js --user-id 1 --session-id 1
 *   node scripts/generate_daily_problem.js --user-id 1 --session-id 1 --day 5
 *   node scripts/generate_daily_problem.js --user-id 1 --session-id 1 --day 5 --dry-run
 *
 * Options:
 *   --user-id    <n>   Required. DB user ID
 *   --session-id <n>   Required. DB session ID
 *   --day        <n>   Optional. Day number in the study plan (default: today's day)
 *   --dry-run          Print generated problem without writing to DB
 */
import { fileURLToPath } from 'url';
import path from 'path';
import { Sequelize, DataTypes, Op } from 'sequelize';
import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ── CLI Args ───────────────────────────────────────────────────────────────────

function getArg(flag) {
    const idx = process.argv.indexOf(flag);
    return idx !== -1 ? process.argv[idx + 1] : null;
}

const USER_ID    = parseInt(getArg('--user-id'), 10);
const SESSION_ID = parseInt(getArg('--session-id'), 10);
const DAY_ARG    = getArg('--day');
const DRY_RUN    = process.argv.includes('--dry-run');

if (!USER_ID || !SESSION_ID) {
    console.error('Usage: node generate_daily_problem.js --user-id <n> --session-id <n> [--day <n>] [--dry-run]');
    process.exit(1);
}

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

const StudyPlan = sequelize.define('StudyPlan', {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    user_id: DataTypes.INTEGER,
    session_id: DataTypes.INTEGER,
    config_json: DataTypes.TEXT,
    plan_json: DataTypes.TEXT('long')
}, { timestamps: true, tableName: 'study_plans' });

// ── Helpers ────────────────────────────────────────────────────────────────────

function computeTodayDayFromPlan(planCreatedAt, totalDays) {
    const created = new Date(planCreatedAt);
    created.setHours(0, 0, 0, 0);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const elapsed = Math.floor((today - created) / (1000 * 60 * 60 * 24)) + 1;
    return Math.min(Math.max(elapsed, 1), totalDays);
}

// ── Main ───────────────────────────────────────────────────────────────────────

async function main() {
    await sequelize.authenticate();
    console.log('✓ Database connected');

    // 1. Load the study plan for this user+session
    const planRow = await StudyPlan.findOne({
        where: { user_id: USER_ID, session_id: SESSION_ID },
        order: [['createdAt', 'DESC']]
    });

    if (!planRow) {
        console.error(`✗ No AI study plan found for user_id=${USER_ID} session_id=${SESSION_ID}`);
        console.error('  Generate a plan first via the web app (Settings → Generate AI Study Plan).');
        process.exit(1);
    }

    const planData = JSON.parse(planRow.plan_json);
    const totalDays = planData.days;

    // 2. Determine target day
    const targetDay = DAY_ARG
        ? parseInt(DAY_ARG, 10)
        : computeTodayDayFromPlan(planRow.createdAt, totalDays);

    if (targetDay < 1 || targetDay > totalDays) {
        console.error(`✗ Day ${targetDay} out of range (plan has ${totalDays} days)`);
        process.exit(1);
    }

    console.log(`✓ Study plan: ${totalDays} days (user_id=${USER_ID}, session_id=${SESSION_ID})`);
    console.log(`✓ Target day: Day ${targetDay}`);

    // 3. Get the problem IDs for that day
    const dayPlan = planData.plan[String(targetDay)];
    if (!dayPlan || (!dayPlan.new?.length && !dayPlan.revision?.length)) {
        console.error(`✗ No problems found for Day ${targetDay} in the plan`);
        process.exit(1);
    }

    const allIds = [...new Set([...(dayPlan.new || []), ...(dayPlan.revision || [])])];
    console.log(`✓ Day ${targetDay} has ${allIds.length} problems (${dayPlan.new?.length || 0} new + ${dayPlan.revision?.length || 0} revision)`);

    // 4. Fetch problem details from DB
    const dayProblems = await Problem.findAll({ where: { id: { [Op.in]: allIds } } });

    if (dayProblems.length === 0) {
        console.error('✗ Could not fetch problems from DB');
        process.exit(1);
    }

    // 5. Summarise topics for the prompt
    const topicGroups = {};
    for (const p of dayProblems) {
        const cat = p.category || 'General';
        if (!topicGroups[cat]) topicGroups[cat] = [];
        topicGroups[cat].push({ title: p.title, difficulty: p.difficulty });
    }

    const topicSummary = Object.entries(topicGroups)
        .map(([cat, probs]) => {
            const lines = probs.map(p => `  - ${p.title} (${p.difficulty})`).join('\n');
            return `${cat}:\n${lines}`;
        })
        .join('\n\n');

    const categories = Object.keys(topicGroups);
    const primaryCategory = categories[0];

    console.log('\nTopics covered today:');
    console.log(topicSummary);

    // 6. Build Gemini prompt
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey === 'your_gemini_api_key_here') {
        console.error('✗ GEMINI_API_KEY not set in .env');
        process.exit(1);
    }

    const prompt = `You are a senior competitive programming problem setter who creates elite, original interview problems.

A student has been studying these LeetCode problems today (Day ${targetDay}):

${topicSummary}

Your task: Create ONE brand-new, completely original problem that:
1. Combines or builds upon the TOPICS above
2. Is SIGNIFICANTLY more challenging — aim for Hard difficulty
3. Has NEVER appeared on LeetCode or any competitive programming site
4. Requires a non-obvious insight or combination of the techniques practised today
5. Follows exact LeetCode problem format

Requirements for the problem:
- Clear, unambiguous problem statement with constraints (include n, value ranges)
- At least 2 worked examples with input, output, and explanation
- A complete, working Python 3 solution using the most optimal algorithm
- The solution must include inline comments explaining the key insight
- A one-line mnemonic capturing the core trick

Return ONLY valid JSON (absolutely no markdown fences, no extra text):
{
  "title": "Problem Title Here",
  "difficulty": "Hard",
  "category": "${primaryCategory}",
  "statement": "Full problem statement.\\n\\nConstraints:\\n- 1 <= n <= 10^5\\n- ...",
  "examples": [
    {
      "input": "param1 = value1, param2 = value2",
      "output": "expected_output",
      "explanation": "Step-by-step walkthrough of why this is correct."
    },
    {
      "input": "param1 = value2, param2 = value3",
      "output": "expected_output_2",
      "explanation": "Walkthrough of the second example."
    }
  ],
  "python_code": "class Solution:\\n    def solve(self, ...) -> ...:\\n        # KEY INSIGHT: explain the non-obvious trick here\\n        ...",
  "mnemonic": "One sentence that captures the core trick so you never forget it."
}`;

    console.log('\nCalling Gemini to generate problem...');

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

    // Stream the generation so we can see progress
    const streamResult = await model.generateContentStream(prompt);
    let fullText = '';
    process.stdout.write('Streaming: ');
    for await (const chunk of streamResult.stream) {
        const text = chunk.text();
        fullText += text;
        process.stdout.write('.');
    }
    console.log(' done.\n');

    // 7. Parse the JSON response
    let cleaned = fullText.trim()
        .replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/, '');

    let generated;
    try {
        generated = JSON.parse(cleaned);
    } catch (e) {
        console.error('✗ Gemini returned invalid JSON. Raw output:');
        console.error(cleaned.substring(0, 500));
        process.exit(1);
    }

    // 8. Validate required fields
    const required = ['title', 'difficulty', 'category', 'statement', 'examples', 'python_code'];
    for (const field of required) {
        if (!generated[field]) {
            console.error(`✗ Missing required field: ${field}`);
            process.exit(1);
        }
    }

    // 9. Preview the generated problem
    console.log('━'.repeat(60));
    console.log(`Title:      ${generated.title}`);
    console.log(`Difficulty: ${generated.difficulty}`);
    console.log(`Category:   ${generated.category}`);
    console.log(`Mnemonic:   ${generated.mnemonic || '—'}`);
    console.log('\nStatement (excerpt):');
    console.log(generated.statement.substring(0, 400) + (generated.statement.length > 400 ? '...' : ''));
    console.log('\nExamples:');
    (generated.examples || []).forEach((ex, i) => {
        console.log(`  Example ${i + 1}:`);
        console.log(`    Input:  ${ex.input}`);
        console.log(`    Output: ${ex.output}`);
        if (ex.explanation) console.log(`    Explain: ${ex.explanation.substring(0, 120)}`);
    });
    console.log('\nSolution (first 10 lines):');
    console.log(generated.python_code.split('\n').slice(0, 10).join('\n'));
    console.log('━'.repeat(60));

    if (DRY_RUN) {
        console.log('\n[DRY RUN] Problem not written to DB. Remove --dry-run to insert.');
        await sequelize.close();
        return;
    }

    // 10. Insert into problems table
    const [[{ maxId }]] = await sequelize.query('SELECT MAX(id) as maxId FROM problems');
    const newId = (maxId || 0) + 1;

    await Problem.create({
        id: newId,
        title: generated.title,
        category: generated.category,
        difficulty: generated.difficulty,
        tag: 'ai',
        statement: generated.statement,
        examples: generated.examples,
        python_code: generated.python_code,
        mnemonic: generated.mnemonic || '',
        guided_hints: null,
        neetcode_url: null,
        leetcode_url: null,
        youtube_url: null
    });

    // Patch the study plan so the problem appears on Day N in the daily view
    planData.plan[String(targetDay)].new.push(newId);
    await planRow.update({ plan_json: JSON.stringify(planData) });
    console.log(`✓ Study plan updated — problem will appear on Day ${targetDay} in the daily view`);

    console.log(`\n✅ Inserted: "${generated.title}" (id=${newId}, tag=ai, Day ${targetDay})`);
    console.log(`   Browse it in the app under "AI Generated" tag filter`);

    await sequelize.close();
}

main().catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
});
