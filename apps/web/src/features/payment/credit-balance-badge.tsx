import { useQuota } from './hooks'

export function CreditBalanceBadge(): React.JSX.Element {
	const { data } = useQuota()

	if (!data) {
		return <span className="text-xs text-muted-foreground">크레딧 불러오는 중...</span>
	}

	const lowCredit = data.creditsRemaining <= 1
	return (
		<div className="flex items-center gap-2">
			<span className="text-sm font-medium">
				이번 달 {data.used}/{data.quota}건 사용
			</span>
			{lowCredit && (
				<span className="rounded bg-amber-100 px-2 py-0.5 text-xs text-amber-800">
					크레딧이 {data.creditsRemaining}건 남았습니다
				</span>
			)}
		</div>
	)
}
