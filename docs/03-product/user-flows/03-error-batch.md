> [<- 허브로 돌아가기](../USER_FLOWS.md)

# 1Dragon 사용자 플로우 -- 에러/예외 + 배치 처리

> **원본 문서:** USER_FLOWS.md (2026-02-09)
> **범위:** 섹션 7 (에러 & 예외 플로우) + 섹션 8 (배치 처리 플로우) + 부록 (화면 상태 매트릭스)

---

## 7. 에러 & 예외 플로우

### 7.1 이미지 품질 문제

```mermaid
flowchart TD
    IMG_UPLOAD([이미지 업로드]) --> IMG_VALIDATE{이미지 검증}

    IMG_VALIDATE -- 해상도 < 720px --> LOW_RES["저해상도 감지"]
    IMG_VALIDATE -- 포맷 미지원 --> BAD_FORMAT["미지원 포맷"]
    IMG_VALIDATE -- 크기 > 20MB --> TOO_LARGE["파일 크기 초과"]
    IMG_VALIDATE -- 비상품 이미지 --> NOT_PRODUCT["상품 이미지 아님"]
    IMG_VALIDATE -- 다중 상품 --> MULTI_PRODUCT["여러 상품 감지"]
    IMG_VALIDATE -- 정상 --> PROCEED[분석 진행]

    LOW_RES --> UPSCALE["Real-ESRGAN 자동 업스케일"]
    UPSCALE --> UPSCALE_RESULT{업스케일 성공?}
    UPSCALE_RESULT -- 성공 --> UPSCALE_NOTICE["'이미지를 고화질로 변환했어요'<br/>+ 원본보다 좋은 결과 안내"]
    UPSCALE_RESULT -- 실패<br/>(너무 저해상도) --> REUPLOAD_GUIDE["'더 선명한 사진으로<br/>더 좋은 영상을 만들 수 있어요'<br/>권장: 720x720px 이상"]
    UPSCALE_NOTICE --> PROCEED
    REUPLOAD_GUIDE --> REUPLOAD_OR_CONTINUE{진행?}
    REUPLOAD_OR_CONTINUE -- 다른 사진 --> IMG_UPLOAD
    REUPLOAD_OR_CONTINUE -- 이대로 진행 --> PROCEED

    BAD_FORMAT --> FORMAT_MSG["'JPEG 또는 PNG 형식으로<br/>변환해주세요'<br/>지원 포맷: JPEG, PNG, WebP"]
    FORMAT_MSG --> IMG_UPLOAD

    TOO_LARGE --> COMPRESS_OFFER{자동 압축?}
    COMPRESS_OFFER -- 자동 압축 --> AUTO_COMPRESS["클라이언트 사이드 리사이징<br/>품질 유지하며 20MB 이내로"]
    COMPRESS_OFFER -- 직접 조정 --> IMG_UPLOAD
    AUTO_COMPRESS --> PROCEED

    NOT_PRODUCT --> PRODUCT_GUIDE["'상품이 잘 보이는 사진을 올려주세요'<br/>예시 이미지 3개 표시<br/>+ '그래도 진행하기' 옵션"]
    PRODUCT_GUIDE --> CONTINUE_ANYWAY{그래도 진행?}
    CONTINUE_ANYWAY -- 예 --> PROCEED
    CONTINUE_ANYWAY -- 다른 사진 --> IMG_UPLOAD

    MULTI_PRODUCT --> MULTI_MSG["'상품이 여러 개 감지됐어요'<br/>'하나의 상품만 포함된 사진을 추천합니다'<br/>+ 메인 상품 자동 감지 표시"]
    MULTI_MSG --> MULTI_CHOICE{선택}
    MULTI_CHOICE -- 그대로 진행<br/>(메인 상품 기준) --> PROCEED
    MULTI_CHOICE -- 다른 사진 --> IMG_UPLOAD

    style LOW_RES fill:#d97706,color:#fff
    style BAD_FORMAT fill:#dc2626,color:#fff
    style TOO_LARGE fill:#d97706,color:#fff
    style NOT_PRODUCT fill:#d97706,color:#fff
    style PROCEED fill:#059669,color:#fff
```

### 7.2 영상 생성 실패

```mermaid
flowchart TD
    GEN_START([영상 생성 시작]) --> GEN_PROGRESS["생성 중...<br/>프로그레스 바"]

    GEN_PROGRESS --> GEN_ERROR{에러 발생 지점}

    GEN_ERROR -- Claude Vision 실패 --> CV_FALLBACK["GPT-4o Vision 폴백"]
    CV_FALLBACK --> CV_RESULT{폴백 성공?}
    CV_RESULT -- 성공 --> CONTINUE_GEN[생성 계속]
    CV_RESULT -- 실패 --> MANUAL_INPUT["수동 입력 요청<br/>'카테고리와 분위기를<br/>직접 선택해주세요'"]
    MANUAL_INPUT --> CONTINUE_GEN

    GEN_ERROR -- Remove.bg 실패 --> RBG_FALLBACK["원본 이미지로 진행<br/>(배경 제거 스킵)"]
    RBG_FALLBACK --> CONTINUE_GEN

    GEN_ERROR -- Runway 실패 --> I2V_FALLBACK["Hailuo 02 폴백"]
    I2V_FALLBACK --> I2V_RESULT{폴백 성공?}
    I2V_RESULT -- 성공 --> CONTINUE_GEN
    I2V_RESULT -- Hailuo 실패 --> KLING_FALLBACK["Kling 2.6 폴백"]
    KLING_FALLBACK --> KLING_RESULT{폴백 성공?}
    KLING_RESULT -- 성공 --> CONTINUE_GEN
    KLING_RESULT -- 전체 실패 --> ALL_FAIL["모든 모델 실패"]

    GEN_ERROR -- GPT-4o 실패 --> GPT_FALLBACK["Claude Haiku 폴백"]
    GPT_FALLBACK --> CONTINUE_GEN

    GEN_ERROR -- Typecast 실패 --> TTS_FALLBACK["내레이션 없이 진행<br/>자막만 포함"]
    TTS_FALLBACK --> CONTINUE_GEN

    GEN_ERROR -- Udio 실패 --> BGM_FALLBACK["로열티 프리 라이브러리<br/>기본 BGM 적용"]
    BGM_FALLBACK --> CONTINUE_GEN

    GEN_ERROR -- 타임아웃<br/>(120초 초과) --> TIMEOUT_RETRY["자동 재시도 1회<br/>+ 폴백 모델 전환"]
    TIMEOUT_RETRY --> TIMEOUT_RESULT{재시도 성공?}
    TIMEOUT_RESULT -- 성공 --> CONTINUE_GEN
    TIMEOUT_RESULT -- 실패 --> ALL_FAIL

    ALL_FAIL --> FAIL_NOTICE["'현재 서버가 바쁩니다'<br/>'완료되면 알려드릴게요'"]
    FAIL_NOTICE --> FAIL_OPTIONS{선택}
    FAIL_OPTIONS -- 이메일 알림 등록 --> QUEUE_NOTIFY["큐에 등록<br/>완료 시 이메일/푸시 알림"]
    FAIL_OPTIONS -- 나중에 다시 시도 --> DASHBOARD_RETURN[대시보드 복귀]

    CONTINUE_GEN --> GEN_COMPLETE[영상 생성 완료]

    style ALL_FAIL fill:#dc2626,color:#fff
    style CONTINUE_GEN fill:#059669,color:#fff
    style GEN_COMPLETE fill:#059669,color:#fff
```

**폴백 체인 요약:**

| 서비스 | 메인 | 폴백 1 | 폴백 2 | 최종 처리 |
|--------|------|--------|--------|----------|
| 이미지 분석 | Claude Vision | GPT-4o Vision | Gemini Vision | 수동 카테고리 입력 |
| 배경 제거 | Remove.bg | SAM 2 (자체) | - | 원본 이미지로 진행 |
| Image-to-Video | Runway Gen-4 Turbo | Hailuo 02 | Kling 2.6 | 대기열 + 알림 |
| 카피라이팅 | GPT-4o | Claude Haiku | - | 기본 템플릿 카피 |
| TTS | Typecast | ElevenLabs | Google Cloud TTS | 내레이션 없이 진행 |
| BGM | Udio | Stable Audio | - | 로열티 프리 라이브러리 |
| 자막 | Deepgram | Whisper (자체) | - | 카피 텍스트 기반 자막 |

### 7.3 API 타임아웃 & Rate Limit

```mermaid
flowchart TD
    API_CALL([API 호출]) --> API_TIMEOUT{응답 시간?}

    API_TIMEOUT -- 정상<br/>(< 30초) --> API_SUCCESS[정상 처리]
    API_TIMEOUT -- 지연<br/>(30~60초) --> SHOW_DELAY["'조금 더 시간이 걸리고 있어요...'<br/>인게이지먼트 UI 표시"]
    API_TIMEOUT -- 타임아웃<br/>(> 120초) --> TIMEOUT_HANDLE[타임아웃 처리]

    SHOW_DELAY --> DELAY_RESULT{결과}
    DELAY_RESULT -- 성공 --> API_SUCCESS
    DELAY_RESULT -- 실패 --> TIMEOUT_HANDLE

    TIMEOUT_HANDLE --> AUTO_RETRY["자동 재시도 (최대 3회)"]
    AUTO_RETRY --> RETRY_RESULT{재시도 결과}
    RETRY_RESULT -- 성공 --> API_SUCCESS
    RETRY_RESULT -- 실패 --> FALLBACK_MODEL[폴백 모델 전환]

    API_CALL --> RATE_LIMIT{Rate Limit?}
    RATE_LIMIT -- 초과 --> QUEUE_WAIT["작업 큐 대기<br/>'잠시 대기 중입니다...'"]
    QUEUE_WAIT --> QUEUE_POSITION["대기 순서 표시<br/>'앞에 N명이 대기 중'"]
    QUEUE_POSITION --> QUEUE_DONE{순서 도달}
    QUEUE_DONE -- 처리 --> API_SUCCESS
    QUEUE_DONE -- 타임아웃 --> TIMEOUT_HANDLE

    style API_SUCCESS fill:#059669,color:#fff
    style TIMEOUT_HANDLE fill:#dc2626,color:#fff
    style QUEUE_WAIT fill:#d97706,color:#fff
```

### 7.4 결제 실패

```mermaid
flowchart TD
    PAY_ATTEMPT([결제 시도]) --> PAY_CHECK{결제 결과}

    PAY_CHECK -- 성공 --> PAY_OK[결제 완료]
    PAY_CHECK -- 카드 한도 초과 --> CARD_LIMIT["'카드 한도를 초과했습니다'<br/>다른 결제 수단 안내"]
    PAY_CHECK -- 카드 만료 --> CARD_EXPIRED["'카드가 만료되었습니다'<br/>카드 정보 업데이트 안내"]
    PAY_CHECK -- 네트워크 오류 --> NETWORK_ERR["'결제 처리 중 오류가 발생했습니다'<br/>자동 재시도"]
    PAY_CHECK -- 이중 결제 감지 --> DOUBLE_PAY["이중 결제 자동 감지<br/>중복분 즉시 환불 처리"]
    PAY_CHECK -- 결제 중 세션 종료 --> SESSION_END["결제 상태 확인<br/>미완료 시 복구 안내 이메일"]

    CARD_LIMIT --> ALT_PAY[다른 결제 수단]
    CARD_EXPIRED --> UPDATE_CARD[카드 정보 업데이트]
    NETWORK_ERR --> AUTO_RETRY_PAY["자동 재시도 (3회)"]

    AUTO_RETRY_PAY --> RETRY_PAY_RESULT{결과}
    RETRY_PAY_RESULT -- 성공 --> PAY_OK
    RETRY_PAY_RESULT -- 실패 --> ALT_PAY

    ALT_PAY --> PAY_ATTEMPT
    UPDATE_CARD --> PAY_ATTEMPT

    DOUBLE_PAY --> REFUND_NOTICE["'중복 결제가 감지되어<br/>₩N을 환불 처리했습니다'"]

    SESSION_END --> RECOVERY_EMAIL["복구 이메일 발송<br/>'결제를 완료하시겠습니까?'"]

    style PAY_OK fill:#059669,color:#fff
    style CARD_LIMIT fill:#dc2626,color:#fff
    style CARD_EXPIRED fill:#dc2626,color:#fff
    style DOUBLE_PAY fill:#d97706,color:#fff
```

---

## 8. 배치 처리 플로우 (Phase 3)

> **Note**: 배치 처리는 MVP에 포함되지 않으며, Phase 3에서 에이전시/대기업 대상으로 구현된다. 아래는 미래 구현 참조용 플로우이다.

### 8.1 대량 영상 일괄 생성

```mermaid
flowchart TD
    BATCH_START([배치 처리 시작]) --> BATCH_INPUT{입력 방식}

    BATCH_INPUT -- 이미지 폴더/ZIP --> FOLDER_UPLOAD["폴더/ZIP 업로드<br/>(최대 500장)"]
    BATCH_INPUT -- CSV + 이미지 --> CSV_UPLOAD["CSV 메타데이터 업로드<br/>+ 이미지 폴더"]
    BATCH_INPUT -- API 연동 --> API_TRIGGER["상품 카탈로그 API에서<br/>자동 이미지 수집"]

    FOLDER_UPLOAD --> BATCH_VALIDATE["일괄 검증<br/>- 이미지 포맷 확인<br/>- 해상도 확인<br/>- 중복 감지"]
    CSV_UPLOAD --> BATCH_VALIDATE
    API_TRIGGER --> BATCH_VALIDATE

    BATCH_VALIDATE --> VALIDATE_RESULT["검증 결과 요약<br/>✓ 정상: 480장<br/>⚠ 저해상도: 15장 (자동 업스케일)<br/>✗ 미지원: 5장 (제외)"]

    VALIDATE_RESULT --> BATCH_SETTINGS["배치 설정"]
    subgraph BATCH_CONFIG["공통 설정"]
        BC_STYLE["공통 스타일 선택"]
        BC_BRAND["브랜드 킷 적용"]
        BC_PLATFORM["출력 플랫폼"]
        BC_LENGTH["영상 길이"]
    end

    BATCH_SETTINGS --> BATCH_CONFIRM["배치 작업 확인<br/>'480개 영상을 생성합니다'<br/>예상 소요 시간: 약 4시간<br/>예상 크레딧 소모: 480건"]

    BATCH_CONFIRM --> BATCH_EXECUTE["배치 실행"]

    subgraph BATCH_PROCESSING["배치 처리 중"]
        BP_QUEUE["작업 큐 관리<br/>동시 처리: 10건"]
        BP_PROGRESS["실시간 진행률<br/>N/480건 완료"]
        BP_INDIVIDUAL["개별 영상 QC<br/>품질 점수 자동 산정"]
        BP_FAIL_HANDLE["실패 건 자동 재시도<br/>(최대 2회)"]
    end

    BATCH_EXECUTE --> BATCH_PROCESSING
    BATCH_PROCESSING --> BATCH_COMPLETE["배치 완료<br/>✓ 성공: 475건<br/>⚠ 품질 재검토 필요: 3건<br/>✗ 실패: 2건"]

    BATCH_COMPLETE --> BATCH_REVIEW["일괄 검토 화면"]
    subgraph BATCH_REVIEW_DETAIL["검토"]
        BR_APPROVE["전체 승인"]
        BR_INDIVIDUAL["개별 영상 프리뷰<br/>+ 재생성/수정"]
        BR_FILTER["필터: 성공/재검토/실패"]
    end

    BATCH_REVIEW --> BATCH_EXPORT["일괄 내보내기<br/>ZIP 다운로드 또는<br/>플랫폼별 자동 업로드"]

    style BATCH_EXECUTE fill:#2563eb,color:#fff
    style BATCH_COMPLETE fill:#059669,color:#fff
```

**배치 우선순위 & 제한:**

| 플랜 | 최대 배치 수 | 동시 처리 | 우선순위 | 야간 할인 (02~06시) |
|------|:-----------:|:--------:|:--------:|:-----------------:|
| Pro | 50장 | 5건 | 보통 | 20% 크레딧 할인 |
| Business | 200장 | 10건 | 높음 | 20% 크레딧 할인 |
| Enterprise | 무제한 | 20건 | 최우선 | 커스텀 |

**배치 에러 처리:**

| 에러 유형 | 처리 | 사용자 알림 |
|----------|------|-----------|
| 개별 이미지 분석 실패 | 건너뛰기 + 실패 목록에 추가 | 배치 완료 리포트에 표시 |
| I2V 생성 실패 (개별) | 자동 재시도 2회 -> 폴백 모델 -> 실패 처리 | 재시도 후에도 실패한 건만 알림 |
| Rate Limit 초과 | 큐 대기 + 처리 속도 자동 조절 | "예상 시간이 늘어났습니다" |
| 전체 API 장애 | 배치 일시 정지 + 복구 후 자동 재개 | "일시적으로 중단됩니다. 복구 시 자동 재개됩니다" |
| 크레딧 부족 (도중) | 현재까지 완료분 저장 + 잔여 건 대기 | "크레딧이 부족합니다. 추가 구매 후 나머지를 처리합니다" |

---

## 부록: 플로우별 화면 상태 매트릭스

### 전체 화면 상태 정의

| 상태 | 설명 | UI 표현 |
|------|------|--------|
| **로딩 (Loading)** | 데이터 또는 리소스를 불러오는 중 | 스켈레톤 UI + 스피너 |
| **빈 상태 (Empty)** | 표시할 데이터가 없음 | 일러스트 + 행동 유도 CTA |
| **에러 (Error)** | 처리 실패 | 에러 메시지 + 원인 설명 + 해결 액션 |
| **권한 없음 (Forbidden)** | 접근 권한이 없는 기능 | 플랜 업그레이드 유도 |
| **성공 (Success)** | 처리 완료 | 성공 메시지 + 다음 행동 유도 |
| **생성 중 (Generating)** | AI 영상 생성 진행 중 | 프로그레스 바 + 단계 표시 + 인게이지먼트 |
| **크레딧 소진 (Exhausted)** | 월간 크레딧 사용 완료 | 구독/크레딧 구매 유도 |

### 주요 화면별 상태 조합

| 화면 | 로딩 | 빈 상태 | 에러 | 권한 없음 | 성공 |
|------|:----:|:------:|:----:|:--------:|:----:|
| 대시보드 | 스켈레톤 | "첫 영상을 만들어보세요!" | 데이터 로드 실패 + 재시도 | - | - |
| 이미지 업로드 | 업로드 프로그레스 | 드래그앤드롭 영역 | 파일 검증 실패 메시지 | - | 분석 완료 |
| 스타일 선택 | 미리보기 로딩 | - | 스타일 로드 실패 | - | 스타일 선택됨 |
| 영상 생성 | 프로그레스 바 + 단계별 | - | 생성 실패 + 재시도/폴백 | 크레딧 소진 | 프리뷰 준비됨 |
| 프리뷰 | 영상 버퍼링 | - | 영상 로드 실패 | - | 재생 가능 |
| 내보내기 | 인코딩 프로그레스 | - | 인코딩 실패 | Free 제한 (1개 플랫폼) | 다운로드 준비 |
| 생성 히스토리 | 스켈레톤 | "아직 만든 영상이 없어요" | 목록 로드 실패 | - | 영상 목록 표시 |
| 결제 | 결제 처리 중 | - | 결제 실패 + 대안 | - | 결제 완료 |
| 구독 관리 | - | Free 플랜 상태 | 구독 정보 로드 실패 | - | 현재 구독 표시 |

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
