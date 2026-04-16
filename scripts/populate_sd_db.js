import { Sequelize, DataTypes } from 'sequelize';
import fs from 'fs';
import path from 'path';

import dotenv from 'dotenv';
dotenv.config();

const sequelize = new Sequelize(process.env.DB_NAME, process.env.DB_USER, process.env.DB_PASS, {
    host: process.env.DB_HOST || '127.0.0.1',
    dialect: 'mysql',
    logging: false
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

const mapping = {
    'bitly': 88,
    'dropbox': 94,
    'gopuff': 95,
    'google-news': 96,
    'ticketmaster': 97,
    'fb-news-feed': 100,
    'tinder': 101,
    'leetcode': 102,
    'whatsapp': 103,
    'yelp': 104,
    'strava': 107,
    'distributed-rate-limiter': 108,
    'online-auction': 109,
    'fb-live-comments': 110,
    'fb-post-search': 111,
    'camelcamelcamel': 114,
    'instagram': 115,
    'top-k': 116,
    'uber': 117,
    'robinhood': 118,
    'google-docs': 121,
    'distributed-cache': 122,
    'youtube': 123,
    'job-scheduler': 124,
    'web-crawler': 125,
    'ad-click-aggregator': 126,
    'payment-system': 127,
    'metrics-monitoring': 128
};

async function populate() {
    try {
        await sequelize.authenticate();
        await SystemDesignProblem.sync({ alter: true });

        for (const [slug, step] of Object.entries(mapping)) {
            const filePath = `/home/puneet/.gemini/antigravity/brain/8db9ec7e-898f-45bc-a888-8b71976830a4/.system_generated/steps/${step}/content.md`;
            if (!fs.existsSync(filePath)) {
                console.warn(`File not found for ${slug} (step ${step})`);
                continue;
            }

            const rawContent = fs.readFileSync(filePath, 'utf8');
            const lines = rawContent.split('\n');
            
            // Basic parsing
            const titleLine = lines.find(l => l.startsWith('Title: '));
            const title = titleLine ? titleLine.replace('Title: ', '').split('|')[0].trim() : slug;
            
            // Extract content between the navigation header and the footer
            const startStr = '### [Functional Requirements]';
            let startIndex = lines.findIndex(l => l.startsWith(startStr));
            if (startIndex === -1) {
                startIndex = lines.findIndex(l => l.startsWith('### '));
            }
            
            const endStr = 'Test Your Knowledge';
            let endIndex = lines.findIndex(l => l.includes(endStr));
            if (endIndex === -1) endIndex = lines.length;
            
            const contentLines = lines.slice(startIndex, endIndex);
            const content = contentLines.join('\n').trim();

            const difficultyMatch = rawContent.match(/Difficulty:\s*(Easy|Medium|Hard)/i);
            const difficulty = difficultyMatch ? difficultyMatch[1] : 'Medium';

            const url = `https://www.hellointerview.com/learn/system-design/problem-breakdowns/${slug}`;

            await SystemDesignProblem.upsert({
                title,
                slug,
                url,
                difficulty,
                content
            });
            console.log(`Populated ${slug}: ${title} (${difficulty})`);
        }
        console.log('Successfully populated all system design problems.');
    } catch (err) {
        console.error('Error populating database:', err);
    } finally {
        await sequelize.close();
    }
}

populate();
