/**
 * Migration: single-user → multi-tenant
 *
 * Run ONCE before deploying the new server code.
 * Safe to re-run — all steps are idempotent.
 *
 * Usage: node scripts/migrate_to_multitenant.js
 * (Requires Cloud SQL Auth Proxy running locally)
 */
import dotenv from 'dotenv';
import { Sequelize } from 'sequelize';
import bcrypt from 'bcryptjs';

dotenv.config();

const { DB_HOST, DB_USER, DB_PASS, DB_NAME, DB_PORT, INSTANCE_CONNECTION_NAME, K_SERVICE } = process.env;

const useSocket = INSTANCE_CONNECTION_NAME && K_SERVICE;
const sequelize = useSocket
    ? new Sequelize(DB_NAME, DB_USER, DB_PASS, {
        host: `/cloudsql/${INSTANCE_CONNECTION_NAME}`,
        dialect: 'mysql',
        logging: false,
        dialectOptions: { socketPath: `/cloudsql/${INSTANCE_CONNECTION_NAME}` }
    })
    : new Sequelize(DB_NAME, DB_USER, DB_PASS, {
        host: DB_HOST || '127.0.0.1',
        port: DB_PORT || 3306,
        dialect: 'mysql',
        logging: false
    });

async function columnExists(table, column) {
    const [rows] = await sequelize.query(
        `SHOW COLUMNS FROM \`${table}\` LIKE '${column}'`
    );
    return rows.length > 0;
}

async function tableExists(table) {
    const [rows] = await sequelize.query(
        `SHOW TABLES LIKE '${table}'`
    );
    return rows.length > 0;
}

async function indexExists(table, indexName) {
    const [rows] = await sequelize.query(
        `SHOW INDEX FROM \`${table}\` WHERE Key_name = '${indexName}'`
    );
    return rows.length > 0;
}

async function run() {
    await sequelize.authenticate();
    console.log('✓ Database connected');

    // ── Step 1: Create users table ──────────────────────────────────────────────
    if (!await tableExists('users')) {
        await sequelize.query(`
            CREATE TABLE users (
                id INT AUTO_INCREMENT PRIMARY KEY,
                email VARCHAR(255) NOT NULL UNIQUE,
                password_hash VARCHAR(255) NOT NULL,
                createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            )
        `);
        console.log('✓ Created users table');
    } else {
        console.log('  users table already exists, skipping');
    }

    // Seed legacy user if table is empty
    const [[{ cnt }]] = await sequelize.query('SELECT COUNT(*) as cnt FROM users');
    let legacyUserId;
    if (cnt === 0) {
        const hash = await bcrypt.hash('changeme-legacy-' + Date.now(), 12);
        await sequelize.query(
            'INSERT INTO users (email, password_hash, createdAt, updatedAt) VALUES (?, ?, NOW(), NOW())',
            { replacements: ['legacy@example.com', hash] }
        );
        console.log('✓ Seeded legacy user (legacy@example.com)');
    }
    const [[legacyUser]] = await sequelize.query('SELECT id FROM users LIMIT 1');
    legacyUserId = legacyUser.id;
    console.log(`  Legacy user id = ${legacyUserId}`);

    // ── Step 2: Create study_sessions table ─────────────────────────────────────
    if (!await tableExists('study_sessions')) {
        await sequelize.query(`
            CREATE TABLE study_sessions (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT NOT NULL,
                name VARCHAR(255) NOT NULL,
                is_default TINYINT(1) NOT NULL DEFAULT 0,
                createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            )
        `);
        console.log('✓ Created study_sessions table');
    } else {
        console.log('  study_sessions table already exists, skipping');
    }

    // Seed legacy session if empty
    const [[{ scnt }]] = await sequelize.query('SELECT COUNT(*) as scnt FROM study_sessions');
    let legacySessionId;
    if (scnt === 0) {
        await sequelize.query(
            'INSERT INTO study_sessions (user_id, name, is_default, createdAt, updatedAt) VALUES (?, ?, ?, NOW(), NOW())',
            { replacements: [legacyUserId, 'Default Session', 1] }
        );
        console.log('✓ Seeded legacy study session');
    }
    const [[legacySession]] = await sequelize.query('SELECT id FROM study_sessions LIMIT 1');
    legacySessionId = legacySession.id;
    console.log(`  Legacy session id = ${legacySessionId}`);

    // ── Step 3: Restructure user_progress ───────────────────────────────────────
    const upHasUserId = await columnExists('user_progress', 'user_id');
    if (!upHasUserId) {
        console.log('  Restructuring user_progress...');

        // Drop old PK on problem_id, add surrogate auto-increment id as new PK
        await sequelize.query(`ALTER TABLE user_progress DROP PRIMARY KEY, ADD COLUMN id INT NOT NULL AUTO_INCREMENT FIRST, ADD PRIMARY KEY (id)`);

        await sequelize.query(`ALTER TABLE user_progress ADD COLUMN user_id INT NULL, ADD COLUMN session_id INT NULL`);
        await sequelize.query(
            `UPDATE user_progress SET user_id = ?, session_id = ? WHERE user_id IS NULL`,
            { replacements: [legacyUserId, legacySessionId] }
        );

        if (!await indexExists('user_progress', 'uq_user_session_problem')) {
            await sequelize.query(
                `ALTER TABLE user_progress ADD UNIQUE INDEX uq_user_session_problem (user_id, session_id, problem_id)`
            );
        }
        console.log('✓ Restructured user_progress');
    } else {
        console.log('  user_progress already has user_id, skipping');
    }

    // ── Step 4: Restructure system_design_progress ──────────────────────────────
    const sdHasUserId = await columnExists('system_design_progress', 'user_id');
    if (!sdHasUserId) {
        console.log('  Restructuring system_design_progress...');
        await sequelize.query(`ALTER TABLE system_design_progress DROP PRIMARY KEY, ADD COLUMN id INT NOT NULL AUTO_INCREMENT FIRST, ADD PRIMARY KEY (id)`);
        await sequelize.query(`ALTER TABLE system_design_progress ADD COLUMN user_id INT NULL, ADD COLUMN session_id INT NULL`);
        await sequelize.query(
            `UPDATE system_design_progress SET user_id = ?, session_id = ? WHERE user_id IS NULL`,
            { replacements: [legacyUserId, legacySessionId] }
        );
        if (!await indexExists('system_design_progress', 'uq_sd_user_session_problem')) {
            await sequelize.query(
                `ALTER TABLE system_design_progress ADD UNIQUE INDEX uq_sd_user_session_problem (user_id, session_id, problem_id)`
            );
        }
        console.log('✓ Restructured system_design_progress');
    } else {
        console.log('  system_design_progress already has user_id, skipping');
    }

    // ── Step 5: Add user_id to user_settings ────────────────────────────────────
    const usHasUserId = await columnExists('user_settings', 'user_id');
    if (!usHasUserId) {
        await sequelize.query(`ALTER TABLE user_settings ADD COLUMN user_id INT NULL`);
        await sequelize.query(
            `UPDATE user_settings SET user_id = ? WHERE user_id IS NULL`,
            { replacements: [legacyUserId] }
        );
        console.log('✓ Added user_id to user_settings');
    } else {
        console.log('  user_settings already has user_id, skipping');
    }

    // ── Step 6: Add user_id/session_id to progress_logs ─────────────────────────
    const plHasUserId = await columnExists('progress_logs', 'user_id');
    if (!plHasUserId) {
        await sequelize.query(`ALTER TABLE progress_logs ADD COLUMN user_id INT NULL, ADD COLUMN session_id INT NULL`);
        await sequelize.query(
            `UPDATE progress_logs SET user_id = ?, session_id = ? WHERE user_id IS NULL`,
            { replacements: [legacyUserId, legacySessionId] }
        );
        console.log('✓ Added user_id/session_id to progress_logs');
    } else {
        console.log('  progress_logs already has user_id, skipping');
    }

    console.log('\n✅ Migration complete!');
    console.log(`   Legacy user id: ${legacyUserId}`);
    console.log(`   Legacy session id: ${legacySessionId}`);
    await sequelize.close();
}

run().catch(err => {
    console.error('Migration failed:', err);
    process.exit(1);
});
