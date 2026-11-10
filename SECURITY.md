# Enterprise Security Architecture & Secrets Protection Guide
**Apex Link Shareholder Portal — Nexus International Alliance (NIA)**

---

## 1. Security Architecture Overview

This application adheres to enterprise defense-in-depth principles and OWASP Top 10 standards to guarantee that API keys, database credentials, and environmental variables remain strictly confidential and completely inaccessible to external actors, scrapers, or malicious attackers.

```
┌────────────────────────────────────────────────────────┐
│                   PUBLIC INTERNET                      │
└──────────────────────────┬─────────────────────────────┘
                           │ HTTPS / TLS 1.3
                           ▼
┌────────────────────────────────────────────────────────┐
│                   VERCEL CDN / EDGE                    │
│  - Static Client Assets (Zero Secrets Embedded)         │
│  - Content Security Policy & Security Headers          │
│  - DDoS Protection & Edge Rate Limiting                │
└──────────────┬───────────────────────────┬─────────────┘
               │ (SPA Routes)              │ (/api/*)
               ▼                           ▼
┌───────────────────────────┐ ┌──────────────────────────┐
│   Vite React Frontend     │ │   Serverless Node.js     │
│  - No API keys in bundle  │ │   Backend API            │
│  - HttpOnly Cookie / JWT  │ │  - Centralized env.js    │
│  - Strict XSS escaping    │ │  - Helmet & CSP Headers  │
└───────────────────────────┘ │  - Strict CORS Whitelist │
                              │  - Global Rate Limiting  │
                              └────────────┬─────────────┘
                                           │ Encrypted TLS / Secure VPC
                     ┌─────────────────────┴─────────────────────┐
                     ▼                                           ▼
         ┌───────────────────────┐                   ┌───────────────────────┐
         │     MongoDB Atlas     │                   │   Cloudinary Storage  │
         │  - SCRAM-SHA-256 Auth │                   │  - API Key & Secret   │
         │  - Least Privilege DB │                   │  - Private Credentials│
         │  - IP Whitelist Gate  │                   │  - Server-Side Only   │
         └───────────────────────┘                   └───────────────────────┘
```

---

## 2. Secrets & Environmental Variable Protection Rules

### 1. The Zero-Secret Rule in Git
- **NEVER** commit `.env` files, production credentials, private keys, or API tokens into version control.
- All `.env*` files (except `.env.example` templates) are permanently and strictly excluded in `.gitignore`.
- Run `npm run security:audit` prior to every release to automatically verify that no secrets or untracked credentials exist.

### 2. Client-Side Decoupling (Vite / React)
- In Vite, only variables explicitly prefixed with `VITE_` are bundled into client JavaScript.
- **Never** prefix backend keys (`MONGODB_URI`, `JWT_SECRET`, `CLOUDINARY_API_SECRET`) with `VITE_`.
- Frontend code only knows the relative `/api` path. All external API calls (Cloudinary upload, database transactions, PDF generation) are handled exclusively server-side.

### 3. Fail-Fast Production Environment Validation
- In production (`NODE_ENV=production` or running on Vercel), `server/src/config/env.js` validates all required secrets before processing requests.
- If `JWT_SECRET` is missing, shorter than 32 characters, or using a known placeholder, the server aborts boot immediately rather than running with an insecure fallback.

### 4. Zero Data Leakage via Diagnostics & Health Endpoints
- Public endpoints (`/`, `/api/health`, `/api/bootstrap-status`) are strictly sanitized.
- Internal connection strings (`mongodb+srv://...`), database usernames, cluster hosts, and Cloudinary keys are never included in API responses or HTTP headers.

### 5. Multi-Layer Rate Limiting & DoS Mitigation
- **Global API Rate Limiter**: 500 requests per 15-minute window per IP address across all `/api/*` endpoints.
- **Authentication Rate Limiter**: Max 20 attempts per 15-minute window on sensitive endpoints (`/api/auth/login`, `/api/auth/reset-password`, `/api/auth/setup-initial-admin`, `/api/auth/activate-invite`).

### 6. Strict Cross-Origin Resource Sharing (CORS) Whitelist
- In production, cross-origin requests with credentials (`withCredentials: true`) are strictly restricted to trusted origins specified in `ALLOWED_ORIGINS` (or preview deployments on `.vercel.app`).
- Arbitrary origins (`*`) are prohibited from making credentialed requests.

### 7. Centralized Error Handling (CWE-209 Prevention)
- In production, unhandled server errors return a generic message (`"An unexpected error occurred. Please contact system support."`) with an opaque tracking `errorId`.
- Internal stack traces, server disk paths, and database query schemas are never revealed to callers.

---

## 3. How to Configure Environment Variables for Production (Vercel)

When deploying to Vercel, configure your encrypted environment variables via the Vercel Dashboard:

1. Open your project in the [Vercel Dashboard](https://vercel.com/dashboard).
2. Navigate to **Settings** > **Environment Variables**.
3. Add the following variables for **Production** and **Preview** environments:

| Variable Name | Description | Example / Recommended Value |
|---|---|---|
| `NODE_ENV` | Runtime environment | `production` |
| `MONGODB_URI` | MongoDB Atlas Connection String | `mongodb+srv://<user>:<password>@cluster0.abcde.mongodb.net/apex_shareholder_portal?retryWrites=true&w=majority` |
| `JWT_SECRET` | 64-char random cryptographic hex string | *Generate using command below* |
| `ALLOWED_ORIGINS` | Comma-separated list of your official production URLs | `https://shareholder.niagroup.com,https://your-deployment.vercel.app` |
| `CLOUDINARY_CLOUD_NAME` | Cloudinary Cloud Name (optional) | *From your Cloudinary dashboard* |
| `CLOUDINARY_API_KEY` | Cloudinary API Key (optional) | *From your Cloudinary dashboard* |
| `CLOUDINARY_API_SECRET` | Cloudinary API Secret (optional) | *From your Cloudinary dashboard* |
| `CLOUDINARY_FOLDER` | Destination folder for uploads | `apex_shareholder_portal` |

### How to Generate a Strong `JWT_SECRET`:
Run this command in terminal to generate a 256-bit cryptographically secure secret:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

---

## 4. MongoDB Atlas Database Security Checklist

1. **IP Access List**:
   - In MongoDB Atlas, go to **Network Access**.
   - If deploying on serverless infrastructure without static outbound IPs (e.g. Vercel), permit access (`0.0.0.0/0`) only in combination with strong SCRAM-SHA-256 credentials and TLS 1.3 encryption.
2. **Database User Privileges**:
   - In MongoDB Atlas, go to **Database Access**.
   - Create a user with **Specific Privileges**: `readWrite` on database `apex_shareholder_portal`.
   - Never use the `atlasAdmin` account for web applications.
3. **Connection Encryption**:
   - The connection string must always use `mongodb+srv://` with `retryWrites=true&w=majority` to enforce end-to-end TLS encryption.

---

## 5. Security Verification Command

Run the automated verification test at any time to validate all controls:
```bash
npm run security:audit
```
