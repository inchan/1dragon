const GENERIC_ERROR_MESSAGE = 'An unexpected error occurred'

export function safeErrorMessage(error: unknown, nodeEnv: string): string {
	if (nodeEnv !== 'production') {
		return error instanceof Error ? error.message : String(error)
	}

	return GENERIC_ERROR_MESSAGE
}
