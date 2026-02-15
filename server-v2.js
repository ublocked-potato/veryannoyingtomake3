// Privacy Search Browser V2 - Enhanced Proxy
// Supports: io games, YouTube, TikTok, Discord, and more
// Run: node server-v2.js

const http = require('http');
const https = require('https');
const { URL } = require('url');
const querystring = require('querystring');

const PORT = 3000;
const cache = new Map();
const CACHE_TTL = 5 * 60 * 1000;

const USER_AGENTS = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0',
];

function getRandomUserAgent() {
    return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
}

// Enhanced URL fetcher with better headers
function fetchUrl(url, callback) {
    const parsedUrl = new URL(url);
    const options = {
        hostname: parsedUrl.hostname,
        port: parsedUrl.port || (parsedUrl.protocol === 'https:' ? 443 : 80),
        path: parsedUrl.pathname + parsedUrl.search,
        method: 'GET',
        headers: {
            'User-Agent': getRandomUserAgent(),
            'Accept': '*/*',
            'Accept-Language': 'en-US,en;q=0.9',
            'Accept-Encoding': 'gzip, deflate, br',
            'DNT': '1',
            'Connection': 'keep-alive',
            'Upgrade-Insecure-Requests': '1',
        }
    };

    const protocol = parsedUrl.protocol === 'https:' ? https : http;
    
    const req = protocol.request(options, (res) => {
        const chunks = [];
        res.on('data', chunk => chunks.push(chunk));
        res.on('end', () => {
            const buffer = Buffer.concat(chunks);
            callback(null, buffer, res.headers['content-type'] || 'text/html', res.headers);
        });
    });

    req.on('error', err => callback(err));
    req.setTimeout(30000, () => {
        req.destroy();
        callback(new Error('Request timeout'));
    });
    req.end();
}

// Rewrite URLs in HTML to go through proxy
function rewriteHTML(html, baseUrl) {
    let rewritten = html;
    
    try {
        const base = new URL(baseUrl);
        const origin = base.origin;
        
        // Rewrite absolute URLs
        rewritten = rewritten.replace(
            /(src|href|action|data)=["']https?:\/\/([^"']+)["']/gi,
            (match, attr, url) => {
                return `${attr}="/api/proxy?url=${encodeURIComponent('https://' + url)}"`;
            }
        );
        
        // Rewrite protocol-relative URLs
        rewritten = rewritten.replace(
            /(src|href|action|data)=["']\/\/([^"']+)["']/gi,
            (match, attr, url) => {
                return `${attr}="/api/proxy?url=${encodeURIComponent('https://' + url)}"`;
            }
        );
        
        // Rewrite relative URLs
        rewritten = rewritten.replace(
            /(src|href|action|data)=["']\/([^"'\/][^"']*)["']/gi,
            (match, attr, url) => {
                const fullUrl = origin + '/' + url;
                return `${attr}="/api/proxy?url=${encodeURIComponent(fullUrl)}"`;
            }
        );
        
        // Inject base tag
        rewritten = rewritten.replace(
            /<head>/i,
            `<head><base href="${origin}/">`
        );
        
        // Remove CSP and frame-busting
        rewritten = rewritten.replace(
            /<meta[^>]*http-equiv=["']?Content-Security-Policy["']?[^>]*>/gi,
            ''
        );
        
        // Remove X-Frame-Options
        rewritten = rewritten.replace(
            /<meta[^>]*http-equiv=["']?X-Frame-Options["']?[^>]*>/gi,
            ''
        );
        
        // Rewrite fetch/XMLHttpRequest in scripts
        rewritten = rewritten.replace(
            /fetch\s*\(\s*["']([^"']+)["']/g,
            (match, url) => {
                if (url.startsWith('http')) {
                    return `fetch("/api/proxy?url=${encodeURIComponent(url)}"`;
                }
                return match;
            }
        );
        
    } catch (e) {
        console.error('Rewrite error:', e);
    }
    
    return rewritten;
}

// Search DuckDuckGo
function searchDuckDuckGo(query, callback) {
    const searchUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
    
    fetchUrl(searchUrl, (err, buffer) => {
        if (err) return callback(err);
        
        const html = buffer.toString('utf-8');
        const results = [];
        
        // Parse results with regex
        const resultRegex = /<a[^>]+class="result__a"[^>]+href="([^"]+)"[^>]*>([^<]+)<\/a>[\s\S]*?<a[^>]+class="result__snippet"[^>]*>([^<]+)/g;
        
        let match;
        while ((match = resultRegex.exec(html)) && results.length < 10) {
            let url = match[1];
            
            // Extract actual URL from DuckDuckGo redirect
            if (url.includes('uddg=')) {
                const uddgMatch = url.match(/uddg=([^&]+)/);
                if (uddgMatch) {
                    url = decodeURIComponent(uddgMatch[1]);
                }
            }
            
            results.push({
                url: url.replace(/^\/\//, 'https://'),
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
    res.setHeader('Access-Control-Allow-Headers', '*');

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

    // Enhanced proxy endpoint
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
            res.writeHead(200, { 
                'Content-Type': cached.contentType,
                'X-Proxy-Cache': 'HIT'
            });
            res.end(cached.data);
            return;
        }

        fetchUrl(targetUrl, (err, buffer, contentType, headers) => {
            if (err) {
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: err.message }));
                return;
            }

            let responseData = buffer;
            let finalContentType = contentType;

            // Rewrite HTML content
            if (contentType && contentType.includes('text/html')) {
                try {
                    const html = buffer.toString('utf-8');
                    const rewritten = rewriteHTML(html, targetUrl);
                    responseData = Buffer.from(rewritten, 'utf-8');
                } catch (e) {
                    console.error('HTML rewrite error:', e);
                }
            }

            // Rewrite CSS content
            if (contentType && contentType.includes('text/css')) {
                try {
                    const css = buffer.toString('utf-8');
                    const rewritten = css.replace(
                        /url\(["']?([^"')]+)["']?\)/g,
                        (match, url) => {
                            if (url.startsWith('http')) {
                                return `url("/api/proxy?url=${encodeURIComponent(url)}")`;
                            }
                            return match;
                        }
                    );
                    responseData = Buffer.from(rewritten, 'utf-8');
                } catch (e) {
                    console.error('CSS rewrite error:', e);
                }
            }

            // Cache the result
            cache.set(targetUrl, { 
                data: responseData, 
                contentType: finalContentType, 
                timestamp: Date.now() 
            });

            res.writeHead(200, { 
                'Content-Type': finalContentType,
                'X-Proxy-Cache': 'MISS'
            });
            res.end(responseData);
        });
        return;
    }

    // 404
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not Found');
});

// Enhanced HTML frontend
function getIndexHTML() {
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Privacy Search V2 - Enhanced</title>
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

        .nav-btn {
            padding: 8px 12px;
            background: #151a1f;
            border: 1px solid #2a2f35;
            border-radius: 4px;
            color: #e6e6e6;
            cursor: pointer;
            font-size: 14px;
        }

        .nav-btn:hover {
            background: #1a1f24;
            border-color: #00d4aa;
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
            background: white;
        }

        .status {
            padding: 4px 12px;
            background: #00d4aa;
            color: #0a0e14;
            font-size: 12px;
            border-radius: 4px;
            display: none;
        }

        .status.visible { display: block; }
    </style>
</head>
<body>
    <div id="app">
        <div class="search-container" id="searchContainer">
            <div class="search-box">
                <input type="text" class="search-input" id="searchInput" placeholder="Search or type a URL (works with YouTube, TikTok, io games!)" autofocus>
            </div>
        </div>

        <div class="results-container" id="resultsContainer">
            <div class="results-list" id="resultsList"></div>
        </div>

        <div class="browser-view" id="browserView">
            <div class="address-bar">
                <button class="nav-btn" id="backBtn">← Back</button>
                <button class="nav-btn" id="homeBtn">🏠 Home</button>
                <input type="text" class="url-input" id="urlInput" placeholder="Enter URL">
                <div class="status" id="status">Loading...</div>
            </div>
            <iframe id="contentFrame" sandbox="allow-same-origin allow-scripts allow-forms allow-popups"></iframe>
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
        const backBtn = document.getElementById('backBtn');
        const homeBtn = document.getElementById('homeBtn');
        const status = document.getElementById('status');

        searchInput.addEventListener('keypress', async (e) => {
            if (e.key === 'Enter') {
                const query = searchInput.value.trim();
                if (!query) return;

                if (isUrl(query)) {
                    loadUrl(normalizeUrl(query));
                } else {
                    performSearch(query);
                }
            }
        });

        urlInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                loadUrl(normalizeUrl(urlInput.value.trim()));
            }
        });

        backBtn.addEventListener('click', () => {
            searchContainer.classList.remove('hidden');
            resultsContainer.classList.add('visible');
            browserView.classList.remove('visible');
        });

        homeBtn.addEventListener('click', () => {
            searchContainer.classList.remove('hidden');
            resultsContainer.classList.remove('visible');
            browserView.classList.remove('visible');
            searchInput.value = '';
            searchInput.focus();
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

            resultsList.innerHTML = '<div class="loading">🔍 Searching...</div>';

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
            status.classList.add('visible');
            status.textContent = 'Loading...';

            try {
                const proxyUrl = \`/api/proxy?url=\${encodeURIComponent(url)}\`;
                
                // Set iframe src to proxy URL
                contentFrame.src = proxyUrl;

                // Hide status after load
                contentFrame.onload = () => {
                    status.classList.remove('visible');
                };

            } catch (error) {
                status.textContent = 'Error: ' + error.message;
                setTimeout(() => status.classList.remove('visible'), 3000);
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
                homeBtn.click();
            }
        });
    </script>
</body>
</html>`;
}

server.listen(PORT, () => {
    console.log(`\n🔒 Privacy Search Browser V2 - Enhanced`);
    console.log(`Running on http://localhost:${PORT}`);
    console.log(`\n✨ Now supports:`);
    console.log(`   - YouTube videos`);
    console.log(`   - TikTok content`);
    console.log(`   - io games`);
    console.log(`   - Discord (limited)`);
    console.log(`   - Most dynamic websites`);
    console.log(`\nPress Ctrl+C to stop\n`);
});
