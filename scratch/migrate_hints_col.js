import { Sequelize } from 'sequelize';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config({ path: path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '.env') });

const sequelize = new Sequelize(process.env.DB_NAME, process.env.DB_USER, process.env.DB_PASS, {
    host: process.env.DB_HOST || '127.0.0.1',
    port: process.env.DB_PORT || 3306,
    dialect: 'mysql',
    logging: true,
});

async function migrate() {
    try {
        await sequelize.authenticate();
        console.log('✅ Connected to DB');
        
        const [results] = await sequelize.query("SHOW COLUMNS FROM problems LIKE 'guided_hints'");
        if (results.length === 0) {
            console.log('🔧 Adding guided_hints column...');
            await sequelize.query("ALTER TABLE problems ADD COLUMN guided_hints TEXT AFTER python_code");
            console.log('✅ Column added successfully');
        } else {
            console.log('ℹ️ Column already exists');
        }
    } catch (err) {
        console.error('❌ Migration failed:', err);
    } finally {
        await sequelize.close();
    }
}

migrate();
