# PathPoint Technical Defense Summary

Use this document as a review guide when presenting or defending PathPoint. It describes the technologies that are implemented in the project and the reasons for the main design decisions.

## 1. System overview

PathPoint is a role-based job application, company, interview, and work-log tracking platform.

The system has three parts:

| Layer | Technology | Purpose |
| --- | --- | --- |
| Frontend | React, Vite, Tailwind CSS | Browser interface for applicants, providers, and administrators. |
| Backend | Node.js, Express | REST API, authentication, authorization, business logic, and file handling. |
| Database | MongoDB Atlas with Mongoose | Persistent storage for users, jobs, companies, applications, notifications, and work logs. |

The frontend and backend can be deployed independently on Vercel. The frontend sends API requests to the backend under the `/api` path.

## 2. Languages and core technologies

- **JavaScript:** The primary programming language on both frontend and backend. The project uses modern ES modules.
- **Node.js 20 or newer:** JavaScript runtime for the backend API.
- **React 18:** Component-based frontend library used to build the user interface.
- **Vite:** Development server and production build tool for the React frontend.
- **Tailwind CSS:** Utility-first CSS framework used for responsive styling, layout, light/dark themes, and consistent UI design.
- **Express:** Backend web framework used to define REST endpoints and middleware.
- **MongoDB Atlas:** Cloud-hosted NoSQL document database.
- **Mongoose:** Object Data Modeling library used to define MongoDB schemas, validation rules, indexes, and relationships by ID.
- **npm:** Package manager used to install and run project dependencies.
- **Vercel:** Intended hosting platform for the frontend and serverless backend API.

## 3. Frontend libraries

| Library | Use in PathPoint |
| --- | --- |
| `axios` | Sends HTTP requests to the backend API and attaches the JWT bearer token. |
| `react-router-dom` | Client-side routing for public, applicant, provider, and admin pages. |
| `@hello-pangea/dnd` | Drag-and-drop interactions, such as application workflow boards. |
| `framer-motion` | UI animation and transitions. |
| `leaflet` and `react-leaflet` | Interactive maps for company/address locations. |
| `lucide-react` | Consistent SVG icon library. |
| `@fontsource-variable/inter` | Self-hosted Inter font package. |

## 4. Backend libraries

| Library | Use in PathPoint |
| --- | --- |
| `express` | REST API routing and middleware pipeline. |
| `mongoose` | MongoDB schemas, validation, indexes, and database queries. |
| `bcryptjs` | Salted password hashing and password comparison. |
| `jsonwebtoken` | Creation and verification of JSON Web Tokens (JWTs). |
| `helmet` | Security-related HTTP response headers. |
| `cors` | Browser origin restrictions for API access. |
| `multer` | Controlled multipart document uploads. |
| `file-type` | Detects actual uploaded image content for company logo validation. |
| `nodemailer` | Sends login verification and password-reset emails through SMTP. |
| `dotenv` | Loads server-only environment variables during local development. |
| `morgan` | Development HTTP request logging. |

## 5. APIs and external services

### Internal REST API

The Express API provides endpoints under `/api`.

| Route group | Main purpose |
| --- | --- |
| `/api/auth` | Registration, login, login-code verification, password recovery, profile, resume, and password changes. |
| `/api/applications` | Applicant job-tracker records and application import/export-related actions. |
| `/api/jobs` | Public job listing discovery, job applications, provider job management, and application review. |
| `/api/companies` | Public company discovery, company applications, applicant application history, and protected file downloads. |
| `/api/providers` | Provider profiles, business verification, and provider-owned companies. |
| `/api/admin` | User, provider, company, job, application, verification, and platform-management actions. |
| `/api/work-logs` | Applicant-owned local work records. |
| `/api/notifications` | Authenticated user notifications. |
| `/api/pins` | Applicant-owned pinned records. |
| `/api/health` | Database/API health information for deployment checks. |

### External services

- **MongoDB Atlas:** Persistent cloud database connection through `MONGODB_URI`.
- **SMTP email provider:** Sends email login codes and password-reset codes through Nodemailer. Gmail/Google Workspace with an app password is supported by the environment template.
- **OpenStreetMap:** Provides map tiles displayed by Leaflet.
- **Nominatim:** Converts addresses into map coordinates for the address feature.
- **Vercel:** Hosts the frontend and serverless backend deployment.

## 6. Authentication and authorization

### Authentication flow

1. A user registers with account and profile information.
2. The password is hashed with `bcryptjs`; the plaintext password is not stored.
3. On successful login, the API creates a signed JWT with a server-only secret.
4. The frontend sends the JWT as `Authorization: Bearer <token>` on protected API requests.
5. Backend middleware verifies the JWT and loads the current user from MongoDB before continuing.
6. Invalid, expired, suspended, archived, or missing accounts are rejected.

### Roles

| Role | Permissions |
| --- | --- |
| **Applicant (`user`)** | Maintains a profile, tracks applications, applies for jobs/companies, manages work logs and pins. |
| **Provider** | Maintains a business profile and, once verified and active, manages companies, job listings, and applications for its own listings. |
| **Administrator (`admin`)** | Reviews providers, companies, and jobs; manages users; reviews cross-pipeline applications and activity data. |

Authorization is enforced on the server, not only by hiding frontend navigation. The API uses `protect`, `applicantOnly`, `approvedProviderOnly`, and `adminOnly` middleware checks.

## 7. Security controls

### Credential and session security

- Passwords have a minimum length and are hashed with bcrypt using a generated salt.
- Password fields are excluded from normal database query results and JSON responses.
- JWT signing requires `JWT_SECRET` to be at least 32 characters before the backend starts.
- JWT expiration is configurable through `JWT_EXPIRES_IN`.
- Invalid or expired tokens are rejected with `401 Unauthorized`.
- Suspended and archived users are blocked even if they still possess a valid token.
- Login verification codes and password-reset codes are time-limited.
- Sensitive values such as password hashes, reset codes, login codes, trusted-device data, and provider document data are removed from serialized user responses.

### Brute-force and abuse protections

- A login lockout is applied after **5 failed attempts** for the same IP/email combination.
- The lockout duration is **60 seconds**.
- Public endpoints have IP-based rate limiting:

| Endpoint type | Limit |
| --- | --- |
| Registration | 12 requests per 15 minutes |
| Username availability | 80 requests per 5 minutes |
| Login-code/password-reset actions | 25 requests per 15 minutes |
| Standard login | 10 requests per 15 minutes |
| Administrator login | 5 requests per 15 minutes |

### HTTP and browser security

- **CORS allowlist:** Browser calls are limited to configured production and local frontend origins. Additional valid frontend URLs are set with `CLIENT_URL`.
- **Helmet:** Adds centralized security headers.
- **Content Security Policy (CSP):** Limits scripts, forms, frames, images, fonts, and backend connections to approved sources.
- **HSTS:** Instructs browsers to use HTTPS for one year on HTTPS deployments.
- **Clickjacking protection:** `frame-ancestors 'none'` prevents the app from being embedded in another site.
- **Permissions Policy:** Camera, microphone, and payment features are disabled; location is restricted to the app itself for mapping.
- **Request-size limits:** JSON and URL-encoded request bodies are limited to 8 MB.
- **Safe errors:** Internal server errors return a generic message instead of exposing stack traces or implementation details.

### Data access and authorization security

- Protected endpoints verify a JWT before returning or changing private data.
- Applicant, provider, and administrator actions are separated by server-side role checks.
- Providers can manage only companies and listings whose `providerId` matches their account.
- Applicants can access only application files and records that belong to them.
- Providers can review only applications associated with their own company/job listings.
- Unique database indexes prevent duplicate submissions for the same applicant and job/company.
- Archived or suspended accounts are rejected by authentication middleware.

### Upload security

- Resumes and supporting documents are restricted to PDF, JPG, and PNG files.
- Resume and company-document uploads have a 5 MB maximum file size.
- Job application documents have a 10 MB maximum per file, with limits on number of files and multipart fields.
- Company-upload filenames use generated UUID values, preventing a user-supplied filename from becoming a server path.
- Company logo upload data is checked against its detected file type, not only its declared MIME type.
- Application documents are saved outside public static assets and downloaded only through authenticated, ownership-checked routes.

### Database and secret security

- Database credentials, JWT secrets, SMTP credentials, and bootstrap admin credentials are stored in backend environment variables.
- The `.env` file is excluded from Git; only `.env.example` templates are committed.
- The frontend receives only `VITE_API_URL`; backend secrets are never intended to be placed in Vite variables.
- Production should disable the in-memory MongoDB fallback so a failed cloud database connection cannot silently use temporary data.
- MongoDB schema validation applies field types, maximum lengths, required fields, enumerated statuses, validation hooks, and database indexes.

## 8. Validation and data integrity

- Mongoose schemas validate user, company, job, application, notification, and work-log data.
- Job listings validate salary ranges and invalid/past date changes.
- Server-side controllers validate IDs, ownership, permitted statuses, and role requirements.
- User search input is escaped before use in MongoDB regular-expression queries.
- Business-verification document uploads validate base64 format, size, declared MIME type, and file signatures for PDF/JPG/PNG files.
- Unique indexes prevent duplicate job/company submissions from the same applicant.

## 9. Testing

The backend contains automated Node test coverage for:

- CORS behavior.
- Login lockout rules.
- Authentication controller behavior.
- Health endpoint behavior.
- Provider/company/job workflow and ownership enforcement.
- Applicant job submission workflow.
- Pins and work logs.
- Application import behavior.

The frontend contains automated tests for job validation and saved job drafts.

## 10. Important files to cite in a defence

| Topic | Source file |
| --- | --- |
| API setup, CORS, Helmet, CSP, HSTS, request limits, errors | `backend/src/server.js` |
| JWT validation and role middleware | `backend/src/middleware/auth.js` |
| Password hashing and sensitive-field removal | `backend/src/models/User.js` |
| Login and endpoint rate limits | `backend/src/routes/authRoutes.js` |
| Login lockout logic | `backend/src/utils/loginLockout.js` |
| MongoDB connection and production fallback safeguard | `backend/src/config/db.js` |
| File-upload constraints | `backend/src/utils/profileUpload.js`, `backend/src/utils/jobUpload.js`, `backend/src/utils/companyUpload.js` |
| Provider business-document validation | `backend/src/utils/businessVerification.js` |
| Client JWT request handling | `frontend/src/api/client.js` |
| Deployment and environment documentation | `README.md` |

## 11. Short defense answer

> PathPoint is a full-stack JavaScript web application using React and Vite for the interface, Node.js and Express for the REST API, and MongoDB Atlas with Mongoose for persistent data. It supports applicants, providers, and administrators through server-enforced role-based access control. Passwords are salted and hashed with bcrypt, authenticated requests use JWT bearer tokens, and protected routes re-check the user's current account and role in the database. We also implemented login lockouts, rate limiting, email verification/password-reset codes, CORS restrictions, Helmet security headers, CSP, HSTS, input validation, private document uploads, and ownership checks. Secrets are separated into backend environment variables and excluded from Git.

## 12. Honest limitations and next improvements

Discuss these transparently if asked. They show awareness of production security tradeoffs.

1. **Distributed rate limiting:** The current rate limiter and login lockout use in-memory storage. This is effective for a single backend instance but is best-effort on serverless/multi-instance deployment. A production-scale next step is Redis-backed rate limiting and lockout storage.
2. **Document storage:** Vercel serverless disk storage is temporary. Production documents should move to durable private object storage, such as Amazon S3, Cloudflare R2, or Vercel Blob, with signed URLs or server-side authorization.
3. **JWT browser storage:** The current frontend keeps its JWT in browser storage for convenience. A future hardening improvement is short-lived access tokens with secure, `HttpOnly`, `Secure`, `SameSite` cookies and refresh-token rotation.
4. **Operational security:** Production should use a dedicated least-privilege MongoDB user, restrictive Atlas network access, a strong unique JWT secret, secure SMTP credentials/app passwords, HTTPS, and regularly updated dependencies.
5. **File scanning:** The current upload controls enforce permitted types and size limits. A higher-security deployment can add antivirus/malware scanning before making uploaded files available.

