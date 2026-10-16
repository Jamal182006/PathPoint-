# PathPoint

PathPoint is one role-based application for applicants, providers, and administrators, backed by a shared Express API and MongoDB database.


This project is split into two folders:

- `backend` — API server
- `frontend` — Vite React app

## Prerequisites

Before running the project, make sure you have:

- Node.js 20 or later installed
- npm installed
- A MongoDB Atlas cluster and database user

> The backend uses Mongoose and is configured for a persistent MongoDB Atlas database. Keep the in-memory fallback disabled.

## MongoDB database setup

The backend uses Mongoose and the database name is `pathpoint`. On startup, the backend creates all required collections and indexes. MongoDB creates the database itself when those collections are initialized. An administrator is only bootstrapped when `BOOTSTRAP_ADMIN_EMAIL` and `BOOTSTRAP_ADMIN_PASSWORD` are configured; there is no built-in shared password.

### MongoDB Atlas

Create a MongoDB Atlas cluster and database user, allow the backend to connect under **Network Access**, and put the connection string in `backend/.env`:

```env
MONGODB_URI=mongodb+srv://<username>:<password>@<cluster-host>/pathpoint?retryWrites=true&w=majority
MONGODB_ALLOW_MEMORY_FALLBACK=false
```

Copy `backend/.env.example` to `backend/.env` and fill in the real MongoDB URI, JWT secret, and any SMTP settings you use. URL-encode special characters in the MongoDB username or password. Keep `.env` local and never commit its values.

## Quick start

From the project root, install the dependencies and copy the environment templates:

```bash
npm run install:all
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

Only copy an example when its corresponding `.env` file does not already exist; this avoids overwriting configured credentials. Set `VITE_API_URL=http://localhost:5000/api` in `frontend/.env` for local development. Configure `backend/.env` with your MongoDB URI and a JWT secret at least 32 characters long. Then start both services:

```bash
npm run dev
```

Open <http://localhost:5173>. The API health endpoint is <http://localhost:5000/api/health>.

### Run services separately

If you prefer separate terminals, run these commands from the repository root:

```bash
npm run dev:backend
```

```bash
npm run dev:frontend
```

The backend environment file is server-only and contains database and SMTP settings. The frontend uses a separate `frontend/.env` containing only `VITE_API_URL`. For Gmail or Google Workspace, use an authorized app password and the SMTP settings enabled by the organization. To check SMTP authentication without sending email or displaying credentials, run `npm --prefix backend run check:smtp`.

### Company applications

Company records and company applications are stored separately from the existing applicant job-tracker `applications` collection. Providers manage their companies at `/provider/companies`; the admin company review queue is at `/admin/companies`; applicants browse listings owned by verified providers, including listings pending company review. Pending listings are marked clearly; rejected and archived listings remain unavailable. Applicants submit dynamic text, date, select, and document fields from the company detail page.

The API adds `GET /api/companies`, `GET /api/companies/:companyId`, `POST /api/companies/:companyId/applications`, applicant application list/detail/file routes under `/api/companies/applications`, provider company CRUD under `/api/providers/me/companies`, provider applicant/status routes, and admin company list/review/archive routes under `/api/admin/companies`. Mongo-backed notifications are available under `/api/notifications` and refresh in the app every 10 seconds. The admin activity log is available at `/api/admin/activity-log`. Company application documents accept PDF, JPG, or PNG, up to 5 MB each, and are accessible only through authenticated ownership-checked routes. Keep `backend/private-uploads` on persistent private storage for deployments; it is excluded from Git.

Existing embedded provider business profiles can be migrated idempotently with `npm --prefix backend run migrate:companies`. Profiles with no prior verification state are migrated as Pending; existing approved or rejected verification states are preserved. The migration does not delete User or Application records. Run backend tests with `npm --prefix backend test`.

Existing accounts can receive usernames and nullable profile fields with the idempotent `npm --prefix backend run migrate:users` migration. It preserves populated user data, derives a unique username from each email when missing, and does not alter passwords. New accounts collect account, personal, address, and role-specific information through a five-step sign-up. Applicants can log in or reset passwords with either email or username.

Applicants discover provider companies and open job listings together at **Jobs** (`/jobs`). Company verification state is displayed from MongoDB; pending listings from verified providers remain discoverable. Both job and company application history is available at **My Applications** (`/my-applications`). The old `/companies`, `/my-company-applications`, and `/my-job-applications` URLs redirect to their current destinations.

### Job listings and local work

Providers manage job listings at `/provider/jobs`. New listings remain drafts until an admin approves them; applicants can only see open jobs from approved companies/providers. Job application files are stored privately under `backend/private-uploads/job-applications` and served through ownership-checked endpoints. Applicant job submissions and local work records use the MongoDB `jobapplications` and `worklogs` collections. Admin job review is at `/admin/jobs`; cross-pipeline application review and deletion is at `/admin/applications`. The normal backend startup creates all required collections and indexes.

Admin overview metrics now include active job listings and recent database activity. Its pending provider verification count links directly to the verification queue. Applicant interviews and work logs use API data; the frontend does not silently switch to browser-only application records when the backend is unavailable. The retired applicant `/analytics` URL redirects to the dashboard; admin aggregate metrics remain available at `/admin`.

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

## Deploying frontend and backend to Vercel

Deploy the two folders as separate Vercel projects from the same Git repository:

1. Create the API project with **Root Directory** set to `backend`. Vercel detects `api/[...path].js` as the serverless API entrypoint. The project uses `npm install` and `npm start` for local development; Vercel runs the API function directly.
2. Add the API environment variables in the Vercel project settings: `MONGODB_URI`, `MONGODB_ALLOW_MEMORY_FALLBACK=false`, and `JWT_SECRET` (at least 32 characters). Add production SMTP variables if password recovery email is needed. `PORT` is supplied by the host and should not be set manually.
   - Configure MongoDB Atlas Network Access to allow connections from the deployed API. To bootstrap an administrator, set `BOOTSTRAP_ADMIN_EMAIL` and `BOOTSTRAP_ADMIN_PASSWORD`; `BOOTSTRAP_ADMIN_NAME` and `BOOTSTRAP_ADMIN_USERNAME` are optional.
   - Vercel Hobby functions use dynamic egress IPs. If your Atlas setup requires an IP allowlist, configure it for the deployed environment. Use a dedicated database user with only the permissions the app needs and a strong password.
3. After deploying the API, confirm `https://<api-project>.vercel.app/api/health` reports a connected database.
4. Create the frontend project with **Root Directory** set to `frontend`, framework **Vite**, build command `npm run build`, and output directory `dist`. Set `VITE_API_URL=/api` as a frontend environment variable. The Vercel rewrite proxies `/api/*` to the backend so browser sign-in requests remain same-origin.
5. Set the API project's `CLIENT_URL` to the exact frontend origin, such as `https://<frontend-project>.vercel.app`. For a custom domain, include each allowed origin as a comma-separated value. Redeploy the API after changing it.

The `backend` Vercel project connects to MongoDB on cold starts and reuses the connection for warm requests. Keep `MONGODB_ALLOW_MEMORY_FALLBACK` disabled in production. Do not put backend secrets in frontend variables; only `VITE_API_URL` belongs in the frontend project.

**File storage limitation:** company application documents currently use local filesystem storage. Vercel functions only provide temporary `/tmp` storage, so those files may disappear between function instances or deployments. Use durable object storage for company documents before relying on uploads in production. Vercel Functions also impose request-size limits, so large multipart uploads may need direct-to-object-storage uploads.

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
- For local development, check that `VITE_API_URL` in `frontend/.env` is `http://localhost:5000/api`
- If needed, verify the backend is responding at `http://localhost:5000/api/health`
- For Vercel, confirm the backend project's Root Directory is `backend` and that `backend/api/[...path].js` is included in the deployed commit. The production health endpoint should report `database: connected`; an `/api/auth/*` `404` means the route is not deployed or routed correctly.
- Check `MONGODB_URI` and `JWT_SECRET` in the backend project's Production environment. Redeploy after changing environment variables.

## Project structure

```text
PathPoint/
├── backend/
│   ├── api/
│   ├── src/
│   └── package.json
├── frontend/
│   ├── api/
│   ├── src/
│   └── package.json
└── README.md
```

## Notes

The local development setup and Vercel deployment setup are documented above. Keep production credentials in the Vercel backend project's environment settings and redeploy after changing them.
