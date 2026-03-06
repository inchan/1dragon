import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { createFileRoute } from '@tanstack/react-router'
import { Button, Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle, Input, Label } from '@1dragon/ui'
import { useProfile, useUpdateProfile } from './hooks'

export const Route = createFileRoute('/settings/profile/')({
	component: ProfileSettingsPage,
})

interface FormData {
	name: string
	avatarUrl: string
}

interface FormErrors {
	name?: string
	avatarUrl?: string
}

function ProfileSettingsPage(): React.JSX.Element {
	const { t } = useTranslation()
	const { data: profile, isLoading, error } = useProfile()
	const updateProfile = useUpdateProfile({
		onSuccess: () => {
			setIsSuccess(true)
			setTimeout(() => setIsSuccess(false), 3000)
		},
	})

	const [formData, setFormData] = useState<FormData>({
		name: '',
		avatarUrl: '',
	})
	const [errors, setErrors] = useState<FormErrors>({})
	const [isSuccess, setIsSuccess] = useState(false)

	// Sync form data with profile data when it loads
	useEffect(() => {
		if (profile) {
			setFormData({
				name: profile.name ?? '',
				avatarUrl: profile.avatarUrl ?? '',
			})
		}
	}, [profile])

	const validateForm = (): boolean => {
		const newErrors: FormErrors = {}

		if (formData.name && formData.name.length > 255) {
			newErrors.name = t('profile.errors.nameTooLong')
		}

		if (formData.avatarUrl) {
			try {
				new URL(formData.avatarUrl)
			} catch {
				newErrors.avatarUrl = t('profile.errors.invalidUrl')
			}
		}

		setErrors(newErrors)
		return Object.keys(newErrors).length === 0
	}

	const handleSubmit = (e: React.FormEvent): void => {
		e.preventDefault()

		if (!validateForm()) {
			return
		}

		const updateData: { name?: string | undefined; avatarUrl?: string | undefined } = {}

		if (formData.name !== (profile?.name ?? '')) {
			updateData.name = formData.name
		}

		if (formData.avatarUrl !== (profile?.avatarUrl ?? '')) {
			updateData.avatarUrl = formData.avatarUrl || undefined
		}

		// Only update if there are changes
		if (Object.keys(updateData).length > 0) {
			updateProfile.mutate(updateData)
		}
	}

	const updateFormData = (field: keyof FormData, value: string): void => {
		setFormData((prev) => ({ ...prev, [field]: value }))
		setIsSuccess(false)
		// Clear error when user starts typing
		if (errors[field]) {
			setErrors((prev) => ({ ...prev, [field]: undefined }))
		}
	}

	const hasChanges =
		formData.name !== (profile?.name ?? '') ||
		formData.avatarUrl !== (profile?.avatarUrl ?? '')

	if (isLoading) {
		return (
			<div className="min-h-screen flex items-center justify-center">
				<p className="text-muted-foreground">{t('common.loading')}</p>
			</div>
		)
	}

	if (error) {
		return (
			<div className="min-h-screen flex items-center justify-center">
				<Card className="w-full max-w-lg">
					<CardHeader>
						<CardTitle>{t('common.error')}</CardTitle>
						<CardDescription>{error.message}</CardDescription>
					</CardHeader>
					<CardFooter>
						<Button onClick={() => window.location.reload()}>{t('common.retry')}</Button>
					</CardFooter>
				</Card>
			</div>
		)
	}

	return (
		<div className="min-h-screen bg-background p-4 md:p-8">
			<div className="max-w-2xl mx-auto">
				<Card>
					<CardHeader>
						<CardTitle>{t('profile.title')}</CardTitle>
						<CardDescription>{t('profile.description')}</CardDescription>
					</CardHeader>
					<form onSubmit={handleSubmit}>
						<CardContent className="space-y-6">
							{/* Avatar Preview */}
							{formData.avatarUrl && (
								<div className="flex justify-center">
									<img
										src={formData.avatarUrl}
										alt={t('profile.avatarAlt')}
										className="w-24 h-24 rounded-full object-cover border-2 border-border"
										onError={(e) => {
											e.currentTarget.src = ''
										}}
									/>
								</div>
							)}

							{/* Name Field */}
							<div className="space-y-2">
								<Label htmlFor="name">{t('profile.nameLabel')}</Label>
								<Input
									id="name"
									value={formData.name}
									onChange={(e) => updateFormData('name', e.target.value)}
									placeholder={t('profile.namePlaceholder')}
									aria-invalid={!!errors.name}
								/>
								{errors.name && (
									<p className="text-sm text-destructive">{errors.name}</p>
								)}
							</div>

							{/* Avatar URL Field */}
							<div className="space-y-2">
								<Label htmlFor="avatarUrl">{t('profile.avatarUrlLabel')}</Label>
								<Input
									id="avatarUrl"
									type="url"
									value={formData.avatarUrl}
									onChange={(e) => updateFormData('avatarUrl', e.target.value)}
									placeholder={t('profile.avatarUrlPlaceholder')}
									aria-invalid={!!errors.avatarUrl}
								/>
								{errors.avatarUrl && (
									<p className="text-sm text-destructive">{errors.avatarUrl}</p>
								)}
							</div>

							{/* Email (Read-only) */}
							<div className="space-y-2">
								<Label htmlFor="email">{t('profile.emailLabel')}</Label>
								<Input
									id="email"
									type="email"
									value={profile?.email ?? ''}
									disabled
									className="bg-muted"
								/>
								<p className="text-xs text-muted-foreground">{t('profile.emailReadOnly')}</p>
							</div>
						</CardContent>
						<CardFooter className="flex justify-between">
							<div>
								{isSuccess && (
									<span className="text-sm text-green-600">{t('profile.saveSuccess')}</span>
								)}
							</div>
							<Button type="submit" disabled={!hasChanges || updateProfile.isPending}>
								{updateProfile.isPending ? t('common.loading') : t('common.save')}
							</Button>
						</CardFooter>
					</form>
					{updateProfile.isError && (
						<div className="px-6 pb-6">
							<p className="text-sm text-destructive text-center">
								{updateProfile.error?.message || t('profile.updateError')}
							</p>
						</div>
					)}
				</Card>
			</div>
		</div>
	)
}
