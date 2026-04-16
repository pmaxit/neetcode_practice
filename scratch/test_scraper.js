import fetch from 'node-fetch';

async function testScraper() {
    try {
        console.log('Fetching neetcode.io...');
        const homeRes = await fetch('https://neetcode.io');
        const homeHtml = await homeRes.text();
        const bundleMatch = homeHtml.match(/src="(main\.[^"]+\.js)"/);
        
        if (!bundleMatch) {
            console.error('Could not find NeetCode bundle URL');
            return;
        }

        const bundleUrl = `https://neetcode.io/${bundleMatch[1]}`;
        console.log(`Fetching bundle: ${bundleUrl}`);
        const bundleRes = await fetch(bundleUrl);
        const bundleJs = await bundleRes.text();

        // Extract problem entries: {problem:"...", video:"...", link:"..."}
        const entries = [...bundleJs.matchAll(/\{problem:"([^"]+)",pattern:"([^"]+)",link:"([^"]+)",video:"([\w-]*)"/g)];
        console.log(`Total entries found: ${entries.length}`);
        
        const titleToVideo = {};
        for (const [, problem, , , video] of entries) {
            if (video) {
                const norm = problem.toLowerCase().replace(/[^a-z0-9]/g, '');
                titleToVideo[norm] = `https://www.youtube.com/watch?v=${video}`;
            }
        }
        
        console.log(`Successfully extracted ${Object.keys(titleToVideo).length} video mappings.`);
        const firstFew = Object.entries(titleToVideo).slice(0, 5);
        console.log('Sample mappings:', firstFew);

    } catch (error) {
        console.error('Scraper failed:', error);
    }
}

testScraper();
