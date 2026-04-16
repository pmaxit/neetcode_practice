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
        // listModels is not directly available on genAI in the same way, but we can try to get a model and see if it fails
        const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
        const result = await model.generateContent('Hi');
        console.log('✅ gemini-1.5-flash is working!');
        console.log('Response:', result.response.text());
    } catch (err) {
        console.error('❌ gemini-1.5-flash failed:', err.message);
    }
    
    try {
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
        const result = await model.generateContent('Hi');
        console.log('✅ gemini-2.0-flash is working!');
    } catch (err) {
        console.error('❌ gemini-2.0-flash failed:', err.message);
    }
}

checkModels();
