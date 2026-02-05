# Friends Chat Room - Deployment Guide

## 🌐 Deploy to Public (Free Options)

### Option 1: Render.com (Recommended - Free Tier Available)

#### Backend Deployment:
1. Create account at [render.com](https://render.com)
2. Click "New +" → "Web Service"
3. Connect your GitHub/GitLab or upload code
4. Settings:
   - **Name**: `friends-chat-backend`
   - **Environment**: `Python 3`
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `python server.py`
   - **Plan**: Free
5. Click "Create Web Service"
6. Copy the URL (e.g., `https://friends-chat-backend.onrender.com`)

#### Frontend Deployment:
1. Update `frontend_chat/src/services/api.js`:
   ```javascript
   const client = axios.create({
       baseURL: 'https://YOUR-BACKEND-URL.onrender.com', // Replace with your backend URL
       headers: {
           'Content-Type': 'application/json',
       },
   });
   ```

2. Build frontend:
   ```bash
   cd frontend_chat
   npm run build
   ```

3. Deploy to Render:
   - Click "New +" → "Static Site"
   - **Publish Directory**: `dist`
   - **Build Command**: `npm install && npm run build`
   - Click "Create Static Site"

### Option 2: Vercel (Frontend) + Railway (Backend)

#### Backend on Railway:
1. Go to [railway.app](https://railway.app)
2. "New Project" → "Deploy from GitHub"
3. Select `backend_python` folder
4. Railway auto-detects Python
5. Add environment variable if needed
6. Get your backend URL

#### Frontend on Vercel:
1. Go to [vercel.com](https://vercel.com)
2. "Add New" → "Project"
3. Import your repository
4. **Root Directory**: `frontend_chat`
5. **Framework Preset**: Vite
6. **Build Command**: `npm run build`
7. **Output Directory**: `dist`
8. Add environment variable:
   - Name: `VITE_API_URL`
   - Value: Your Railway backend URL
9. Deploy!

### Option 3: PythonAnywhere (All-in-One)

1. Create account at [pythonanywhere.com](https://pythonanywhere.com)
2. Upload backend code
3. Configure WSGI file
4. Host frontend static files
5. Get your URL: `yourusername.pythonanywhere.com`

---

## 📱 Mobile Access

Once deployed, your app will work on:
- ✅ iPhone/iPad (Safari, Chrome)
- ✅ Android (Chrome, Firefox)
- ✅ Any device with a web browser

**Add to Home Screen** (Makes it feel like a native app):
- **iOS**: Safari → Share → "Add to Home Screen"
- **Android**: Chrome → Menu → "Add to Home Screen"

---

## 🔒 Security for Production

Before going live, update `backend_python/server.py`:

```python
# Change this line:
app.run(port=8069, debug=True)

# To:
app.run(host='0.0.0.0', port=8069, debug=False)
```

---

## 🚀 Quick Deploy with Render (EASIEST)

I have created a `render.yaml` and `Dockerfile` for you.

1.  **Push to GitHub**:
    ```bash
    git add .
    git commit -m "Deploy Ready"
    git push origin main
    ```

2.  **Deploy on Render**:
    - Go to [dashboard.render.com/blueprints](https://dashboard.render.com/blueprints)
    - Click "New Blueprint Instance"
    - Connect your GitHub repository.
    - Render will automatically read `render.yaml` and deploys your app!

That's it! No complex manual configuration needed.

---

## 🌍 Your Live URLs

After deployment, you'll get:
- **Backend**: `https://friends-chat-backend.onrender.com`
- **Frontend**: `https://friends-chat.vercel.app` (or similar)

Share the frontend URL with your friends!

---

## 💡 Tips

1. **Free tier limitations**:
   - Render free tier sleeps after 15 min of inactivity
   - First request after sleep takes ~30 seconds
   - Consider upgrading ($7/month) for always-on

2. **Custom Domain** (Optional):
   - Buy domain from Namecheap/GoDaddy
   - Point to your Vercel/Render URL
   - Example: `chat.yourname.com`

3. **Mobile Performance**:
   - App is already responsive
   - Works offline? No (needs internet)
   - Install as PWA for app-like experience
