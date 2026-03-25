<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Lumina Commerce

Project is now separated into:

- `frontend/` (React + Vite)
- `backend/` (Express + MongoDB auth API)

## Prerequisites

- Node.js 18+
- MongoDB connection string

## Environment Setup

1. Frontend: copy `frontend/.env.example` to `frontend/.env.local`
2. Backend: copy `backend/.env.example` to `backend/.env` (or `backend/.env.local`)
3. Set required values:
- Frontend: `GEMINI_API_KEY`, `VITE_API_BASE_URL`
- Backend: `MONGODB_URI`, `JWT_SECRET`

## Run Locally

1. Install dependencies:
- `npm run install:frontend`
- `npm run install:backend`
2. Start backend API:
- `npm run dev:backend`
3. Start frontend:
- `npm run dev:frontend`

Shortcut commands:
- `npm run server` (same as `npm run dev:backend`)
- `npm run dev` (same as `npm run dev:frontend`)

## Auth Endpoints

- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET /api/auth/me`
- `GET /api/health`

## Notes

- An admin user is seeded at backend startup if missing.
- Default seeded admin credentials are controlled by `ADMIN_EMAIL` and `ADMIN_PASSWORD`.
