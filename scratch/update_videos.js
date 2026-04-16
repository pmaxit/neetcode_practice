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
    logging: false
});

const Problem = sequelize.define('Problem', {
    id: { type: DataTypes.INTEGER, primaryKey: true },
    title: DataTypes.STRING,
    youtube_url: DataTypes.STRING
}, { timestamps: false, tableName: 'problems' });

async function updateVideos() {
    try {
        await sequelize.authenticate();
        console.log('Connected to database.');

        console.log('Fetching NeetCode bundle...');
        const homeRes = await fetch('https://neetcode.io');
        const homeHtml = await homeRes.text();
        const bundleMatch = homeHtml.match(/src="(main\.[^"]+\.js)"/);
        
        if (!bundleMatch) {
            throw new Error('Could not find NeetCode bundle URL');
        }

        const bundleUrl = `https://neetcode.io/${bundleMatch[1]}`;
        console.log(`Fetching mappings from: ${bundleUrl}`);
        const bundleRes = await fetch(bundleUrl);
        const bundleJs = await bundleRes.text();

        const entries = [...bundleJs.matchAll(/\{problem:"([^"]+)",pattern:"([^"]+)",link:"([^"]+)",video:"([\w-]*)"/g)];
        console.log(`Found ${entries.length} potential mappings.`);
        
        const titleToVideo = {};
        for (const [, problem, , , video] of entries) {
            if (video) {
                const norm = problem.toLowerCase().replace(/[^a-z0-9]/g, '');
                titleToVideo[norm] = `https://www.youtube.com/watch?v=${video}`;
            }
        }

        const problems = await Problem.findAll();
        console.log(`Found ${problems.length} problems in database.`);

        let updatedCount = 0;
        for (const problem of problems) {
            const normTitle = problem.title.toLowerCase().replace(/[^a-z0-9]/g, '');
            const videoUrl = titleToVideo[normTitle];
            
            if (videoUrl && problem.youtube_url !== videoUrl) {
                await problem.update({ youtube_url: videoUrl });
                updatedCount++;
                console.log(`Updated [${problem.id}] ${problem.title} -> ${videoUrl}`);
            }
        }

        console.log(`Successfully updated ${updatedCount} problems.`);

    } catch (error) {
        console.error('Update failed:', error);
    } finally {
        await sequelize.close();
    }
}

updateVideos();
