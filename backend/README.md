# Zoopi Backend (NestJS)

This project is the unified backend for Zoopi, replacing the previous Express services (`print-service`, `print-agent-v3`) and the Supabase backend with a monolithic NestJS application using a local PostgreSQL database.

## Architecture

- **Framework**: NestJS
- **Database**: PostgreSQL (Dockerized)
- **ORM**: TypeORM
- **API Port**: 3847

## Modules

- `PrintService`: TCP/IP thermal printing service.
- `PrintAgent`: Local printer management and agent.
- `Fiscal`: Fiscal document configuration and logic.
- `Delivery`: Delivery fee calculation and configuration.
- `Products`: Product management (PostgreSQL).
- `Orders`: Order management (PostgreSQL).

## Database Setup

This project uses a Dockerized PostgreSQL database.

1.  **Start the Database**:
    ```bash
    docker-compose up -d
    ```
    This starts PostgreSQL on port 5432 with:
    - User: `postgres`
    - Password: `password`
    - DB: `zoopi`

2.  **Schema Migration**:
    The application is configured to automatically synchronize entities with the database schema (`synchronize: true`).

## Running the App

```bash
# Install dependencies
npm install

# Start the application
npm run start:dev
```

## API Endpoints

- `GET /print-service/health`
- `GET /print-agent/health`
- `POST /fiscal` (and other generated endpoints)
- `POST /delivery`
- `GET /products`
- `GET /orders`

## Migration Note

The frontend currently points to Supabase. To complete the migration:
1.  Update the frontend `supabase/client.ts` or API calls to point to this NestJS backend.
2.  Implement the full CRUD logic in the `Products` and `Orders` services to match the Supabase queries.
