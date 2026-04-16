import { Sequelize, DataTypes } from 'sequelize';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config({ path: path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '.env') });

const sequelize = new Sequelize(process.env.DB_NAME, process.env.DB_USER, process.env.DB_PASS, {
    host: process.env.DB_HOST || '127.0.0.1',
    port: process.env.DB_PORT || 3306,
    dialect: 'mysql',
    logging: false,
});

const Problem = sequelize.define('Problem', {
    id: { type: DataTypes.INTEGER, primaryKey: true },
    title: DataTypes.STRING,
    guided_hints: DataTypes.TEXT,
}, { timestamps: false, tableName: 'problems' });

async function check() {
    await sequelize.authenticate();
    const problems = await Problem.findAll({ where: { id: [1, 2, 3] } });
    for (const p of problems) {
        console.log(`\n--- Problem ${p.id}: ${p.title} ---`);
        console.log(p.guided_hints);
    }
    await sequelize.close();
}

check();
