<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Lumina Commerce

Project is organized for Vercel-friendly deployment:

- `frontend/` - React + Vite storefront
- `backend/` - shared API logic, MongoDB models, auth, cart, assistant routes
- `api/` - Vercel serverless entrypoints that reuse the backend app
- `vercel.json` - Vercel build/output configuration

## Prerequisites

- Node.js 20+
- MongoDB connection string

## Environment Setup

1. Frontend: copy `frontend/.env.example` to `frontend/.env.local`
2. Backend: copy `backend/.env.example` to `backend/.env` (or `backend/.env.local`)
3. Set required values:
- Frontend:
  - `VITE_API_BASE_URL` is optional. Leave it empty to use same-origin `/api`.
- Backend:
  - `MONGODB_URI`
  - `MONGODB_DB`
  - `JWT_SECRET`
  - `JWT_EXPIRES_IN`
  - `CLIENT_URL`
  - `GEMINI_API_KEY`
  - `GEMINI_MODEL`
  - `ADMIN_EMAIL`
  - `ADMIN_PASSWORD`
  - `ADMIN_NAME`

## Run Locally

1. Install dependencies:
- `npm install`
2. Start backend API:
- `npm run dev:backend`
3. Start frontend:
- `npm run dev:frontend`

Shortcut commands:
- `npm run server` (same as `npm run dev:backend`)
- `npm run dev` (same as `npm run dev:frontend`)
- `npm run build`
- `npm run typecheck`

## Auth Endpoints

- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET /api/auth/me`
- `GET /api/health`

## Vercel Deployment

1. Push the repository to GitHub.
2. Import the repository into Vercel.
3. Keep the project root as the repository root.
4. Vercel will use:
- `npm install`
- `npm run build`
- output directory: `frontend/dist`
5. Add these Vercel environment variables:
- `MONGODB_URI`
- `MONGODB_DB`
- `JWT_SECRET`
- `JWT_EXPIRES_IN`
- `CLIENT_URL`
- `GEMINI_API_KEY`
- `GEMINI_MODEL`
- `ADMIN_EMAIL`
- `ADMIN_PASSWORD`
- `ADMIN_NAME`
6. Redeploy the project.

## Git Push

```bash
git init
git add .
git commit -m "Initial clean commit"
git branch -M main
git remote add origin https://github.com/MithunTalukdar/lumina-shoping.git
git push -u origin main
```

## Notes

- An admin user is seeded at backend startup if missing.
- Default seeded admin credentials are controlled by `ADMIN_EMAIL` and `ADMIN_PASSWORD`.
- The shopping assistant now calls a server-side `/api/assistant` route, so the Gemini API key is no longer exposed in the browser.
