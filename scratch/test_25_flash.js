import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
dotenv.config();

async function testModel() {
    const apiKey = process.env.GEMINI_API_KEY;
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
    
    try {
        const result = await model.generateContent("Say hello!");
        console.log('✅ success:', result.response.text());
    } catch (err) {
        console.error('❌ failed:', err.message);
    }
}

testModel();
