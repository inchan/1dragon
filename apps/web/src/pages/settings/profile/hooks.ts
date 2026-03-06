import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { api } from '../../../lib/api'
import type { UpdateProfileRequest, UserProfile } from '@1dragon/shared'

const PROFILE_QUERY_KEY = ['profile'] as const

interface UseUpdateProfileContext {
	previousProfile: UserProfile | undefined
}

export function useProfile(): ReturnType<typeof useQuery<UserProfile, Error>> {
	const { t } = useTranslation()

	return useQuery<UserProfile, Error>({
		queryKey: PROFILE_QUERY_KEY,
		queryFn: async () => {
			try {
				return await api.getProfile()
			} catch (error) {
				throw new Error(
					error instanceof Error ? error.message : t('profile.fetchError'),
				)
			}
		},
	})
}

interface UseUpdateProfileOptions {
	onSuccess?: () => void
	onError?: (error: Error) => void
}

export function useUpdateProfile(
	options: UseUpdateProfileOptions = {},
): ReturnType<typeof useMutation<UserProfile, Error, UpdateProfileRequest, UseUpdateProfileContext>> {
	const { t } = useTranslation()
	const queryClient = useQueryClient()

	return useMutation<UserProfile, Error, UpdateProfileRequest, UseUpdateProfileContext>({
		mutationFn: async (data) => {
			try {
				return await api.updateProfile(data)
			} catch (error) {
				throw new Error(
					error instanceof Error ? error.message : t('profile.updateError'),
				)
			}
		},
		onMutate: async (newData) => {
			// Cancel any outgoing refetches
			await queryClient.cancelQueries({ queryKey: PROFILE_QUERY_KEY })

			// Snapshot the previous value
			const previousProfile = queryClient.getQueryData<UserProfile>(PROFILE_QUERY_KEY)

			// Optimistically update to the new value
			if (previousProfile) {
				const updatedProfile: UserProfile = {
					...previousProfile,
					name: newData.name ?? previousProfile.name,
					avatarUrl: newData.avatarUrl ?? previousProfile.avatarUrl,
					updatedAt: new Date().toISOString(),
				}
				queryClient.setQueryData<UserProfile>(PROFILE_QUERY_KEY, updatedProfile)
			}

			return { previousProfile }
		},
		onError: (error, _newData, context) => {
			// If the mutation fails, roll back to the previous value
			if (context?.previousProfile) {
				queryClient.setQueryData(PROFILE_QUERY_KEY, context.previousProfile)
			}
			options.onError?.(error)
		},
		onSettled: () => {
			// Always refetch after error or success to ensure cache is in sync with server
			queryClient.invalidateQueries({ queryKey: PROFILE_QUERY_KEY })
			options.onSuccess?.()
		},
	})
}
