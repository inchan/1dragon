# 1Dragon 사용자 플로우

> **작성일:** 2026-02-09
> **기반 문서:** TECH_RESEARCH.md, USER_RESEARCH.md, VISION.md, BUSINESS_MODEL.md, GTM_STRATEGY.md, MVP_SCOPE.md, FEATURE_SPEC.md
> **문서 상태:** 프로덕트 사용자 플로우 초안

---

## 문서 구조

본 사용자 플로우 문서는 가독성과 유지보수를 위해 3개의 하위 문서로 분할되었습니다.

---

### 1. 온보딩 + 영상 생성 플로우

> 전체 서비스 플로우 개요(Mermaid 다이어그램), 사용자 여정 단계별 매핑(AARRR), B2C/B2B 온보딩 플로우(화면 상태, 에지케이스 포함), Quick Mode(Level 0)/Standard Mode(Level 1~2)/Pro Mode(Level 3~4) 영상 생성 플로우를 정의합니다.

[상세 보기](user-flows/01-onboarding-generation.md)

---

### 2. 편집 + 내보내기 + 결제 플로우

> MVP 편집 플로우(전체 재생성 vs 빠른 재렌더링), 멀티플랫폼 내보내기(세이프 존 스펙 포함), SNS 직접 공유 플로우, Free->Paid 전환(크레딧 소진 시 72시간 리밋 오퍼), 크레딧 갱신, 구독 관리/취소/환불 플로우를 정의합니다.

[상세 보기](user-flows/02-edit-export-payment.md)

---

### 3. 에러/예외 + 배치 처리 플로우

> 이미지 품질 문제 6가지 케이스 처리, 영상 생성 실패 시 7개 서비스 폴백 체인, API 타임아웃/Rate Limit 처리, 결제 실패 6가지 케이스, Phase 3 배치 처리(대량 영상 일괄 생성, 우선순위/제한, 에러 처리), 화면 상태 매트릭스(7개 상태 x 9개 화면)를 정의합니다.

[상세 보기](user-flows/03-error-batch.md)

---

## Sources

| 참조 문서 | 경로 | 주요 인용 |
|----------|------|----------|
| 기술 조사 보고서 | `/docs/01-research/TECH_RESEARCH.md` | 폴백 체인, API 비용, 생성 시간 SLA |
| 사용자 조사 보고서 | `/docs/01-research/USER_RESEARCH.md` | 페르소나 여정 맵, 커스터마이징 레벨, 플랫폼 세이프 존, 이탈 위험 지점 |
| 비전 & 전략 | `/docs/02-strategy/VISION.md` | Time-to-Value 원칙, Progressive Disclosure, Product Fidelity First |
| 비즈니스 모델 | `/docs/02-strategy/BUSINESS_MODEL.md` | 가격 티어, 크레딧 시스템, 워터마크 인센티브, 환불 정책 |
| GTM 전략 | `/docs/02-strategy/GTM_STRATEGY.md` | 바이럴 루프, PLG 전략, 전환 유도 타이밍, AARRR KPI |
| MVP 범위 정의 | `/docs/03-product/MVP_SCOPE.md` | MVP 포함/제외 기능, 기술 아키텍처, 오케스트레이션 파이프라인 |
| 기능 명세서 | `/docs/03-product/FEATURE_SPEC.md` | F001~F015 기능 스펙, 비즈니스 규칙, 에지케이스, 의존성 맵 |

---

**문서 작성일**: 2026-02-09
**다음 업데이트**: UI 와이어프레임 연동 후 화면별 상세 인터랙션 추가, Playwright E2E 시나리오 작성

---

> **역할 정의**
> 본 문서 작성에 다음 역할이 수행되었습니다:
> - **UX 디자이너**: 사용자 플로우 설계, 온보딩 트랙 분리, 화면 상태 정의, Progressive Disclosure 적용
> - **프로덕트 매니저**: 전환 유도 전략, 크레딧 소진 시나리오, 리텐션 오퍼 설계
> - **시스템 분석가**: 에러/예외 플로우, 폴백 체인 설계, API 타임아웃 처리, 배치 에러 핸들링
> - **테크니컬 라이터**: Mermaid 다이어그램 작성, 구조화된 문서화, 에지케이스 체계화
