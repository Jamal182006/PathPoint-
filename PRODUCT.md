# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

- Applicants looking for jobs, companies, and application opportunities.
- Providers or business owners who manage company profiles, job listings, and applicant communication.
- Administrators who review provider/company verification, job listings, and applications.

## Product Purpose

PathPoint is a role-based workforce platform that connects applicants, providers, and administrators in one workflow. It enables applicants to discover company-backed jobs, submit applications, track status, and maintain work logs; it enables providers to manage companies and listings; and it gives administrators the tools to verify providers, review submissions, and monitor activity.

## Positioning

PathPoint sits between a job board and an operations workflow system: it is not only listing work, but also enforcing role-based ownership, approvals, and verified company/provider records. The platform distinguishes itself by combining job discovery, company verification, application review, and operational work tracking in a single authenticated system.

## Operating Context

- The app is a split-stack project with a Vite React frontend and an Express/MongoDB backend.
- The backend runs on Node.js and uses MongoDB Atlas for persistent storage.
- Access is segmented by role: applicants, providers, and admins each have distinct permissions and screens.
- Private application and company documents are stored in server-side private upload directories rather than public static assets.
- Provider verification and job approval are part of the operating workflow, with admin review and notifications integrated into the product.

## Capabilities and Constraints

- Applicants can sign up, sign in, reset password, and use email or username as a login identifier.
- Providers can manage company profiles, job listings, application responses, and related status workflows.
- Admins can review provider/company verification, approve or reject listings, and monitor recent activity.
- Application and company document uploads accept PDF, JPG, and PNG files up to 5 MB per upload.
- The backend relies on environment variables for MongoDB, JWT secrets, SMTP configuration, and bootstrap admin/demo account credentials.
- The project keeps private upload storage and local env values out of source control.
- The codebase currently has no declared public brand assets or campaign materials beyond the product name and product workflows.

## Brand Commitments

- Product name: PathPoint.
- The tone is professional, operational, and trustworthy rather than consumer-facing or promotional.
- The identity should support a work-placement and verification platform rather than a casual social product.

## Evidence on Hand

- Root project overview in [README.md](README.md)
- Root package configuration in [package.json](package.json)
- Backend API configuration in [backend/package.json](backend/package.json)
- Backend route and controller structure under [backend/src](backend/src)
- Frontend app structure under [frontend/src](frontend/src)
- Product workflows described in [README.md](README.md), especially company verification, provider flows, job review, admin metrics, and analytics

## Product Principles

- Role clarity: each user type has distinct responsibilities and access boundaries.
- Trust through verification: providers, companies, and listings are reviewed and approved before they become broadly visible.
- Operational transparency: applicants and admins can see status changes, history, and activity.
- Privacy and control: sensitive documents and account data remain protected behind authenticated ownership checks.
- Practical usability: the system is built to support real hiring and company management workflows rather than decorative browsing alone.

## Accessibility & Inclusion

- The application should support standard accessible web practices across forms, navigation, and role-based views.
- Login and identity workflows must remain usable for users who may prefer either email or username.
- Business and document workflows should be clear to applicants and providers, with visible status and review states rather than hidden process steps.
- The project does not currently declare a more specific accessibility target beyond building to common web accessibility standards.
