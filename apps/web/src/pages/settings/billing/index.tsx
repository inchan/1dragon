import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { Button, Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle, Input, Label } from '@snapvid/ui'
import { api } from '@/lib/api'
import { useCancelSubscription, useQuota, useSubscription } from '@/features/payment/hooks'

export const Route = createFileRoute('/settings/billing/')({
	component: BillingSettingsPage,
})

function BillingSettingsPage(): React.JSX.Element {
	const { data: subscription, isLoading } = useSubscription()
	const { data: quota } = useQuota()
	const cancelSubscription = useCancelSubscription()
	const [refundReason, setRefundReason] = useState('단순 변심')
	const [refundMessage, setRefundMessage] = useState('')

	if (isLoading || !subscription) {
		return (
			<div className="min-h-screen p-6">
				<p className="text-sm text-muted-foreground">구독 정보를 불러오는 중...</p>
			</div>
		)
	}

	const nextPaymentDate = new Date(subscription.currentPeriodEnd).toLocaleDateString('ko-KR')

	return (
		<div className="mx-auto max-w-3xl space-y-6 px-4 py-8">
			<h1 className="text-3xl font-semibold">구독 관리</h1>

			<Card>
				<CardHeader>
					<CardTitle>현재 플랜</CardTitle>
					<CardDescription>다음 결제일과 상태를 확인할 수 있습니다.</CardDescription>
				</CardHeader>
				<CardContent className="grid gap-2 text-sm">
					<p>플랜: {subscription.plan?.name ?? subscription.planId}</p>
					<p>상태: {subscription.status}</p>
					<p>다음 결제일: {nextPaymentDate}</p>
					<p>
						크레딧: {quota?.creditsRemaining ?? subscription.remainingCredits}/
						{quota?.creditsTotal ?? subscription.baseQuota}
					</p>
				</CardContent>
				<CardFooter>
					<Button
						variant="destructive"
						disabled={cancelSubscription.isPending}
						onClick={() => cancelSubscription.mutate('사용자 요청')}
					>
						구독 취소
					</Button>
				</CardFooter>
			</Card>

			<Card>
				<CardHeader>
					<CardTitle>7일 환불</CardTitle>
					<CardDescription>구독 시작 7일 내 환불을 요청할 수 있습니다.</CardDescription>
				</CardHeader>
				<CardContent className="space-y-3">
					<div className="space-y-2">
						<Label htmlFor="refundReason">환불 사유</Label>
						<Input
							id="refundReason"
							value={refundReason}
							onChange={(e) => setRefundReason(e.target.value)}
						/>
					</div>
					{refundMessage && <p className="text-sm text-muted-foreground">{refundMessage}</p>}
				</CardContent>
				<CardFooter>
					<Button
						variant="outline"
						onClick={async () => {
							try {
								await api.refund({
									subscriptionId: subscription.id,
									reason: refundReason,
								})
								setRefundMessage('환불 요청이 접수되었습니다.')
							} catch (error) {
								setRefundMessage(
									error instanceof Error ? error.message : '환불 요청에 실패했습니다.',
								)
							}
						}}
					>
						환불 요청
					</Button>
				</CardFooter>
			</Card>
		</div>
	)
}
