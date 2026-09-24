# PathPoint — Frontend & Full Backend-Ready Architecture

**PathPoint** is a production-grade, backend-ready Job Application Progress & Interview Tracker built with **React 18 (Vite), Tailwind CSS, Recharts, Axios, and @hello-pangea/dnd**.

It features dual-portal authentication (**Candidate Login & Signup** vs. **Dedicated Administrative Suite Login**), strict role-based access control, cohort analytics, student directory management, and an enterprise-grade API client layer ready to connect to any backend (Express, FastAPI, Django, Spring Boot, Go).

---

## ✨ Core Features & Portals

### 1. 🎓 Candidate / Job Seeker Portal
- **Candidate Login (`/login`):**
  - Email and password authentication with visibility toggle.
  - "Remember Me" persistent session option.
  - Interactive "Forgot Password" recovery modal with simulated reset link.
  - Direct portal gateway link to the Administrative Suite.
  - 1-Click Candidate Demo profiles (`Alex Morgan` & `Jordan Hayes`).
- **Candidate Registration (`/register`):**
  - Full Name, Email, Target Career Track selection, Password confirmation.
  - Real-time password strength checklist (length, case, numbers/symbols).
  - Terms of Service & Privacy Policy acceptance.
- **Application Kanban Board (`/dashboard`):**
  - 5-stage drag-and-drop pipeline (`Saved` → `Applied` → `Interviewing` → `Offered` → `Rejected`).
  - Search keyword filtering and alternate List View (`?view=list`).
- **Application Detail & Audit Trail (`/applications/:id`):**
  - Timestamped `statusHistory` audit trail.
  - Multi-round interview scheduler with upcoming alerts.
- **Interview Scheduler Calendar (`/interviews`):**
  - Centralized schedule with Next 7 Days urgency highlight.
- **Personal Analytics (`/analytics`):**
  - Interview conversion rate, offer rate, response velocity, and pipeline funnel charts.

---

### 2. 🛡️ Dedicated Administrative & Counselor Suite
- **Dedicated Admin Login (`/admin/login`):**
  - Distinct high-security cyber-slate design with Shield branding.
  - Counselor ID / Admin email, master password, and 2FA passcode field.
  - **Strict Role Enforcement:** Candidate credentials submitted to this portal are rejected with an explicit security refusal banner (`Access Denied: Administrative privileges required`).
  - 1-Click Counselor Demo button (`Dr. Sarah Lin` • `admin@example.com` / `admin123`).
- **Cohort Conversion Analytics (`/admin`):**
  - Platform-wide aggregate metrics (total seekers, applications per seeker, offer rates, status breakdown).
- **Job Seeker Directory & User Management (`/admin/users`):**
  - Searchable, filterable directory of all registered job seekers.
  - Review candidate portfolio drawer (Counselor Advisory View).
  - Account status toggling (Activate / Suspend student account).
  - One-click CSV roster export.
- **Backend Health & Diagnostics Hub (`/admin/system`):**
  - Live HTTP ping test against `/api/health` with roundtrip millisecond latency monitor.
  - Dynamic API Base URL switcher (switch between local `http://localhost:5000/api` or remote production URLs directly from the UI).
  - Active JWT Bearer session inspector.
- **403 Forbidden Route Guard (`/admin/access-denied`):**
  - Dedicated access denied screen preventing unauthorized candidates from viewing counselor tools.

---

## 🔌 Backend Readiness & API Layer

The frontend is 100% prepared for instant backend hookup:
- **API Client (`src/api/client.js`):** Axios instance with dynamic base URL, automatic Bearer JWT injection, and 401 session expiry interceptors.
- **Modular API Services:**
  - `src/api/authApi.js`: Login, admin login, registration, password recovery, session verification.
  - `src/api/applicationsApi.js`: Applications CRUD, status updates, resume uploads.
  - `src/api/adminApi.js`: Cohort benchmarks, candidate directory, status updates, portfolio inspection.
  - `src/api/systemApi.js`: Health pings, latency diagnostics, endpoint test runners.
- **Dual-Mode Adapter (`src/services/apiAdapter.js`):** Automatically detects if a backend is running on port 5000. If offline, gracefully falls back to rich client-side mock storage so the frontend never crashes and remains fully testable.
- **API Specification:** Read [`BACKEND_SPECIFICATION.md`](./BACKEND_SPECIFICATION.md) for full endpoint contracts, JSON schemas, and Mongoose database definitions.

---

## 🚀 Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment (Optional)
Copy `.env.example` to `.env`:
```env
VITE_API_URL=http://localhost:5000/api
```

### 3. Start Development Server
```bash
npm run dev
```
Open **`http://localhost:5173`** in your browser.

---

## 🔑 Demo Accounts

| Role | Email | Password | Access Level |
|---|---|---|---|
| **Student / Candidate** | `user@example.com` | `password123` | Candidate Portal (`/login`) |
| **Student / Candidate** | `jordan@example.com` | `password123` | Candidate Portal (`/login`) |
| **Counselor / Admin** | `admin@example.com` | `admin123` | Admin Portal (`/admin/login`) |

---

## 🛠 Tech Stack

- **Framework:** React 18 with Vite
- **Styling:** Tailwind CSS (Vanilla CSS + utility design system)
- **Icons:** `lucide-react`
- **Charts:** `recharts`
- **Drag-and-Drop:** `@hello-pangea/dnd`
- **Routing:** `react-router-dom` v6
- **HTTP Client:** `axios`
