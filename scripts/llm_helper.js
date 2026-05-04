import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const modelInstance = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

export async function callLLM(prompt, systemPrompt = "You are a robotic technical assistant. ZERO conversation. ZERO thinking blocks. Start with 'SECTION 1:' and follow the format perfectly.", model = "gemini-2.5-flash") {
    const result = await modelInstance.generateContent({
        contents: [{ role: "user", parts: [{ text: `${systemPrompt}\n\n${prompt}` }] }],
    });

    const responseText = result.response.text();
    
    if (!responseText) {
        console.log('\n--- LLM ERROR: EMPTY RESPONSE ---');
    }
    return responseText || "";
}
