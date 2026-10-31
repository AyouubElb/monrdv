import { existsSync } from 'node:fs';

// Locally all apps share the root `.env`; in CI and production the variables come from the environment.
// Variables already set in the environment win over the file.
if (existsSync('../.env')) process.loadEnvFile('../.env');
