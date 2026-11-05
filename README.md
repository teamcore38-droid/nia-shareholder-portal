# Apex Link — Shareholder Portal Web Application (MERN + Cloudinary)

Prepared for **NIA Group of Company** (`Proposal Reference: ALG-SP-2026-16`).

## Architecture & Stack
- **Frontend**: React 19, Vite 6, Tailwind CSS v4, Lucide Icons, Custom Interactive SVG Step-After Financial Charts with Accessible Tabular Toggle.
- **Backend**: Node.js, Express.js, JWT Authentication with Multi-Factor Staff Verification & Session Version Revocation, PDFKit Dated Statement & Report Generator.
- **Database**: MongoDB & Mongoose (`server/src/models/index.js`) with automatic Persistent Local JSON-Document Engine (`server/data/portal_db.json`) fallback when local `mongod` is not running.
- **Media & Document Storage**: Cloudinary v2 SDK (`server/src/config/cloudinary.js`) with runtime credential configuration in **Settings (Interface 21)** or `server/.env` and safe local fallback (`server/uploads/`).
- **Zero Unwanted Seed Data**: Starts completely clean of any fake/unwanted records. On first visit, initialize your primary Administrator account directly from the Sign-In screen.

## Running the Application
1. **Backend API (`http://localhost:5000`)**:
   ```bash
   cd server
   npm start
   ```
2. **Frontend Web App (`http://localhost:5173`)**:
   ```bash
   cd client
   npm run dev
   ```
