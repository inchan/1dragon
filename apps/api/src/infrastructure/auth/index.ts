export { auth } from './better-auth.js'
export { setupAuthRoutes, authMiddleware, requireAuth } from './hono-handler.js'
export {
	sessionMiddleware,
	requireAuth as requireAuthWithRefresh,
	optionalAuth,
	getSession,
	getCurrentUserId,
} from './session-middleware.js'
