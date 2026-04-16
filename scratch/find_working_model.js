import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config({ path: path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '.env') });

const modelsToTry = [
    'gemini-1.5-flash',
    'gemini-1.5-flash-latest',
    'gemini-1.5-pro',
    'gemini-pro',
    'gemini-1.0-pro'
];

async function checkModels() {
    const apiKey = process.env.GEMINI_API_KEY;
    console.log('Using Key:', apiKey.substring(0, 8) + '...');
    const genAI = new GoogleGenerativeAI(apiKey);

    for (const modelName of modelsToTry) {
        process.stdout.write(`Trying ${modelName}... `);
        try {
            const model = genAI.getGenerativeModel({ model: modelName });
            const result = await model.generateContent('Hi');
            console.log('✅ OK');
            process.exit(0);
        } catch (err) {
            console.log(`❌ ${err.message.split('\n')[0]}`);
        }
    }
}

checkModels();
