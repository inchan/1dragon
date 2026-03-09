# Agentic AI PR 체크리스트

## 목적
`agentic-ai-systems` 통합 변경이 PR 단계에서 빠짐없이 검토되도록 한다.

## 작성 규칙
- PR 설명에 적용한 workflow 변화와 검증 결과를 함께 적는다
- 체크되지 않은 항목이 있으면 이유를 적는다

## 1. 변경 범위
- [ ] 어떤 workflow 가 바뀌었는지 설명했다 (`BASELINE`, `PROMPT_CHAIN`, `ORCHESTRATOR_WORKERS`)
- [ ] 어떤 입력 조건이 라우팅에 영향을 주는지 설명했다
- [ ] API 계약 변경 여부를 명시했다 (`agenticMode`, `agenticPlan`, `skipWearableComposite`)
- [ ] 웹 표시 전략과 서버 실제 전략이 같은지 설명했다

## 2. 필수 검증
- [ ] `COREPACK_HOME=/tmp/corepack corepack pnpm --filter @1dragon/shared test`
- [ ] `COREPACK_HOME=/tmp/corepack corepack pnpm --filter @1dragon/shared typecheck`
- [ ] `COREPACK_HOME=/tmp/corepack corepack pnpm --filter @1dragon/api typecheck`
- [ ] `COREPACK_HOME=/tmp/corepack corepack pnpm --filter @1dragon/web typecheck`
- [ ] `COREPACK_HOME=/tmp/corepack corepack pnpm --filter @1dragon/api test`

## 3. Agentic 케이스 검증
- [ ] baseline 케이스 확인
- [ ] prompt-chain 케이스 확인
- [ ] orchestrator 케이스 확인
- [ ] wearable composite 케이스 확인
- [ ] manual override 케이스 확인

권장 명령:

```bash
COREPACK_HOME=/tmp/corepack corepack pnpm --filter @1dragon/api run validate:agentic:smoke -- --cookie "$SESSION_COOKIE"
```

## 4. 수동 확인
- [ ] 스타일 단계에서 Agentic 전략 카드가 올바르게 보인다
- [ ] persona/composite 조건에서 `skipWearableComposite` 동작이 맞다
- [ ] 분석 결과의 `keywords`, `moods` 가 생성 요청에 반영된다
- [ ] duplicate 요청 시 `isDuplicate=true` 와 동일 `agenticPlan` 을 확인했다

## 5. 회귀 위험
- [ ] 기존 생성 성공 경로를 깨지 않았다
- [ ] 재시도/실패/DLQ 경로를 깨지 않았다
- [ ] SSE 이벤트 메타데이터에 agentic 정보가 남는다
- [ ] provider worker 동작과 quality gate 회귀가 없다

## 6. 첨부 권장
- [ ] smoke test 로그
- [ ] 대표 케이스 1~2개 API 응답 예시
- [ ] 필요한 경우 스타일 단계 스크린샷
