# PathPoint — Frontend & Full Backend-Ready Architecture

**PathPoint** is a React and Express job platform backed by MongoDB, built with **React 18 (Vite), Tailwind CSS, Axios, and @hello-pangea/dnd**.

It has role-based authentication, an applicant pipeline, provider company and job tools, admin review queues, and a REST API backed by MongoDB.

---

## ✨ Core Features & Portals

### 1. 🎓 Candidate / Job Seeker Portal
- **Candidate Login (`/login`):**
  - Email and password authentication with visibility toggle.
  - "Remember Me" persistent session option.
  - Password reset by email verification code through the backend.
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
- **My Applications (`/my-applications`):**
  - Searchable, sortable, paginated company and job submissions with rejected history, notes, archive, and withdrawal actions.
  - Track and untrack applications, companies, and jobs from their detail and list views.
- **Interview Scheduler Calendar (`/interviews`):**
  - Centralized schedule with Next 7 Days urgency highlight.
- **Work Log (`/work-log`):**
  - Multi-step modal for recording, editing, and deleting work logs, backed by MongoDB.

---

### 2. 🛡️ Dedicated Administrative & Counselor Suite
- **Role-based Login (`/login`):**
  - The shared login redirects users to the dashboard for their role.
  - Admin-only routes are protected by a server role check and a frontend route guard.
- **Cohort Conversion Analytics (`/admin`):**
  - Platform-wide aggregate metrics (total seekers, applications per seeker, offer rates, status breakdown).
- **Job Seeker Directory & User Management (`/admin/users`):**
  - Searchable, filterable directory of all registered job seekers.
  - Review candidate portfolio drawer (Counselor Advisory View).
  - Account status toggling (Activate / Suspend student account).
  - One-click CSV roster export.
- **Application Oversight (`/admin/applications`):**
  - Search, filter, and review tracker, company, and job applications; admins can remove a submission and its private files.
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
- **API Adapter (`src/services/apiAdapter.js`):** Uses the Express API and MongoDB for authenticated application data. If the backend is unavailable, data pages show an error and retry action instead of creating local-only records.
- **API Specification:** Read [`BACKEND_SPECIFICATION.md`](./BACKEND_SPECIFICATION.md) for full endpoint contracts, JSON schemas, and Mongoose database definitions.

---

## 🚀 Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment
Use the live `frontend/.env` file with:
```env
VITE_API_URL=http://localhost:5000/api
```

### 3. Start Development Server
```bash
npm run dev
```
Open **`http://localhost:5173`** in your browser.

---

## Database-backed accounts

Create accounts through the registration flow. The frontend sends requests to the backend configured in `frontend/.env`, and the backend stores account data in the MongoDB database configured in `backend/.env`. Do not run the optional seed script against a live database.

---

## 🛠 Tech Stack

- **Framework:** React 18 with Vite
- **Styling:** Tailwind CSS (Vanilla CSS + utility design system)
- **Icons:** `lucide-react`
- **Drag-and-Drop:** `@hello-pangea/dnd`
- **Routing:** `react-router-dom` v6
- **HTTP Client:** `axios`
