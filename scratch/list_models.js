import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config({ path: path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '.env') });

const apiKey = process.env.GEMINI_API_KEY;
// The listModels method is actually on the GenerativeLanguageClient which is part of a different package,
// but in @google/generative-ai, we can try to fetch from the models endpoint directly or use the SDK's hidden list method if it exists.
// Actually, the easiest way is to use a fetch to the models endpoint.

async function listModels() {
    console.log('Fetching model list for Key:', apiKey.substring(0, 8) + '...');
    try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
        const data = await response.json();
        if (data.models) {
            console.log('Available Models:');
            data.models.forEach(m => {
                console.log(`- ${m.name} (${m.supportedGenerationMethods.join(', ')})`);
            });
        } else {
            console.log('No models found or error:', data);
        }
    } catch (err) {
        console.error('Failed to list models:', err.message);
    }
}

listModels();
