import { createRootRoute, Link, Outlet } from '@tanstack/react-router'
import { QueryClientProvider } from '@tanstack/react-query'
import type { JSX } from 'react'
import { queryClient } from '../lib/query-client'
import { CreditBalanceBadge } from '@/features/payment/credit-balance-badge'

export const Route = createRootRoute({
	component: RootComponent,
	beforeLoad: () => {
		return {
			queryClient,
		}
	},
})

function RootComponent(): JSX.Element {
	return (
		<QueryClientProvider client={queryClient}>
			<div className="min-h-screen bg-background">
				<header className="border-b bg-card/70 backdrop-blur">
					<div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
						<nav className="flex items-center gap-4 text-sm">
							<Link to="/dashboard" className="[&.active]:font-semibold">
								Dashboard
							</Link>
							<Link to="/studio/create" className="[&.active]:font-semibold">
								Studio
							</Link>
							<Link to="/products/analyze" className="[&.active]:font-semibold">
								상품 분석
							</Link>
							<Link to="/pricing" className="[&.active]:font-semibold">
								Pricing
							</Link>
							<Link to="/settings" className="[&.active]:font-semibold">
								Settings
							</Link>
						</nav>
						<CreditBalanceBadge />
					</div>
				</header>
				<Outlet />
			</div>
		</QueryClientProvider>
	)
}
