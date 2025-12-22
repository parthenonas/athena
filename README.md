# Athena LMS

Athena is a modular Learning Management System (LMS) built as a TypeScript monorepo.
The project is under active development and not production-ready yet.

> **Work in progress.** Most of the system is not production-ready yet.

## Features

- **Role-Based Access Control (RBAC):** Students, Instructors, Admins.
- **Code Runner:** Secure execution of student code via [isolate](https://github.com/ioi/isolate).
- **Course Studio:** Instructor tools for creating and managing content.
- **Modern UI:** Clean, responsive interface built with Nuxt UI & Tailwind.

## Tech Stack

### Backend
- **Framework:** NestJS
- **Database:** PostgreSQL + TypeORM
- **Caching:** Redis
- **Auth:** JWT, Argon2
- **Storage:** MinIO (planned)
- **Testing:** Jest + Testcontainers

### Frontend
- **Framework:** Nuxt 3 (SPA mode)
- **UI Library:** Nuxt UI (Tailwind CSS based)
- **State:** Pinia + Persisted State
- **Validation:** Zod

### Monorepo
- Managed via **pnpm workspaces**

### Applications
- `apps/athena-api` - Backend API
- `apps/athena-runner` - Code execution service
- `apps/athena-web` - Frontend Dashboard

## Getting Started

### Prerequisites
- Node.js 20+
- Docker & Docker Compose

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/shekshuev/athena-lms.git
   cd athena-lms
   ```

2. **Install dependencies:**
    ```bash
    npm install
    ```

3. **Setup Environment: Copy `.env.example` to `.env`**
    ```bash
    cp apps/athena-api/.env.example apps/athena-api/.env
    cp apps/athena-runner/.env.example apps/athena-runner/.env
    cp apps/athena-web/.env.example apps/athena-web/.env
    ```

4. **Start Infrastructure (DB, Redis):**
    ```bash
    docker-compose -f docker-compose.infra.yml up -d
    ```

5. **Build Shared Libs:**
    ```bash
    npm run build:types
    npm run build:common
    ```


## Development

Run services in separate terminals:

```bash
# Start backend (API):
npm run dev:api

# Start runner:
npm run dev:runner

# Start frontend (Web):
npm run dev:web
```


## Testing

We use Vitest for Frontend and Jest for Backend.

```bash
# Unit tests:
npm run test:api
npm run test:runner
npm run test:web

# E2E tests (Testcontainers):
npm run test:api:e2e
npm run test:runner:e2e

# Static checks:
npm audit
npm run lint:api
npm run lint:runner
npm run lint:web
npm run typecheck:api
npm run typecheck:runner
npm run typecheck:web
```


##  CI/CD

GitHub Actions pipeline handles:

- Audit & Linting
- Typechecking
- Unit Tests
- E2E Tests (Backend)
- Build verification

Triggered on PRs and pushes to `main` and `develop`.

> Note regarding Code Runner: The runner service relies on [isolate](https://github.com/ioi/isolate), which utilizes Linux kernel features (cgroups, namespaces).
> 
> On Linux: Ensure [isolate](https://github.com/ioi/isolate) is installed and you have sudo rights (or configured sudoers).
> 
> On macOS/Windows: You cannot run apps/athena-runner natively with code execution enabled. 

## License

MIT License Copyright © 2025 [Sergei Shekshuev](https://github.com/shekshuev)
