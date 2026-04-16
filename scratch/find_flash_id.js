import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config({ path: path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '.env') });

const apiKey = process.env.GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(apiKey);

async function findSmallestFlash() {
    const flashModels = [
        'gemini-1.5-flash-8b',
        'gemini-1.5-flash-8b-latest',
        'gemini-1.5-flash-latest',
        'gemini-1.5-flash',
        'gemini-1.5-flash-001',
        'gemini-1.5-flash-002'
    ];

    console.log('Using Key:', apiKey.substring(0, 8) + '...');

    for (const name of flashModels) {
        process.stdout.write(`Testing ${name}... `);
        try {
            const model = genAI.getGenerativeModel({ model: name });
            const result = await model.generateContent('Hi');
            console.log('✅ Success!');
            process.exit(0);
        } catch (err) {
            console.log(`❌ ${err.message.split('\n')[0]}`);
        }
    }
}

findSmallestFlash();
