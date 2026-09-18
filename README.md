# Moodcraft

A private, offline record of daily mood and medication, built to make the
relationship between dose spacing and how well a dose worked visible.

- Domain rules: [`domain-spec-moodcraft.md`](domain-spec-moodcraft.md)
- Visual language: [`design-system/`](design-system/) — open the HTML files directly
- Implementation plan: [`docs/superpowers/plans/2026-09-18-moodcraft-implementation.md`](docs/superpowers/plans/2026-09-18-moodcraft-implementation.md)
- Design-system parity review: [`docs/design-parity.md`](docs/design-parity.md)

## Running it

    npm install
    npm run dev       # http://localhost:5173
    npm test          # unit and component tests
    npm run typecheck
    npm run build

## Where the data lives

In this browser, in IndexedDB, on this device. There is no account, no server,
no sync and no network code — a test enforces that. Export writes a JSON file
you keep yourself.

## Changing the stored shape

Append a migration to `src/data/migrations.ts` and let `SCHEMA_VERSION` follow
it. Shipped migrations are never edited.
