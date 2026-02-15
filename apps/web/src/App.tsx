import { RouterProvider, createRouter } from '@tanstack/react-router'
import type { JSX } from 'react'
import { routeTree } from './routeTree.gen'

const router = createRouter({ routeTree })

declare module '@tanstack/react-router' {
	interface Register {
		router: typeof router
	}
}

export function App(): JSX.Element {
	return <RouterProvider router={router} />
}
