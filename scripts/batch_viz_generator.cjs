#!/usr/bin/env node
/**
 * Batch Visualization Generator
 * Generates execution traces for all 150 problems using Gemini LLM and saves to DB.
 */

const { GoogleGenerativeAI } = require("@google/generative-ai");
const mysql = require('mysql2/promise');
const dotenv = require('dotenv');

dotenv.config();

const apiKey = process.env.VITE_GEMINI_API_KEY || process.env.GEMINI_API_KEY;
if (!apiKey) {
    console.error("Error: API key not found. Set VITE_GEMINI_API_KEY or GEMINI_API_KEY");
    process.exit(1);
}

const genAI = new GoogleGenerativeAI(apiKey);
const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" });

// Sample inputs for different problem types
const SAMPLE_INPUTS = {
    "two sum": { nums: [2, 7, 11, 15], target: 9 },
    "contains duplicate": { nums: [1, 2, 3, 1] },
    "valid anagram": { s: "anagram", t: "nagaram" },
    "group anagrams": { strs: ["eat", "tea", "tan", "ate", "nat", "bat"] },
    "top k frequent": { nums: [1, 1, 1, 2, 2, 3], k: 2 },
    "encode and decode": { strs: ["hello", "world"] },
    "product of array": { nums: [1, 2, 3, 4] },
    "valid sudoku": { board: [["5","3",".",".","7",".",".",".","."],["6",".",".","1","9","5",".",".","."],[".","9","8",".",".",".",".","6","."],["8",".",".",".","6",".",".",".","3"],["4",".",".","8",".","3",".",".","1"],["7",".",".",".","2",".",".",".","6"],[".","6",".",".",".",".","2","8","."],[".",".",".","4","1","9",".",".","5"],[".",".",".",".","8",".",".","7","9"]] },
    "longest consecutive": { nums: [100, 4, 200, 1, 3, 2] },
    "valid palindrome": { s: "A man, a plan, a canal: Panama" },
    "reverse integer": { x: 123 },
    "string to integer": { s: "42" },
    "container with most water": { height: [1, 8, 6, 2, 5, 4, 8, 3, 7] },
    "3sum": { nums: [-1, 0, 1, 2, -1, -4] },
    "3sum closest": { nums: [-1, 2, 1, -4], target: 1 },
    "longest substring": { s: "abcabcbb" },
    "subarray sum equals k": { nums: [1, 1, 1], k: 2 },
    "permutation in string": { s1: "ab", s2: "eidbaooo" },
    "rotate image": { matrix: [[1,2,3],[4,5,6],[7,8,9]] },
    "spiral matrix": { matrix: [[1,2,3],[4,5,6],[7,8,9]] },
    "set matrix zeros": { matrix: [[1,1,1],[1,0,1],[1,1,1]] },
    "jump game": { nums: [2, 3, 1, 1, 4] },
    "climbing stairs": { n: 5 },
    "best time to buy and sell stock": { prices: [7, 1, 5, 3, 6, 4] },
    "minimum path sum": { grid: [[1,2,3],[4,5,6]] },
    "coin change": { coins: [1, 2, 5], amount: 11 },
    "longest increasing subsequence": { nums: [10, 9, 2, 5, 3, 7, 101, 18] },
    "word break": { s: "leetcode", wordDict: ["leet", "code"] },
    "house robber": { nums: [1, 2, 3, 1] },
    "decode ways": { s: "226" },
    "unique paths": { m: 3, n: 7 },
    "longest common subsequence": { text1: "abcde", text2: "ace" },
    "edit distance": { word1: "horse", word2: "ros" },
    "find town judge": { n: 2, trust: [[1,2]] },
    "number of islands": { grid: [["1","1","1","1","0"],["1","1","0","1","0"],["1","1","0","0","0"],["0","0","0","0","0"]] },
    "clone graph": { adjList: [[1,2],[2,3],[3,4],[4,5]] },
    "pacific atlantic": { heights: [[1,2,2,3,5],[3,2,3,4,4],[2,4,5,3,1],[6,7,1,3,4],[5,1,1,1,4]] },
    "invert binary tree": { root: [4,2,7,1,3,6,9] },
    "diameter of binary tree": { root: [1,2,3,4,5] },
    "lowest common ancestor": { root: [3,5,1,6,2,0,8], p: 5, q: 1 },
    "validate bst": { root: [2,1,3] },
    "max depth": { root: [3,9,20,null,null,15,7] },
    "serialize and deserialize": { root: [1,2,3,null,null,4,5] },
    "subtree of another tree": { root: [3,4,5,1,2], subRoot: [4,1,2] },
    "construct binary tree from array": { nums: [2,3,1,1,2], k: 4 },
    "sliding window maximum": { nums: [1,-1], k: 1 },
    "first negative number": { nums: [12,-1,-7,8,-15,30,16,28], k: 3 },
    "frequency equals": { s: "ab", t: "ba" },
    "maximum sum subarray": { nums: [-2,1,-3,4,-1,2,1,-5,4] },
    "linked list cycle": { head: [3,2,0,-4], pos: 1 },
    "merge two sorted lists": { list1: [1,2,4], list2: [1,3,4] },
    "reverse linked list": { head: [1,2,3,4,5] },
    "lru cache": { capacity: 2 },
    "merge k sorted lists": { lists: [[1,4,5],[1,3,4],[2,6]] },
    "trapping rain water": { height: [0,1,0,2,1,0,1,3,2,1,2,1] },
    "sort colors": { nums: [2,0,2,1,1,0] },
    "shortest path in matrix": { grid: [[0,1],[1,0]] },
    "longest palindromic substring": { s: "babad" },
    "regular expression matching": { s: "aa", p: "a*" },
    "integer to roman": { num: 3 },
    "roman to integer": { s: "III" },
    "longest common prefix": { strs: ["flower","flow","flight"] },
    "valid parentheses": { s: "()[]{}" },
    "remove duplicates from sorted array": { nums: [1,1,2] },
    "remove element": { nums: [3,2,2,3], val: 3 },
    "search insert position": { nums: [1,3,5,6], target: 5 },
    "maximum product subarray": { nums: [2,3,-2,4] },
    "find minimum in rotated sorted array": { nums: [3,4,5,1,2] },
    "search in rotated sorted array": { nums: [4,5,6,7,0,1,2], target: 0 },
    "median of two sorted arrays": { nums1: [1,3], nums2: [2] },
};

function getSampleInput(title) {
    const titleLower = title.toLowerCase();

    for (const [key, value] of Object.entries(SAMPLE_INPUTS)) {
        if (titleLower.includes(key)) {
            return value;
        }
    }

    // Default input
    return { nums: [1, 2, 3] };
}

async function generateTrace(code, title, problemId) {
    const inputs = getSampleInput(title);

    const prompt = `
You are given a Python solution for a coding problem. Your task is to generate a detailed execution trace.

Problem: ${title}
Sample Input: ${JSON.stringify(inputs)}

Python Code:
${code}

Generate a JSON array of execution steps. Each step must have:
- "line": the line number in the code (1-based)
- "state": an object showing all variable values AFTER that line executes
- "explanation": a short bulleted explanation (starting with •) of what happened
- "visualHint": one of "highlight", "pointer_move", "array_update", "map_update", "found", "logic_check", "variable_creation"

Focus on the key variables that change at each step. Show actual values, not placeholders.
Return ONLY valid JSON (no markdown, no explanation).
`;

    try {
        const result = await model.generateContent(prompt);
        const text = result.response.text();

        // Parse JSON response
        const cleanText = text.replace(/```json|```/g, '').trim();
        const steps = JSON.parse(cleanText);

        return {
            problemId,
            title,
            code,
            steps: Array.isArray(steps) ? steps : steps.steps || []
        };
    } catch (err) {
        console.error(`Error generating trace for problem ${problemId}:`, err.message);
        return null;
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

    await connection.execute(
        'UPDATE problems SET visualization = ? WHERE id = ?',
        [JSON.stringify(visualization), problemId]
    );

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

    const [rows] = await connection.execute(
        'SELECT id, title, python_code FROM problems WHERE id >= ? AND id <= ? ORDER BY id',
        [startId, endId]
    );

    await connection.end();

    let count = 0;
    for (const row of rows) {
        console.log(`Processing problem ${row.id}: ${row.title}...`);

        const result = await generateTrace(row.python_code, row.title, row.id);
        if (result) {
            await saveToDatabase(row.id, result);
            console.log(`  Saved ${result.steps.length} steps to database`);
            count++;
        }

        // Rate limiting
        await new Promise(r => setTimeout(r, 500));
    }

    console.log(`\nDone! Generated ${count} visualizations.`);
    return count;
}

// Main
const args = process.argv.slice(2);
const startId = parseInt(args[0]) || 1;
const endId = parseInt(args[1]) || 150;

console.log(`Generating visualizations for problems ${startId}-${endId}...`);
processProblems(startId, endId).catch(console.error);