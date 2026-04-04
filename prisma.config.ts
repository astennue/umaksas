import { defineConfig } from 'prisma/config';

export default defineConfig({
  // Migrate seed command from package.json#prisma.seed
  migrations: {
    seed: 'bun prisma/seed.ts',
  },
});
