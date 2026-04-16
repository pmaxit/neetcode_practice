import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config({ path: path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '.env') });

const apiKey = process.env.GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(apiKey);

async function testLatest() {
    console.log('Testing gemini-flash-latest...');
    try {
        const model = genAI.getGenerativeModel({ model: 'gemini-flash-latest' });
        const result = await model.generateContent('Explain binary search in 1 sentence.');
        console.log('✅ Success:', result.response.text());
        process.exit(0);
    } catch (err) {
        console.log('❌ Failed:', err.message);
        process.exit(1);
    }
}

testLatest();
