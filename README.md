# Copy Singer

Copy Singer analyzes a user's test singing, compares the resulting vocal profile with song profiles, recommends suitable songs and karaoke keys, and provides a SoulX-Singer voice-conversion demo. The current local implementation includes the SVC workbench and guided vocal-profile measurement.

## Local setup

```bash
pnpm install --frozen-lockfile
cp .env.example .env.local
# Set MODAL_API_KEY in .env.local when testing voice conversion.
docker compose up -d --build
pnpm run db:migrate:deploy
pnpm run db:generate
pnpm run dev
```

Open:

- `http://localhost:3000/` or `/profile` for the vocal-profile and recommendation flow;
- `http://localhost:3000/dev/svc` for the developer SoulX-Singer workbench.

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

The analyzer stores uploaded source audio under `work/vocal-profiles/` and returns a 24-hour expiry timestamp. Deleting a profile through the UI removes both its database rows and analyzer recording. Automatic expiry cleanup is not included in this feature yet.

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
POSTGRES_DB=copy_singer
POSTGRES_USER=copy_singer
POSTGRES_PASSWORD=copy_singer_dev
POSTGRES_PORT=5433
DATABASE_URL=postgresql://copy_singer:copy_singer_dev@localhost:5433/copy_singer?schema=public
```

## Commands

```bash
pnpm run dev
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
app/                         Next.js pages and API proxy routes
components/                  Vocal workbench and shadcn/ui components
data/catalogs/               Versioned song metadata and analysis artifact
lib/db/                      Server-only Prisma client
prisma/                      Prisma schema, migrations, and development seed
scripts/                     Local database verification scripts
services/soulx-singer-svc/   Modal GPU API deployment
services/song-catalog-analyzer/  Ephemeral Modal L4 catalog benchmark
services/vocal-profile-api/  Local FastAPI/librosa CPU analyzer
work/vocal-profiles/         Ignored local recording storage
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
