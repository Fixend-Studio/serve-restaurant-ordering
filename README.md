# Serve

QR and NFC ordering for restaurants. Developed by FIXEND.

## Requirements

- Node.js 22. Run `nvm use` in this directory.
- npm

## Local development

```bash
nvm use
npm install
cp .env.example .env.local
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

The architecture, database design, and build sequence are in [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md). The schema draft is [supabase/schema.sql](supabase/schema.sql). It is not applied to a database yet.
