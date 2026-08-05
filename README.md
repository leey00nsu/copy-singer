# Vocal Loom

A minimal SoulX-Singer singing voice conversion workbench built with the latest Next-compatible App Router surface, React 19, Tailwind CSS 4, and shadcn/ui. The Modal service is kept in `services/soulx-singer-svc`.

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

## Environment

```dotenv
MODAL_API_URL=https://dbstndla1212--soulx-singer-svc-web.modal.run
MODAL_API_KEY=the-value-stored-in-the-soulx-api-secret
```

## Commands

```bash
npm run dev
npm run build
npm test
npm run lint
```

## Layout

```text
app/                         Next.js pages and API proxy routes
components/                  Vocal workbench and shadcn/ui components
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
