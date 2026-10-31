// Creates `.env` from `.env.example` on first run, so a fresh clone starts with `pnpm dev`.
import { copyFileSync, existsSync } from 'node:fs';

if (!existsSync('.env')) {
  copyFileSync('.env.example', '.env');
  console.log('Created .env from .env.example (local development defaults).');
}
