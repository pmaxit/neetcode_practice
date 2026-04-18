import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { Sequelize, DataTypes } from 'sequelize';
import cors from 'cors';
import dotenv from 'dotenv';
import { GoogleGenerativeAI } from '@google/generative-ai';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// ── Database Setup ─────────────────────────────────────────────────────────────
const DB_HOST = process.env.DB_HOST;
const DB_USER = process.env.DB_USER;
const DB_PASS = process.env.DB_PASS;
const DB_NAME = process.env.DB_NAME;
const DB_PORT = process.env.DB_PORT || 3306;

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
        port: DB_PORT,
        dialect: 'mysql',
        logging: false,
        pool: { max: 5, min: 0, acquire: 30000, idle: 10000 },
        retry: { match: [/Connection lost/i, /SequelizeConnectionError/i], max: 3 }
    });

// ── Models ─────────────────────────────────────────────────────────────────────

const User = sequelize.define('User', {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    email: { type: DataTypes.STRING(255), allowNull: false, unique: true },
    password_hash: { type: DataTypes.STRING(255), allowNull: false },
}, { timestamps: true, tableName: 'users' });

const StudySession = sequelize.define('StudySession', {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    user_id: { type: DataTypes.INTEGER, allowNull: false },
    name: { type: DataTypes.STRING(255), allowNull: false },
    is_default: { type: DataTypes.BOOLEAN, defaultValue: false },
}, { timestamps: true, tableName: 'study_sessions' });

User.hasMany(StudySession, { foreignKey: 'user_id' });
StudySession.belongsTo(User, { foreignKey: 'user_id' });

const Problem = sequelize.define('Problem', {
    id: { type: DataTypes.INTEGER, primaryKey: true },
    title: DataTypes.STRING,
    category: DataTypes.STRING,
    difficulty: DataTypes.STRING,
    statement: DataTypes.TEXT,
    examples: DataTypes.JSON,
    python_code: DataTypes.TEXT,
    mnemonic: DataTypes.TEXT,
    guided_hints: DataTypes.TEXT,
    neetcode_url: DataTypes.STRING,
    leetcode_url: DataTypes.STRING,
    youtube_url: DataTypes.STRING
}, { timestamps: false, tableName: 'problems' });

const UserProgress = sequelize.define('UserProgress', {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    user_id: { type: DataTypes.INTEGER, allowNull: true },
    session_id: { type: DataTypes.INTEGER, allowNull: true },
    problem_id: { type: DataTypes.INTEGER, allowNull: false },
    status: { type: DataTypes.STRING, defaultValue: 'not-started' },
    user_code: DataTypes.TEXT,
    practice_code: DataTypes.TEXT,
    user_notes: DataTypes.TEXT,
    is_favorite: { type: DataTypes.BOOLEAN, defaultValue: false }
}, {
    timestamps: true,
    tableName: 'user_progress',
    indexes: [{ unique: true, fields: ['user_id', 'session_id', 'problem_id'] }]
});

const SystemDesignProblem = sequelize.define('SystemDesignProblem', {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    title: DataTypes.STRING,
    slug: { type: DataTypes.STRING, unique: true },
    url: DataTypes.STRING,
    difficulty: DataTypes.STRING,
    content: DataTypes.TEXT('long'),
    scheduled_date: DataTypes.DATEONLY
}, { timestamps: false, tableName: 'system_design_problems' });

const SystemDesignProgress = sequelize.define('SystemDesignProgress', {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    user_id: { type: DataTypes.INTEGER, allowNull: true },
    session_id: { type: DataTypes.INTEGER, allowNull: true },
    problem_id: { type: DataTypes.INTEGER, allowNull: false },
    status: { type: DataTypes.STRING, defaultValue: 'not-started' },
    notes: DataTypes.TEXT
}, {
    timestamps: true,
    tableName: 'system_design_progress',
    indexes: [{ unique: true, fields: ['user_id', 'session_id', 'problem_id'] }]
});

const MLSystemDesignNote = sequelize.define('MLSystemDesignNote', {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    title: DataTypes.STRING,
    category: DataTypes.STRING,
    history: DataTypes.TEXT,
    example: DataTypes.TEXT,
    where_it_is_used: DataTypes.TEXT,
    technical_deep_dive: DataTypes.TEXT('long'),
    scheduled_date: DataTypes.DATEONLY
}, { timestamps: false, tableName: 'ml_system_design_notes' });

const UserSettings = sequelize.define('UserSettings', {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    user_id: { type: DataTypes.INTEGER, allowNull: true },
    planned_days: { type: DataTypes.INTEGER, defaultValue: 25 },
    revisions_per_day: { type: DataTypes.INTEGER, defaultValue: 3 }
}, { timestamps: true, tableName: 'user_settings' });

const ProgressLog = sequelize.define('ProgressLog', {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    user_id: { type: DataTypes.INTEGER, allowNull: true },
    session_id: { type: DataTypes.INTEGER, allowNull: true },
    problem_id: { type: DataTypes.INTEGER },
    status: { type: DataTypes.STRING },
}, { timestamps: true, tableName: 'progress_logs' });

// ── JWT & Auth Middleware ───────────────────────────────────────────────────────

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

function signToken(userId) {
    return jwt.sign({ sub: userId }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

async function requireAuth(req, res, next) {
    const header = req.headers['authorization'];
    if (!header?.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'No token provided' });
    }
    try {
        const payload = jwt.verify(header.slice(7), JWT_SECRET);
        req.userId = payload.sub;
        next();
    } catch {
        res.status(401).json({ error: 'Invalid or expired token' });
    }
}

async function requireSession(req, res, next) {
    const sessionId = parseInt(req.headers['x-session-id'], 10);
    if (!sessionId) return res.status(400).json({ error: 'X-Session-Id header required' });
    const session = await StudySession.findOne({ where: { id: sessionId, user_id: req.userId } });
    if (!session) return res.status(403).json({ error: 'Session not found or not yours' });
    req.sessionId = sessionId;
    next();
}

// ── Health Check ───────────────────────────────────────────────────────────────

app.get('/api/health', async (req, res) => {
    try {
        await sequelize.authenticate();
        res.json({ status: 'healthy', database: 'connected', timestamp: new Date().toISOString() });
    } catch (error) {
        console.error('[Health Check] FAILED:', error);
        res.status(503).json({ status: 'unhealthy', database: 'disconnected', error: error.message });
    }
});

// ── Auth Endpoints ─────────────────────────────────────────────────────────────

app.post('/api/auth/register', async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email and password required' });
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) return res.status(400).json({ error: 'Invalid email address' });

    try {
        const existing = await User.findOne({ where: { email: email.toLowerCase() } });
        if (existing) return res.status(409).json({ error: 'Email already registered' });

        const password_hash = await bcrypt.hash(password, 12);
        const user = await User.create({ email: email.toLowerCase(), password_hash });

        // Auto-create default session
        await StudySession.create({ user_id: user.id, name: 'Default Session', is_default: true });

        const token = signToken(user.id);
        res.status(201).json({ token, user: { id: user.id, email: user.email } });
    } catch (err) {
        console.error('[Auth Register]', err);
        res.status(500).json({ error: 'Registration failed' });
    }
});

app.post('/api/auth/login', async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email and password required' });

    try {
        const user = await User.findOne({ where: { email: email.toLowerCase() } });
        if (!user) return res.status(401).json({ error: 'Invalid email or password' });

        const valid = await bcrypt.compare(password, user.password_hash);
        if (!valid) return res.status(401).json({ error: 'Invalid email or password' });

        const token = signToken(user.id);
        res.json({ token, user: { id: user.id, email: user.email } });
    } catch (err) {
        console.error('[Auth Login]', err);
        res.status(500).json({ error: 'Login failed' });
    }
});

app.get('/api/auth/me', requireAuth, async (req, res) => {
    try {
        const user = await User.findByPk(req.userId, { attributes: ['id', 'email'] });
        if (!user) return res.status(404).json({ error: 'User not found' });
        res.json(user);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/auth/logout', (req, res) => {
    res.json({ success: true });
});

// ── Study Session Endpoints ────────────────────────────────────────────────────

app.get('/api/sessions', requireAuth, async (req, res) => {
    try {
        const sessions = await StudySession.findAll({
            where: { user_id: req.userId },
            order: [['createdAt', 'DESC']]
        });
        res.json(sessions);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/sessions', requireAuth, async (req, res) => {
    const { name } = req.body;
    if (!name || !name.trim()) return res.status(400).json({ error: 'Session name required' });
    if (name.trim().length > 100) return res.status(400).json({ error: 'Session name too long (max 100 chars)' });
    try {
        const session = await StudySession.create({ user_id: req.userId, name: name.trim() });
        res.status(201).json(session);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/sessions/:id', requireAuth, async (req, res) => {
    try {
        const session = await StudySession.findOne({
            where: { id: req.params.id, user_id: req.userId }
        });
        if (!session) return res.status(404).json({ error: 'Session not found' });
        res.json(session);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/sessions/:id', requireAuth, async (req, res) => {
    try {
        const session = await StudySession.findOne({
            where: { id: req.params.id, user_id: req.userId }
        });
        if (!session) return res.status(404).json({ error: 'Session not found' });
        if (session.is_default) return res.status(400).json({ error: 'Cannot delete the default session' });
        await session.destroy();
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ── System Design Endpoints ────────────────────────────────────────────────────

app.get('/api/system-design', requireAuth, requireSession, async (req, res) => {
    try {
        const problems = await SystemDesignProblem.findAll();
        const progress = await SystemDesignProgress.findAll({
            where: { user_id: req.userId, session_id: req.sessionId }
        });
        const progressMap = progress.reduce((acc, p) => {
            acc[p.problem_id] = p;
            return acc;
        }, {});

        const result = problems.map(p => ({
            ...p.toJSON(),
            status: progressMap[p.id]?.status || 'not-started',
            notes: progressMap[p.id]?.notes || ''
        }));

        res.json(result);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/system-design/today', async (req, res) => {
    try {
        const count = await SystemDesignProblem.count();
        if (count === 0) return res.status(404).json({ error: 'No problems found' });

        const dayIndex = Math.floor(Date.now() / (1000 * 60 * 60 * 24));
        const index = dayIndex % count;

        const todayProblem = await SystemDesignProblem.findOne({
            order: [['id', 'ASC']],
            offset: index,
            limit: 1
        });

        if (!todayProblem) return res.status(404).json({ error: 'No problems found' });
        res.json({ ...todayProblem.toJSON(), status: 'not-started', notes: '' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/ml-design/today', async (req, res) => {
    try {
        const count = await MLSystemDesignNote.count();
        if (count === 0) return res.status(404).json({ error: 'No notes found' });

        const dayIndex = Math.floor(Date.now() / (1000 * 60 * 60 * 24));
        const index = dayIndex % count;

        const todayNote = await MLSystemDesignNote.findOne({
            order: [['id', 'ASC']],
            offset: index,
            limit: 1
        });
        if (!todayNote) return res.status(404).json({ error: 'No ML notes found' });
        res.json(todayNote);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/ml-design', async (req, res) => {
    try {
        const notes = await MLSystemDesignNote.findAll({ order: [['title', 'ASC']] });
        res.json(notes);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/system-design/progress', requireAuth, requireSession, async (req, res) => {
    const { problem_id, status, notes } = req.body;
    try {
        let progress = await SystemDesignProgress.findOne({
            where: { user_id: req.userId, session_id: req.sessionId, problem_id }
        });
        if (progress) {
            if (status !== undefined) progress.status = status;
            if (notes !== undefined) progress.notes = notes;
            await progress.save();
        } else {
            progress = await SystemDesignProgress.create({
                user_id: req.userId, session_id: req.sessionId, problem_id, status, notes
            });
        }
        res.json(progress);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ── Daily Problem ──────────────────────────────────────────────────────────────

app.get('/api/daily', requireAuth, requireSession, async (req, res) => {
    try {
        const problems = await Problem.findAll({ order: [['id', 'ASC']] });
        const progress = await UserProgress.findAll({
            where: { user_id: req.userId, session_id: req.sessionId }
        });

        const merged = problems.map((p) => {
            const prog = progress.find(u => u.problem_id === p.id);
            return {
                ...p.toJSON(),
                day: Math.floor((p.id - 1) / 6) + 1,
                user_status: prog ? prog.status : 'not-started',
                user_code: prog ? prog.user_code : '',
                practice_code: prog ? prog.practice_code : '',
                user_notes: prog ? prog.user_notes : '',
                is_favorite: prog ? prog.is_favorite : false,
                guided_hints: p.guided_hints || null
            };
        });

        res.json(merged);
    } catch (error) {
        console.error('[API /api/daily] ERROR:', error);
        res.status(500).json({ error: error.message });
    }
});

// ── Toggle Favorite ────────────────────────────────────────────────────────────

app.post('/api/problems/:id/favorite', requireAuth, requireSession, async (req, res) => {
    const { id } = req.params;
    const { is_favorite } = req.body;
    try {
        let progress = await UserProgress.findOne({
            where: { user_id: req.userId, session_id: req.sessionId, problem_id: id }
        });
        if (progress) {
            progress.is_favorite = is_favorite;
            await progress.save();
        } else {
            progress = await UserProgress.create({
                user_id: req.userId, session_id: req.sessionId, problem_id: id, is_favorite
            });
        }
        res.json({ success: true, is_favorite: progress.is_favorite });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ── Problems List ──────────────────────────────────────────────────────────────

app.get('/api/problems', requireAuth, requireSession, async (req, res) => {
    try {
        const problems = await Problem.findAll({ order: [['id', 'ASC']] });
        const progress = await UserProgress.findAll({
            where: { user_id: req.userId, session_id: req.sessionId }
        });

        const merged = problems.map((p) => {
            const prog = progress.find(u => u.problem_id === p.id);
            return {
                ...p.toJSON(),
                day: Math.floor((p.id - 1) / 6) + 1,
                user_status: prog ? prog.status : 'not-started',
                user_code: prog ? prog.user_code : '',
                practice_code: prog ? prog.practice_code : '',
                user_notes: prog ? prog.user_notes : '',
                is_favorite: prog ? prog.is_favorite : false,
                guided_hints: p.guided_hints || null
            };
        });

        res.json(merged);
    } catch (error) {
        console.error('[API /api/problems] ERROR:', error);
        res.status(500).json({ error: error.message });
    }
});

// ── Progress ───────────────────────────────────────────────────────────────────

app.get('/api/progress', requireAuth, requireSession, async (req, res) => {
    try {
        const progress = await UserProgress.findAll({
            where: { user_id: req.userId, session_id: req.sessionId }
        });
        const progressMap = {};
        progress.forEach(p => {
            progressMap[p.problem_id] = {
                status: p.status,
                completed: p.status === 'completed',
                is_favorite: p.is_favorite
            };
        });
        res.json(progressMap);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/progress', requireAuth, requireSession, async (req, res) => {
    const { problemId, status, code, practiceCode, notes } = req.body;
    try {
        let progress = await UserProgress.findOne({
            where: { user_id: req.userId, session_id: req.sessionId, problem_id: problemId }
        });
        if (progress) {
            progress.status = status;
            progress.user_code = code;
            progress.practice_code = practiceCode;
            progress.user_notes = notes;
            await progress.save();
        } else {
            progress = await UserProgress.create({
                user_id: req.userId, session_id: req.sessionId, problem_id: problemId,
                status, user_code: code, practice_code: practiceCode, user_notes: notes
            });
        }

        await ProgressLog.create({
            user_id: req.userId,
            session_id: req.sessionId,
            problem_id: problemId,
            status: status === 'completed' ? 'completed' : 'attempt'
        });

        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ── Settings ───────────────────────────────────────────────────────────────────

app.get('/api/settings', requireAuth, async (req, res) => {
    try {
        let settings = await UserSettings.findOne({ where: { user_id: req.userId } });
        if (!settings) {
            settings = await UserSettings.create({ user_id: req.userId });
        }
        res.json(settings);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/settings', requireAuth, async (req, res) => {
    try {
        const { planned_days, revisions_per_day } = req.body;
        let settings = await UserSettings.findOne({ where: { user_id: req.userId } });
        if (!settings) {
            settings = await UserSettings.create({ user_id: req.userId, planned_days, revisions_per_day });
        } else {
            await settings.update({ planned_days, revisions_per_day });
        }
        res.json(settings);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ── Stats ──────────────────────────────────────────────────────────────────────

app.get('/api/stats', requireAuth, requireSession, async (req, res) => {
    try {
        const logs = await ProgressLog.findAll({
            where: { user_id: req.userId, session_id: req.sessionId },
            order: [['createdAt', 'ASC']]
        });

        const statsByDay = {};
        logs.forEach(log => {
            const date = log.createdAt.toISOString().split('T')[0];
            if (!statsByDay[date]) statsByDay[date] = { attempts: 0, completed: 0 };
            if (log.status === 'completed') statsByDay[date].completed++;
            else statsByDay[date].attempts++;
        });

        const totalSolved = await UserProgress.count({
            where: { user_id: req.userId, session_id: req.sessionId, status: 'completed' }
        });
        const totalProblems = await Problem.count();

        res.json({
            daily: statsByDay,
            summary: {
                totalSolved,
                totalProblems,
                percentage: Math.round((totalSolved / totalProblems) * 100) || 0
            }
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ── Reset Progress ─────────────────────────────────────────────────────────────

app.post('/api/settings/reset', requireAuth, requireSession, async (req, res) => {
    try {
        await UserProgress.destroy({
            where: { user_id: req.userId, session_id: req.sessionId }
        });
        await SystemDesignProgress.destroy({
            where: { user_id: req.userId, session_id: req.sessionId }
        });
        res.json({ success: true, message: 'All progress has been reset.' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ── Gemini Agent: Code Review ──────────────────────────────────────────────────

app.post('/api/agent/review', requireAuth, async (req, res) => {
    const { problemTitle, statement, description, userCode, hints, difficulty, category } = req.body;
    const problemText = statement || description || '';

    if (!userCode || userCode.trim().length < 10) {
        return res.status(400).json({ error: 'Please write some code before asking for a review.' });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey === 'your_gemini_api_key_here') {
        return res.status(500).json({ error: 'Gemini API key not configured. Add GEMINI_API_KEY to .env.' });
    }

    try {
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({
            model: 'gemini-2.5-flash',
            systemInstruction: [
                'You are an expert coding interview coach specializing in LeetCode-style problems.',
                'Your role is to review Python solutions written by an engineer practicing for interviews.',
                'Be concise, technical, and constructive. Focus on:',
                '  1. Correctness — does the logic handle all edge cases?',
                '  2. Time/Space complexity — state the Big-O with justification.',
                '  3. Minimal improvements — suggest only the most impactful changes with short code snippets.',
                '  4. Encourage the learner — acknowledge what they got right.',
                'Format your response in markdown with clear sections.',
                'Never rewrite the entire solution — only show the changed parts.',
            ].join('\n')
        });

        const cleanStatement = (problemText)
            .replace(/<[^>]+>/g, ' ')
            .replace(/\s+/g, ' ')
            .trim()
            .substring(0, 800);

        const userMessage = [
            `## Problem: ${problemTitle}`,
            `**Category:** ${category || 'Unknown'} | **Difficulty:** ${difficulty || 'Unknown'}`,
            '',
            '### Problem Statement (excerpt)',
            cleanStatement,
            '',
            '### Guided Hints Given to the User',
            hints ? `\`\`\`python\n${hints}\n\`\`\`` : 'No hints were provided.',
            '',
            '### User\'s Code',
            `\`\`\`python\n${userCode}\n\`\`\``,
            '',
            'Please review this code. Check if it works correctly, identify any issues,',
            'and suggest minimal changes with clear explanations.',
        ].join('\n');

        const result = await model.generateContent(userMessage);
        const responseText = result.response.text();
        res.json({ feedback: responseText });
    } catch (err) {
        console.error('[Agent Review] Error:', err);
        res.status(500).json({ error: 'Gemini API call failed: ' + err.message });
    }
});

// ── Admin: Batch Hint Generation ───────────────────────────────────────────────

app.post('/api/admin/generate-hints', async (req, res) => {
    const { limit = 10, overwrite = false } = req.body;

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey === 'your_gemini_api_key_here') {
        return res.status(500).json({ error: 'Gemini API key not configured.' });
    }

    try {
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

        const whereClause = overwrite ? {} : { guided_hints: null };
        const problems = await Problem.findAll({ where: whereClause, limit });

        let generated = 0;
        let failed = 0;
        const results = [];

        for (const problem of problems) {
            try {
                const cleanStatement = (problem.statement || '')
                    .replace(/<[^>]+>/g, ' ')
                    .replace(/\s+/g, ' ')
                    .trim()
                    .substring(0, 600);

                const codePreview = (problem.python_code || '')
                    .split('\n')
                    .slice(0, 8)
                    .join('\n');

                const prompt = [
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

                const result = await model.generateContent(prompt);
                const hints = result.response.text().trim();

                await problem.update({ guided_hints: hints });
                generated++;
                results.push({ id: problem.id, title: problem.title, status: 'ok' });
                console.log(`[Hints] Generated for: ${problem.title}`);
            } catch (err) {
                failed++;
                results.push({ id: problem.id, title: problem.title, status: 'error', error: err.message });
                console.warn(`[Hints] Failed for ${problem.title}:`, err.message);
            }
            await new Promise(r => setTimeout(r, 400));
        }

        res.json({ success: true, generated, failed, results });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ── Static Assets ──────────────────────────────────────────────────────────────

app.use(express.static(path.join(__dirname, 'dist')));

// ── Admin: Extract YouTube Video Links ────────────────────────────────────────

app.post('/api/admin/extract-videos', async (req, res) => {
    try {
        console.log('--- YouTube Video Extraction Triggered ---');

        const homeRes = await fetch('https://neetcode.io');
        const homeHtml = await homeRes.text();
        const bundleMatch = homeHtml.match(/src="(main\.[^"]+\.js)"/);
        if (!bundleMatch) return res.status(500).json({ error: 'Could not find NeetCode bundle URL' });

        const bundleUrl = `https://neetcode.io/${bundleMatch[1]}`;
        console.log(`Fetching bundle: ${bundleUrl}`);
        const bundleRes = await fetch(bundleUrl);
        const bundleJs = await bundleRes.text();

        const entries = [...bundleJs.matchAll(/\{problem:"([^"]+)",pattern:"([^"]+)",link:"([^"]+)",video:"([\w-]*)"/g)];
        const titleToVideo = {};
        for (const [, problem, , , video] of entries) {
            if (video) {
                const norm = problem.toLowerCase().replace(/[^a-z0-9]/g, '');
                titleToVideo[norm] = `https://www.youtube.com/watch?v=${video}`;
            }
        }
        console.log(`Extracted ${Object.keys(titleToVideo).length} video mappings`);

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

// ── Admin: Enrichment Pipeline ─────────────────────────────────────────────────

app.post('/api/admin/enrich', async (req, res) => {
    const LIST_URL = 'https://raw.githubusercontent.com/krmanik/Anki-NeetCode/main/neetcode-150-list.json';
    const DESC_BASE_URL = 'https://raw.githubusercontent.com/krmanik/Anki-NeetCode/main/data/leetcode-json-data/';
    const SOLUTION_BASE_URL = 'https://raw.githubusercontent.com/neetcode-gh/leetcode/main/python/';

    try {
        console.log('--- Database Enrichment Triggered ---');

        const response = await fetch(LIST_URL);
        const mapping = await response.json();

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

                const descResp = await fetch(`${DESC_BASE_URL}${slug}.json`);
                let statement = '';
                if (descResp.ok) {
                    const descData = await descResp.json();
                    statement = descData.content || '';
                } else {
                    console.warn(`  - Description fetch failed for ${slug} (${descResp.status})`);
                }

                let python_code = '';
                const solFilename = solMap[slug] || solMap[slug.replace(/-/g, '_')] || Object.keys(solMap).find(k => k.includes(slug));
                if (solFilename) {
                    const solResp = await fetch(`${SOLUTION_BASE_URL}${solFilename}`);
                    if (solResp.ok) python_code = await solResp.text();
                    else console.warn(`  - Solution fetch failed for ${solFilename}`);
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

// ── SPA Fallback ───────────────────────────────────────────────────────────────

app.get('/*splat', (req, res) => {
    res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

// ── Seeding Logic ──────────────────────────────────────────────────────────────

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
                examples: [{ input: "nums = [1, 2, 3]", output: "true" }],
                python_code: `class Solution:\n    def solve(self, nums):\n        # Your solution here\n        pass`,
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

// ── Start Server ───────────────────────────────────────────────────────────────

async function ensureTableStructure() {
    // These tables originally had problem_id as PK. If the migration hasn't run yet
    // (or server restarted before migration), handle the PK swap here so sync({ alter })
    // doesn't fail with ER_MULTIPLE_PRI_KEY.
    for (const table of ['user_progress', 'system_design_progress']) {
        try {
            const [cols] = await sequelize.query(`SHOW COLUMNS FROM \`${table}\` LIKE 'user_id'`);
            if (cols.length === 0) {
                // user_id not yet added — do the PK restructure
                await sequelize.query(
                    `ALTER TABLE \`${table}\` DROP PRIMARY KEY, ADD COLUMN id INT NOT NULL AUTO_INCREMENT FIRST, ADD PRIMARY KEY (id)`
                );
                await sequelize.query(
                    `ALTER TABLE \`${table}\` ADD COLUMN user_id INT NULL, ADD COLUMN session_id INT NULL`
                );
                console.log(`Restructured ${table} (added surrogate PK + tenant columns)`);
            }
        } catch (e) {
            // Table may not exist yet on a fresh deploy — sync({ alter }) will create it
            if (!e.message?.includes("doesn't exist")) {
                console.warn(`ensureTableStructure warning for ${table}:`, e.message);
            }
        }
    }
}

app.listen(PORT, async () => {
    console.log(`Server running on port ${PORT}`);
    try {
        await sequelize.authenticate();
        console.log('Database connected.');
        await ensureTableStructure();
        await sequelize.sync({ alter: true });
        await seedDatabase();
    } catch (err) {
        console.error('Database initialization failed:', err);
    }
});
