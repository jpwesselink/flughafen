#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const script = join(__dirname, '..', 'src', 'cli-fetch-schemas.ts');

const result = spawnSync(
  process.execPath,
  ['--import', 'tsx', script, ...process.argv.slice(2)],
  { stdio: 'inherit', cwd: process.cwd() }
);

process.exit(result.status ?? 1);
