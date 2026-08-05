# Copy Singer

Copy Singer analyzes a user's test singing, compares the resulting vocal profile with song profiles, recommends suitable songs and karaoke keys, and provides a SoulX-Singer voice-conversion demo. The current implementation contains the SVC workbench; profiling and recommendations are tracked through lee-spec-kit docs.

## Local setup

```bash
npm install
cp .env.example .env.local
# Set MODAL_API_KEY in .env.local
npm run dev
```

Open `http://localhost:3000` and upload:

- a clean reference singing voice, ideally under 30 seconds;
- a target vocal or full mix, up to 5 minutes.

The browser calls same-origin Next.js API routes. The Modal API key stays on the server and is never sent to the browser.

## Local PostgreSQL

PostgreSQL runs locally with Docker Compose. The default host port is `5433`; the container keeps PostgreSQL's standard `5432` port.

Copy the environment example once, then keep your actual values in the ignored `.env.local` file:

```bash
cp .env.example .env.local
```

If `.env.local` already contains the Modal settings, add only the PostgreSQL variables from `.env.example` instead of overwriting it.

Start the database and confirm that it is healthy:

```bash
docker compose up -d
docker compose ps
```

Apply the committed migrations, generate Prisma Client, seed development fixtures, and verify the relation graph:

```bash
npm run db:migrate:deploy
npm run db:generate
npm run db:seed
npm run db:verify
npm run db:status
```

Create a new migration after changing `prisma/schema.prisma`:

```bash
npm run db:migrate -- --name describe_your_change
```

Stop PostgreSQL without deleting its named volume:

```bash
docker compose down
```

Deleting the named volume also deletes the local database and is intentionally not part of the normal workflow.

## Environment

```dotenv
MODAL_API_URL=https://dbstndla1212--soulx-singer-svc-web.modal.run
MODAL_API_KEY=the-value-stored-in-the-soulx-api-secret
POSTGRES_DB=copy_singer
POSTGRES_USER=copy_singer
POSTGRES_PASSWORD=copy_singer_dev
POSTGRES_PORT=5433
DATABASE_URL=postgresql://copy_singer:copy_singer_dev@localhost:5433/copy_singer?schema=public
```

## Commands

```bash
npm run dev
npm run build
npm test
npm run lint
npm run db:validate
npm run db:generate
npm run db:migrate:deploy
npm run db:seed
npm run db:verify
npm run db:status
```

## Layout

```text
app/                         Next.js pages and API proxy routes
components/                  Vocal workbench and shadcn/ui components
lib/db/                      Server-only Prisma client
prisma/                      Prisma schema, migrations, and development seed
scripts/                     Local database verification scripts
services/soulx-singer-svc/   Modal GPU API deployment
```

## Documentation workflow

This repository uses lee-spec-kit in embedded, local-workflow mode.

```bash
npx lee-spec-kit detect --json
npx lee-spec-kit idea <name>
npx lee-spec-kit feature <name> --component web
npx lee-spec-kit feature <name> --component modal-api
```

Product requirements live in `docs/prd/`, while active implementation work is tracked in component feature folders under `docs/features/`.
