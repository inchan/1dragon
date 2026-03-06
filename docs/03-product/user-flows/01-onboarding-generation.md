> [<- 허브로 돌아가기](../USER_FLOWS.md)

# 1Dragon 사용자 플로우 -- 온보딩 + 영상 생성

> **원본 문서:** USER_FLOWS.md (2026-02-09)
> **범위:** 섹션 1 (핵심 플로우 다이어그램) + 섹션 2 (온보딩 플로우) + 섹션 3 (영상 생성 플로우)

---

## 1. 핵심 플로우 다이어그램

### 1.1 전체 서비스 플로우 개요

사용자가 1Dragon에 진입하여 영상을 생성하고 활용하기까지의 전체 플로우를 다음과 같이 정의한다.

```mermaid
flowchart TB
    START([사용자 진입]) --> AUTH{계정 있음?}
    AUTH -- 아니오 --> ONBOARD[온보딩 플로우]
    AUTH -- 예 --> LOGIN[로그인]

    ONBOARD --> FIRST_VIDEO[첫 영상 생성]
    LOGIN --> DASHBOARD[대시보드]

    DASHBOARD --> UPLOAD[이미지 업로드]
    FIRST_VIDEO --> UPLOAD

    UPLOAD --> ANALYZE[AI 이미지 분석<br/>F001]
    ANALYZE --> STYLE[스타일 선택<br/>F002]

    STYLE --> GEN_MODE{생성 모드}
    GEN_MODE -- Level 0 완전 자동 --> AUTO_GEN[자동 영상 생성]
    GEN_MODE -- Level 1 선택형 --> SELECT_GEN[옵션 선택 후 생성]

    AUTO_GEN --> PARALLEL_AI
    SELECT_GEN --> PARALLEL_AI

    subgraph PARALLEL_AI[병렬 AI 처리]
        COPY[카피 생성<br/>F004]
        BGM[BGM 선택<br/>F005]
        TTS_OPT[TTS 내레이션<br/>F006]
        SUB[자막 생성<br/>F007]
    end

    PARALLEL_AI --> VIDEO_GEN[AI 영상 생성<br/>F003]
    VIDEO_GEN --> PREVIEW[프리뷰<br/>F008]

    PREVIEW --> SATISFIED{만족?}
    SATISFIED -- 아니오 --> REGEN{재생성<br/>횟수 <= 5?}
    REGEN -- 예 --> STYLE
    REGEN -- 아니오 --> GUIDE[가이드 안내]
    GUIDE --> UPLOAD

    SATISFIED -- 예 --> EXPORT[내보내기<br/>F009]
    EXPORT --> SHARE_OPTION{공유 방법}
    SHARE_OPTION -- 다운로드 --> DOWNLOAD[MP4 다운로드]
    SHARE_OPTION -- SNS 직접 공유 --> SNS[SNS 업로드<br/>F010]

    DOWNLOAD --> END_FLOW([완료])
    SNS --> END_FLOW

    style UPLOAD fill:#7c3aed,color:#fff
    style VIDEO_GEN fill:#2563eb,color:#fff
    style PREVIEW fill:#059669,color:#fff
    style EXPORT fill:#d97706,color:#fff
```

### 1.2 사용자 여정 단계별 매핑

| 여정 단계 | 플로우 | 관련 기능 | 핵심 지표 |
|----------|--------|----------|----------|
| **Acquisition** | 랜딩 -> 가입 | F011 | 가입 전환율 |
| **Activation** | 온보딩 -> 첫 영상 생성 | F001~F008 | Time-to-Value (60초 이내) |
| **Retention** | 반복 영상 생성 -> 대시보드 | F001~F010 | Week 1 리텐션 25%+ |
| **Revenue** | 무료 크레딧 소진 -> 구독 | F012 | Free->Paid CVR 2%+ |
| **Referral** | 워터마크 영상 공유 -> 바이럴 | F009, F010 | K-factor 0.3+ |

---

## 2. 온보딩 플로우

### 2.1 B2C 온보딩 (1인 셀러 - 최유진 페르소나)

**설계 원칙**: Time-to-Value < 60초. 가입과 동시에 첫 영상 생성을 시작한다. 별도의 튜토리얼은 제공하지 않으며, "첫 영상 만들기" 자체가 온보딩이다.

```mermaid
flowchart TD
    LAND([랜딩 페이지 도착]) --> CTA["'무료로 영상 만들기' 클릭"]
    CTA --> SOCIAL{소셜 로그인 선택}
    SOCIAL -- 카카오 --> KAKAO[카카오 OAuth]
    SOCIAL -- Google --> GOOGLE[Google OAuth]
    SOCIAL -- Apple --> APPLE[Apple OAuth]

    KAKAO --> WELCOME[웰컴 화면<br/>'사진 한 장으로 영상을 만들어보세요']
    GOOGLE --> WELCOME
    APPLE --> WELCOME

    WELCOME --> PHOTO_GUIDE["상품 사진 업로드 유도<br/>'갤러리에서 상품 사진을 선택하세요'"]
    PHOTO_GUIDE --> UPLOAD_FIRST[사진 업로드]
    UPLOAD_FIRST --> PRODUCT_NAME["상품명 입력<br/>(선택사항 - 자동 추출 대체 가능)"]
    PRODUCT_NAME --> AI_MAGIC["AI 분석 + 생성 시작<br/>'AI가 영상을 만들고 있어요...'"]
    AI_MAGIC --> FIRST_RESULT["첫 영상 프리뷰<br/>(Best-foot-forward: Runway Gen-4)"]
    FIRST_RESULT --> REACTION{반응}

    REACTION -- 만족 --> SHARE_PROMPT["'TikTok에 바로 올려볼까요?'"]
    REACTION -- 불만족 --> RETRY["'다른 스타일로 다시 만들기'<br/>(무료 재시도)"]
    RETRY --> FIRST_RESULT

    SHARE_PROMPT --> SHARE_YES["SNS 공유 또는 다운로드"]
    SHARE_PROMPT --> SHARE_LATER["'나중에 할게요'"]

    SHARE_YES --> ONBOARD_DONE["온보딩 완료<br/>'축하해요! 첫 영상이 완성됐어요'<br/>잔여 무료 크레딧: 2건"]
    SHARE_LATER --> ONBOARD_DONE

    ONBOARD_DONE --> DASHBOARD_B2C[대시보드 진입]

    style AI_MAGIC fill:#2563eb,color:#fff
    style FIRST_RESULT fill:#059669,color:#fff
    style ONBOARD_DONE fill:#7c3aed,color:#fff
```

**단계별 화면 상태:**

| 단계 | 화면 | 소요 시간 | 에러 상태 |
|------|------|----------|----------|
| 1. 랜딩 | CTA 버튼 중심, 샘플 영상 자동 재생 | - | - |
| 2. 로그인 | 소셜 로그인 3종 버튼 | 3초 | OAuth 실패 -> 재시도 안내 |
| 3. 웰컴 | 단순 안내 텍스트 + 업로드 버튼 | 2초 | - |
| 4. 사진 업로드 | 갤러리 접근 또는 드래그앤드롭 | 5초 | 미지원 포맷 -> 안내 메시지 |
| 5. 상품명 입력 | 텍스트 필드 (선택) | 5초 | - |
| 6. AI 생성 중 | 프로그레스 바 + 단계별 안내 애니메이션 | 30~60초 | 생성 실패 -> 자동 재시도 |
| 7. 첫 결과 | 영상 프리뷰 + 재생성/공유 버튼 | - | - |

**에지케이스:**

| 케이스 | 처리 |
|--------|------|
| 갤러리 권한 거부 (모바일) | "사진 접근 권한이 필요합니다" + 설정 이동 링크 |
| 상품명 미입력 | Claude Vision 분석 결과에서 상품명 자동 추출 시도 -> 실패 시 "상품명" 기본값 |
| 첫 영상 생성 실패 | "잠시 후 다시 시도해주세요" + 자동 재시도 1회 + 폴백 모델 |
| 네트워크 불안정 | 오프라인 상태 감지 -> "인터넷 연결을 확인해주세요" |
| 소셜 로그인 동일 이메일 충돌 | "이미 가입된 이메일입니다. [카카오/Google]로 로그인해주세요" |

---

### 2.2 B2B 온보딩 (중소 브랜드/에이전시 - 김민수, 이서연 페르소나)

**설계 원칙**: 팀 설정과 브랜드 킷 등록을 온보딩에 포함하되, 첫 영상 생성은 3분 이내에 가능해야 한다. 복잡한 설정은 온보딩 이후로 미룬다.

```mermaid
flowchart TD
    B2B_LAND([B2B 랜딩 또는<br/>세일즈 미팅 후 가입]) --> B2B_SIGNUP["회사 이메일 가입<br/>(Google Workspace SSO 또는 이메일)"]
    B2B_SIGNUP --> COMPANY_INFO["기본 정보 입력<br/>- 회사명 (필수)<br/>- 업종 (선택)<br/>- 월 영상 예상량 (선택)"]
    COMPANY_INFO --> BRAND_SETUP{브랜드 킷 설정?}

    BRAND_SETUP -- 지금 설정 --> BRAND_KIT["브랜드 킷 등록<br/>- 로고 업로드<br/>- 브랜드 컬러 (HEX)<br/>- 폰트 선택"]
    BRAND_SETUP -- 나중에 --> SKIP_BRAND["기본 스타일로 시작"]

    BRAND_KIT --> FIRST_B2B["첫 영상 생성<br/>(B2C 플로우와 동일)"]
    SKIP_BRAND --> FIRST_B2B

    FIRST_B2B --> B2B_RESULT["영상 프리뷰"]
    B2B_RESULT --> TEAM_INVITE{팀원 초대?}

    TEAM_INVITE -- 예 --> INVITE["팀원 이메일 초대<br/>(최대 5명 무료 체험)"]
    TEAM_INVITE -- 나중에 --> B2B_DASHBOARD[대시보드 진입]

    INVITE --> B2B_DASHBOARD

    style BRAND_KIT fill:#7c3aed,color:#fff
    style FIRST_B2B fill:#2563eb,color:#fff
```

**B2B 온보딩 차별점:**

| 항목 | B2C | B2B |
|------|-----|-----|
| 가입 방식 | 소셜 로그인 원클릭 | 회사 이메일 + 기본 정보 |
| 브랜드 설정 | 없음 (MVP) | 선택적 브랜드 킷 (Phase 2) |
| 첫 영상 생성 | 즉시 (30초) | 기본 정보 입력 후 (2~3분) |
| 팀 기능 | 없음 | 팀원 초대 (Phase 2) |
| 온보딩 완료 기준 | 첫 영상 생성 | 첫 영상 생성 + 팀원 1명 초대 |

---

## 3. 영상 생성 플로우

### 3.1 Quick Mode (Level 0 - 완전 자동)

**대상 사용자**: 최유진(1인 셀러), 오성호(도매). 편집 기술이 없거나 극도의 시간 효율을 원하는 사용자.

**핵심 경험**: 사진 업로드 -> 버튼 1번 -> 영상 완성. 중간 선택 과정 없음.

```mermaid
flowchart TD
    QM_START([Quick Mode 시작]) --> QM_UPLOAD["사진 업로드<br/>갤러리 선택 또는 드래그앤드롭"]
    QM_UPLOAD --> QM_NAME["상품명 입력<br/>(또는 자동 추출)"]
    QM_NAME --> QM_BUTTON["'영상 만들기' 버튼 클릭"]

    QM_BUTTON --> QM_PROGRESS["생성 중...<br/>프로그레스 바 표시"]

    subgraph QM_AI["백엔드 자동 처리 (사용자 개입 없음)"]
        direction TB
        QM_ANALYZE["1. Claude Vision 분석<br/>카테고리, 키워드, 분위기 자동 감지"]
        QM_STYLE_AUTO["2. 최적 스타일 자동 선택<br/>카테고리 x 플랫폼 매칭"]
        QM_PARALLEL["3. 병렬 처리"]
        QM_COPY["카피 자동 생성"]
        QM_BGM_AUTO["BGM 자동 매칭"]
        QM_SUB_AUTO["자막 자동 생성"]
        QM_I2V["4. Runway Gen-4 I2V 생성<br/>3클립 x 10초"]
        QM_COMPOSE["5. FFmpeg 최종 합성"]

        QM_ANALYZE --> QM_STYLE_AUTO
        QM_STYLE_AUTO --> QM_PARALLEL
        QM_PARALLEL --> QM_COPY
        QM_PARALLEL --> QM_BGM_AUTO
        QM_PARALLEL --> QM_SUB_AUTO
        QM_COPY --> QM_I2V
        QM_BGM_AUTO --> QM_I2V
        QM_SUB_AUTO --> QM_I2V
        QM_I2V --> QM_COMPOSE
    end

    QM_PROGRESS -.-> QM_AI
    QM_AI --> QM_RESULT["영상 프리뷰<br/>+ 3개 플랫폼 미리보기"]

    QM_RESULT --> QM_ACTION{다음 행동}
    QM_ACTION -- 다운로드 --> QM_DOWNLOAD[MP4 다운로드]
    QM_ACTION -- SNS 공유 --> QM_SNS[원클릭 업로드]
    QM_ACTION -- 다시 만들기 --> QM_REGEN["다른 스타일로 재생성<br/>(최대 5회)"]
    QM_REGEN --> QM_PROGRESS

    style QM_BUTTON fill:#2563eb,color:#fff
    style QM_RESULT fill:#059669,color:#fff
```

**프로그레스 바 단계 표시:**

| 진행률 | 표시 메시지 | 실제 처리 단계 | 예상 시간 |
|:------:|-----------|-------------|:--------:|
| 0~10% | "상품을 분석하고 있어요..." | Claude Vision 이미지 분석 | ~3초 |
| 10~25% | "배경을 정리하고 있어요..." | Remove.bg 배경 제거 | ~3초 |
| 25~40% | "마케팅 카피를 쓰고 있어요..." | GPT-4o 카피 생성 (병렬) | ~5초 |
| 40~75% | "영상을 만들고 있어요..." | Runway Gen-4 I2V 생성 | ~30초 |
| 75~90% | "음악과 자막을 넣고 있어요..." | BGM + TTS + 자막 합성 | ~10초 |
| 90~100% | "거의 다 됐어요!" | FFmpeg 최종 인코딩 | ~5초 |

**인게이지먼트 UI (생성 대기 중):**
- "생성 중에 다른 상품 사진도 올려보세요" (다음 영상 큐잉)
- 카테고리별 성공 사례 슬라이드 ("패션 셀러 A님은 이 스타일로 조회수 1.2만 달성")
- 현재 생성 중인 영상의 스타일 미리보기 썸네일

---

### 3.2 Standard Mode (Level 1~2 - 선택형/라이트 에딧)

**대상 사용자**: 김민수(중소 브랜드), 장하늘(인플루언서). 자동 생성 기반이지만 스타일/카피/BGM을 직접 선택하고 싶은 사용자.

```mermaid
flowchart TD
    SM_START([Standard Mode 시작]) --> SM_UPLOAD["사진 업로드<br/>(최대 5장 - Starter 플랜)"]
    SM_UPLOAD --> SM_NAME["상품명 입력 + 간단 설명 (선택)"]
    SM_NAME --> SM_ANALYZE["AI 분석 결과 확인<br/>카테고리, 키워드, 분위기 표시"]

    SM_ANALYZE --> SM_STYLE["스타일 선택 (Level 1)<br/>5개 스타일 카드 + 3초 미리보기"]
    SM_STYLE --> SM_PLATFORM["출력 플랫폼 선택<br/>☑ TikTok  ☑ Shorts  ☑ Reels"]

    SM_PLATFORM --> SM_OPTIONS["옵션 설정 (Level 1)"]
    subgraph SM_OPTIONS_DETAIL["선택 가능 옵션"]
        SM_LENGTH["영상 길이: 15초 / 30초"]
        SM_TONE["카피 톤: 캐주얼 / 전문적 / 감성적"]
        SM_VOICE["내레이션: 포함 / 미포함<br/>음성 선택 (3종)"]
        SM_WATERMARK["워터마크: 포함(+5건 보너스) / 미포함"]
    end

    SM_OPTIONS --> SM_GENERATE["'영상 생성' 클릭"]
    SM_GENERATE --> SM_PROGRESS["생성 중...<br/>(Quick Mode와 동일한 프로그레스)"]
    SM_PROGRESS --> SM_RESULT["결과 화면"]

    subgraph SM_RESULT_DETAIL["결과 확인"]
        SM_VIDEO["영상 프리뷰 재생"]
        SM_COPY_REVIEW["카피 3세트 중 선택<br/>직접 수정 가능 (Level 2)"]
        SM_BGM_CHANGE["BGM 변경 가능<br/>라이브러리에서 교체"]
        SM_SUBTITLE_STYLE["자막 스타일 변경<br/>심플 / 강조 / 모션"]
    end

    SM_RESULT --> SM_FINAL{최종 확인}
    SM_FINAL -- 확정 --> SM_EXPORT[내보내기]
    SM_FINAL -- 수정 적용 --> SM_RERENDER["수정 사항 반영 후<br/>재렌더링 (15초)"]
    SM_RERENDER --> SM_RESULT
    SM_FINAL -- 전체 재생성 --> SM_STYLE

    style SM_STYLE fill:#7c3aed,color:#fff
    style SM_GENERATE fill:#2563eb,color:#fff
    style SM_RESULT fill:#059669,color:#fff
```

**Level 1 vs Level 2 기능 분리:**

| 항목 | Level 1 (선택형) | Level 2 (라이트 에딧, Phase 2) |
|------|-----------------|-------------------------------|
| 스타일 | 5개 중 택 1 | 5개 중 택 1 + 커스텀 파라미터 |
| 카피 | 3세트 중 택 1 | 직접 수정 가능 |
| BGM | 분위기 기반 자동 매칭 | 라이브러리에서 직접 교체 |
| 자막 | 스타일 3종 택 1 | 폰트/색상/크기 변경 |
| 영상 길이 | 15초 / 30초 택 1 | 트림 바로 정밀 조정 |
| 브랜드 킷 | N/A | 로고/컬러 자동 적용 |

**에지케이스:**

| 케이스 | 처리 |
|--------|------|
| 5장 업로드 시 1장이 미지원 포맷 | 해당 이미지만 건너뛰기 + 안내 메시지 |
| 스타일 미리보기 로딩 실패 | 정적 썸네일 폴백 + "미리보기를 불러올 수 없습니다" |
| 카피 수정 후 영상 길이 초과 | "카피가 영상 길이를 초과합니다. 줄이거나 속도를 높일까요?" |
| 내레이션 포함 선택 시 TTS 실패 | 내레이션 없이 생성 + "내레이션 생성에 실패했습니다. 자막만 포함됩니다" 안내 |

---

### 3.3 Pro Mode (Level 3~4 - 씬 에디터/프로 에디터, Phase 2~3)

**대상 사용자**: 이서연(에이전시), 박준혁(대기업). 세밀한 편집 제어가 필요한 전문가.

> **Note**: MVP에는 포함되지 않으며, Phase 2~3에서 단계적으로 구현된다.

```mermaid
flowchart TD
    PM_START([Pro Mode 시작]) --> PM_UPLOAD["다중 이미지 업로드<br/>(최대 20장)"]
    PM_UPLOAD --> PM_ANALYZE["AI 분석 + 브랜드 킷 자동 적용"]
    PM_ANALYZE --> PM_STORYBOARD["스토리보드 자동 생성<br/>씬 3~5개 구성 제안"]

    PM_STORYBOARD --> PM_EDIT_SCENES["씬 에디터 (Level 3)"]
    subgraph PM_SCENE_EDIT["씬별 편집"]
        PM_SCENE_ORDER["씬 순서 드래그앤드롭"]
        PM_SCENE_EFFECT["씬별 전환 효과 선택"]
        PM_SCENE_TIMING["씬별 시작/종료 시간 조정"]
        PM_SCENE_IMAGE["씬별 이미지 교체"]
    end

    PM_EDIT_SCENES --> PM_TIMELINE["타임라인 에디터 (Level 4)"]
    subgraph PM_TIMELINE_EDIT["타임라인 편집"]
        PM_TL_LAYERS["레이어 관리<br/>(영상/자막/로고/BGM)"]
        PM_TL_KEYFRAME["키프레임 애니메이션"]
        PM_TL_SOUND["사운드 믹싱<br/>(BGM/내레이션/효과음 볼륨)"]
    end

    PM_TIMELINE --> PM_PREVIEW["실시간 프리뷰"]
    PM_PREVIEW --> PM_QC{품질 확인}
    PM_QC -- 수정 필요 --> PM_EDIT_SCENES
    PM_QC -- 승인 --> PM_EXPORT_PRO["멀티플랫폼 내보내기<br/>+ 브랜드 킷 워터마크"]

    style PM_STORYBOARD fill:#7c3aed,color:#fff
    style PM_EDIT_SCENES fill:#2563eb,color:#fff
    style PM_TIMELINE fill:#d97706,color:#fff
```
