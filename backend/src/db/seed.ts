import { runMigrationAndSeed } from './migrate.js';

export async function runSeed() {
  await runMigrationAndSeed();
}

if (process.argv[1] && process.argv[1].includes('seed.ts')) {
  runSeed()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('Error ejecutando seed:', err);
      process.exit(1);
    });
}
