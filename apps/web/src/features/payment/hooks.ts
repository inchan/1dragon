import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api, type QuotaDto, type SubscriptionDto, type PlanDto, type LimitedOfferDto } from '@/lib/api'

const QUERY_KEYS = {
	plans: ['payments', 'plans'] as const,
	subscription: ['payments', 'subscription'] as const,
	quota: ['payments', 'quota'] as const,
	offer: ['payments', 'offer'] as const,
}

export function usePlans(): ReturnType<typeof useQuery<PlanDto[], Error>> {
	return useQuery({
		queryKey: QUERY_KEYS.plans,
		queryFn: () => api.getPlans(),
	})
}

export function useSubscription(): ReturnType<typeof useQuery<SubscriptionDto, Error>> {
	return useQuery({
		queryKey: QUERY_KEYS.subscription,
		queryFn: () => api.getSubscription(),
	})
}

export function useQuota(): ReturnType<typeof useQuery<QuotaDto, Error>> {
	return useQuery({
		queryKey: QUERY_KEYS.quota,
		queryFn: () => api.getQuota(),
		refetchInterval: 20_000,
	})
}

export function useLimitedOffer(): ReturnType<typeof useQuery<LimitedOfferDto, Error>> {
	return useQuery({
		queryKey: QUERY_KEYS.offer,
		queryFn: () => api.getLimitedOffer(),
		refetchInterval: 60_000,
	})
}

export function useSubscribe(): ReturnType<
	typeof useMutation<
		SubscriptionDto,
		Error,
		{
			planTier: 'FREE' | 'STARTER'
			billingCycle: 'MONTHLY' | 'YEARLY'
			paymentMethod: { type: string; token: string }
		}
	>
> {
	const queryClient = useQueryClient()

	return useMutation({
		mutationFn: (payload) => api.subscribe(payload),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: QUERY_KEYS.subscription })
			queryClient.invalidateQueries({ queryKey: QUERY_KEYS.quota })
			queryClient.invalidateQueries({ queryKey: QUERY_KEYS.offer })
		},
	})
}

export function useCancelSubscription(): ReturnType<typeof useMutation<SubscriptionDto, Error, string | undefined>> {
	const queryClient = useQueryClient()

	return useMutation({
		mutationFn: (reason) => api.cancelSubscription(reason),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: QUERY_KEYS.subscription })
			queryClient.invalidateQueries({ queryKey: QUERY_KEYS.quota })
		},
	})
}

export function useCheckout(): ReturnType<
	typeof useMutation<unknown, Error, { paymentKey: string; orderId: string; amount: number; method?: string }>
> {
	return useMutation({
		mutationFn: (payload) => api.checkout(payload),
	})
}
