import { createFileRoute } from '@tanstack/react-router'
import { useMemo, useState } from 'react'
import { Button, Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle, Input, Label } from '@snapvid/ui'
import { useCheckout, useLimitedOffer, usePlans, useSubscribe, useSubscription } from '@/features/payment/hooks'

export const Route = createFileRoute('/pricing/')({
	component: PricingPage,
})

function PricingPage(): React.JSX.Element {
	const [billingCycle, setBillingCycle] = useState<'MONTHLY' | 'YEARLY'>('MONTHLY')
	const [paymentMethod, setPaymentMethod] = useState<'KAKAOPAY' | 'TOSSPAY' | 'CARD'>('KAKAOPAY')
	const [paymentKey, setPaymentKey] = useState('test_payment_key')
	const [orderId, setOrderId] = useState(`order_${Date.now()}`)

	const { data: plans, isLoading } = usePlans()
	const { data: subscription } = useSubscription()
	const { data: offer } = useLimitedOffer()
	const subscribe = useSubscribe()
	const checkout = useCheckout()

	const starterPlan = useMemo(() => plans?.find((plan) => plan.tier === 'STARTER'), [plans])

	return (
		<div className="mx-auto max-w-6xl space-y-6 px-4 py-8">
			<div className="space-y-2">
				<h1 className="text-3xl font-semibold">요금제 선택</h1>
				<p className="text-sm text-muted-foreground">
					Free/Starter 비교 후 월간 또는 연간으로 구독할 수 있습니다.
				</p>
				{offer?.active && (
					<div className="inline-flex rounded border border-rose-300 bg-rose-50 px-3 py-2 text-sm text-rose-700">
						72시간 한정: 지금 구독하면 첫 달 {offer.discountPercent}% 할인
					</div>
				)}
			</div>

			<div className="flex items-center gap-2">
				<Button
					variant={billingCycle === 'MONTHLY' ? 'default' : 'outline'}
					onClick={() => setBillingCycle('MONTHLY')}
				>
					월간
				</Button>
				<Button
					variant={billingCycle === 'YEARLY' ? 'default' : 'outline'}
					onClick={() => setBillingCycle('YEARLY')}
				>
					연간(20% 할인)
				</Button>
			</div>

			<div className="grid gap-4 md:grid-cols-2">
				{isLoading && <p className="text-sm text-muted-foreground">요금제를 불러오는 중...</p>}
				{plans?.map((plan) => {
					const price = billingCycle === 'MONTHLY' ? plan.priceMonthly : plan.priceYearly
					const current = subscription?.planId === plan.id

					return (
						<Card key={plan.id} className={current ? 'border-primary' : ''}>
							<CardHeader>
								<CardTitle>{plan.name}</CardTitle>
								<CardDescription>
									{billingCycle === 'MONTHLY'
										? `월 ${price.toLocaleString()}원`
										: `연 ${price.toLocaleString()}원`}
								</CardDescription>
							</CardHeader>
							<CardContent className="space-y-2 text-sm">
								<p>월 영상 {plan.quota}건</p>
								<p>최대 영상 길이 {plan.limits.maxVideoLengthSec}초</p>
								<p>멀티 플랫폼 {plan.limits.multiPlatformEnabled ? '지원' : '미지원'}</p>
								<p>워터마크 {plan.limits.watermarkRequired ? '필수' : '선택'}</p>
							</CardContent>
							<CardFooter>
								<Button
									disabled={subscribe.isPending}
									onClick={() => {
										subscribe.mutate({
											planTier: plan.tier,
											billingCycle,
											paymentMethod: {
												type: paymentMethod,
												token: 'widget-token',
											},
										})
									}}
								>
									{current ? '현재 요금제' : '이 요금제로 시작'}
								</Button>
							</CardFooter>
						</Card>
					)
				})}
			</div>

			<Card>
				<CardHeader>
					<CardTitle>토스페이먼츠 결제 위젯 (MVP 연동)</CardTitle>
					<CardDescription>카카오페이/토스페이/신용카드 결제 승인 API 연동</CardDescription>
				</CardHeader>
				<CardContent className="grid gap-4 md:grid-cols-2">
					<div className="space-y-2">
						<Label>결제 수단</Label>
						<div className="flex gap-2">
							<Button
								variant={paymentMethod === 'KAKAOPAY' ? 'default' : 'outline'}
								onClick={() => setPaymentMethod('KAKAOPAY')}
							>
								카카오페이
							</Button>
							<Button
								variant={paymentMethod === 'TOSSPAY' ? 'default' : 'outline'}
								onClick={() => setPaymentMethod('TOSSPAY')}
							>
								토스페이
							</Button>
							<Button
								variant={paymentMethod === 'CARD' ? 'default' : 'outline'}
								onClick={() => setPaymentMethod('CARD')}
							>
								신용카드
							</Button>
						</div>
					</div>
					<div className="space-y-2">
						<Label htmlFor="paymentKey">Payment Key</Label>
						<Input id="paymentKey" value={paymentKey} onChange={(e) => setPaymentKey(e.target.value)} />
					</div>
					<div className="space-y-2">
						<Label htmlFor="orderId">Order ID</Label>
						<Input id="orderId" value={orderId} onChange={(e) => setOrderId(e.target.value)} />
					</div>
				</CardContent>
				<CardFooter>
					<Button
						disabled={!starterPlan || checkout.isPending}
						onClick={() => {
							if (!starterPlan) {
								return
							}
							checkout.mutate({
								paymentKey,
								orderId,
								amount: billingCycle === 'MONTHLY' ? starterPlan.priceMonthly : starterPlan.priceYearly,
								method: paymentMethod,
							})
						}}
					>
						결제 승인 요청
					</Button>
				</CardFooter>
			</Card>
		</div>
	)
}
