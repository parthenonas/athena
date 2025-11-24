# Athena LMS

Athena is a modular Learning Management System (LMS) built as a TypeScript monorepo.
The project is under active development and not production-ready yet.

> **Work in progress.** Most of the system is not production-ready yet.


## Tech Stack

### Backend
NestJS, TypeORM, PostgreSQL, JWT, Argon2, MinIO (planned), Full test setup with Jest and Testcontainers

### Frontend
React with MUI, Vite, Redux Toolkit, React Hook Form, Zod

### Monorepo
npm workspaces

### Applications:
- apps/athena-api (backend)
- apps/athena-learn (student UI)
- apps/athena-studio (teacher UI)
- apps/athena-control (admin UI)


## Development

```bash
# Install dependencies:
npm install

# Build shared libraries:
npm run build:types
npm run build:common

# Start backend:
npm run dev:api

# Start frontends:
npm run dev:learn
npm run dev:studio
npm run dev:control
```


## Testing

```bash
# Unit tests:
npm run test:api

# E2E tests (Testcontainers):
npm run test:api:e2e

# Static checks:
npm audit
npm run lint:api
npm run typecheck:api
```


## CI

GitHub Actions run audit, linting, typechecking, unit tests, e2e tests (API only), and build checks.
Triggered on pull requests and pushes to main and develop branches.

## License

MIT License Copyright © 2025 [Sergei Shekshuev](https://github.com/shekshuev)
