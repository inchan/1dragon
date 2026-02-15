import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { authClient } from './client';

const SESSION_QUERY_KEY = ['auth', 'session'] as const;

interface UseAuthReturn {
	user: typeof authClient.$Infer.Session.user | null;
	isLoading: boolean;
	isAuthenticated: boolean;
	signIn: (provider: 'kakao' | 'google' | 'apple') => void;
	signOut: () => void;
}

export function useAuth(): UseAuthReturn {
	const queryClient = useQueryClient();

	const { data: session, isLoading } = useQuery({
		queryKey: SESSION_QUERY_KEY,
		queryFn: async () => {
			const { data } = await authClient.getSession();
			return data;
		},
	});

	const signInMutation = useMutation({
		mutationFn: async (provider: 'kakao' | 'google' | 'apple') => {
			const result = await authClient.signIn.social({
				provider,
				callbackURL: '/dashboard',
			});
			return result;
		},
	});

	const signOutMutation = useMutation({
		mutationFn: async () => {
			await authClient.signOut();
		},
		onSuccess: () => {
			queryClient.setQueryData(SESSION_QUERY_KEY, null);
			queryClient.invalidateQueries({ queryKey: SESSION_QUERY_KEY });
		},
	});

	const signIn = (provider: 'kakao' | 'google' | 'apple'): void => {
		signInMutation.mutate(provider);
	};

	const signOut = (): void => {
		signOutMutation.mutate();
	};

	return {
		user: session?.user ?? null,
		isLoading,
		isAuthenticated: session?.user != null,
		signIn,
		signOut,
	};
}
