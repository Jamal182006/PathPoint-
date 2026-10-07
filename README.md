# PathPoint

PathPoint is a full-stack job application tracker with a React frontend and an Express + MongoDB backend.Nice


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

Copy `backend/.env.example` to `backend/.env`, then replace `<username>`, `<password>`, and `<cluster-host>` with the values from Atlas. Set a random `JWT_SECRET` with at least 32 characters. URL-encode special characters in the username or password. Keep `.env` local and never commit its values.

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

The backend environment file is server-only and contains database and SMTP settings. The frontend uses a separate `frontend/.env` containing only `VITE_API_URL`; `frontend/.env.example` is only its template. For Gmail or Google Workspace, use an authorized app password and the SMTP settings enabled by the organization.

To test backend SMTP authentication without sending an email or displaying credentials, run `npm --prefix backend run check:smtp` after configuring `backend/.env`.

### Company applications

Company records and company applications are stored separately from the existing applicant job-tracker `applications` collection. Providers manage their companies at `/provider/companies`; the admin company review queue is at `/admin/companies`; applicants browse approved companies and submit documents from the company detail page.

The API adds `GET /api/companies`, `GET /api/companies/:companyId`, `POST /api/companies/:companyId/applications`, applicant application list/detail/file routes under `/api/companies/applications`, provider company CRUD under `/api/providers/me/companies`, provider applicant/status routes, and admin company list/review/archive routes under `/api/admin/companies`. Private uploads are stored in `backend/private-uploads/company-applications` and are accessible only through authenticated ownership-checked routes. Keep this directory on persistent private storage for deployments; it is excluded from Git.

Existing embedded provider business profiles can be migrated idempotently with `npm --prefix backend run migrate:companies`. Profiles with no prior verification state are migrated as Pending; existing approved or rejected verification states are preserved. The migration does not delete User or Application records. Run backend tests with `npm --prefix backend test`.

### Job listings and local work

Providers manage job listings at `/provider/jobs`. New listings remain drafts until an admin approves them; applicants can only see open jobs from approved companies/providers. Job application files are stored privately under `backend/private-uploads/job-applications` and served through ownership-checked endpoints. Applicant job submissions and local work records use the MongoDB `jobapplications` and `worklogs` collections. Admin job review is at `/admin/jobs`; cross-pipeline application review and deletion is at `/admin/applications`. The normal backend startup creates all required collections and indexes.

Admin overview metrics now include active job listings and recent database activity. Its pending provider verification count links directly to the verification queue. Authenticated applicant analytics and interviews use API data; the frontend does not silently switch to browser-only application records when the backend is unavailable.

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

## Local test accounts

Copy the sample account email and password variables from `backend/.env.example` into `backend/.env` and set unique passwords. `npm run seed` creates one administrator, one approved provider with an approved company, one pending provider with a pending company, and two applicants. Seeding is idempotent and preserves existing users, companies, applications, and uploads. Existing accounts with matching email addresses are left unchanged.

## Useful commands

### Backend

```bash
cd backend
npm run dev
npm run seed
npm run migrate:companies
```

### Frontend

```bash
cd frontend
npm run dev
npm run build
npm run preview
```

## Manual end-to-end checklist

1. Copy `backend/.env.example` to `backend/.env`, set the seed passwords, and run `npm --prefix backend run seed`; sign in with the seeded pending provider and verify the account shows **Pending**.
2. Sign in as admin, open **Provider verification**, preview the document, approve the provider, then confirm the provider can open company tools.
3. Submit a company and verify it stays hidden from applicants until approved in **Companies**. Confirm a rejected company shows its reason and can be edited and resubmitted.
4. Create a job with required document and text requirements, salary range, deadline, and slots. Confirm it stays unavailable until admin approval and the provider opens it.
5. As an applicant, browse the approved listing, submit only profile details and required responses, and confirm duplicate, deadline, invalid-file, and full-slot submissions are rejected.
6. As the provider, review the applicant, preview their files, schedule an interview, and set an outcome. Confirm the applicant sees the updated status and interview details in **Job applications**.
7. Check `/admin/applications` for all three application types, try its filters/search/pagination, and verify its delete action removes uploaded files for company and job submissions.
8. As an applicant, confirm analytics, interviews, and work logs load from the API; stop the backend and verify the app reports an unavailable service instead of showing local sample records.

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
