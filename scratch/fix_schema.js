import { Sequelize, DataTypes } from 'sequelize';
import dotenv from 'dotenv';

dotenv.config();

const DB_HOST = process.env.DB_HOST;
const DB_USER = process.env.DB_USER;
const DB_PASS = process.env.DB_PASS;
const DB_NAME = process.env.DB_NAME;

const sequelize = new Sequelize(DB_NAME, DB_USER, DB_PASS, {
    host: DB_HOST,
    dialect: 'mysql',
    logging: console.log
});

async function run() {
    try {
        await sequelize.authenticate();
        console.log('Connection has been established successfully.');

        const queryInterface = sequelize.getQueryInterface();
        const tableInfo = await queryInterface.describeTable('problems');
        
        if (!tableInfo.youtube_url) {
            console.log('Adding youtube_url column...');
            await queryInterface.addColumn('problems', 'youtube_url', {
                type: DataTypes.STRING,
                allowNull: true
            });
            console.log('Column added successfully.');
        } else {
            console.log('youtube_url column already exists.');
        }

    } catch (error) {
        console.error('Unable to connect to the database or modify schema:', error);
    } finally {
        await sequelize.close();
    }
}

run();
