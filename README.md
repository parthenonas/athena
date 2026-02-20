<!-- 
   Copyright 2026 Parthenonas

   Licensed under the Apache License, Version 2.0 (the "License");
   you may not use this file except in compliance with the License.
   You may obtain a copy of the License at

       http://www.apache.org/licenses/LICENSE-2.0

   Unless required by applicable law or agreed to in writing, software
   distributed under the License is distributed on an "AS IS" BASIS,
   WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   See the License for the specific language governing permissions and
   limitations under the License.
-->

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
- Docker & Docker Compose (See [installation manual](https://docs.docker.com/engine/install/))

### Installation

1. **Clone the repository:**

   ```bash
   git clone https://github.com/parthenonas/athena.git
   cd athena
   ```

2. **Install dependencies:**

    ```bash
    npm install
    ```

3. **Setup Environment: Copy `.env.example` to `.env`**

    ```bash
    cp .env.example .env
    cp apps/athena-api/.env.example apps/athena-api/.env
    cp apps/athena-runner/.env.example apps/athena-runner/.env
    cp apps/athena-web/.env.example apps/athena-web/.env
    ```

4. **Start Infrastructure (DB, Redis):**

    ```bash
    docker compose -f docker-compose.infra.yml up -d
    ```

5. **Build Shared Libs:**

    ```bash
    npm run build:types
    npm run build:common
    ```


## Development

Migrate databases if needed:

```bash
npm run migration:run
```

Then run services in separate terminals:

```bash
# Start backend (API):
npm run dev:api

# Start runner:
npm run dev:runner

# Start frontend (Web):
npm run dev:web
```

### Troubleshooting `ENOSPC` Error

> **Note for macOS and Windows users:**  
> This issue is specific to **Linux** systems. If you are using macOS or Windows, you can ignore this step as these operating systems handle file watching differently.

If you encounter the error `ENOSPC: System limit for number of file watchers reached` after `npm run dev:web`, it means your Linux system has hit its inotify limit. This is common in large web projects.

To fix this, increase the watcher limit using one of the following methods:

1. Temporary fix (resets after reboot):

    ```bash
    sudo sysctl fs.inotify.max_user_watches=524288
    sudo sysctl -p
    ```

2. Permanent fix:

    Run the following command to persist the setting:

    ```bash
    echo fs.inotify.max_user_watches=524288 | sudo tee -a /etc/sysctl.conf && sudo sysctl -p
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
