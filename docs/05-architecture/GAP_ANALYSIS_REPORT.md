# Gap Analysis Report: Requirements vs Architecture

> **작성일:** 2026-02-11
> **작성자:** Product Owner & System Analyst
> **대상:** Initial Design (v1) vs PRD/Feature Spec/Decision Tree

본 문서는 기획된 요구사항(PRD, Feature Spec)과 초기 아키텍처 설계(Initial Design) 간의 정합성을 분석하여, 구현 단계(Week 3 Milestone) 진입 전 해결해야 할 갭(Gap)을 식별합니다.

---

## 1. 개요 (Executive Summary)

초기 설계(`INITIAL_DESIGN.md`)는 **핵심 생성 파이프라인(Hybrid Engine)**과 **안정성(Fallback, Quota)** 확보에 집중되어 있어 Week 3 마일스톤 달성에는 적합합니다. 그러나 **MVP 필수 기능 중 "비즈니스 로직(멀티플랫폼, SNS 공유, 상세 구독 정책)"** 영역에서 일부 설계 공백이 발견되었습니다. 특히 `Feature Spec`에 명시된 "플랫폼별 변형 생성"과 "사용자 알림" 부분이 아키텍처에 명시적으로 반영되지 않았습니다.

---

## 2. Critical Gaps (Must Fix)

MVP 출시 및 Week 3 E2E 테스트 통과를 위해 반드시 보완해야 할 설계 요소입니다.

### 2.1. 멀티플랫폼 출력 아키텍처 미반영 (F009)
- **요구사항:** `F009` 및 `US-4.1`에 따라 1회 생성 시 **3개 플랫폼(TikTok, Shorts, Reels) 규격에 맞는 변형(Variant) 영상을 동시 출력**해야 함 (Starter 플랜 이상).
- **현재 설계:**
  - `generate_video` 함수의 반환값이 단일 `VideoResult` 또는 `video.url`로 표현됨.
  - `ComposerPort`가 단일 `VideoAsset`만 반환하는 구조로 보임.
- **Risk:** 확장성을 고려하지 않고 단일 파일 생성으로 구현할 경우, 추후 플랫폼별 최적화(세이프 존, 길이 등) 지원 시 구조 변경 비용 발생.
- **Action:** `VideoResult`가 `dict[Platform, VideoAsset]` 형태의 다중 결과물을 포함하도록 도메인 엔티티 수정 및 FFmpeg 파이프라인의 병렬 처리(또는 순차 변환) 로직 추가 필요.

### 2.2. 알림 및 비동기 결과 전달 시스템 부재 (F003, US-2.1)
- **요구사항:** 영상 생성은 60~90초가 소요되는 비동기 작업이므로, 완료 시 **사용자에게 알림(푸시/이메일/인앱)**을 제공해야 함. 특히 `Feature Spec`의 에지케이스(Rate Limit 초과 시 대기 후 알림) 처리를 위해 필수.
- **현재 설계:** `Celery` 큐는 존재하나, 작업 완료 후 사용자에게 결과를 전달하는 **Notification Service** 또는 **WebSocket/SSE** 구조가 명시되지 않음. 단순히 폴링(Polling)만으로는 UX 품질 저하 우려.
- **Action:** `NotificationPort` 추가 및 클라이언트 통신 방식(Polling vs SSE) 명확화.

### 2.3. 상세 결제/구독 생명주기 설계 부족 (F012, US-5.2)
- **요구사항:** 워터마크 포함 시 무료 건수 추가(인센티브), 연간 결제 할인, 크레딧 이월 불가 등 복잡한 비즈니스 규칙 존재.
- **현재 설계:** `QuotaService`와 `BudgetTicket`으로 "사용량 제한"과 "비용 통제"는 잘 설계되었으나, **Subscription Lifecycle(갱신, 만료, 업그레이드, 환불)**과 **PG사 연동(Webhook 처리)** 설계가 추상적임.
- **Risk:** 결제 실패, 이중 결제 등 금전적 사고 위험.
- **Action:** `Payment` 도메인 내 `SubscriptionManager` 서비스 상세화 및 PG사 Webhook 핸들러 설계 추가.

---

## 3. Minor Discrepancies (Should Fix)

구현 과정에서 수정 가능하지만, 사전에 정의하면 혼선을 줄일 수 있는 항목들입니다.

### 3.1. 워터마크 인센티브 및 정책 로직 위치 모호
- **내용:** `PRD`의 "워터마크 포함 시 월 5건 추가 무료"와 같은 정책은 단순 Quota 시스템(`Token Bucket`)만으로는 구현하기 어려움.
- **제안:** `QuotaService` 상위에 `PromotionPolicy` 또는 `IncentiveService`를 두어 동적 할당량 관리가 가능하도록 설계 보완.

### 3.2. 구체적인 미디어 처리 벤더 연동 설계 미흡 (F005, F006, F007)
- **내용:** 설계 문서에는 `I2V`와 `Remove.bg`만 구체화되어 있고, BGM(Udio), TTS(Typecast), STT(Deepgram)는 `FFmpeg` 단계에 뭉뚱그려져 있음.
- **제안:** 각 미디어 요소(Audio, Subtitle) 생성을 위한 별도의 `Provider` 인터페이스(`TTSPort`, `BGMPort`, `SubtitlePort`)를 정의하여 `Hybrid Engine`의 모듈성을 강화해야 함.

### 3.3. SNS 직접 공유 기능 설계 제외 (F010)
- **내용:** `Initial Design` 범위에서 제외됨. MVP 우선순위 P1이므로 Week 3 이후라도 아키텍처 고려 필요(OAuth 토큰 관리 등).
- **제안:** `infrastructure/external/sns` 모듈 공간 확보 및 `SocialAuth` 엔티티(토큰 저장용) 설계 추가.

---

## 4. Suggestions for Alignment

장기적 관점(Phase 2~) 및 운영 효율을 위한 제언입니다.

### 4.1. 편집 기능을 대비한 데이터 구조 설계 (Phase 2)
- **현황:** 현재는 렌더링 된 `MP4`만 저장하는 구조.
- **제안:** `Phase 2`의 라이트 에디터 지원을 위해, 생성에 사용된 모든 자산(이미지, BGM, 카피, 타임라인 정보)을 포함하는 **프로젝트 파일(JSON 등)** 형태의 메타데이터 저장 구조를 미리 채택할 것. (`VideoProject` Aggregate 정의)

### 4.2. 내부 운영(Admin) 도구 고려
- **현황:** 설계에 포함되지 않음.
- **제안:** 생성 오류 확인, 수동 환불, 악성 유저 차단 등을 위한 Admin API 엔드포인트 및 `SuperUser` 권한 로직을 초기부터 `FastAPI` 라우터에 포함시키는 것을 권장.

### 4.3. Roadmap 구체화 (Week 4~6)
- **현황:** Week 3까지의 로드맵만 상세함.
- **제안:** `Decision Tree`의 Week 6(MVP 완성)까지 남은 3주 동안 `Critical Gaps`에서 언급된 멀티플랫폼, 결제 연동, UI 고도화를 어떻게 배치할지 추가 계획 수립 필요.

---

## 5. 결론

Initial Design은 핵심 엔진 구현에 대해 매우 견고하게 설계되었으나, **"제품(Product)"으로서의 기능(다양한 출력, 알림, 정교한 과금)** 연결 고리가 일부 누락되었습니다.

**승인 조건:**
위 **2. Critical Gaps** 항목에 대한 보완 설계를 `INITIAL_DESIGN_v1.1`에 반영하거나, 별도의 `Tech Spec`으로 구체화한 후 구현에 착수하는 것을 승인합니다.
