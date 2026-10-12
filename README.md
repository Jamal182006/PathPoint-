# PathPoint

PathPoint is one role-based application for applicants, providers, and administrators, backed by a shared Express API and MongoDB database.


This project is split into two folders:

- `backend` — API server
- `frontend` — Vite React app

## Prerequisites

Before running the project, make sure you have:

- Node.js 18+ installed
- npm installed
- A MongoDB Atlas cluster and database user

> The backend uses Mongoose and is configured for a persistent MongoDB Atlas database. Keep the in-memory fallback disabled.

## MongoDB database setup

The backend uses Mongoose and the database name is `pathpoint`. On startup, the backend creates all required collections and indexes. MongoDB creates the database itself when those collections are initialized. An administrator is only bootstrapped when `BOOTSTRAP_ADMIN_EMAIL` and `BOOTSTRAP_ADMIN_PASSWORD` are configured; there is no built-in shared password.

### MongoDB Atlas

Create a free cluster at MongoDB Atlas, create a database user, add the backend server IP under **Network Access**, and put the connection string in `backend/.env`:

```env
MONGODB_URI=mongodb+srv://<username>:<password>@<cluster-host>/pathpoint?retryWrites=true&w=majority
MONGODB_ALLOW_MEMORY_FALLBACK=false
```

Use the live `backend/.env` file as the source of truth. Populate the real MongoDB URI, JWT secret, SMTP settings, and demo account passwords directly in that file. URL-encode special characters in the MongoDB username or password. Keep `.env` local and never commit its values.

## Quick start

From the project root, run:

```bash
npm install
npm run dev
```

This starts both the backend and frontend together automatically.

## 1) Install backend dependencies

Open a terminal and run:

```bash
cd backend
npm install
```

## 2) Start the backend

```bash
npm run dev
```

or:

```bash
npm start
```

The backend will start on:

- http://localhost:5000
- API health check: http://localhost:5000/api/health

Configure `backend/.env` with the MongoDB connection string and SMTP settings supplied by your database and email providers:

```env
MONGODB_URI=mongodb+srv://<username>:<password>@<cluster-host>/pathpoint?retryWrites=true&w=majority
MONGODB_ALLOW_MEMORY_FALLBACK=false
```

The backend environment file is server-only and contains database and SMTP settings. The frontend uses a separate `frontend/.env` containing only `VITE_API_URL`. For Gmail or Google Workspace, use an authorized app password and the SMTP settings enabled by the organization.

To test backend SMTP authentication without sending an email or displaying credentials, run `npm --prefix backend run check:smtp` after configuring `backend/.env`.

### Company applications

Company records and company applications are stored separately from the existing applicant job-tracker `applications` collection. Providers manage their companies at `/provider/companies`; the admin company review queue is at `/admin/companies`; applicants browse listings owned by verified providers, including listings pending company review. Pending listings are marked clearly; rejected and archived listings remain unavailable. Applicants submit dynamic text, date, select, and document fields from the company detail page.

The API adds `GET /api/companies`, `GET /api/companies/:companyId`, `POST /api/companies/:companyId/applications`, applicant application list/detail/file routes under `/api/companies/applications`, provider company CRUD under `/api/providers/me/companies`, provider applicant/status routes, and admin company list/review/archive routes under `/api/admin/companies`. Mongo-backed notifications are available under `/api/notifications` and refresh in the app every 10 seconds. The admin activity log is available at `/api/admin/activity-log`. Company application documents accept PDF, JPG, or PNG, up to 5 MB each, and are accessible only through authenticated ownership-checked routes. Keep `backend/private-uploads` on persistent private storage for deployments; it is excluded from Git.

Existing embedded provider business profiles can be migrated idempotently with `npm --prefix backend run migrate:companies`. Profiles with no prior verification state are migrated as Pending; existing approved or rejected verification states are preserved. The migration does not delete User or Application records. Run backend tests with `npm --prefix backend test`.

Existing accounts can receive usernames and nullable profile fields with the idempotent `npm --prefix backend run migrate:users` migration. It preserves populated user data, derives a unique username from each email when missing, and does not alter passwords. New accounts collect account, personal, address, and role-specific information through a five-step sign-up. Applicants can log in or reset passwords with either email or username.

Applicants discover provider companies and open job listings together at **Jobs** (`/jobs`). Company verification state is displayed from MongoDB; pending listings from verified providers remain discoverable. Both job and company application history is available at **My Applications** (`/my-applications`). The old `/companies`, `/my-company-applications`, and `/my-job-applications` URLs redirect to their current destinations.

### Job listings and local work

Providers manage job listings at `/provider/jobs`. New listings remain drafts until an admin approves them; applicants can only see open jobs from approved companies/providers. Job application files are stored privately under `backend/private-uploads/job-applications` and served through ownership-checked endpoints. Applicant job submissions and local work records use the MongoDB `jobapplications` and `worklogs` collections. Admin job review is at `/admin/jobs`; cross-pipeline application review and deletion is at `/admin/applications`. The normal backend startup creates all required collections and indexes.

Admin overview metrics now include active job listings and recent database activity. Its pending provider verification count links directly to the verification queue. Applicant interviews and work logs use API data; the frontend does not silently switch to browser-only application records when the backend is unavailable. The retired applicant `/analytics` URL redirects to the dashboard; admin aggregate metrics remain available at `/admin`.

## 3) Install frontend dependencies

In a second terminal, run:

```bash
cd frontend
npm install
```

## 4) Start the frontend

```bash
npm run dev
```

The frontend will run on:

- http://localhost:5173

## 5) Open the app

Visit this URL in your browser:

```text
http://localhost:5173
```

## Database-backed accounts

Create accounts through the registration flow. The frontend uses `frontend/.env` to reach the backend, and the backend uses the server-only `backend/.env` to connect to MongoDB. The optional seed script is for disposable development databases only; do not run it against a live database.

## Useful commands

### Backend

```bash
cd backend
npm run dev
npm run migrate:companies
npm run migrate:users
```

### Frontend

```bash
cd frontend
npm run dev
npm run build
npm run preview
```

## Manual end-to-end checklist

1. Confirm `/api/health` reports `database: connected`, then register a real user and provider account through the app.
2. Sign up as a User through all five steps, then sign in with the email and again with the username. Repeat signup as a Provider and confirm its dashboard shows pending verification.
3. As an approved Provider, add a company; as a User, confirm it appears in `/jobs` with its database status. Search, sort, and filter the directory.
4. Submit an application, request changes as the Provider, and confirm the user sees a notification/status update and can resubmit from **My Applications**.
5. Check that separate Companies and Company Apps navigation items are absent, old URLs redirect, and the Dashboard has no weekly target.
6. At login, confirm exactly one **Create one** link is visible and the layout has no bottom gap at 360, 768, 1024, and 1440 px in light/dark modes.
7. Sign in as admin, review provider/company verification, and confirm the approved badge/rejection note updates from the shared database.
8. Confirm `/analytics` redirects to `/dashboard`; pin and unpin a job, company, and application; verify pins and latest updates appear on the Dashboard. Confirm interviews and work logs load from the API, then stop the backend and verify the app reports an unavailable service instead of showing local sample records.

## Troubleshooting

### Backend won't start

- Check that Node.js is installed: `node -v`
- Make sure dependencies are installed: `npm install`
- Confirm `MONGODB_URI` is a valid Atlas URI
- Confirm the Atlas database user password is URL-encoded
- Confirm the backend machine's IP address is allowed in Atlas Network Access
- Check the backend logs for the masked connection URI and the exact Atlas error

### Frontend can't connect to the backend

- Confirm the backend is running on port 5000
- Check that the frontend API base URL is set correctly in the app config
- If needed, verify the backend is responding at `http://localhost:5000/api/health`

## Project structure

```text
Projects/
├── backend/
│   ├── src/
│   ├── package.json
│   └── .env (optional)
├── frontend/
│   ├── src/
│   ├── package.json
│   └── vite.config.js
├── README.md
└── ...
```

## Notes

This project is designed for local development. To make it production-ready, you would usually:

- add a real MongoDB Atlas or self-hosted MongoDB instance
- configure secure environment variables
- add deployment settings for frontend and backend
- enable production build and hosting configuration
