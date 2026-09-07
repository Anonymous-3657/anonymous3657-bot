# 🖥️ LOCAL PC MEIN KAISE RUN KAREIN - Complete Step-by-Step Guide

## 📋 PEHLE YE SAB INSTALL KAREIN:

---

### ✅ STEP 1: Python Install Karein (Required for Backend)

#### **Windows ke liye:**
1. https://www.python.org/downloads/ par jayein
2. "Download Python 3.11.x" button click karein
3. Installer run karein
4. ⚠️ **IMPORTANT:** "Add Python to PATH" checkbox tick karein
5. "Install Now" click karein
6. Installation complete hone ke baad "Close" click karein

#### **Check karein Python install hua ya nahi:**
```bash
# Command Prompt (CMD) ya PowerShell kholain
python --version
# Output: Python 3.11.x dikhna chahiye
```

#### **Mac ke liye:**
```bash
# Terminal kholain aur ye command chalayein
brew install python
```

#### **Linux (Ubuntu/Debian) ke liye:**
```bash
sudo apt update
sudo apt install python3 python3-pip python3-venv
```

---

### ✅ STEP 2: Node.js Install Karein (Required for Frontend)

#### **Windows/Mac/Linux ke liye:**
1. https://nodejs.org/ par jayein
2. "LTS" (Long Term Support) version download karein
3. Installer run karein
4. "Next" → "Next" → "Install" karte jayein
5. Computer restart karein (recommended)

#### **Check karein Node.js install hua ya nahi:**
```bash
node --version
# Output: v18.x.x ya v20.x.x dikhna chahiye

npm --version
# Output: 9.x.x ya 10.x.x dikhna chahiye
```

---

### ✅ STEP 3: MongoDB Install Karein (Database ke liye)

#### **OPTION A: MongoDB Atlas (Online - RECOMMENDED - EASIEST)**

Ye sabse aasan tarika hai. Local install karne ki zarurat nahi.

1. https://www.mongodb.com/cloud/atlas/register par jayein
2. **Free account banayein:**
   - Email: apna email daalein
   - Password: strong password banayein
   - Full Name: apna naam daalein

3. **"Build a Database" click karein**

4. **FREE tier select karein:**
   - "M0 FREE" option select karein
   - Cloud Provider: AWS ya Google Cloud
   - Region: Mumbai (India) select karein
   - Cluster Name: `cg-student-portal` daalein
   - "Create Cluster" click karein
   - 3-5 minutes wait karein

5. **Database User banayein:**
   - "Database Access" section mein jayein
   - "Add New Database User" click karein
   - Username: `cgstudentportal`
   - Password: `StrongPass123` (ya koi strong password)
   - Role: "Read and write to any database" select karein
   - "Add Database User" click karein

6. **Network Access set karein:**
   - "Network Access" section mein jayein
   - "Add IP Address" click karein
   - "Allow Access from Anywhere" (0.0.0.0/0) click karein
   - "Confirm" click karein

7. **Connection String lein:**
   - "Database" section mein jayein
   - "Connect" button click karein
   - "Connect your application" choose karein
   - Driver: "Python", Version: "4.0 or later"
   - Connection string copy karein:
   ```
   mongodb+srv://cgstudentportal:<password>@cg-student-portal.xxxxx.mongodb.net/?retryWrites=true&w=majority
   ```
   - `<password>` ko apne actual password se replace karein
   - Example: `mongodb+srv://cgstudentportal:StrongPass123@cg-student-portal.xxxxx.mongodb.net/?retryWrites=true&w=majority`

8. **Ye connection string save kar lein - hum ise aage use karenge!**

---

#### **OPTION B: Local MongoDB Install Karein (Advanced Users)**

##### **Windows ke liye:**
1. https://www.mongodb.com/try/download/community par jayein
2. "Windows" select karein
3. "MSI" download karein
4. Installer run karein
5. "Complete" installation type select karein
6. "Install MongoDB as a Service" checkbox tick karein
7. Install karein

##### **Check karein MongoDB chal raha hai:**
```bash
# Command Prompt kholain
mongo
# Ya
mongosh
# MongoDB shell open hona chahiye
```

##### **Mac ke liye:**
```bash
# Homebrew install karein agar nahi hai
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# MongoDB install karein
brew tap mongodb/brew
brew install mongodb-community

# MongoDB start karein
brew services start mongodb-community
```

##### **Linux (Ubuntu) ke liye:**
```bash
# MongoDB public key import karein
curl -fsSL https://www.mongodb.org/static/pgp/server-7.0.asc | sudo gpg -o /usr/share/keyrings/mongodb-server-7.0.gpg --dearmor

# MongoDB repository add karein
echo "deb [ arch=amd64,arm64 signed-by=/usr/share/keyrings/mongodb-server-7.0.gpg ] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/7.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-7.0.list

# Install karein
sudo apt update
sudo apt install -y mongodb-org

# MongoDB start karein
sudo systemctl start mongod
sudo systemctl enable mongod
```

---

### ✅ STEP 4: Git Install Karein (Code download karne ke liye)

#### **Windows ke liye:**
1. https://git-scm.com/download/win par jayein
2. Installer download aur run karein
3. "Next" → "Next" → "Install" karte jayein

#### **Mac ke liye:**
```bash
# Terminal kholain
xcode-select --install
# Popup aayega, "Install" click karein
```

#### **Linux ke liye:**
```bash
sudo apt install git
```

#### **Check karein Git install hua ya nahi:**
```bash
git --version
# Output: git version 2.x.x dikhna chahiye
```

---

## 🚀 AB CODE RUN KARTE HAIN:

---

### ✅ STEP 5: GitHub Se Code Download Karein

```bash
# Apne computer mein ek folder kholain jahan aap project rakhna chahte hain
# Example: C:\Projects (Windows) ya ~/Projects (Mac/Linux)

# GitHub se code clone karein
git clone https://github.com/Anonymous-3657/anonymous3657-bot.git

# Project folder mein jayein
cd anonymous3657-bot
```

---

### ✅ STEP 6: Backend Setup Karein

#### **6.1 Backend Folder Mein Jayein:**
```bash
cd backend
```

#### **6.2 Virtual Environment Banayein:**
```bash
# Windows:
python -m venv venv

# Mac/Linux:
python3 -m venv venv
```

#### **6.3 Virtual Environment Activate Karein:**
```bash
# Windows (Command Prompt):
venv\Scripts\activate

# Windows (PowerShell):
.\venv\Scripts\Activate.ps1

# Mac/Linux:
source venv/bin/activate
```

**Aapko terminal mein `(venv)` dikhna chahiye - iska matlab virtual environment active hai!**

#### **6.4 Dependencies Install Karein:**
```bash
pip install -r requirements.txt
```

**Ye 5-10 minutes le sakta hai. Wait karein.**

#### **6.5 .env File Banayein:**

Backend folder mein ek new file banayein: `.env` (bina kisi extension ke)

**Windows:**
```bash
# Notepad kholain
notepad .env
```

**Mac/Linux:**
```bash
nano .env
```

**Ye content paste karein:**
```env
# MongoDB Configuration
# Agar MongoDB Atlas use kar rahe hain:
MONGO_URL=mongodb+srv://cgstudentportal:StrongPass123@cg-student-portal.xxxxx.mongodb.net/?retryWrites=true&w=majority

# Agar Local MongoDB use kar rahe hain:
# MONGO_URL=mongodb://localhost:27017

DB_NAME=cg_student_portal

# JWT Secret (Koi bhi random string daal dein - kam se kam 32 characters)
JWT_SECRET=my-super-secret-jwt-key-123456789-change-this-in-production

# Admin Account (First time backend run karne par ye admin account banega)
ADMIN_EMAIL=admin@cgstudentportal.in
ADMIN_PASSWORD=CgAdmin@2026

# App Configuration
APP_ENV=local
CORS_ORIGINS=http://localhost:3000,http://localhost:8000

# File Storage
STORAGE_BACKEND=local
LOCAL_STORAGE_PATH=./storage

# Optional: Email Service (Abhi ke liye khaali chhod dein)
RESEND_API_KEY=

# Optional: AI Services (Abhi ke liye khaali chhod dein)
OPENAI_API_KEY=
GEMINI_API_KEY=
```

**⚠️ IMPORTANT:** 
- `MONGO_URL` ko apne MongoDB Atlas connection string se replace karein
- Agar local MongoDB use kar rahe hain to `MONGO_URL=mongodb://localhost:27017` use karein
- File save karein: `Ctrl+S` (Windows) ya `Ctrl+O` (nano editor mein)

#### **6.6 Backend Server Start Karein:**
```bash
uvicorn server:app --host 0.0.0.0 --port 8000 --reload
```

**Aapko ye output dikhna chahiye:**
```
INFO:     Uvicorn running on http://0.0.0.0:8000 (Press CTRL+C to quit)
INFO:     Started reloader process [12345]
INFO:     Started server process [12346]
INFO:     Waiting for application startup.
INFO:     Application startup complete.
```

**✅ Backend successfully chal raha hai!**

**Check karein:** Browser mein http://localhost:8000/health kholain
- Agar `{"status":"ok"}` dikhai de, to backend sahi chal raha hai!

---

### ✅ STEP 7: Frontend Setup Karein

#### **⚠️ IMPORTANT: Backend server chal raha hai, lekin usko band mat karna! Naya terminal window kholain.**

#### **7.1 Naya Terminal/Command Prompt Kholain:**
- **Windows:** Naya Command Prompt ya PowerShell window kholain
- **Mac/Linux:** Naya Terminal tab kholain (`Ctrl+Shift+T`)

#### **7.2 Project Folder Mein Jayein:**
```bash
# Jahan aapne project clone kiya tha wahan jayein
cd anonymous3657-bot
cd frontend
```

#### **7.3 Dependencies Install Karein:**
```bash
npm install --legacy-peer-deps
```

**Ye 10-15 minutes le sakta hai. Wait karein.**

#### **7.4 .env File Banayein:**

Frontend folder mein ek new file banayein: `.env`

**Windows:**
```bash
notepad .env
```

**Mac/Linux:**
```bash
nano .env
```

**Ye content paste karein:**
```env
REACT_APP_BACKEND_URL=http://localhost:8000
```

**File save karein.**

#### **7.5 Frontend Server Start Karein:**
```bash
npm start
```

**Browser automatically khul jayega: http://localhost:3000**

**Agar browser na khule, to manually kholain:** http://localhost:3000

---

## 🎉 DONE! Aapki Website Chal Rahi Hai!

---

### 🌐 Aap Ab Ye Access Kar Sakte Hain:

| Service | URL |
|---------|-----|
| **Main Website** | http://localhost:3000 |
| **Backend API** | http://localhost:8000 |
| **API Documentation** | http://localhost:8000/docs |
| **Admin Panel** | http://localhost:3000/admin |
| **Login Page** | http://localhost:3000/login |
| **Public Materials** | http://localhost:3000/materials |
| **Animated Login** | http://localhost:3000/login |

---

### 🔐 Admin Login:

**Email:** `admin@cgstudentportal.in`  
**Password:** `CgAdmin@2026`

---

## 📝 TERMINAL WINDOWS SUMMARY:

Aapke paas **2 terminal windows** open honi chahiye:

### **Terminal 1 (Backend):**
```
cd anonymous3657-bot/backend
venv\Scripts\activate  # (ya source venv/bin/activate)
uvicorn server:app --host 0.0.0.0 --port 8000 --reload
```
**✅ Ye terminal band mat karna!**

### **Terminal 2 (Frontend):**
```
cd anonymous3657-bot/frontend
npm start
```
**✅ Ye terminal bhi band mat karna!**

---

## 🔄 NEXT TIME JAB AAP RUN KARNA CHAHEIN:

### **Backend Start Karne Ke Liye:**
```bash
cd anonymous3657-bot/backend
venv\Scripts\activate  # (ya source venv/bin/activate)
uvicorn server:app --host 0.0.0.0 --port 8000 --reload
```

### **Frontend Start Karne Ke Liye (Naye Terminal Mein):**
```bash
cd anonymous3657-bot/frontend
npm start
```

---

## ❓ COMMON PROBLEMS & SOLUTIONS:

### **Problem 1: "python" command nahi mil raha**
**Solution:** Python install karein aur PATH mein add karein

### **Problem 2: "pip" command nahi mil raha**
**Solution:** 
```bash
python -m pip install -r requirements.txt
```

### **Problem 3: "MongoDB connection failed"**
**Solution:** 
- Agar MongoDB Atlas use kar rahe hain: Connection string check karein
- Agar local MongoDB use kar rahe hain: MongoDB service start karein
  ```bash
  # Windows:
  net start MongoDB
  
  # Mac:
  brew services start mongodb-community
  
  # Linux:
  sudo systemctl start mongod
  ```

### **Problem 4: "npm install" fail ho raha hai**
**Solution:** 
```bash
# Cache clear karein
npm cache clean --force

# node_modules delete karein
rm -rf node_modules package-lock.json

# Dobara install karein
npm install --legacy-peer-deps
```

### **Problem 5: Port 8000 ya 3000 already in use**
**Solution:**
```bash
# Windows:
netstat -ano | findstr :8000
taskkill /PID <PID_NUMBER> /F

# Mac/Linux:
lsof -ti:8000 | xargs kill -9
```

### **Problem 6: Frontend backend se connect nahi ho raha**
**Solution:**
- Check karein backend chal raha hai ya nahi
- Check karein `frontend/.env` file mein `REACT_APP_BACKEND_URL=http://localhost:8000` hai
- Frontend restart karein (`Ctrl+C` karke dobara `npm start`)

### **Problem 7: Browser mein "Cannot GET /" dikh raha hai**
**Solution:**
- Backend ke liye: http://localhost:8000/docs kholain
- Frontend ke liye: http://localhost:3000 kholain

---

## 🛑 SERVER BAND KARNE KE LIYE:

Dono terminal mein:
```
Ctrl + C
```

---

## 📚 COMPLETE FILE STRUCTURE:

```
anonymous3657-bot/
├── backend/
│   ├── venv/                    # Virtual environment (aapne banaya)
│   ├── .env                     # Configuration file (aapne banaya)
│   ├── server.py                # Main backend file
│   ├── requirements.txt         # Python dependencies
│   └── ...
├── frontend/
│   ├── node_modules/            # npm packages (install hone ke baad)
│   ├── .env                     # Configuration file (aapne banaya)
│   ├── package.json             # npm dependencies
│   └── ...
├── README.md
├── RUN_GUIDE.md
├── WHERE_TO_RUN.md
└── LOCAL_SETUP_GUIDE.md         # Ye file
```

---

## ✅ CHECKLIST - SAB INSTALL HUA YA NAHI:

- [ ] Python 3.10+ install hai
- [ ] Node.js 18+ install hai
- [ ] MongoDB Atlas account bana hai YA local MongoDB install hai
- [ ] Git install hai
- [ ] Code clone ho gaya hai
- [ ] Backend `.env` file banayi hai
- [ ] Backend dependencies install hui hain (`pip install -r requirements.txt`)
- [ ] Backend server chal raha hai (http://localhost:8000/health)
- [ ] Frontend `.env` file banayi hai
- [ ] Frontend dependencies install hui hain (`npm install --legacy-peer-deps`)
- [ ] Frontend server chal raha hai (http://localhost:3000)
- [ ] Browser mein website open ho rahi hai
- [ ] Admin login kaam kar raha hai

---

## 🎯 NEXT STEPS:

1. **Website explore karein:** http://localhost:3000
2. **Admin panel mein login karein:** http://localhost:3000/admin
3. **Animated login page dekhein:** http://localhost:3000/login
4. **Public materials dekhein:** http://localhost:3000/materials
5. **API docs dekhein:** http://localhost:8000/docs

---

## 📞 HELP CHAHIYE?

- **Detailed Guide:** `RUN_GUIDE.md` file dekhein
- **Where to Run:** `WHERE_TO_RUN.md` file dekhein
- **All Features:** `ALL_FEATURES_COMPLETED.md` file dekhein
- **GitHub Issues:** https://github.com/Anonymous-3657/anonymous3657-bot/issues

---

## 🎉 CONGRATULATIONS!

Aapne successfully apna CG Student Portal local PC par run kar liya hai! 🚀

Ab aap:
- ✅ Website use kar sakte hain
- ✅ Admin panel access kar sakte hain
- ✅ Features test kar sakte hain
- ✅ Development kar sakte hain
- ✅ Data add kar sakte hain

**Happy Coding!** 💻✨
