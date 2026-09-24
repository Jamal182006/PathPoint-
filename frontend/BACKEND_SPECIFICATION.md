# PathPoint — Complete Backend API Specification & Integration Contract

This document provides the definitive REST API specification and database schema requirements for the **PathPoint** backend. The frontend is architected to seamlessly interface with any backend implementation (Node.js/Express, Python/FastAPI/Django, Go, Java/Spring Boot) following these contracts.

---

## 1. Global Specifications

### Base URL
- Development Default: `http://localhost:5000/api`
- Environment Variable: `VITE_API_URL`
- Dynamic Override: Stored in browser `localStorage.pathpoint_api_url` if configured via the Admin System Health panel.

### Headers & Authentication
All protected requests require a JSON Web Token (JWT) passed in the `Authorization` HTTP header:
```http
Authorization: Bearer <jwt_token>
Content-Type: application/json
```

### Standard Response Formats

#### Successful Response (200 / 201)
```json
{
  "success": true,
  "message": "Optional human-readable confirmation message",
  "data": { ... } // Or array [...]
}
```

#### Error Response (400 / 401 / 403 / 404 / 500)
```json
{
  "success": false,
  "message": "Specific error description explaining the cause",
  "errors": [ ... ] // Optional list of field-level validation errors
}
```

---

## 2. Authentication & Authorization (`/api/auth`)

### 2.1 User / Candidate Login
Authenticate a job seeker / student.

- **Endpoint:** `POST /api/auth/login`
- **Access:** Public
- **Request Body:**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```
- **Response `200 OK`:**
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "65fc0e8d91a1b2c3d4e5f601",
    "name": "Alex Morgan",
    "email": "user@example.com",
    "role": "user",
    "careerTrack": "Software Engineering",
    "createdAt": "2026-07-22T12:00:00.000Z"
  }
}
```
- **Errors:**
  - `400 Bad Request`: Email and password are required.
  - `401 Unauthorized`: Invalid email or password.

---

### 2.2 Dedicated Admin / Counselor Login
Authenticate an administrator or career counselor.

- **Endpoint:** `POST /api/auth/admin/login`
- **Access:** Public (Admin Role Required)
- **Request Body:**
```json
{
  "email": "admin@example.com",
  "password": "admin123",
  "securityCode": "849201" // Optional 2FA / Passcode
}
```
- **Response `200 OK`:**
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "65fc0e8d91a1b2c3d4e5f602",
    "name": "Dr. Sarah Lin",
    "email": "admin@example.com",
    "role": "admin",
    "title": "Director of Career Services",
    "createdAt": "2026-06-15T10:00:00.000Z"
  }
}
```
- **Errors:**
  - `401 Unauthorized`: Invalid admin credentials.
  - `403 Forbidden`: `{"success": false, "message": "Access Denied: Account lacks administrative privileges."}`

---

### 2.3 Candidate Registration
Create a new job seeker profile.

- **Endpoint:** `POST /api/auth/register`
- **Access:** Public
- **Request Body:**
```json
{
  "name": "Jordan Hayes",
  "email": "jordan@example.com",
  "password": "SecurePassword123!",
  "role": "user",
  "careerTrack": "Product Design"
}
```
- **Response `201 Created`:**
```json
{
  "success": true,
  "message": "Account registered successfully",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "65fc0e8d91a1b2c3d4e5f603",
    "name": "Jordan Hayes",
    "email": "jordan@example.com",
    "role": "user",
    "careerTrack": "Product Design",
    "createdAt": "2026-09-22T13:00:00.000Z"
  }
}
```
- **Errors:**
  - `400 Bad Request`: Email already registered or password under 6 characters.

---

### 2.4 Get Current Authenticated Profile
Retrieve profile data using the active JWT token.

- **Endpoint:** `GET /api/auth/me`
- **Access:** Protected (`Bearer <token>`)
- **Response `200 OK`:**
```json
{
  "success": true,
  "user": {
    "id": "65fc0e8d91a1b2c3d4e5f601",
    "name": "Alex Morgan",
    "email": "user@example.com",
    "role": "user",
    "careerTrack": "Software Engineering",
    "createdAt": "2026-07-22T12:00:00.000Z"
  }
}
```
- **Errors:**
  - `401 Unauthorized`: Token invalid, expired, or missing.

---

### 2.5 Password Reset Request (Forgot Password)
Initiate password reset via email.

- **Endpoint:** `POST /api/auth/forgot-password`
- **Access:** Public
- **Request Body:**
```json
{
  "email": "user@example.com"
}
```
- **Response `200 OK`:**
```json
{
  "success": true,
  "message": "If an account with that email exists, password reset instructions have been dispatched."
}
```

---

### 2.6 Change Password
Update password for authenticated user.

- **Endpoint:** `PUT /api/auth/password`
- **Access:** Protected (`Bearer <token>`)
- **Request Body:**
```json
{
  "currentPassword": "password123",
  "newPassword": "NewSecurePassword456!"
}
```
- **Response `200 OK`:**
```json
{
  "success": true,
  "message": "Password changed successfully"
}
```

---

## 3. Applications Management (`/api/applications`)

### 3.1 Get All Applications
Fetch user's applications with optional query filters.

- **Endpoint:** `GET /api/applications`
- **Access:** Protected (`Bearer <token>`)
- **Query Parameters:**
  - `status`: Filter by status (`Saved`, `Applied`, `Interviewing`, `Offered`, `Rejected`)
  - `search`: Keyword match against company or role
- **Response `200 OK`:**
```json
{
  "success": true,
  "count": 2,
  "data": [
    {
      "_id": "65fc1a2b91a1b2c3d4e5f701",
      "userId": "65fc0e8d91a1b2c3d4e5f601",
      "company": "Stripe",
      "role": "Frontend Infrastructure Engineer",
      "salaryRange": "$140k - $165k",
      "dateApplied": "2026-09-17T12:00:00.000Z",
      "status": "Interviewing",
      "statusHistory": [
        { "status": "Saved", "changedAt": "2026-09-15T10:00:00.000Z" },
        { "status": "Applied", "changedAt": "2026-09-17T12:00:00.000Z" },
        { "status": "Interviewing", "changedAt": "2026-09-20T14:30:00.000Z" }
      ],
      "jobDescriptionNotes": "Focus on React 18, Vite tooling, and design systems.",
      "contactPerson": "David Chen (Technical Recruiter)",
      "resumeVersion": "Resume_Frontend_2026.pdf",
      "interviewDates": [
        {
          "date": "2026-09-26T15:00:00.000Z",
          "round": "Technical Screening",
          "interviewer": "Engineering Lead"
        }
      ],
      "createdAt": "2026-09-15T10:00:00.000Z",
      "updatedAt": "2026-09-20T14:30:00.000Z"
    }
  ]
}
```

---

### 3.2 Get Application by ID
- **Endpoint:** `GET /api/applications/:id`
- **Access:** Protected (`Bearer <token>`)
- **Response `200 OK`:**
```json
{
  "success": true,
  "data": { /* Application Object */ }
}
```

---

### 3.3 Create Application
- **Endpoint:** `POST /api/applications`
- **Access:** Protected (`Bearer <token>`)
- **Request Body:**
```json
{
  "company": "Airbnb",
  "role": "Senior UI Engineer",
  "salaryRange": "$160k - $185k",
  "dateApplied": "2026-09-22T08:00:00.000Z",
  "status": "Applied",
  "jobDescriptionNotes": "Core web performance and design tokens architecture.",
  "contactPerson": "Sarah Connor (Hiring Manager)",
  "resumeVersion": "Resume_Principal_v2.pdf",
  "interviewDates": []
}
```
- **Response `201 Created`:**
```json
{
  "success": true,
  "message": "Application created",
  "data": { /* Created Application */ }
}
```

---

### 3.4 Update Application
- **Endpoint:** `PUT /api/applications/:id`
- **Access:** Protected (`Bearer <token>`)
- **Request Body:** Fields to update (`company`, `role`, `salaryRange`, `notes`, `interviewDates`, etc.)
- **Response `200 OK`:**
```json
{
  "success": true,
  "data": { /* Updated Application */ }
}
```

---

### 3.5 Update Application Status (Drag-and-Drop Kanban)
- **Endpoint:** `PATCH /api/applications/:id/status`
- **Access:** Protected (`Bearer <token>`)
- **Request Body:**
```json
{
  "status": "Offered"
}
```
- **Note:** Backend should automatically append `{ status: "Offered", changedAt: new Date() }` to `statusHistory`.
- **Response `200 OK`:**
```json
{
  "success": true,
  "data": { /* Application with updated status and statusHistory */ }
}
```

---

### 3.6 Delete Application
- **Endpoint:** `DELETE /api/applications/:id`
- **Access:** Protected (`Bearer <token>`)
- **Response `200 OK`:**
```json
{
  "success": true,
  "message": "Application deleted successfully"
}
```

---

### 3.7 Upload Resume Document
- **Endpoint:** `POST /api/applications/:id/resume`
- **Access:** Protected (`Bearer <token>`)
- **Headers:** `Content-Type: multipart/form-data`
- **Form Data:** `resume` (Binary File: PDF/DOCX, max 10MB)
- **Response `200 OK`:**
```json
{
  "success": true,
  "message": "Resume uploaded successfully",
  "data": {
    "resumeVersion": "Resume_Frontend_2026.pdf",
    "resumeUrl": "/uploads/resumes/resume-65fc1a2b.pdf"
  }
}
```

---

## 4. Personal Analytics (`/api/analytics`)

### 4.1 Candidate Summary
- **Endpoint:** `GET /api/analytics/summary`
- **Access:** Protected (`Bearer <token>`)
- **Response `200 OK`:**
```json
{
  "success": true,
  "data": {
    "totalApplications": 12,
    "interviewRate": 33.3,
    "offerRate": 8.3,
    "avgResponseDays": 5.4,
    "statusCounts": {
      "Saved": 2,
      "Applied": 5,
      "Interviewing": 4,
      "Offered": 1,
      "Rejected": 0
    }
  }
}
```

---

## 5. Administrative & Counselor Portal (`/api/admin`)

All `/api/admin/*` endpoints strictly require an active token where `user.role === 'admin'`. Non-admin requests must receive `403 Forbidden`.

### 5.1 Platform Aggregate Cohort Metrics
- **Endpoint:** `GET /api/admin/aggregate-metrics`
- **Access:** Protected (Admin Only)
- **Response `200 OK`:**
```json
{
  "success": true,
  "data": {
    "totalUsers": 124,
    "totalApplications": 842,
    "usersWithOfferCount": 38,
    "avgApplicationsPerUser": 6.8,
    "avgApplicationsBeforeOffer": 11.2,
    "platformInterviewRate": 28.4,
    "platformOfferRate": 12.1,
    "statusCounts": {
      "Saved": 142,
      "Applied": 320,
      "Interviewing": 210,
      "Offered": 85,
      "Rejected": 85
    }
  }
}
```

---

### 5.2 Seeker Directory / User Management
- **Endpoint:** `GET /api/admin/users`
- **Access:** Protected (Admin Only)
- **Query Parameters:**
  - `search`: Filter by name or email
  - `role`: Filter by role (`user`, `admin`)
  - `status`: Filter by account status (`active`, `suspended`)
- **Response `200 OK`:**
```json
{
  "success": true,
  "count": 3,
  "data": [
    {
      "id": "65fc0e8d91a1b2c3d4e5f601",
      "name": "Alex Morgan",
      "email": "user@example.com",
      "role": "user",
      "careerTrack": "Software Engineering",
      "status": "active",
      "applicationCount": 8,
      "interviewCount": 2,
      "offerCount": 1,
      "createdAt": "2026-07-22T12:00:00.000Z",
      "lastActiveAt": "2026-09-22T09:15:00.000Z"
    }
  ]
}
```

---

### 5.3 Update User Status
Enable or suspend a job seeker profile.

- **Endpoint:** `PATCH /api/admin/users/:id/status`
- **Access:** Protected (Admin Only)
- **Request Body:**
```json
{
  "status": "suspended" // "active" or "suspended"
}
```
- **Response `200 OK`:**
```json
{
  "success": true,
  "message": "User status updated to suspended"
}
```

---

### 5.4 Counselor Portfolio Review
Inspect a specific seeker's applications in advisor view.

- **Endpoint:** `GET /api/admin/users/:id/applications`
- **Access:** Protected (Admin Only)
- **Response `200 OK`:**
```json
{
  "success": true,
  "user": {
    "id": "65fc0e8d91a1b2c3d4e5f601",
    "name": "Alex Morgan",
    "email": "user@example.com"
  },
  "applications": [ /* List of seeker's applications */ ]
}
```

---

## 6. System Health & Diagnostics (`/api/health`)

### 6.1 Server Health Ping
- **Endpoint:** `GET /api/health`
- **Access:** Public
- **Response `200 OK`:**
```json
{
  "status": "healthy",
  "version": "1.0.0",
  "uptimeSeconds": 86420,
  "database": "connected",
  "timestamp": "2026-09-22T13:02:00.000Z"
}
```

---

## 7. Recommended Mongoose / MongoDB Schemas

```javascript
// User Schema
const UserSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true, minlength: 6 }, // bcrypt hashed
  role: { type: String, enum: ['user', 'admin'], default: 'user' },
  careerTrack: { type: String, default: 'General' },
  status: { type: String, enum: ['active', 'suspended'], default: 'active' },
  createdAt: { type: Date, default: Date.now },
  lastActiveAt: { type: Date, default: Date.now },
});

// Application Schema
const ApplicationSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  company: { type: String, required: true, trim: true },
  role: { type: String, required: true, trim: true },
  salaryRange: { type: String, default: '' },
  dateApplied: { type: Date, default: Date.now },
  status: {
    type: String,
    enum: ['Saved', 'Applied', 'Interviewing', 'Offered', 'Rejected'],
    default: 'Saved',
    index: true,
  },
  statusHistory: [
    {
      status: { type: String, required: true },
      changedAt: { type: Date, default: Date.now },
    },
  ],
  jobDescriptionNotes: { type: String, default: '' },
  contactPerson: { type: String, default: '' },
  resumeVersion: { type: String, default: '' },
  resumeUrl: { type: String, default: '' },
  interviewDates: [
    {
      date: { type: Date, required: true },
      round: { type: String, default: 'General Interview' },
      interviewer: { type: String, default: '' },
    },
  ],
}, { timestamps: true });
```
