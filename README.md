# Copysinger

Copysinger analyzes a signed-in user's test singing, compares the resulting vocal profile with song profiles, recommends suitable songs and karaoke keys, and provides a ticket-based SoulX-Singer voice-conversion demo. Google OAuth identifies users, Leemage stores reference and result audio, and a PostgreSQL-backed worker keeps mixing jobs running after the browser closes.

## Local setup

```bash
pnpm install --frozen-lockfile
cp .env.example .env.local
# Fill Google OAuth, Leemage, Modal, and admin values in .env.local.
docker compose up -d --build
pnpm run db:migrate:deploy
pnpm run db:generate
pnpm run dev
```

`pnpm dev` starts the Next.js development server and durable mixing worker together. For production on the single instance, run `pnpm build` and then `pnpm start`; `start` also runs both processes. Use `pnpm dev:web` or `pnpm start:web` only when intentionally diagnosing the web process without a worker.

Open:

- `http://localhost:3000/` or `/profile` for the vocal-profile and recommendation flow;
- `http://localhost:3000/account` for ticket balance and ledger;
- `http://localhost:3000/mixing-history` for durable jobs and results;
- `http://localhost:3000/admin` for allowlisted operators;
- `http://localhost:3000/dev/svc` for the developer SoulX-Singer workbench when `ENABLE_DEV_SVC=true` in development.

For voice conversion, upload:

- a clean reference singing voice, ideally under 30 seconds;
- a target vocal or full mix, up to 5 minutes.

The browser calls same-origin Next.js API routes. The Modal API key stays on the server and is never sent to the browser.

For a vocal profile, sing any familiar song verse for about 10–30 seconds without accompaniment—for example, the Korean national anthem or “Happy Birthday.” Recording stops when you press the button or automatically at 30 seconds. You can instead upload a WAV, MP3, M4A, or WebM file. The local analyzer accepts at most 25 MB and 60 seconds.

## Local PostgreSQL and vocal analyzer

PostgreSQL runs locally with Docker Compose. The default host port is `5433`; the container keeps PostgreSQL's standard `5432` port.

Copy the environment example once, then keep your actual values in the ignored `.env.local` file:

```bash
cp .env.example .env.local
```

If `.env.local` already contains the Modal settings, add only the PostgreSQL variables from `.env.example` instead of overwriting it.

Start PostgreSQL and the CPU-only librosa/ffmpeg analyzer, then confirm both are healthy:

```bash
docker compose up -d --build
docker compose ps
curl -fsS http://localhost:8001/health
```

Apply the committed migrations, generate Prisma Client, seed development fixtures, and verify the relation graph:

```bash
set -a
source .env.local
set +a
pnpm run db:migrate:deploy
pnpm run db:generate
pnpm run db:seed
pnpm run db:verify
pnpm run db:status
```

Create a new migration after changing `prisma/schema.prisma`:

```bash
pnpm run db:migrate -- --name describe_your_change
```

The analyzer uses `work/vocal-profiles/` only as a short-lived handoff. After analysis, Next.js uploads the standardized WAV to Leemage, stores only `MediaAsset` metadata in PostgreSQL, and deletes the analyzer copy. Deleting a profile removes the Leemage object; failed external deletion is recorded for the mixing worker to retry.

## Google OAuth, Leemage, and background mixing

Create a Google OAuth web client and register this local redirect URI:

```text
http://localhost:3000/api/auth/callback/google
```

Create one Leemage project and an API key with the minimum permissions required to presign/confirm uploads, read project files, and delete files. Keep the key server-side. Fill these variables in `.env.local`:

```dotenv
BETTER_AUTH_SECRET=at-least-32-random-characters
BETTER_AUTH_URL=http://localhost:3000
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
ADMIN_EMAILS=operator@example.com

LEEMAGE_BASE_URL=https://leemage.leey00nsu.com/api/v1
LEEMAGE_API_KEY=...
LEEMAGE_PROJECT_ID=...

SIGNUP_TICKET_GRANT=1
MIXING_TICKET_COST=1
MIXING_WORKER_CONCURRENCY=1
MIXING_MAX_ATTEMPTS=3
MIXING_LEASE_SECONDS=120
MIXING_POLL_INTERVAL_MS=5000
```

Check configuration without printing secrets, then optionally upload and immediately delete one Leemage smoke file:

```bash
pnpm run verify:feature-config
pnpm run verify:feature-config -- --leemage
```

The default single-instance commands supervise the web process and durable worker together:

```bash
pnpm dev
# or, after pnpm build
pnpm start
```

If either child process fails, the combined command terminates the other process so the instance supervisor can restart the complete service. `pnpm run worker:mixing` remains available for worker-only diagnostics.

The web request atomically spends `MIXING_TICKET_COST` and creates a PostgreSQL job. The worker claims jobs with a lease, downloads the private reference through its stored Leemage metadata, asks the analyzer for an ephemeral allowlisted song target, submits Modal, and copies successful results back to Leemage. Failures before Modal acceptance are refunded; failures after acceptance are not. Restarting the worker lets another process reclaim an expired lease and continue polling the same Modal job.

### Song catalog analysis

The TJ 2026-07 Top 100 source list is stored in `data/catalogs/tj-2607-top100.md`. PostgreSQL holds mutable application metadata, while the reproducible analysis results are committed in `data/catalogs/tj-2607-song-profiles.json` and shipped unchanged with each deployment.

Import the metadata, initialize the artifact, then analyze pending songs sequentially:

```bash
pnpm run catalog:import
pnpm run catalog:init-profiles
pnpm run catalog:analyze -- --limit 1 --resume
pnpm run catalog:verify
```

Use `--rank 49 --resume` to retry one catalog entry, or omit `--rank` and set `--limit` for a bounded sequential batch. READY songs are not downloaded again.

`catalog:analyze` is a local-development-only build workflow. For each allowlisted catalog URL, the analyzer downloads audio with yt-dlp into an OS temporary directory, separates vocals with Demucs, computes aggregate pYIN metrics, and removes the source plus every stem before responding. It writes metrics, source links, status, and tool versions atomically to the JSON artifact after each song; it does not create `Recording` or `VocalProfile` rows. Song audio is never stored in the repository, database, artifact, or a persistent Docker volume.

For an optional three-song Modal GPU benchmark, install and authenticate the Modal CLI, then run:

```bash
python -m pip install -r services/song-catalog-analyzer/requirements-local.txt
python -m modal setup
python -m modal run services/song-catalog-analyzer/modal_app.py --limit 3
```

The command defaults to a three-song benchmark and accepts an explicitly approved limit up to 100. It downloads on the local machine because YouTube blocks Modal data-center IPs, uploads WAV files to an anonymous `Volume.ephemeral()`, runs up to eight independent L4 functions, updates the local JSON artifact, and deletes the temporary local directory and ephemeral Volume when the run exits. Individual local download failures do not stop the remaining GPU inputs. It does not deploy an endpoint or create a named media Volume.

For a large batch, point the job-scoped local temporary directory at a disk with enough free space:

```bash
COPY_SINGER_TEMP_ROOT=/Volumes/sn850x/copy-singer-temp \
  python -m modal run services/song-catalog-analyzer/modal_app.py --limit 86
```

Before release, require all 100 profiles to be present:

```bash
pnpm run catalog:verify -- --require-ready
```

`catalog:clear-db-profiles` is a one-time migration helper that removes legacy catalog analysis rows produced by the earlier DB-backed implementation. It is deliberately limited to catalog ranks 1–100 and refuses to delete referenced profiles.

The `demucs_models` Docker volume contains reusable model weights only. Downloading and immediate deletion do not replace the requirement to have permission to process a source. A future recommendation-to-Convert integration must use the same job-scoped cleanup boundary and must never expose the original or separated stems.

Stop the local services without deleting PostgreSQL's named volume:

```bash
docker compose down
```

Deleting the named volume also deletes the local database and is intentionally not part of the normal workflow.

## Environment

```dotenv
MODAL_API_URL=https://dbstndla1212--soulx-singer-svc-web.modal.run
MODAL_API_KEY=the-value-stored-in-the-soulx-api-secret
SONG_ANALYSIS_MODAL_URL=https://your-workspace--copy-singer-catalog-analyzer-fastapi-app.modal.run
# Optional; MODAL_API_KEY is reused when omitted.
SONG_ANALYSIS_MODAL_API_KEY=
BETTER_AUTH_SECRET=at-least-32-random-characters
BETTER_AUTH_URL=http://localhost:3000
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
ADMIN_EMAILS=operator@example.com
LEEMAGE_BASE_URL=https://leemage.leey00nsu.com/api/v1
LEEMAGE_API_KEY=your-leemage-api-key
LEEMAGE_PROJECT_ID=your-leemage-project-id
SIGNUP_TICKET_GRANT=1
MIXING_TICKET_COST=1
POSTGRES_DB=copy_singer
POSTGRES_USER=copy_singer
POSTGRES_PASSWORD=copy_singer_dev
POSTGRES_PORT=5433
DATABASE_URL=postgresql://copy_singer:copy_singer_dev@localhost:5433/copy_singer?schema=public
```

## Commands

```bash
pnpm run dev
pnpm run dev:web
pnpm start
pnpm run start:web
pnpm run worker:mixing
pnpm run worker:song-analysis
pnpm run modal:song-catalog:deploy # remote deploy; approval required
pnpm run verify:feature-config
pnpm run build
pnpm test
pnpm run lint
pnpm run db:validate
pnpm run db:generate
pnpm run db:migrate:deploy
pnpm run db:seed
pnpm run db:verify
pnpm run db:status
pnpm run catalog:import
pnpm run catalog:init-profiles
pnpm run catalog:analyze -- --limit 1 --resume
pnpm run catalog:verify -- --require-ready
docker compose run --rm --no-deps \
  -v "$PWD/services/vocal-profile-api:/app" \
  vocal-profile-api sh -lc \
  'python -m pip install --disable-pip-version-check -q -r requirements-dev.txt && pytest -q'
curl -fsS http://localhost:8001/health
```

## Layout

```text
app/                              Thin Next.js App Router adapters
src/_app/                         FSD App layer: layout, providers, routes, workers
src/_pages/                       FSD Pages layer: route-level UI composition
src/widgets/                      Reusable, self-contained page sections
src/features/                     User actions and application use cases
src/entities/                     Domain data, behavior, and domain UI
src/shared/                       Framework-agnostic API, config, DB, media, and UI
data/catalogs/                    Versioned song metadata and analysis artifacts
prisma/                           Prisma schema, migrations, and development seed
scripts/                          Workers and local verification/maintenance tools
services/soulx-singer-svc/        Modal GPU singing-voice conversion API
services/vocal-profile-modal/     Modal GPU vocal-profile analyzer
services/song-catalog-analyzer/   Ephemeral Modal catalog benchmark
services/vocal-profile-api/       Local FastAPI/librosa CPU analyzer
tests/                            Node, integration, UI, Query, and boundary tests
work/vocal-profiles/              Ignored local recording storage
```

The root `app/` and `src/_app/` are intentionally different. Next.js requires
route conventions such as `page.tsx`, `layout.tsx`, and `route.ts` under
`app/`. Those files contain only Next.js route configuration and re-exports
from an FSD public API. Application composition and Route Handler
implementations live in `src/_app/`. Likewise, `src/_pages/` is the FSD Pages
layer, not a second Next.js router. The `_app` and `_pages` names follow the
[official FSD Next.js guide](https://fsd.how/docs/guides/tech/with-nextjs/)
to avoid collisions with Next.js directories.

FSD dependencies point from higher layers to lower layers:

```text
_app → _pages → widgets → features → entities → shared
```

A module may skip layers while following that direction. Code in one slice
must not import another slice's `api/`, `model/`, `ui/`, `lib/`, or `config/`
files directly. Import through the target slice's root public API instead.
Relative imports within the same slice remain internal implementation details.

Public API entry points describe their runtime capability:

- `index.ts` exports browser-safe UI, client APIs, and pure model values.
- `index.model.ts` exports runtime-neutral schemas, types, and value contracts
  without pulling UI, client hooks, database access, or secrets into the graph.
- `index.server.ts` exports database operations, server policies, secrets, and
  other server-only capabilities.
- More specific suffixes, when present, expose a deliberately narrower
  capability and should be used only by the named consumer class.

`pnpm run check:architecture` runs Steiger's standard FSD rules and the
repository boundary tests. The narrow overrides in `steiger.config.ts` remain
necessary because the current Steiger/FSD filesystem versions do not normalize
underscore-prefixed App/Pages layers consistently in every rule and do not
count some `_app` Route Handler or worker consumers. Keep exceptions limited to
confirmed paths and re-evaluate them when those packages are upgraded.

## Documentation workflow

This repository uses lee-spec-kit in embedded, local-workflow mode.

```bash
npx lee-spec-kit detect --json
npx lee-spec-kit idea <name>
npx lee-spec-kit feature <name> --component web
npx lee-spec-kit feature <name> --component modal-api
```

Product requirements live in `docs/prd/`, while active implementation work is tracked in component feature folders under `docs/features/`.
