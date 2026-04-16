import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { Sequelize, DataTypes } from 'sequelize';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Database Setup — configure via .env (see .env.example)
const DB_HOST = process.env.DB_HOST;
const DB_USER = process.env.DB_USER;
const DB_PASS = process.env.DB_PASS;
const DB_NAME = process.env.DB_NAME;

// Database connection logic
// In Cloud Run, K_SERVICE is set. Use Unix socket there.
// Locally, use TCP (usually 127.0.0.1) via Cloud SQL Auth Proxy.
const useSocket = process.env.INSTANCE_CONNECTION_NAME && process.env.K_SERVICE;

const sequelize = useSocket
    ? new Sequelize(DB_NAME, DB_USER, DB_PASS, {
        host: `/cloudsql/${process.env.INSTANCE_CONNECTION_NAME}`,
        dialect: 'mysql',
        logging: false,
        dialectOptions: { socketPath: `/cloudsql/${process.env.INSTANCE_CONNECTION_NAME}` }
    })
    : new Sequelize(DB_NAME, DB_USER, DB_PASS, {
        host: DB_HOST || '127.0.0.1',
        dialect: 'mysql',
        logging: false,
        pool: {
            max: 5,
            min: 0,
            acquire: 30000,
            idle: 10000
        },
        retry: {
            match: [/Connection lost/i, /SequelizeConnectionError/i],
            max: 3
        }
    });

const Problem = sequelize.define('Problem', {
    id: { type: DataTypes.INTEGER, primaryKey: true },
    title: DataTypes.STRING,
    category: DataTypes.STRING,
    difficulty: DataTypes.STRING,
    statement: DataTypes.TEXT,
    examples: DataTypes.JSON,
    python_code: DataTypes.TEXT,
    mnemonic: DataTypes.TEXT,
    neetcode_url: DataTypes.STRING,
    leetcode_url: DataTypes.STRING,
    youtube_url: DataTypes.STRING
}, { timestamps: false, tableName: 'problems' });

const UserProgress = sequelize.define('UserProgress', {
    problem_id: { type: DataTypes.INTEGER, primaryKey: true },
    status: { type: DataTypes.STRING, defaultValue: 'not-started' },
    user_code: DataTypes.TEXT,
    user_notes: DataTypes.TEXT
}, { timestamps: true, tableName: 'user_progress' });

// API Routes
app.get('/api/problems', async (req, res) => {
    try {
        const problems = await Problem.findAll({ order: [['id', 'ASC']] });
        const progress = await UserProgress.findAll();

        const merged = problems.map((p) => {
            const prog = progress.find(u => u.problem_id === p.id);
            return {
                ...p.toJSON(),
                day: ((p.id - 1) % 19) + 1,
                user_status: prog ? prog.status : 'not-started',
                user_code: prog ? prog.user_code : '',
                user_notes: prog ? prog.user_notes : ''
            };
        });

        res.json(merged);
    } catch (error) {
        console.error('[API /api/problems] ERROR:', error);
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/progress', async (req, res) => {
    try {
        const progress = await UserProgress.findAll();
        const progressMap = {};
        progress.forEach(p => {
            progressMap[p.problem_id] = {
                status: p.status,
                completed: p.status === 'completed'
            };
        });
        res.json(progressMap);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/progress', async (req, res) => {
    const { problemId, status, code, notes } = req.body;
    try {
        await UserProgress.upsert({
            problem_id: problemId,
            status,
            user_code: code,
            user_notes: notes
        });
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Serve frontend
app.use(express.static(path.join(__dirname, 'dist')));

// Admin: Extract and store YouTube video links from NeetCode bundle
app.post('/api/admin/extract-videos', async (req, res) => {
    try {
        console.log('--- YouTube Video Extraction Triggered ---');

        // 1. Fetch the NeetCode Angular bundle
        const homeRes = await fetch('https://neetcode.io');
        const homeHtml = await homeRes.text();
        const bundleMatch = homeHtml.match(/src="(main\.[^"]+\.js)"/);
        if (!bundleMatch) return res.status(500).json({ error: 'Could not find NeetCode bundle URL' });

        const bundleUrl = `https://neetcode.io/${bundleMatch[1]}`;
        console.log(`Fetching bundle: ${bundleUrl}`);
        const bundleRes = await fetch(bundleUrl);
        const bundleJs = await bundleRes.text();

        // 2. Extract problem entries: {problem:"...", video:"...", link:"..."}
        const entries = [...bundleJs.matchAll(/\{problem:"([^"]+)",pattern:"([^"]+)",link:"([^"]+)",video:"([\w-]*)"/g)];
        const titleToVideo = {};
        for (const [, problem, , , video] of entries) {
            if (video) {
                const norm = problem.toLowerCase().replace(/[^a-z0-9]/g, '');
                titleToVideo[norm] = `https://www.youtube.com/watch?v=${video}`;
            }
        }
        console.log(`Extracted ${Object.keys(titleToVideo).length} video mappings`);

        // 3. Update DB problems that have matching titles
        const problems = await Problem.findAll();
        let updated = 0;
        for (const p of problems) {
            const norm = p.title.toLowerCase().replace(/[^a-z0-9]/g, '');
            const ytUrl = titleToVideo[norm];
            if (ytUrl && ytUrl !== p.youtube_url) {
                await p.update({ youtube_url: ytUrl });
                updated++;
            }
        }

        console.log(`Updated ${updated} problems with YouTube URLs`);
        res.json({ success: true, extracted: Object.keys(titleToVideo).length, updated });
    } catch (error) {
        console.error('Video extraction failed:', error);
        res.status(500).json({ error: error.message });
    }
});

// Admin Enrichment Pipeline
app.post('/api/admin/enrich', async (req, res) => {
    const LIST_URL = 'https://raw.githubusercontent.com/krmanik/Anki-NeetCode/main/neetcode-150-list.json';
    const DESC_BASE_URL = 'https://raw.githubusercontent.com/krmanik/Anki-NeetCode/main/data/leetcode-json-data/';
    const SOLUTION_BASE_URL = 'https://raw.githubusercontent.com/neetcode-gh/leetcode/main/python/';

    try {
        console.log('--- Database Enrichment Triggered ---');
        
        // 1. Fetch mapping
        const response = await fetch(LIST_URL);
        const mapping = await response.json();

        // 2. Fetch solution filenames
        const solRepoResponse = await fetch('https://api.github.com/repos/neetcode-gh/leetcode/contents/python');
        const solFiles = await solRepoResponse.json();
        const solMap = {};
        solFiles.forEach(f => {
            const match = f.name.match(/\d+-(.+)\.py/);
            if (match) solMap[match[1]] = f.name;
        });

        const flatProblems = [];
        for (const [category, problemsMap] of Object.entries(mapping)) {
            for (const [title, p] of Object.entries(problemsMap)) {
                flatProblems.push({ ...p, title, category });
            }
        }

        let updatedCount = 0;
        for (const p of flatProblems) {
            try {
                const slug = p.url.split('/problems/')[1].replace('/', '');
                console.log(`Enriching [${p.title}] with slug: ${slug}`);
                
                // Fetch Description
                const descResp = await fetch(`${DESC_BASE_URL}${slug}.json`);
                let statement = '';
                if (descResp.ok) {
                    const descData = await descResp.json();
                    statement = descData.content || '';
                } else {
                    console.warn(`  - Description fetch failed for ${slug} (${descResp.status})`);
                }

                // Fetch Solution
                let python_code = '';
                const solFilename = solMap[slug] || solMap[slug.replace(/-/g, '_')] || Object.keys(solMap).find(k => k.includes(slug));
                if (solFilename) {
                    const solResp = await fetch(`${SOLUTION_BASE_URL}${solFilename}`);
                    if (solResp.ok) {
                        python_code = await solResp.text();
                    } else {
                        console.warn(`  - Solution fetch failed for ${solFilename}`);
                    }
                }

                const record = await Problem.findOne({ where: { title: p.title } });
                if (record) {
                    await record.update({
                        statement: statement || record.statement || '',
                        python_code: python_code || record.python_code || '',
                        mnemonic: `Pattern: ${p.category}. Master the ${p.difficulty} level logic.`,
                        leetcode_url: p.url
                    });
                    updatedCount++;
                }
                await new Promise(r => setTimeout(r, 50));
            } catch (innerErr) {
                console.warn(`Enrichment failed for ${p.title}:`, innerErr.message);
            }
        }
        res.json({ success: true, message: `Successfully enriched ${updatedCount} problems.` });
    } catch (error) {
        console.error('Final Enrichment Pipeline failure:', error);
        res.status(500).json({ error: error.message });
    }
});

app.get('*all', (req, res) => {
    res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

// Seeding Logic
async function seedDatabase() {
    const count = await Problem.count();
    if (count === 0) {
        console.log('Database empty. Seeding problems...');
        try {
            const rawData = fs.readFileSync(path.join(__dirname, 'src', 'data', 'problems.json'), 'utf8');
            const problems = JSON.parse(rawData);
            
            const patterns = {
                "Arrays & Hashing": "Use HashMaps for O(1) lookup. Sort if order doesn't matter.",
                "Two Pointers": "Pointers at ends for target sum, or adjacent for partition.",
                "Sliding Window": "Expand right, shrink left when count/sum exceeds limit.",
                "Stack": "Use to reverse order or find Next Greater Element.",
                "Binary Search": "L, R + Mid. Use when search space is sorted.",
                "Linked List": "Dummy node, Two pointers (Fast/Slow), Reversing.",
                "Trees": "Recursion (DFS) or Queue (BFS). In-order is sorted for BST.",
                "Backtracking": "Choose, Explore, Unchoose. DFS with state.",
                "Graphs": "Adjacency list. Visit set. BFS for shortest path.",
                "Heaps": "Min/Max Heap for top-K problems.",
                "Dynamic Programming": "State (dp[i]), Transition, Base case. Memoize top-down or fill bottom-up.",
                "Bit Manipulation": "XOR for duplicates, AND with n-1 to clear LSB."
            };

            const enrichedProblems = problems.map(p => ({
                ...p,
                statement: `Practice this ${p.category} problem. Implement an optimal solution to achieve O(n) or better if possible.`,
                examples: [
                    { input: "nums = [1, 2, 3]", output: "true" }
                ],
                python_code: `class Solution:
    def solve(self, nums):
        # Your solution here
        pass`,
                mnemonic: patterns[p.category] || "Standard pattern solution."
            }));

            await Problem.bulkCreate(enrichedProblems);
            console.log(`Successfully seeded ${enrichedProblems.length} problems.`);
        } catch (err) {
            console.error('Seeding failed:', err);
        }
    } else {
        console.log('Database already has data. Skipping seed.');
    }
}

// Start Server
app.listen(PORT, async () => {
    console.log(`Server running on port ${PORT}`);
    
    try {
        await sequelize.authenticate();
        console.log('Database connected.');
        
        // Sync models
        await sequelize.sync();
        
        // Auto-seed if needed
        await seedDatabase();
    } catch (err) {
        console.error('Database initialization failed:', err);
    }
});

