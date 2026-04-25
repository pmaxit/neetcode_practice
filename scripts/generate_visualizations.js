import { GoogleGenerativeAI } from "@google/generative-ai";
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.VITE_GEMINI_API_KEY || process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" });

/**
 * Instruments and executes code to capture state at each line.
 * For simplicity in this prototype, we use a basic instrumentation approach.
 */
function traceCodeExecution(code, input) {
    const lines = code.split('\n');
    let instrumentedCode = 'const _trace = [];\n';
    
    lines.forEach((line, index) => {
        // Simple instrumentation: record state after each line
        // This is a naive implementation; a production version would use an AST transformer (like Babel)
        instrumentedCode += line + `\n_trace.push({ line: ${index + 1}, state: JSON.parse(JSON.stringify({ ...typeof locals !== "undefined" ? locals : {} })) });\n`;
    });
    
    instrumentedCode += '\n_trace;';

    // In a real scenario, we would run this in a VM sandbox
    // For this demonstration, we'll focus on the Agentic Flow logic
    // and provide a mock execution trace for "Two Sum" if the dynamic execution is too complex.
    return [
        { line: 1, state: { nums: [2, 7, 11, 15], target: 9, i: 0 } },
        { line: 2, state: { nums: [2, 7, 11, 15], target: 9, i: 0, complement: 7 } },
        { line: 3, state: { nums: [2, 7, 11, 15], target: 9, i: 0, complement: 7, map: { '2': 0 } } }
        // ... more steps
    ];
}

async function generateExplanation(code, step, previousSteps) {
    const prompt = `
    Code:
    ${code}

    Current Execution Step:
    Line: ${step.line}
    Variable State: ${JSON.stringify(step.state)}

    Previous Context:
    ${JSON.stringify(previousSteps.slice(-2))}

    Task: Provide a concise, point-wise explanation of what happened on this line. 
    Use a bulleted list format (using • or -).
    Mention specific variable changes and the logic.
    Also, suggest a 'visualHint' (e.g., "highlight", "pointer_move", "array_update", "found").
    
    Return JSON only: { "explanation": "• Point 1\n• Point 2", "visualHint": "..." }
    `;

    const result = await model.generateContent(prompt);
    const text = result.response.text();
    return JSON.parse(text.replace(/```json|```/g, '').trim());
}

async function critiqueExplanation(code, step, explanationData) {
    const prompt = `
    Code:
    ${code}

    Step Line: ${step.line}
    State: ${JSON.stringify(step.state)}
    Generated Explanation: ${explanationData.explanation}
    Visual Hint: ${explanationData.visualHint}

    Task: Critique this explanation. Is it 100% accurate to the code and state? Is it clear?
    Return JSON only: { "isAccurate": true/false, "feedback": "...", "suggestion": "..." }
    `;

    const result = await model.generateContent(prompt);
    const text = result.response.text();
    return JSON.parse(text.replace(/```json|```/g, '').trim());
}

async function runAgenticFlow(code, trace) {
    const finalTrace = [];
    
    for (const step of trace) {
        let attempts = 0;
        let currentExplanation = null;
        let passed = false;

        console.log(`Processing Line ${step.line}...`);

        while (attempts < 3 && !passed) {
            currentExplanation = await generateExplanation(code, step, finalTrace);
            const critique = await critiqueExplanation(code, step, currentExplanation);
            
            if (critique.isAccurate) {
                passed = true;
            } else {
                console.log(`  Critique failed for line ${step.line}: ${critique.feedback}`);
                attempts++;
            }
        }

        finalTrace.push({
            ...step,
            explanation: currentExplanation.explanation,
            visualHint: currentExplanation.visualHint
        });
    }

    return finalTrace;
}

async function main() {
    const testCode = `function twoSum(nums, target) {
    const map = {};
    for (let i = 0; i < nums.length; i++) {
        const complement = target - nums[i];
        if (complement in map) {
            return [map[complement], i];
        }
        map[nums[i]] = i;
    }
}`;

    // For the demo, we use a pre-computed trace that matches the logic
    const mockTrace = [
        { line: 1, state: { nums: [2, 7, 11, 15], target: 9 } },
        { line: 2, state: { nums: [2, 7, 11, 15], target: 9, map: {} } },
        { line: 3, state: { nums: [2, 7, 11, 15], target: 9, map: {}, i: 0 } },
        { line: 4, state: { nums: [2, 7, 11, 15], target: 9, map: {}, i: 0, complement: 7 } },
        { line: 5, state: { nums: [2, 7, 11, 15], target: 9, map: {}, i: 0, complement: 7 } },
        { line: 8, state: { nums: [2, 7, 11, 15], target: 9, map: { '2': 0 }, i: 0, complement: 7 } },
        { line: 3, state: { nums: [2, 7, 11, 15], target: 9, map: { '2': 0 }, i: 1, complement: 7 } },
        { line: 4, state: { nums: [2, 7, 11, 15], target: 9, map: { '2': 0 }, i: 1, complement: 2 } },
        { line: 5, state: { nums: [2, 7, 11, 15], target: 9, map: { '2': 0 }, i: 1, complement: 2 } },
        { line: 6, state: { nums: [2, 7, 11, 15], target: 9, map: { '2': 0 }, i: 1, complement: 2, result: [0, 1] } }
    ];

    console.log("Starting Agentic Flow for Two Sum visualization...");
    const resultTrace = await runAgenticFlow(testCode, mockTrace);

    const output = {
        problemId: 3,
        title: "Two Sum",
        code: testCode,
        steps: resultTrace
    };

    const outputPath = path.join(process.cwd(), 'src/data/visualizations.json');
    fs.writeFileSync(outputPath, JSON.stringify(output, null, 2));
    console.log(`Visualization data saved to ${outputPath}`);
}

main().catch(console.error);
