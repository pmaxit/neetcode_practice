import request from 'supertest';
import express from 'express';
import jwt from 'jsonwebtoken';

// We need to spin up a minimal app with the same Annotation model logic for testing.
// Since server.js uses top-level imports and starts the server, we create a minimal test app.

import { Sequelize, DataTypes } from 'sequelize';

const JWT_SECRET = 'test-secret-key';

function signToken(userId) {
    return jwt.sign({ sub: userId }, JWT_SECRET, { expiresIn: '1h' });
}

function requireAuth(req, res, next) {
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

function requireSession(req, res, next) {
    const sessionId = parseInt(req.headers['x-session-id'], 10);
    if (!sessionId) return res.status(400).json({ error: 'X-Session-Id header required' });
    req.sessionId = sessionId;
    next();
}

async function createTestApp() {
    const sequelize = new Sequelize('sqlite::memory:', { logging: false });

    const Annotation = sequelize.define('Annotation', {
        id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
        session_id: { type: DataTypes.INTEGER, allowNull: false },
        problem_id: { type: DataTypes.INTEGER, allowNull: false },
        image_blob: { type: DataTypes.BLOB, allowNull: false },
    }, { timestamps: true, tableName: 'annotations' });

    await sequelize.sync();

    const app = express();
    app.use(express.json({ limit: '10mb' }));

    app.post('/api/annotations', requireAuth, requireSession, async (req, res) => {
        const { imageDataUrl, problemId } = req.body;
        if (!imageDataUrl || !imageDataUrl.startsWith('data:image/png;base64,')) {
            return res.status(400).json({ error: 'imageDataUrl must be a base64 PNG data URL' });
        }
        if (!problemId) {
            return res.status(400).json({ error: 'problemId is required' });
        }
        try {
            const base64Data = imageDataUrl.replace(/^data:image\/png;base64,/, '');
            const buffer = Buffer.from(base64Data, 'base64');
            const annotation = await Annotation.create({
                session_id: req.sessionId,
                problem_id: parseInt(problemId, 10),
                image_blob: buffer
            });
            res.status(201).json({ id: annotation.id, success: true });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });

    app.get('/api/annotations', requireAuth, requireSession, async (req, res) => {
        try {
            const annotations = await Annotation.findAll({
                where: { session_id: req.sessionId },
                order: [['createdAt', 'DESC']]
            });
            const result = annotations.map(a => ({
                id: a.id,
                session_id: a.session_id,
                problem_id: a.problem_id,
                createdAt: a.createdAt,
                updatedAt: a.updatedAt
            }));
            res.json(result);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });

    app.get('/api/annotations/:id', requireAuth, requireSession, async (req, res) => {
        try {
            const annotation = await Annotation.findOne({
                where: { id: req.params.id, session_id: req.sessionId }
            });
            if (!annotation) return res.status(404).json({ error: 'Annotation not found' });
            const base64 = annotation.image_blob.toString('base64');
            res.json({
                id: annotation.id,
                session_id: annotation.session_id,
                problem_id: annotation.problem_id,
                imageDataUrl: `data:image/png;base64,${base64}`,
                createdAt: annotation.createdAt,
                updatedAt: annotation.updatedAt
            });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });

    return { app, Annotation, sequelize };
}

describe('Annotations API Integration', () => {
    let app;
    let sequelize;
    let token;
    let sessionId = 1;

    beforeAll(async () => {
        const setup = await createTestApp();
        app = setup.app;
        sequelize = setup.sequelize;
        token = signToken(1);
    });

    afterAll(async () => {
        await sequelize.close();
    });

    test('POST with valid data returns 201 and creates annotation', async () => {
        const imageDataUrl = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
        const res = await request(app)
            .post('/api/annotations')
            .set('Authorization', `Bearer ${token}`)
            .set('X-Session-Id', String(sessionId))
            .send({ imageDataUrl, problemId: 42 });

        expect(res.status).toBe(201);
        expect(res.body.id).toBeDefined();
        expect(res.body.success).toBe(true);
    });

    test('GET list returns created annotation', async () => {
        const imageDataUrl = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
        const postRes = await request(app)
            .post('/api/annotations')
            .set('Authorization', `Bearer ${token}`)
            .set('X-Session-Id', String(sessionId))
            .send({ imageDataUrl, problemId: 7 });

        const res = await request(app)
            .get('/api/annotations')
            .set('Authorization', `Bearer ${token}`)
            .set('X-Session-Id', String(sessionId));

        expect(res.status).toBe(200);
        expect(Array.isArray(res.body)).toBe(true);
        expect(res.body.length).toBeGreaterThanOrEqual(1);
        expect(res.body[0].problem_id).toBe(7);
    });

    test('GET by id returns stored blob', async () => {
        const imageDataUrl = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
        const postRes = await request(app)
            .post('/api/annotations')
            .set('Authorization', `Bearer ${token}`)
            .set('X-Session-Id', String(sessionId))
            .send({ imageDataUrl, problemId: 3 });

        const res = await request(app)
            .get(`/api/annotations/${postRes.body.id}`)
            .set('Authorization', `Bearer ${token}`)
            .set('X-Session-Id', String(sessionId));

        expect(res.status).toBe(200);
        expect(res.body.imageDataUrl).toMatch(/^data:image\/png;base64,/);
    });
});
