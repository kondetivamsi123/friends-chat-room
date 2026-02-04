# Next Steps to Deploy

## You've successfully committed your code! 🎉

Now follow these steps to deploy:

### 1. Create GitHub Repository

1. Go to [github.com](https://github.com)
2. Click the "+" icon → "New repository"
3. Name: `friends-chat-room`
4. Description: "Secure chat room with MFA for friends"
5. **Keep it Public** (required for free hosting)
6. **DO NOT** initialize with README (you already have one)
7. Click "Create repository"

### 2. Push Your Code

GitHub will show you commands. Run these in your terminal:

```powershell
git remote add origin https://github.com/YOUR-USERNAME/friends-chat-room.git
git branch -M main
git push -u origin main
```

Replace `YOUR-USERNAME` with your actual GitHub username.

### 3. Deploy Backend on Render

1. Go to [render.com](https://render.com) and sign up (use GitHub to sign in)
2. Click "New +" → "Web Service"
3. Click "Connect account" to link GitHub
4. Select your `friends-chat-room` repository
5. Configure:
   - **Name**: `friends-chat-backend`
   - **Root Directory**: `backend_python`
   - **Environment**: `Python 3`
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `python server.py`
   - **Instance Type**: `Free`
6. Click "Create Web Service"
7. **IMPORTANT**: Copy the URL (e.g., `https://friends-chat-backend.onrender.com`)

### 4. Update Frontend with Backend URL

Edit `frontend_chat/src/services/api.js` line 5:

```javascript
// Change from:
baseURL: '', 

// To:
baseURL: 'https://friends-chat-backend.onrender.com',
```

Then commit and push:
```powershell
git add .
git commit -m "Update backend URL"
git push
```

### 5. Deploy Frontend on Render

1. In Render, click "New +" → "Static Site"
2. Select your `friends-chat-room` repository again
3. Configure:
   - **Name**: `friends-chat-room`
   - **Root Directory**: `frontend_chat`
   - **Build Command**: `npm install && npm run build`
   - **Publish Directory**: `dist`
4. Click "Create Static Site"
5. **DONE!** Copy your live URL (e.g., `https://friends-chat-room.onrender.com`)

### 6. Share with Friends! 🎉

Send them the frontend URL. They can:
- Open it on any device
- Add to home screen for app-like experience
- Login with their credentials

---

## Troubleshooting

**Backend shows "Application failed to respond"**:
- Wait 2-3 minutes for first deployment
- Check logs in Render dashboard

**Frontend can't connect to backend**:
- Make sure you updated `api.js` with correct backend URL
- Check CORS is enabled (it is in our code)

**Free tier goes to sleep**:
- Render free tier sleeps after 15 min inactivity
- First request takes ~30 seconds to wake up
- Upgrade to $7/month for always-on

---

## Your Credentials

**Users who can login**:
1. `vkrishna368.mail.com@gmail.com` / `Vamsi@143` (MFA: 123456)
2. `Saiprakash` / `Sai@123` (MFA: 123456)
3. `Danarao` / `Dana@123` (MFA: 123456)

Share these with your friends or add more users in `backend_python/server.py`!
