#!/usr/bin/env node
const { GoogleGenerativeAI } = require("@google/generative-ai");
const mysql = require('mysql2/promise');
const dotenv = require('dotenv');

dotenv.config();

const apiKey = process.env.VITE_GEMINI_API_KEY || process.env.GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(apiKey);
const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" });

const SAMPLE_INPUTS = {
    "two sum": { nums: [2, 7, 11, 15], target: 9 },
    "reverse linked list": { head: [1, 2, 3, 4, 5] },
    "invert binary tree": { root: [4, 2, 7, 1, 3, 6, 9] },
    "merge two sorted lists": { list1: [1, 2, 4], list2: [1, 3, 4] },
    "contains duplicate": { nums: [1, 2, 3, 1] },
    "valid anagram": { s: "anagram", t: "nagaram" },
    "group anagrams": { strs: ["eat", "tea", "tan", "ate", "nat", "bat"] },
    "top k frequent": { nums: [1, 1, 1, 2, 2, 3], k: 2 }
};

function getSampleInput(title) {
    const titleLower = title.toLowerCase();
    for (const [key, value] of Object.entries(SAMPLE_INPUTS)) {
        if (titleLower.includes(key)) return value;
    }
    return { nums: [1, 2, 3] };
}

async function generateInitialTrace(code, title, problemId, feedback = "") {
    const inputs = getSampleInput(title);
    const prompt = `
You are an expert Python execution tracer.
Problem: ${title}
Sample Input: ${JSON.stringify(inputs)}
Python Code:
${code}

${feedback ? `PREVIOUS FEEDBACK TO FIX:\n${feedback}\n` : ""}

Task: Generate a 100% accurate line-by-line execution trace in JSON.
For each step, include:
1. "line": 1-based line number.
2. "state": Snapshot of ALL variables.
   - For ARRAYS: Use [val, val, ...]
   - For LINKED LISTS: Use { type: "linked_list", nodes: [{val: 1, next: 2}, ...], head: 0, current: 1 }
   - For TREES: Use { type: "tree", nodes: [{val: 4, left: 1, right: 2}, ...], root: 0, active: 1 }
   - For MAPS/SETS: Use standard JSON objects.
3. "explanation": Point-wise (using •) explanation of what happened on this SPECIFIC line.
4. "visualHint": "pointer_move", "array_update", "found", "tree_swap", etc.

IMPORTANT: 
- Capture state AFTER the line executes.
- Ensure data structures are NOT empty if the code has initialized them.
- If it's a loop, trace every single iteration.

Return ONLY the JSON object/array.
`;

    try {
        const result = await model.generateContent(prompt);
        let text = result.response.text();
        text = text.replace(/```json|```/g, '').trim();
        return JSON.parse(text);
    } catch (err) {
        console.error(`Generation error: ${err.message}`);
        return null;
    }
}

async function critiqueTrace(code, title, trace) {
    const prompt = `
Analyze this execution trace for the Python problem "${title}".

Code:
${code}

Trace:
${JSON.stringify(trace)}

Task: Rate this visualization from 1 to 5.
1: Completely wrong or empty.
2: Major logical errors or missing variables.
3: Mostly correct but vague or missing iterations.
4: Highly accurate but could be clearer or more visual.
5: Perfect. 100% accurate, rich data structures, clear point-wise explanations.

Return JSON only: { "score": number, "feedback": "Detailed explanation of what to fix to reach score 5" }
`;

    try {
        const result = await model.generateContent(prompt);
        let text = result.response.text();
        text = text.replace(/```json|```/g, '').trim();
        return JSON.parse(text);
    } catch (err) {
        return { score: 1, feedback: "Critique failed" };
    }
}

async function saveToDatabase(problemId, visualization) {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST || '127.0.0.1',
        port: parseInt(process.env.DB_PORT) || 3306,
        user: process.env.DB_USER,
        password: process.env.DB_PASS,
        database: process.env.DB_NAME
    });
    await connection.execute('UPDATE problems SET visualization = ? WHERE id = ?', [JSON.stringify(visualization), problemId]);
    await connection.end();
}

async function processProblems(startId, endId) {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST || '127.0.0.1',
        port: parseInt(process.env.DB_PORT) || 3306,
        user: process.env.DB_USER,
        password: process.env.DB_PASS,
        database: process.env.DB_NAME
    });
    const [rows] = await connection.execute('SELECT id, title, python_code FROM problems WHERE id >= ? AND id <= ? AND (python_code IS NOT NULL AND python_code != "")', [startId, endId]);
    await connection.end();

    for (const row of rows) {
        console.log(`\n🚀 Starting Reactive Flow for: ${row.title} (ID: ${row.id})`);
        
        let currentTrace = null;
        let bestScore = 0;
        let attempts = 0;
        let feedback = "";

        while (bestScore < 5 && attempts < 5) {
            attempts++;
            console.log(`  Attempt ${attempts}: Generating...`);
            currentTrace = await generateInitialTrace(row.python_code, row.title, row.id, feedback);
            
            if (!currentTrace) continue;

            console.log(`  Attempt ${attempts}: Critiquing...`);
            const critique = await critiqueTrace(row.python_code, row.title, currentTrace);
            bestScore = critique.score;
            feedback = critique.feedback;

            console.log(`  Score: ${bestScore}/5. ${bestScore < 5 ? `Feedback: ${feedback.substring(0, 60)}...` : "PERFECT!"}`);
        }

        if (currentTrace && bestScore >= 4) { // Save if it's high quality
            const finalData = {
                problemId: row.id,
                title: row.title,
                code: row.python_code,
                language: 'python',
                steps: Array.isArray(currentTrace) ? currentTrace : currentTrace.steps || []
            };
            await saveToDatabase(row.id, finalData);
            console.log(`✅ Saved visualization for ${row.title} with score ${bestScore}/5`);
        } else {
            console.log(`❌ Failed to reach acceptable quality for ${row.title}`);
        }
    }
}

const args = process.argv.slice(2);
processProblems(parseInt(args[0]) || 1, parseInt(args[1]) || 3).catch(console.error);
