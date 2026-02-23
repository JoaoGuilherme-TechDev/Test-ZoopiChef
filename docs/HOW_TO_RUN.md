# How to Run the System

The Zoopi system has been refactored to use a NestJS backend with a local PostgreSQL database, replacing the previous Supabase architecture.

## Prerequisites

1.  **Node.js**: Installed (v18+ recommended).
2.  **Docker Desktop**: Installed and running (required for the database).

## Quick Start (Windows)

Double-click the `start-all.bat` script in the root folder.

This script will:
1.  Start the PostgreSQL database via Docker.
2.  Open a new terminal window for the Backend (NestJS).
3.  Open a new terminal window for the Frontend (Vite).

## Manual Start

If you prefer to run components individually:

### 1. Start Database
```bash
start-database.bat
# OR
cd backend-nest
docker-compose up -d
```

### 2. Start Backend
```bash
start-backend.bat
# OR
cd backend-nest
npm install
npm run start:dev
```
The backend API will be available at `http://localhost:3847`.

### 3. Start Frontend
```bash
start-frontend.bat
# OR
npm install --legacy-peer-deps
npm run dev
```
The frontend will launch in your browser (usually `http://localhost:8080`).

## Architecture

- **Frontend**: React + Vite (Port 8080)
- **Backend**: NestJS (Port 3847)
- **Database**: PostgreSQL (Port 5432)

## Troubleshooting

- **Database Connection Error**: Ensure Docker Desktop is running.
- **Port Conflicts**: Ensure ports 3847, 5432, and 8080 are free.
- **Dependencies**: If you encounter errors, try running `npm install` in both the root folder and `backend-nest` folder.
