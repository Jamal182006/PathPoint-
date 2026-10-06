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

The backend uses Mongoose and the database name is `pathpoint`. On startup, the backend creates the `users` and `applications` collections and applies their model indexes. MongoDB creates the database itself when those collections are initialized. The default admin account is also created if it does not already exist.

### MongoDB Atlas

Create a free cluster at MongoDB Atlas, create a database user, add the backend server IP under **Network Access**, and put the connection string in `backend/.env`:

```env
MONGODB_URI=mongodb+srv://<username>:<password>@<cluster-host>/pathpoint?retryWrites=true&w=majority
MONGODB_ALLOW_MEMORY_FALLBACK=false
```

Replace `<username>`, `<password>`, and `<cluster-host>` with the values from Atlas. URL-encode special characters in the username or password. Do not commit `.env` or expose the database password in source control.

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

## Default admin account

The backend creates this admin account automatically if it does not already exist:

- Admin: `admin@example.com` / `admin123`

Regular users must create accounts through the signup page.

## Useful commands

### Backend

```bash
cd backend
npm run dev
npm run seed
```

### Frontend

```bash
cd frontend
npm run dev
npm run build
npm run preview
```

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
