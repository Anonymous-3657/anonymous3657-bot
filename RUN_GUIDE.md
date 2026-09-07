# 🚀 Complete Setup & Run Guide - CG Student Portal

## 📋 Prerequisites

Before running the application, make sure you have:

### Required Software:
- **Python 3.10+** - For backend
- **Node.js 18+** - For frontend
- **MongoDB** - Database (local or cloud)
- **Git** - Version control

### Optional (Recommended):
- **MongoDB Atlas** - Free cloud MongoDB (easier than local setup)
- **VS Code** - Code editor
- **Postman** - API testing

---

## 🎯 Quick Start (5 Minutes)

### Step 1: Clone the Repository
```bash
git clone https://github.com/Anonymous-3657/anonymous3657-bot.git
cd anonymous3657-bot
```

### Step 2: Setup Backend
```bash
cd backend
python3 -m venv venv

# Windows
venv\Scripts\activate

# Mac/Linux
source venv/bin/activate

pip install -r requirements.txt
```

### Step 3: Configure Backend Environment
Create `backend/.env` file:
```bash
MONGO_URL=mongodb://localhost:27017
DB_NAME=cg_student_portal
JWT_SECRET=your-secret-key-change-this-to-something-random-123456789
ADMIN_EMAIL=admin@cgstudentportal.in
ADMIN_PASSWORD=CgAdmin@2026
APP_ENV=local
CORS_ORIGINS=*

# Storage (local filesystem for development)
STORAGE_BACKEND=local
LOCAL_STORAGE_PATH=./storage

# Optional: API Keys (leave empty for now)
OPENAI_API_KEY=
GEMINI_API_KEY=
RESEND_API_KEY=
```

### Step 4: Start MongoDB
**Option A: Local MongoDB**
```bash
# Install MongoDB locally
# Mac: brew install mongodb-community
# Windows: Download from https://www.mongodb.com/try/download/community
# Linux: Follow https://www.mongodb.com/docs/manual/installation/

# Start MongoDB
mongod
```

**Option B: MongoDB Atlas (Recommended for Beginners)**
1. Go to https://www.mongodb.com/cloud/atlas/register
2. Create free account
3. Create new cluster (free tier)
4. Get connection string
5. Replace `MONGO_URL` in `.env` with your connection string:
   ```
   MONGO_URL=mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
   ```

### Step 5: Start Backend Server
```bash
cd backend
# Make sure you're in the virtual environment
uvicorn server:app --host 0.0.0.0 --port 8000 --reload
```

You should see:
```
INFO:     Uvicorn running on http://0.0.0.0:8000 (Press CTRL+C to quit)
INFO:     Started reloader process
INFO:     Started server process
INFO:     Indexes ensured; admin seed: created
```

### Step 6: Setup Frontend
```bash
cd frontend
npm install --legacy-peer-deps
```

### Step 7: Configure Frontend Environment
Create `frontend/.env` file:
```bash
REACT_APP_BACKEND_URL=http://localhost:8000
```

### Step 8: Start Frontend Server
```bash
cd frontend
npm start
```

You should see:
```
Compiled successfully!

You can now view frontend in the browser.

  Local:            http://localhost:3000
  On Your Network:  http://192.168.x.x:3000
```

### Step 9: Open Your Browser
Visit: **http://localhost:3000**

🎉 **Done! Your application is now running!**

---

## 📝 Detailed Setup Instructions

### Backend Setup (FastAPI + MongoDB)

#### 1. Install Python Dependencies
```bash
cd backend
python3 -m venv venv

# Activate virtual environment
# Windows:
venv\Scripts\activate

# Mac/Linux:
source venv/bin/activate

# Install all packages
pip install -r requirements.txt
```

#### 2. Environment Variables
Create `backend/.env`:
```env
# MongoDB Configuration
MONGO_URL=mongodb://localhost:27017
DB_NAME=cg_student_portal

# JWT Authentication
JWT_SECRET=change-this-to-a-random-secret-key-at-least-32-chars

# Admin Account (created on first run)
ADMIN_EMAIL=admin@cgstudentportal.in
ADMIN_PASSWORD=CgAdmin@2026

# App Configuration
APP_ENV=local
CORS_ORIGINS=http://localhost:3000,http://localhost:8000

# File Storage
STORAGE_BACKEND=local
LOCAL_STORAGE_PATH=./storage

# Optional: Email Service (Resend)
RESEND_API_KEY=

# Optional: AI Services (for Study Buddy)
OPENAI_API_KEY=
GEMINI_API_KEY=
```

**Important:**
- Change `JWT_SECRET` to a random secure string
- Use strong `ADMIN_PASSWORD`
- For production, set `APP_ENV=production`

#### 3. Initialize Database
On first run, the backend automatically:
- Creates MongoDB indexes
- Seeds the admin user
- Seeds 158 colleges data
- Creates initial collections

#### 4. Run Backend
```bash
cd backend
uvicorn server:app --host 0.0.0.0 --port 8000 --reload
```

**Flags explained:**
- `--host 0.0.0.0` - Allow external connections
- `--port 8000` - Run on port 8000
- `--reload` - Auto-reload on code changes (dev only)

**Test Backend:**
```bash
# Health check
curl http://localhost:8000/health

# API docs (Swagger UI)
open http://localhost:8000/docs
```

---

### Frontend Setup (React + Tailwind)

#### 1. Install Dependencies
```bash
cd frontend
npm install --legacy-peer-deps
```

**Why `--legacy-peer-deps`?**
Some packages have peer dependency conflicts. This flag resolves them.

#### 2. Environment Variables
Create `frontend/.env`:
```env
# Backend API URL
REACT_APP_BACKEND_URL=http://localhost:8000
```

**For Production:**
```env
REACT_APP_BACKEND_URL=https://your-backend-domain.com
```

#### 3. Run Development Server
```bash
npm start
```

This starts the React development server with hot-reload.

**Build for Production:**
```bash
npm run build
```

This creates optimized files in `frontend/build/`

---

### MongoDB Setup

#### Option A: Local MongoDB

**Installation:**

**Mac:**
```bash
brew tap mongodb/brew
brew install mongodb-community@7.0
brew services start mongodb-community@7.0
```

**Windows:**
1. Download MongoDB from: https://www.mongodb.com/try/download/community
2. Install with default settings
3. MongoDB runs as a Windows service automatically

**Linux (Ubuntu/Debian):**
```bash
# Import MongoDB public key
curl -fsSL https://www.mongodb.org/static/pgp/server-7.0.asc | sudo gpg -o /usr/share/keyrings/mongodb-server-7.0.gpg --dearmor

# Add MongoDB repository
echo "deb [ arch=amd64,arm64 signed-by=/usr/share/keyrings/mongodb-server-7.0.gpg ] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/7.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-7.0.list

# Install
sudo apt-get update
sudo apt-get install -y mongodb-org

# Start MongoDB
sudo systemctl start mongod
sudo systemctl enable mongod
```

**Verify MongoDB is running:**
```bash
mongosh
# Should connect to MongoDB shell
```

#### Option B: MongoDB Atlas (Cloud - Recommended)

1. **Create Account:**
   - Go to https://www.mongodb.com/cloud/atlas/register
   - Sign up for free

2. **Create Cluster:**
   - Click "Build a Database"
   - Select FREE tier (M0)
   - Choose cloud provider & region
   - Click "Create Cluster"

3. **Create Database User:**
   - Go to "Database Access"
   - Click "Add New Database User"
   - Username: `cgstudentportal`
   - Password: (generate strong password)
   - Role: "Read and write to any database"
   - Click "Add User"

4. **Allow Network Access:**
   - Go to "Network Access"
   - Click "Add IP Address"
   - Click "Allow Access from Anywhere" (0.0.0.0/0)
   - Click "Confirm"

5. **Get Connection String:**
   - Go to "Database" → "Connect"
   - Choose "Connect your application"
   - Copy connection string:
   ```
   mongodb+srv://cgstudentportal:<password>@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
   ```

6. **Update `.env`:**
   ```env
   MONGO_URL=mongodb+srv://cgstudentportal:YOUR_PASSWORD@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
   ```

---

## 🔧 Troubleshooting

### Backend Issues

**Error: "MongoDB connection failed"**
```bash
# Check if MongoDB is running
# Local:
mongod --version
# or
ps aux | grep mongod

# Atlas: Check connection string and network access
```

**Error: "Module not found"**
```bash
# Reinstall dependencies
cd backend
pip install -r requirements.txt --force-reinstall
```

**Error: "Port 8000 already in use"**
```bash
# Use different port
uvicorn server:app --port 8001

# Or kill existing process
# Mac/Linux:
lsof -ti:8000 | xargs kill -9
# Windows:
netstat -ano | findstr :8000
taskkill /PID <PID> /F
```

### Frontend Issues

**Error: "Cannot connect to backend"**
```bash
# Check backend is running on port 8000
curl http://localhost:8000/health

# Check CORS_ORIGINS in backend/.env includes http://localhost:3000
```

**Error: "npm install fails"**
```bash
# Clear npm cache
npm cache clean --force

# Delete node_modules and reinstall
rm -rf node_modules package-lock.json
npm install --legacy-peer-deps
```

**Error: "Module not found" in React**
```bash
# Check all imports use correct paths
# All imports should use @/ alias
# Example: import { Button } from "@/components/ui/button"
```

### Database Issues

**Error: "Collection not found"**
```bash
# Database is auto-created on first backend run
# Make sure backend has started successfully at least once
```

**Error: "Duplicate key error"**
```bash
# Clear database and restart
# WARNING: This deletes all data!
mongosh
use cg_student_portal
db.dropDatabase()
# Restart backend
```

---

## 🎯 Running the Application

### Development Mode

**Terminal 1 - Backend:**
```bash
cd backend
source venv/bin/activate  # or venv\Scripts\activate on Windows
uvicorn server:app --host 0.0.0.0 --port 8000 --reload
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm start
```

**Access:**
- Frontend: http://localhost:3000
- Backend API: http://localhost:8000
- API Docs: http://localhost:8000/docs

### Production Mode

**Build Frontend:**
```bash
cd frontend
npm run build
```

**Serve Frontend:**
```bash
# Option 1: Using Python (simple)
cd frontend/build
python3 -m http.server 3000

# Option 2: Using Node.js
npm install -g serve
serve -s build -l 3000

# Option 3: Using nginx (recommended for production)
# See nginx configuration section below
```

**Run Backend (Production):**
```bash
cd backend
uvicorn server:app --host 0.0.0.0 --port 8000 --workers 4
```

---

## 📦 Deployment Options

### Option 1: Render.com (Free - Easiest)

**Backend:**
1. Push code to GitHub
2. Go to https://render.com
3. Create "Web Service"
4. Connect your GitHub repo
5. Build Command: `cd backend && pip install -r requirements.txt`
6. Start Command: `cd backend && uvicorn server:app --host 0.0.0.0 --port $PORT`
7. Add environment variables in Render dashboard

**Frontend:**
1. Create "Static Site"
2. Connect your GitHub repo
3. Build Command: `cd frontend && npm install && npm run build`
4. Publish Directory: `frontend/build`
5. Add environment variable: `REACT_APP_BACKEND_URL=https://your-backend.onrender.com`

### Option 2: Vercel (Frontend) + Railway (Backend)

**Frontend (Vercel):**
```bash
cd frontend
npm install -g vercel
vercel
```

**Backend (Railway):**
1. Go to https://railway.app
2. Create new project
3. Deploy from GitHub
4. Set environment variables
5. Get URL and update frontend env

### Option 3: VPS (DigitalOcean, AWS, etc.)

**Setup:**
```bash
# Install dependencies
sudo apt update
sudo apt install python3-pip python3-venv nodejs npm nginx mongodb

# Clone repo
git clone https://github.com/Anonymous-3657/anonymous3657-bot.git
cd anonymous3657-bot

# Setup backend
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# Setup frontend
cd ../frontend
npm install --legacy-peer-deps
npm run build

# Use PM2 to keep backend running
npm install -g pm2
cd ../backend
pm2 start "uvicorn server:app --host 0.0.0.0 --port 8000 --workers 4" --name backend
```

**Nginx Configuration:**
```nginx
server {
    listen 80;
    server_name yourdomain.com;

    # Frontend
    location / {
        root /path/to/frontend/build;
        try_files $uri $uri/ /index.html;
    }

    # Backend API
    location /api {
        proxy_pass http://localhost:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

---

## 🔐 Environment Variables Reference

### Backend (.env)
```env
# Required
MONGO_URL=mongodb://localhost:27017
DB_NAME=cg_student_portal
JWT_SECRET=your-secret-key

# Admin
ADMIN_EMAIL=admin@cgstudentportal.in
ADMIN_PASSWORD=StrongPassword123

# App
APP_ENV=local  # or production
CORS_ORIGINS=http://localhost:3000

# Storage
STORAGE_BACKEND=local
LOCAL_STORAGE_PATH=./storage

# Optional
OPENAI_API_KEY=sk-...
GEMINI_API_KEY=...
RESEND_API_KEY=re_...
```

### Frontend (.env)
```env
REACT_APP_BACKEND_URL=http://localhost:8000
```

---

## 🧪 Testing

### Backend Tests
```bash
cd backend
pytest
```

### Frontend Tests
```bash
cd frontend
npm test
```

---

## 📱 Access URLs

After running locally:

| Service | URL |
|---------|-----|
| Frontend | http://localhost:3000 |
| Backend API | http://localhost:8000 |
| API Documentation | http://localhost:8000/docs |
| Admin Panel | http://localhost:3000/admin |
| Public Materials | http://localhost:3000/materials |
| Login Page | http://localhost:3000/login |

**Default Admin Credentials:**
- Email: admin@cgstudentportal.in
- Password: CgAdmin@2026

---

## 🎉 You're All Set!

Your CG Student Portal is now running with:

✅ **15+ Features:**
- Notification system
- Student profiles
- Rating & reviews
- Comments & discussions
- Admin analytics dashboard
- Bulk actions
- Announcements
- Platform settings
- CSV export
- Public downloads
- Animated login page
- Theme toggle
- And more!

✅ **Tech Stack:**
- Backend: FastAPI + MongoDB
- Frontend: React + Tailwind CSS
- Authentication: JWT with httpOnly cookies
- File Storage: Local filesystem (or cloud)

✅ **Ready for:**
- Development
- Testing
- Deployment

---

## 📞 Need Help?

- **Documentation:** Check `ALL_FEATURES_COMPLETED.md`
- **API Docs:** Visit http://localhost:8000/docs (when backend is running)
- **GitHub Issues:** https://github.com/Anonymous-3657/anonymous3657-bot/issues

---

## 🚀 Next Steps

1. **Explore the app** - Visit all pages, test features
2. **Customize** - Change colors, branding in `frontend/src/index.css`
3. **Add content** - Create universities, courses, resources via admin panel
4. **Deploy** - Choose a hosting option from the deployment section
5. **Share** - Show the world your amazing student portal!

**Happy coding! 🎊**
