import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config({ path: path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '.env') });

async function checkModels() {
    const apiKey = process.env.GEMINI_API_KEY;
    console.log('Using Key:', apiKey.substring(0, 8) + '...');
    try {
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
        const result = await model.generateContent("Test");
        console.log('✅ gemini-2.5-flash is working!');
    } catch (err) {
        console.error('❌ gemini-2.5-flash failed:', err.message);
    }
}

checkModels();
