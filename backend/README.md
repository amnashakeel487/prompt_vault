# PromptVault Flask (Python) Backend

A lightweight, scalable **Flask (Python 3.12)** REST API backend connecting directly to the **Supabase PostgreSQL database** using the official `supabase-py` SDK.

---

## 🚀 How to Run the Backend

### 1. Prerequisites
- Python 3.10+ installed

### 2. Install Dependencies
```bash
cd backend
pip install -r requirements.txt
```

### 3. Environment Variables
The backend automatically reads the `.env` file from the project root directory. Ensure `.env` contains:
```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

### 4. Start the Flask Server
```bash
python app.py
```
* The server will run on `http://localhost:5000` (or the port defined in `$PORT`).
* Base endpoint check: `http://localhost:5000/`

---

## 📡 API Endpoints Overview

### 🔐 Authentication (`/api/auth`)
* `POST /api/auth/signup` — Public user registration
* `POST /api/auth/login` — Public user / Category Admin login (blocks super admin from public portal)
* `POST /api/auth/system-login` — Super Admin portal login
* `GET /api/auth/profile` — Get current authenticated user's role & profile
* `POST /api/auth/reset-password` — Send password reset email

### 📝 Prompts (`/api/prompts`)
* `GET /api/prompts` — List published prompts with filtering (category, tags, search, pagination)
* `GET /api/prompts/<slug>` — Get prompt by slug + related prompts
* `GET /api/prompts/pending` — List pending prompts awaiting review (Admin)
* `POST /api/prompts` — Create a new prompt
* `PUT /api/prompts/<id>` — Edit an existing prompt
* `PUT /api/prompts/<id>/approve` — Super Admin approve prompt
* `PUT /api/prompts/<id>/reject` — Super Admin reject prompt with reason
* `DELETE /api/prompts/<id>` — Delete a prompt
* `POST /api/prompts/<id>/views` — Increment view count
* `POST /api/prompts/<id>/copies` — Increment copy count

### 🏷️ Categories (`/api/categories`)
* `GET /api/categories` — List all categories with published prompt counts
* `GET /api/categories/<slug>` — Category detail + subcategories
* `POST /api/categories` — Create category (Admin)
* `PUT /api/categories/<id>` — Update category (Admin)
* `DELETE /api/categories/<id>` — Delete category (Admin)
* `GET /api/categories/<id>/subcategories` — List subcategories
* `POST /api/categories/subcategories` — Create subcategory
* `DELETE /api/categories/subcategories/<id>` — Delete subcategory

### 👥 Team Member Requests (`/api/team`)
* `POST /api/team/requests` — Submit a "Become a Team Member" application
* `GET /api/team/requests/status` — Get status of current user's team application
* `GET /api/team/requests` — List pending applications (Super Admin)
* `PUT /api/team/requests/<id>/approve` — Approve request (promotes user to `category_admin` in `admin_profiles`)
* `PUT /api/team/requests/<id>/reject` — Reject request with feedback

### ⭐ Favorites & Contact (`/api/favorites`)
* `POST /api/favorites/toggle` — Bookmark or unbookmark a prompt
* `GET /api/favorites` — Get list of user's favorited prompts
* `POST /api/favorites/contact` — Submit a contact message
* `GET /api/favorites/contact/messages` — List contact messages (Admin)
* `DELETE /api/favorites/contact/messages/<id>` — Delete message (Admin)

---

## 🏗️ Architecture
```
[ React Frontend (Vite) ]  ──(HTTP REST / JSON)──>  [ Flask Python API (:5000) ]  ──(supabase-py)──>  [ Supabase Postgres DB ]
```
