import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
dotenv.config();

async function listModels() {
    const apiKey = process.env.GEMINI_API_KEY;
    const genAI = new GoogleGenerativeAI(apiKey);
    
    try {
        // We use the raw fetch or a model call that supports listing
        // The standard SDK doesn't have a direct 'listModels' in some versions, 
        // but we can try to fetch from the endpoint.
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
        const data = await response.json();
        console.log(JSON.stringify(data, null, 2));
    } catch (err) {
        console.error('Failed to list models:', err.message);
    }
}

listModels();
