import { useState, type JSX } from 'react'
import { useTranslation } from 'react-i18next'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useMutation } from '@tanstack/react-query'
import { Button, Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle, Input, Label, Select } from '@snapvid/ui'
import { api } from '../../lib/api'
import type { OnboardingRequest } from '@snapvid/shared'

export const Route = createFileRoute('/onboarding/')({
	component: OnboardingPage,
})

const SELLING_PLATFORMS = [
	{ value: 'coupang', label: '쿠팡' },
	{ value: 'naver', label: '네이버 스마트스토어' },
	{ value: 'gmarket', label: 'G마켓' },
	{ value: 'auction', label: '옥션' },
	{ value: '11st', label: '11번가' },
	{ value: 'interpark', label: '인터파크' },
	{ value: 'ssg', label: 'SSG닷컴' },
	{ value: 'homepage', label: '자체 홈페이지' },
	{ value: 'instagram', label: '인스타그램' },
	{ value: 'facebook', label: '페이스북' },
	{ value: 'other', label: '기타' },
]

const PRODUCT_CATEGORIES = [
	{ value: 'fashion', label: '패션/의류' },
	{ value: 'beauty', label: '뷰티/화장품' },
	{ value: 'food', label: '식품' },
	{ value: 'electronics', label: '전자제품' },
	{ value: 'home', label: '홈/인테리어' },
	{ value: 'accessories', label: '액세서리/잡화' },
	{ value: 'sports', label: '스포츠/레저' },
	{ value: 'kids', label: '유아/아동' },
	{ value: 'books', label: '도서/문구' },
	{ value: 'pet', label: '반려동물' },
	{ value: 'other', label: '기타' },
]

type Step = 1 | 2 | 3

interface FormData {
	businessName: string
	sellingPlatform: string
	productCategory: string
}

interface FormErrors {
	businessName?: string
	sellingPlatform?: string
	productCategory?: string
}

function OnboardingPage(): JSX.Element {
	const { t } = useTranslation()
	const navigate = useNavigate()
	const [currentStep, setCurrentStep] = useState<Step>(1)
	const [formData, setFormData] = useState<FormData>({
		businessName: '',
		sellingPlatform: '',
		productCategory: '',
	})
	const [errors, setErrors] = useState<FormErrors>({})

	const onboardingMutation = useMutation({
		mutationFn: (data: OnboardingRequest) => api.completeOnboarding(data),
		onSuccess: () => {
			navigate({ to: '/dashboard' })
		},
	})

	const validateStep = (step: Step): boolean => {
		const newErrors: FormErrors = {}

		switch (step) {
			case 1:
				if (!formData.businessName.trim()) {
					newErrors.businessName = t('onboarding.errors.businessNameRequired')
				} else if (formData.businessName.length > 255) {
					newErrors.businessName = t('onboarding.errors.businessNameTooLong')
				}
				break
			case 2:
				if (!formData.sellingPlatform) {
					newErrors.sellingPlatform = t('onboarding.errors.platformRequired')
				}
				break
			case 3:
				if (!formData.productCategory) {
					newErrors.productCategory = t('onboarding.errors.categoryRequired')
				}
				break
		}

		setErrors(newErrors)
		return Object.keys(newErrors).length === 0
	}

	const handleNext = (): void => {
		if (validateStep(currentStep)) {
			if (currentStep < 3) {
				setCurrentStep((prev) => (prev + 1) as Step)
			} else {
				handleSubmit()
			}
		}
	}

	const handleBack = (): void => {
		if (currentStep > 1) {
			setCurrentStep((prev) => (prev - 1) as Step)
		}
	}

	const handleSkip = (): void => {
		navigate({ to: '/dashboard' })
	}

	const handleSubmit = (): void => {
		const requestData: OnboardingRequest = {
			businessName: formData.businessName,
			sellingPlatform: formData.sellingPlatform,
			productCategory: formData.productCategory,
		}
		onboardingMutation.mutate(requestData)
	}

	const updateFormData = (field: keyof FormData, value: string): void => {
		setFormData((prev) => ({ ...prev, [field]: value }))
		// Clear error when user starts typing
		if (errors[field]) {
			setErrors((prev) => ({ ...prev, [field]: undefined }))
		}
	}

	const renderStepContent = (): JSX.Element => {
		switch (currentStep) {
			case 1:
				return (
					<div className="space-y-4">
						<div className="space-y-2">
							<Label htmlFor="businessName">{t('onboarding.step1.businessNameLabel')}</Label>
							<Input
								id="businessName"
								value={formData.businessName}
								onChange={(e) => updateFormData('businessName', e.target.value)}
								placeholder={t('onboarding.step1.businessNamePlaceholder')}
								aria-invalid={!!errors.businessName}
							/>
							{errors.businessName && (
								<p className="text-sm text-destructive">{errors.businessName}</p>
							)}
						</div>
					</div>
				)
			case 2:
				return (
					<div className="space-y-4">
						<div className="space-y-2">
							<Label htmlFor="sellingPlatform">{t('onboarding.step2.platformLabel')}</Label>
							<Select
								id="sellingPlatform"
								value={formData.sellingPlatform}
								onChange={(value) => updateFormData('sellingPlatform', value)}
								options={SELLING_PLATFORMS}
								placeholder={t('onboarding.step2.platformPlaceholder')}
								aria-invalid={!!errors.sellingPlatform}
							/>
							{errors.sellingPlatform && (
								<p className="text-sm text-destructive">{errors.sellingPlatform}</p>
							)}
						</div>
					</div>
				)
			case 3:
				return (
					<div className="space-y-4">
						<div className="space-y-2">
							<Label htmlFor="productCategory">{t('onboarding.step3.categoryLabel')}</Label>
							<Select
								id="productCategory"
								value={formData.productCategory}
								onChange={(value) => updateFormData('productCategory', value)}
								options={PRODUCT_CATEGORIES}
								placeholder={t('onboarding.step3.categoryPlaceholder')}
								aria-invalid={!!errors.productCategory}
							/>
							{errors.productCategory && (
								<p className="text-sm text-destructive">{errors.productCategory}</p>
							)}
						</div>
					</div>
				)
		}
	}

	const getStepTitle = (): string => {
		switch (currentStep) {
			case 1:
				return t('onboarding.step1.title')
			case 2:
				return t('onboarding.step2.title')
			case 3:
				return t('onboarding.step3.title')
		}
	}

	const getStepDescription = (): string => {
		switch (currentStep) {
			case 1:
				return t('onboarding.step1.description')
			case 2:
				return t('onboarding.step2.description')
			case 3:
				return t('onboarding.step3.description')
		}
	}

	return (
		<div className="min-h-screen flex items-center justify-center bg-background p-4">
			<Card className="w-full max-w-lg">
				<CardHeader>
					<div className="flex items-center justify-between">
						<div className="flex gap-1">
							{([1, 2, 3] as const).map((step) => (
								<div
									key={step}
									className={`h-2 w-8 rounded-full ${
										step <= currentStep ? 'bg-primary' : 'bg-muted'
									}`}
								/>
							))}
						</div>
						<span className="text-sm text-muted-foreground">
							{currentStep} / 3
						</span>
					</div>
					<CardTitle className="mt-4">{getStepTitle()}</CardTitle>
					<CardDescription>{getStepDescription()}</CardDescription>
				</CardHeader>
				<CardContent>{renderStepContent()}</CardContent>
				<CardFooter className="flex justify-between">
					<div>
						{currentStep > 1 ? (
							<Button variant="outline" onClick={handleBack} disabled={onboardingMutation.isPending}>
								{t('common.back')}
							</Button>
						) : (
							<Button variant="ghost" onClick={handleSkip} disabled={onboardingMutation.isPending}>
								{t('onboarding.skip')}
							</Button>
						)}
					</div>
					<Button
						onClick={handleNext}
						disabled={onboardingMutation.isPending}
					>
						{onboardingMutation.isPending
						? t('common.loading')
						: currentStep === 3
							? t('onboarding.complete')
							: t('common.next')}
					</Button>
				</CardFooter>
				{onboardingMutation.isError && (
					<div className="px-6 pb-6">
						<p className="text-sm text-destructive text-center">
							{onboardingMutation.error?.message || t('onboarding.error')}
						</p>
					</div>
				)}
			</Card>
		</div>
	)
}
