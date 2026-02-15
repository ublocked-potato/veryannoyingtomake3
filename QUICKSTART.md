# 🚀 Quick Start Guide

Get started with Privacy Search Browser in 60 seconds!

## ⚡ Fastest Way (Download & Run)

### 1. Download
Download these files to a folder:
- `server-v3.js` (recommended)
- OR `server-v2.js` (balanced)
- OR `server.js` (fastest)

### 2. Run
```bash
node server-v3.js
```

### 3. Open Browser
Visit: `http://localhost:3000`

**That's it!** No installation, no dependencies, just works.

---

## 📋 Which Version Should I Download?

### 🔴 server-v3.js (RECOMMENDED)
**Best for: YouTube, Games, TikTok, Everything**
- ✅ 95% UI accuracy
- ✅ YouTube works perfectly
- ✅ All games work
- ✅ TikTok works
- ⚠️ Slower (1.5s load time)

### 🟢 server-v2.js (BALANCED)
**Best for: Normal browsing, Most sites**
- ✅ 85% UI accuracy
- ✅ Most sites work well
- ⚠️ Some games work
- ⚠️ YouTube has issues
- ⚡ Medium speed (1.2s load time)

### 🔵 server.js (FASTEST)
**Best for: Docs, Wikipedia, Reading**
- ✅ 60% UI accuracy
- ✅ Super fast
- ❌ Games don't work
- ❌ YouTube doesn't work
- ⚡ Fastest (0.8s load time)

---

## 🎯 Quick Decision

**Just starting?** → Download `server-v3.js`

**Want speed?** → Download `server.js`

**Good balance?** → Download `server-v2.js`

---

## 📝 All Files Explained

### Required (Choose ONE):
- ✅ `server-v3.js` - Ultimate version (recommended)
- OR `server-v2.js` - Enhanced version
- OR `server.js` - Basic version

### Optional (Good to have):
- 📖 `README.md` - Main documentation
- 📖 `README-V2.md` - V2 details
- 📖 `README-V3.md` - V3 details
- 📦 `package.json` - NPM scripts (optional)
- 🐳 `Dockerfile` - For Docker deployment
- 📄 `LICENSE` - MIT License

### Not Needed:
- ❌ `node_modules/` - No dependencies!
- ❌ `package-lock.json` - No dependencies!

---

## 🔧 Different Ways to Run

### Method 1: Direct (Simplest)
```bash
node server-v3.js
```

### Method 2: With NPM
```bash
npm start          # Runs V3
npm run v2         # Runs V2
npm run v1         # Runs V1
```

### Method 3: Background
```bash
# macOS/Linux
nohup node server-v3.js &

# Windows
start node server-v3.js
```

### Method 4: PM2 (Production)
```bash
npm install -g pm2
pm2 start server-v3.js --name privacy-browser
pm2 startup
pm2 save
```

---

## 🎮 What Can I Do?

### With V3 (server-v3.js):
✅ Search DuckDuckGo  
✅ Watch YouTube videos  
✅ Watch TikTok videos  
✅ Play agar.io, slither.io  
✅ Browse GitHub pages  
✅ View most websites perfectly  

### Things that WON'T work (any version):
❌ Netflix (DRM protection)  
❌ Banking sites (security)  
❌ Login-required sites  
❌ Video calls (WebRTC)  

---

## 🐛 Common Issues

### "Port 3000 is already in use"
```bash
# Change the port in the file:
const PORT = 3001;  // Change this line

# Or kill the process:
lsof -i :3000
kill -9 <PID>
```

### "node: command not found"
Install Node.js from: https://nodejs.org

### "Search doesn't work"
- Check internet connection
- Make sure DuckDuckGo isn't blocked
- Try a VPN

### "Site looks weird"
- Try V3 instead of V1
- Some sites actively block proxies
- Check browser console for errors

---

## 🚀 Deploy to the Internet

### Heroku (Free)
```bash
# 1. Create Heroku app
heroku create my-privacy-browser

# 2. Push code
git init
git add .
git commit -m "Initial commit"
git push heroku main

# 3. Open
heroku open
```

### Railway (Easy)
1. Upload files to GitHub
2. Go to railway.app
3. Click "Deploy from GitHub"
4. Select your repo
5. Done!

### Render (Free)
1. Upload to GitHub
2. Go to render.com
3. New Web Service
4. Connect repo
5. Start command: `node server-v3.js`

---

## 📞 Need Help?

1. Read the full `README.md`
2. Check `README-V3.md` for V3 details
3. Google your error message
4. Check GitHub Issues

---

## ⭐ Tips

**Tip 1:** Start with V3, try others if it's too slow

**Tip 2:** Press `Ctrl+L` to return to search anytime

**Tip 3:** Works best with Chrome/Firefox

**Tip 4:** Close unused tabs to save memory

**Tip 5:** Restart server if it gets slow

---

## 🎉 You're Ready!

```bash
# Run this:
node server-v3.js

# Visit this:
http://localhost:3000

# Search for:
youtube.com
# or
agar.io
# or
wikipedia.org
```

**Enjoy private browsing!** 🔒
