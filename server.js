// Privacy Search Browser - Single File Implementation
// Run: node server.js
// Visit: http://localhost:3000

const http = require('http');
const https = require('https');
const { URL } = require('url');

const PORT = 3000;

// Simple in-memory cache
const cache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// Random user agents for anti-fingerprinting
const USER_AGENTS = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0',
];

function getRandomUserAgent() {
    return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
}

// Fetch URL with privacy features
function fetchUrl(url, callback) {
    const parsedUrl = new URL(url);
    const options = {
        hostname: parsedUrl.hostname,
        port: parsedUrl.port || (parsedUrl.protocol === 'https:' ? 443 : 80),
        path: parsedUrl.pathname + parsedUrl.search,
        method: 'GET',
        headers: {
            'User-Agent': getRandomUserAgent(),
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.9',
            'DNT': '1',
        }
    };

    const protocol = parsedUrl.protocol === 'https:' ? https : http;
    
    const req = protocol.request(options, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => callback(null, data, res.headers['content-type'] || 'text/html'));
    });

    req.on('error', err => callback(err));
    req.setTimeout(30000, () => {
        req.destroy();
        callback(new Error('Request timeout'));
    });
    req.end();
}

// Search DuckDuckGo
function searchDuckDuckGo(query, callback) {
    const searchUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
    
    fetchUrl(searchUrl, (err, html) => {
        if (err) return callback(err);
        
        // Simple regex parsing (basic but works)
        const results = [];
        const resultRegex = /<a[^>]+class="result__a"[^>]+href="([^"]+)"[^>]*>([^<]+)<\/a>[\s\S]*?<a[^>]+class="result__snippet"[^>]*>([^<]+)</g;
        
        let match;
        while ((match = resultRegex.exec(html)) && results.length < 10) {
            results.push({
                url: match[1].replace(/^\/\/uddg=/, '').split('&amp;')[0],
                title: match[2].trim(),
                snippet: match[3].trim()
            });
        }
        
        callback(null, results);
    });
}

// Main HTTP server
const server = http.createServer((req, res) => {
    const parsedUrl = new URL(req.url, `http://localhost:${PORT}`);
    const path = parsedUrl.pathname;

    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
    }

    // Serve main page
    if (path === '/' || path === '/index.html') {
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(getIndexHTML());
        return;
    }

    // Search endpoint
    if (path === '/api/search') {
        const query = parsedUrl.searchParams.get('q');
        if (!query) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Missing query parameter' }));
            return;
        }

        console.log('Search:', query);
        searchDuckDuckGo(query, (err, results) => {
            if (err) {
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: err.message }));
                return;
            }

            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ results }));
        });
        return;
    }

    // Proxy endpoint
    if (path === '/api/proxy') {
        const targetUrl = parsedUrl.searchParams.get('url');
        if (!targetUrl) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Missing url parameter' }));
            return;
        }

        console.log('Proxy:', targetUrl);

        // Check cache
        const cached = cache.get(targetUrl);
        if (cached && (Date.now() - cached.timestamp < CACHE_TTL)) {
            res.writeHead(200, { 'Content-Type': cached.contentType });
            res.end(cached.data);
            return;
        }

        fetchUrl(targetUrl, (err, data, contentType) => {
            if (err) {
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: err.message }));
                return;
            }

            // Cache the result
            cache.set(targetUrl, { data, contentType, timestamp: Date.now() });

            res.writeHead(200, { 'Content-Type': contentType });
            res.end(data);
        });
        return;
    }

    // 404
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not Found');
});

// HTML frontend
function getIndexHTML() {
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Privacy Search</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            background: linear-gradient(135deg, #0a0e14 0%, #0f1419 50%, #0a0e14 100%);
            color: #e6e6e6;
            height: 100vh;
            overflow: hidden;
        }

        #app { display: flex; flex-direction: column; height: 100vh; }

        .search-container {
            display: flex;
            align-items: center;
            justify-content: center;
            flex: 1;
            transition: all 0.3s;
        }

        .search-container.hidden { display: none; }

        .search-box {
            width: 90%;
            max-width: 600px;
            padding: 16px 24px;
            background: white;
            border-radius: 24px;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
            display: flex;
            gap: 12px;
        }

        .search-input {
            flex: 1;
            border: none;
            outline: none;
            font-size: 16px;
            color: #202124;
        }

        .results-container {
            display: none;
            padding: 40px 20px;
            overflow-y: auto;
            flex: 1;
        }

        .results-container.visible { display: block; }

        .results-list {
            max-width: 800px;
            margin: 0 auto;
            display: flex;
            flex-direction: column;
            gap: 24px;
        }

        .result-card {
            background: #0f1419;
            border: 1px solid #2a2f35;
            border-radius: 8px;
            padding: 20px;
            cursor: pointer;
            transition: all 0.2s;
        }

        .result-card:hover {
            background: #151a1f;
            border-color: #00d4aa;
            transform: translateY(-2px);
        }

        .result-url {
            color: #a0a0a0;
            font-size: 12px;
            margin-bottom: 8px;
        }

        .result-title {
            color: #00d4aa;
            font-size: 18px;
            margin-bottom: 8px;
        }

        .result-snippet {
            color: #e6e6e6;
            font-size: 14px;
            line-height: 1.6;
        }

        .loading {
            text-align: center;
            padding: 40px;
            color: #a0a0a0;
        }

        .browser-view {
            display: none;
            flex: 1;
            background: white;
        }

        .browser-view.visible { display: flex; flex-direction: column; }

        .address-bar {
            display: flex;
            gap: 8px;
            padding: 8px;
            background: #0f1419;
            border-bottom: 1px solid #2a2f35;
        }

        .url-input {
            flex: 1;
            padding: 8px 16px;
            background: #151a1f;
            border: 1px solid #2a2f35;
            border-radius: 20px;
            color: #e6e6e6;
        }

        iframe {
            flex: 1;
            border: none;
        }
    </style>
</head>
<body>
    <div id="app">
        <div class="search-container" id="searchContainer">
            <div class="search-box">
                <input type="text" class="search-input" id="searchInput" placeholder="Search or type a URL" autofocus>
            </div>
        </div>

        <div class="results-container" id="resultsContainer">
            <div class="results-list" id="resultsList"></div>
        </div>

        <div class="browser-view" id="browserView">
            <div class="address-bar">
                <input type="text" class="url-input" id="urlInput" placeholder="Enter URL">
            </div>
            <iframe id="contentFrame"></iframe>
        </div>
    </div>

    <script>
        const searchInput = document.getElementById('searchInput');
        const searchContainer = document.getElementById('searchContainer');
        const resultsContainer = document.getElementById('resultsContainer');
        const resultsList = document.getElementById('resultsList');
        const browserView = document.getElementById('browserView');
        const urlInput = document.getElementById('urlInput');
        const contentFrame = document.getElementById('contentFrame');

        searchInput.addEventListener('keypress', async (e) => {
            if (e.key === 'Enter') {
                const query = searchInput.value.trim();
                if (!query) return;

                // Check if it's a URL
                if (isUrl(query)) {
                    loadUrl(normalizeUrl(query));
                } else {
                    performSearch(query);
                }
            }
        });

        urlInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                loadUrl(urlInput.value.trim());
            }
        });

        function isUrl(text) {
            return /^(https?:\\/\\/)|(www\\.)|\\w+\\.\\w+/i.test(text);
        }

        function normalizeUrl(url) {
            if (!/^https?:\\/\\//i.test(url)) {
                return 'https://' + url;
            }
            return url;
        }

        async function performSearch(query) {
            searchContainer.classList.add('hidden');
            resultsContainer.classList.add('visible');
            browserView.classList.remove('visible');

            resultsList.innerHTML = '<div class="loading">Searching...</div>';

            try {
                const response = await fetch(\`/api/search?q=\${encodeURIComponent(query)}\`);
                const data = await response.json();

                if (data.results && data.results.length > 0) {
                    displayResults(data.results);
                } else {
                    resultsList.innerHTML = '<div class="loading">No results found</div>';
                }
            } catch (error) {
                resultsList.innerHTML = '<div class="loading">Search failed: ' + error.message + '</div>';
            }
        }

        function displayResults(results) {
            resultsList.innerHTML = results.map(result => \`
                <div class="result-card" onclick="loadUrl('\${escapeHtml(result.url)}')">
                    <div class="result-url">\${formatUrl(result.url)}</div>
                    <div class="result-title">\${escapeHtml(result.title)}</div>
                    <div class="result-snippet">\${escapeHtml(result.snippet)}</div>
                </div>
            \`).join('');
        }

        async function loadUrl(url) {
            searchContainer.classList.add('hidden');
            resultsContainer.classList.remove('visible');
            browserView.classList.add('visible');

            urlInput.value = url;

            try {
                const response = await fetch(\`/api/proxy?url=\${encodeURIComponent(url)}\`);
                const html = await response.text();

                const doc = contentFrame.contentDocument || contentFrame.contentWindow.document;
                doc.open();
                doc.write(html);
                doc.close();
            } catch (error) {
                const doc = contentFrame.contentDocument || contentFrame.contentWindow.document;
                doc.open();
                doc.write(\`<h1>Error loading page</h1><p>\${error.message}</p>\`);
                doc.close();
            }
        }

        function formatUrl(url) {
            try {
                const u = new URL(url);
                return u.hostname + u.pathname;
            } catch {
                return url;
            }
        }

        function escapeHtml(text) {
            const div = document.createElement('div');
            div.textContent = text;
            return div.innerHTML;
        }

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'l') {
                e.preventDefault();
                searchContainer.classList.remove('hidden');
                resultsContainer.classList.remove('visible');
                browserView.classList.remove('visible');
                searchInput.focus();
            }
        });
    </script>
</body>
</html>`;
}

server.listen(PORT, () => {
    console.log(`\\n🔒 Privacy Search Browser running on http://localhost:${PORT}`);
    console.log('Press Ctrl+C to stop\\n');
});
