import { PrismaClient } from '@prisma/client'
import { readFileSync } from 'fs'
import { join } from 'path'

// Explicitly load .env file to override shell environment variables
// This ensures PostgreSQL URLs are used even if shell has old SQLite paths
function loadDotEnv() {
  try {
    const envPath = join(process.cwd(), '.env')
    const envContent = readFileSync(envPath, 'utf-8')
    for (const line of envContent.split('\n')) {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith('#')) continue
      const eqIndex = trimmed.indexOf('=')
      if (eqIndex === -1) continue
      const key = trimmed.substring(0, eqIndex).trim()
      let value = trimmed.substring(eqIndex + 1).trim()
      // Remove surrounding quotes
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1)
      }
      if (key && value) {
        process.env[key] = value
      }
    }
  } catch {
    // .env file not found, use default env
  }
}

loadDotEnv()

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

// Ensure DATABASE_URL is PostgreSQL (not SQLite)
const dbUrl = process.env.DATABASE_URL || ''
const isPostgres = dbUrl.startsWith('postgresql://') || dbUrl.startsWith('postgres://')

if (!isPostgres) {
  console.error('[DB] WARNING: DATABASE_URL is not PostgreSQL. Current:', dbUrl.substring(0, 60))
}

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : [],
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db
