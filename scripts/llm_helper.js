
const LM_STUDIO_URL = 'http://localhost:1234/v1/chat/completions';

export async function callLLM(prompt, systemPrompt = "You are a robotic technical assistant. ZERO conversation. ZERO thinking blocks. Start with 'SECTION 1:' and follow the format perfectly.", model = "google/gemma-3n-e4b") {
    const response = await fetch(LM_STUDIO_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            model: model,
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: prompt }
            ],
            temperature: 0,
            max_tokens: 8192,
        })
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`LM Studio error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    if (!data.choices || data.choices.length === 0 || !data.choices[0].message.content) {
        console.log('\n--- LLM ERROR: EMPTY RESPONSE ---');
        console.log(JSON.stringify(data, null, 2));
        console.log('--------------------------------\n');
    }
    return data.choices[0].message.content || "";
}
