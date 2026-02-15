import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode, JSX } from 'react';

const queryClient = new QueryClient({
	defaultOptions: {
		queries: {
			staleTime: 5 * 60 * 1000,
			retry: 1,
		},
	},
});

interface AuthProviderProps {
	children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps): JSX.Element {
	return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
