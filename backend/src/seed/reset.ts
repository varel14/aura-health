import { resetAndSeed } from './seed.js';

resetAndSeed().catch((err) => {
  console.error('❌ Reset failed:', err);
  process.exit(1);
});
