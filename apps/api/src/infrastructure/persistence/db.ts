import 'reflect-metadata'
import { drizzle, type NodePgDatabase } from 'drizzle-orm/node-postgres'
import { Pool } from 'pg'
import * as schema from './schema'
import { logger } from '../logging/index.js'

/**
 * PostgreSQL 연결 설정
 * Connection pooling 및 Drizzle ORM 설정
 */

// 환경 변수
const DATABASE_URL = process.env.DATABASE_URL
const DB_MAX_CONNECTIONS = Number.parseInt(process.env.DB_MAX_CONNECTIONS ?? '20', 10)
const DB_IDLE_TIMEOUT = Number.parseInt(process.env.DB_IDLE_TIMEOUT ?? '30000', 10)
const DB_CONNECTION_TIMEOUT = Number.parseInt(process.env.DB_CONNECTION_TIMEOUT ?? '5000', 10)

if (!DATABASE_URL) {
	throw new Error('DATABASE_URL environment variable is required')
}

// PostgreSQL 연결 풀 설정
export const pool = new Pool({
	connectionString: DATABASE_URL,
	max: DB_MAX_CONNECTIONS,
	idleTimeoutMillis: DB_IDLE_TIMEOUT,
	connectionTimeoutMillis: DB_CONNECTION_TIMEOUT,
})

// 연결 이벤트 핸들링
pool.on('error', (err) => {
	logger.error({ error: err }, 'Unexpected error on idle client')
	process.exit(-1)
})

// Drizzle ORM 인스턴스
export const db: NodePgDatabase<typeof schema> = drizzle(pool, { schema })

// 데이터베이스 타입 export
export type Database = NodePgDatabase<typeof schema>
export type Schema = typeof schema

// 연결 테스트 함수
export async function testConnection(): Promise<boolean> {
	try {
		const client = await pool.connect()
		const result = await client.query('SELECT NOW()')
		client.release()
		logger.info({ now: result.rows[0]?.now }, 'Database connected')
		return true
	} catch (error) {
		logger.error({ error }, 'Database connection failed')
		return false
	}
}

// 연결 종료 함수
export async function closeConnection(): Promise<void> {
	await pool.end()
}
