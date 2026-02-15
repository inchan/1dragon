import pino from 'pino'
import { config } from '../../shared/config.js'

const isDevelopment = config.NODE_ENV === 'development'

const pinoConfig: pino.LoggerOptions = {
	level: config.LOG_LEVEL,
	base: {
		pid: process.pid,
		env: config.NODE_ENV,
	},
}

if (isDevelopment) {
	pinoConfig.transport = {
		target: 'pino-pretty',
		options: {
			colorize: true,
			translateTime: 'HH:MM:ss Z',
			ignore: 'pid,env',
		},
	}
}

export const logger = pino(pinoConfig)

export type LogContext = {
	job_id?: string
	user_id?: string
	provider?: string
	request_id?: string
	[key: string]: unknown
}

export function createChildLogger(context: LogContext): pino.Logger {
	return logger.child(context)
}
