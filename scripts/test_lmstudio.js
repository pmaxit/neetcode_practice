

async function testLMStudio() {
    const url = 'http://localhost:1234/v1/chat/completions';
    const payload = {
        model: "local-model", // LM Studio ignores this or uses the loaded model
        messages: [
            { role: "system", content: "You are a helpful assistant." },
            { role: "user", content: "Hello! Are you working?" }
        ],
        temperature: 0.7
    };

    console.log(`Checking LM Studio at ${url}...`);

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`HTTP error! status: ${response.status}, body: ${errorText}`);
        }

        const data = await response.json();
        console.log('Successfully connected to LM Studio!');
        console.log('Response:', data.choices[0].message.content);
        return true;
    } catch (error) {
        console.error('Failed to connect to LM Studio:', error.message);
        console.log('\nMake sure LM Studio is running and "Local Server" is started on port 1234.');
        return false;
    }
}

testLMStudio();
