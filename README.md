# CloudSentinel

An enterprise-grade, dashboard intelligence application that monitors multi-stack cloud provisions, aggregates billing footprints using advanced temporal charting, identifies programmatic configuration anomalies natively via trailing time-series variance analysis, and delivers comprehensive optimization heuristics safely.

## Tech Stack
- Frontend: React + TypeScript + Vite + Tailwind CSS v3 + Recharts + React Router v6
- Backend: Express + Node.js + TypeScript
- Database: PostgreSQL 15 handled structurally using the `pg` pool abstraction

## Setup & Deployment (Docker)
The entire monorepo builds and links cohesively mimicking production environments via Docker Compose:

1. Clone repo locally.
2. Initialize environment parameters (`.env.example` -> `.env`) via terminal: `cp .env.example .env`
3. Bring cluster active structurally:
```bash
docker-compose up --build
```
This seamlessly provisions local containers linking all routing namespaces concurrently. Open `http://localhost:5173` to view the UI.

## Adding AWS / GCP Target Integrations
Because the system is encapsulated natively around the `providerFactory()` singleton and `CloudProvider` base definitions, the backend adapts polymorphically.

1. Navigate to `/server/src/providers/` and write direct SDK endpoints completing either structure (`AWSCloudProvider` or `GCPCloudProvider`).
2. Supply valid cloud runtime identifiers into the central config mapping `CLOUD_PROVIDER` inside `.env` configuration (i.e. `CLOUD_PROVIDER=aws` or `CLOUD_PROVIDER=gcp`).
3. Re-initialize container instances.
