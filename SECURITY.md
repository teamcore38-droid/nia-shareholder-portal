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
         │     MongoDB Atlas     │                   │ Cloudflare R2 Storage │
         │  - SCRAM-SHA-256 Auth │                   │  - Access Key & Secret│
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
- **Never** prefix backend keys (`MONGODB_URI`, `JWT_SECRET`, `CLOUDFLARE_R2_SECRET_ACCESS_KEY`) with `VITE_`.
- Frontend code only knows the relative `/api` path. All external API calls (Cloudflare R2 upload, database transactions, PDF generation) are handled exclusively server-side.

### 3. Fail-Fast Production Environment Validation
- In production (`NODE_ENV=production` or running on Vercel), `server/src/config/env.js` validates all required secrets before processing requests.
- If `JWT_SECRET` is missing, shorter than 32 characters, or using a known placeholder, the server aborts boot immediately rather than running with an insecure fallback.

### 4. Zero Data Leakage via Diagnostics & Health Endpoints
- Public endpoints (`/`, `/api/health`, `/api/bootstrap-status`) are strictly sanitized.
- Internal connection strings (`mongodb+srv://...`), database usernames, cluster hosts, and Cloudflare R2 keys are never included in API responses or HTTP headers.

### 5. Multi-Layer Rate Limiting, Brute-Force Lockout & DoS Mitigation
- **Global API Rate Limiter**: 2,000 requests per 15-minute window per IP across `/api/*` endpoints (excluding `/api/health`) to accommodate shared corporate/AGM NATs.
- **Authentication & Brute-Force Protection**: Layered per-account + IP rate limiting (`15` failed attempts / 15 min per `IP + account` and `250` failed attempts / 15 min per IP, `skipSuccessfulRequests: true`), plus a database-backed 5-strike 15-minute account lockout on repeated invalid passwords or 2FA codes.
- **Export & Upload Throttling**: Dedicated limits on CPU-heavy PDF/CSV exports (`30` / 5 min per user) and file uploads (`60` / 15 min per user), with JSON payloads capped at `1mb`.
- **NoSQL & XSS Payload Sanitization**: Global middleware strips `$`-prefixed MongoDB operators, dotted keys, and prototype-pollution keys from `req.body` and `req.query`, while document/logo URLs reject `javascript:` and `data:` schemes.

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
| `CLOUDFLARE_ACCOUNT_ID` | Cloudflare Account ID (optional) | *From your Cloudflare dashboard* |
| `CLOUDFLARE_R2_ACCESS_KEY_ID` | Cloudflare R2 Access Key ID (optional) | *From your Cloudflare R2 API Tokens* |
| `CLOUDFLARE_R2_SECRET_ACCESS_KEY` | Cloudflare R2 Secret Access Key (optional) | *From your Cloudflare R2 API Tokens* |
| `CLOUDFLARE_R2_BUCKET_NAME` | Cloudflare R2 Bucket Name (optional) | `apex-shareholder-portal` |
| `CLOUDFLARE_R2_PUBLIC_URL` | Optional R2 public URL / custom domain | *Leave blank for authenticated proxy* |
| `CLOUDFLARE_R2_FOLDER` | Destination folder prefix for uploads | `apex_shareholder_portal` |

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
