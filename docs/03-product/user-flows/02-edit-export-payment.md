> [<- 허브로 돌아가기](../USER_FLOWS.md)

# 1Dragon 사용자 플로우 -- 편집 + 내보내기 + 결제

> **원본 문서:** USER_FLOWS.md (2026-02-09)
> **범위:** 섹션 4 (편집 플로우) + 섹션 5 (내보내기 & 공유 플로우) + 섹션 6 (결제 & 구독 플로우)

---

## 4. 편집 플로우

### 4.1 MVP 편집 플로우 (Level 0~1)

MVP에서 편집 기능은 최소화하여, 사용자가 생성된 결과를 확인하고 재생성하는 것에 집중한다. "편집"이 아닌 "선택"의 개념으로 접근한다.

```mermaid
flowchart TD
    EDIT_START([프리뷰 화면]) --> EDIT_OPTIONS{수정하고 싶은 부분?}

    EDIT_OPTIONS -- 전체 스타일 --> RESTYLE["다른 스타일로 다시 만들기<br/>(재생성 카운트 차감)"]
    EDIT_OPTIONS -- 카피 변경 --> COPY_SELECT["카피 3세트 중<br/>다른 세트 선택"]
    EDIT_OPTIONS -- 자막 스타일 --> SUB_STYLE["자막 스타일 변경<br/>심플 / 강조 / 모션"]
    EDIT_OPTIONS -- BGM 변경 --> BGM_SELECT["분위기 카테고리 변경<br/>밝은 / 차분한 / 역동적"]
    EDIT_OPTIONS -- 내레이션 토글 --> NARR_TOGGLE["내레이션 포함/제거"]
    EDIT_OPTIONS -- 없음 (만족) --> GO_EXPORT[내보내기로 이동]

    RESTYLE --> REGENERATE["전체 재생성<br/>(30~60초)"]
    REGENERATE --> EDIT_START

    COPY_SELECT --> QUICK_RERENDER["빠른 재렌더링<br/>(자막/카피만 교체, 10~15초)"]
    SUB_STYLE --> QUICK_RERENDER
    BGM_SELECT --> QUICK_RERENDER
    NARR_TOGGLE --> QUICK_RERENDER
    QUICK_RERENDER --> EDIT_START

    style RESTYLE fill:#dc2626,color:#fff
    style QUICK_RERENDER fill:#2563eb,color:#fff
    style GO_EXPORT fill:#059669,color:#fff
```

**전체 재생성 vs 빠른 재렌더링:**

| 구분 | 전체 재생성 | 빠른 재렌더링 |
|------|-----------|-------------|
| **소요 시간** | 30~60초 | 10~15초 |
| **크레딧 소모** | 1건 차감 (재생성 5회 무료) | 차감 없음 |
| **변경 범위** | 스타일, 영상 클립, 전환 효과 전체 | 카피 텍스트, 자막 스타일, BGM, 내레이션만 |
| **API 호출** | Runway Gen-4 재호출 | FFmpeg만 재합성 |
| **비용** | ~$0.50 (I2V 비용 포함) | ~$0.01 (FFmpeg만) |

**에지케이스:**

| 케이스 | 처리 |
|--------|------|
| 재생성 5회 모두 불만족 | "더 좋은 사진으로 시도해보세요" 가이드 + 고객지원 연결 |
| 빠른 재렌더링 중 서버 오류 | 이전 버전 유지 + 재시도 안내 |
| 카피 수정 시 금칙어(과대광고) 포함 | 경고 메시지 "과장된 표현이 포함되어 있습니다" + 수정 제안 |

---

## 5. 내보내기 & 공유 플로우

### 5.1 멀티플랫폼 내보내기

```mermaid
flowchart TD
    EX_START([내보내기 시작]) --> EX_PLAN{현재 플랜?}

    EX_PLAN -- Free --> EX_FREE["1개 플랫폼만 선택 가능<br/>+ 워터마크 포함"]
    EX_PLAN -- Starter --> EX_PAID["3개 플랫폼 동시 출력<br/>+ 워터마크 선택"]

    EX_FREE --> EX_SELECT_ONE["플랫폼 선택<br/>○ TikTok  ○ Shorts  ○ Reels"]
    EX_PAID --> EX_SELECT_MULTI["플랫폼 선택 (복수)<br/>☑ TikTok  ☑ Shorts  ☑ Reels"]

    EX_SELECT_ONE --> EX_WATERMARK_ON["워터마크 자동 적용<br/>'Made with 1Dragon'"]
    EX_SELECT_MULTI --> EX_WATERMARK_CHOICE{워터마크 포함?}

    EX_WATERMARK_CHOICE -- 포함<br/>(+5건/월 보너스) --> EX_WATERMARK_ON
    EX_WATERMARK_CHOICE -- 미포함 --> EX_NO_WATERMARK[워터마크 없이 출력]

    EX_WATERMARK_ON --> EX_OPTIMIZE["플랫폼별 자동 최적화"]
    EX_NO_WATERMARK --> EX_OPTIMIZE

    subgraph EX_OPT_DETAIL["자동 최적화 처리"]
        direction LR
        EX_SAFE["세이프 존 조정<br/>상단/하단 여백"]
        EX_TEXT["텍스트 위치 재배치<br/>플랫폼 UI 겹침 방지"]
        EX_BITRATE["비트레이트 최적화<br/>8~12 Mbps"]
        EX_FILENAME["파일명 자동 지정<br/>[상품명]_[플랫폼]_[날짜].mp4"]
    end

    EX_OPTIMIZE --> EX_METHOD{내보내기 방법}
    EX_METHOD -- 다운로드 --> EX_DOWNLOAD["MP4 다운로드<br/>(플랫폼별 개별 파일)"]
    EX_METHOD -- SNS 직접 공유 --> EX_SNS_FLOW[SNS 공유 플로우]
    EX_METHOD -- 링크 공유 --> EX_LINK["공유 링크 생성<br/>(24시간 유효)"]

    EX_DOWNLOAD --> EX_DONE([완료])
    EX_SNS_FLOW --> EX_DONE
    EX_LINK --> EX_DONE

    style EX_OPTIMIZE fill:#2563eb,color:#fff
    style EX_DONE fill:#059669,color:#fff
```

### 5.2 SNS 직접 공유 플로우

```mermaid
flowchart TD
    SNS_START([SNS 공유 시작]) --> SNS_PLATFORM{플랫폼 선택}

    SNS_PLATFORM -- TikTok --> TT_CHECK{TikTok 계정<br/>연결됨?}
    SNS_PLATFORM -- Instagram --> IG_CHECK{Instagram<br/>비즈니스 계정<br/>연결됨?}

    TT_CHECK -- 아니오 --> TT_CONNECT["TikTok for Business<br/>계정 연결"]
    TT_CHECK -- 예 --> TT_UPLOAD_PREP[업로드 준비]

    IG_CHECK -- 아니오 --> IG_CONNECT["Instagram<br/>비즈니스 계정 연결"]
    IG_CHECK -- 예 --> IG_UPLOAD_PREP[업로드 준비]

    TT_CONNECT --> TT_UPLOAD_PREP
    IG_CONNECT --> IG_UPLOAD_PREP

    TT_UPLOAD_PREP --> SNS_CAPTION["캡션 자동 채움<br/>(카피 + 해시태그)"]
    IG_UPLOAD_PREP --> SNS_CAPTION

    SNS_CAPTION --> SNS_EDIT_CAPTION{캡션 수정?}
    SNS_EDIT_CAPTION -- 수정 --> SNS_CAPTION_EDIT["캡션 직접 수정"]
    SNS_EDIT_CAPTION -- 그대로 --> SNS_PUBLISH["게시 확인<br/>'[플랫폼]에 업로드할까요?'"]

    SNS_CAPTION_EDIT --> SNS_PUBLISH

    SNS_PUBLISH --> SNS_UPLOADING["업로드 중..."]
    SNS_UPLOADING --> SNS_SUCCESS{업로드 결과}

    SNS_SUCCESS -- 성공 --> SNS_COMPLETE["업로드 완료!<br/>'[플랫폼]에서 확인하기' 링크"]
    SNS_SUCCESS -- 실패 --> SNS_FAIL["업로드 실패<br/>'다운로드 후 직접 업로드' 대안 제공"]

    SNS_COMPLETE --> SNS_END([완료])
    SNS_FAIL --> SNS_DOWNLOAD_ALT["대안: MP4 다운로드"]
    SNS_DOWNLOAD_ALT --> SNS_END

    style SNS_PUBLISH fill:#2563eb,color:#fff
    style SNS_COMPLETE fill:#059669,color:#fff
    style SNS_FAIL fill:#dc2626,color:#fff
```

**플랫폼별 세이프 존 스펙:**

| 플랫폼 | 상단 여백 | 하단 여백 | 좌우 여백 | 자막 위치 기본값 |
|--------|:--------:|:--------:|:--------:|:------------:|
| TikTok | 150px | 270px | 40px | 하단 중앙 (270px 위) |
| YouTube Shorts | 100px | 200px | 30px | 하단 중앙 (200px 위) |
| Instagram Reels | 120px | 250px | 40px | 하단 중앙 (250px 위) |

**에지케이스:**

| 케이스 | 처리 |
|--------|------|
| SNS 계정 연결 해제 상태 | 재연결 안내 + 다운로드 대안 |
| 업로드 중 네트워크 끊김 | 로컬에 영상 캐시 + 재시도 안내 |
| 플랫폼 API 변경/장애 | 다운로드 폴백 항상 유지 + 인앱 알림 |
| 캡션 글자 수 초과 (TikTok 4000자/Instagram 2200자) | 자동 축약 + "캡션이 길어서 일부 생략됩니다" 안내 |

---

## 6. 결제 & 구독 플로우

### 6.1 Free -> Paid 전환 (크레딧 소진 시)

```mermaid
flowchart TD
    PAY_TRIGGER([무료 크레딧 소진<br/>3건/월 모두 사용]) --> PAY_PROMPT["크레딧 소진 알림<br/>'이번 달 무료 영상을 모두 사용했어요'"]

    PAY_PROMPT --> PAY_OPTIONS{선택}
    PAY_OPTIONS -- 구독하기 --> PLAN_SELECT["플랜 선택<br/>Starter ₩9,900/월"]
    PAY_OPTIONS -- 다음에 --> PAY_LATER["대시보드 복귀<br/>(생성 버튼 비활성)"]
    PAY_OPTIONS -- 72시간 리밋 오퍼 --> LIMIT_OFFER["특별 할인 확인<br/>'지금 가입하면 첫 달 50%'<br/>₩9,900 -> ₩4,950"]

    PAY_LATER --> PAY_NUDGE["72시간 후 리마인더<br/>이메일 + 푸시 알림"]
    PAY_NUDGE --> PAY_REMIND["'아직 만들고 싶은 영상이 있으신가요?<br/>지금 구독하면 첫 달 50%'"]
    PAY_REMIND --> PAY_EXPIRE{72시간 경과?}
    PAY_EXPIRE -- 아직 유효 --> LIMIT_OFFER
    PAY_EXPIRE -- 만료 --> NORMAL_PRICE["정상 가격 안내<br/>₩9,900/월"]
    NORMAL_PRICE --> PLAN_SELECT

    LIMIT_OFFER --> PLAN_SELECT

    PLAN_SELECT --> PAY_PERIOD{결제 주기}
    PAY_PERIOD -- 월간 --> PAY_MONTHLY["월간 ₩9,900/월"]
    PAY_PERIOD -- 연간 --> PAY_ANNUAL["연간 ₩7,900/월<br/>(20% 할인, 연 ₩94,800)"]

    PAY_MONTHLY --> PAY_METHOD{결제 수단}
    PAY_ANNUAL --> PAY_METHOD

    PAY_METHOD -- 카카오페이 --> KAKAO_PAY[카카오페이 결제]
    PAY_METHOD -- 토스페이 --> TOSS_PAY[토스페이 결제]
    PAY_METHOD -- 신용카드 --> CARD_PAY[신용카드 결제]

    KAKAO_PAY --> PAY_PROCESSING["결제 처리 중..."]
    TOSS_PAY --> PAY_PROCESSING
    CARD_PAY --> PAY_PROCESSING

    PAY_PROCESSING --> PAY_RESULT{결제 결과}
    PAY_RESULT -- 성공 --> PAY_SUCCESS["구독 완료!<br/>'이번 달 30건 영상을 만들 수 있어요'<br/>+ 즉시 생성 가능"]
    PAY_RESULT -- 실패 --> PAY_FAIL["결제 실패<br/>'다른 결제 수단을 시도해주세요'"]

    PAY_FAIL --> PAY_RETRY{재시도?}
    PAY_RETRY -- 예 --> PAY_METHOD
    PAY_RETRY -- 아니오 --> PAY_LATER

    PAY_SUCCESS --> DASHBOARD_PAID([유료 대시보드])

    style PAY_PROMPT fill:#d97706,color:#fff
    style LIMIT_OFFER fill:#dc2626,color:#fff
    style PAY_SUCCESS fill:#059669,color:#fff
    style PAY_FAIL fill:#dc2626,color:#fff
```

**전환 유도 타이밍:**

| 시점 | 트리거 | 메시지 | 채널 |
|------|--------|--------|------|
| 크레딧 잔여 1건 | 영상 생성 완료 시 | "무료 영상이 1건 남았어요" | 인앱 배너 |
| 크레딧 소진 | 생성 시도 시 | "이번 달 무료 영상을 모두 사용했어요" | 인앱 모달 |
| 소진 후 24시간 | 타이머 트리거 | "아까 만들던 영상, 계속 만들어볼까요?" | 푸시 + 이메일 |
| 소진 후 48시간 | 타이머 트리거 | "지금 구독하면 첫 달 50% 할인" | 이메일 |
| 소진 후 72시간 | 리밋 오퍼 만료 | "할인이 곧 종료됩니다" | 푸시 + 이메일 |
| 다음 월 초 | 크레딧 리셋 | "새 무료 영상 3건이 충전됐어요!" | 푸시 |

### 6.2 크레딧 소진 & 갱신 플로우

```mermaid
flowchart TD
    CREDIT_CHECK([영상 생성 요청]) --> CREDIT_AVAILABLE{크레딧 잔여?}

    CREDIT_AVAILABLE -- 있음 --> GENERATE["영상 생성 진행<br/>잔여 크레딧 -1"]
    CREDIT_AVAILABLE -- 없음 --> PLAN_CHECK{현재 플랜?}

    PLAN_CHECK -- Free --> FREE_EXHAUSTED["무료 크레딧 소진<br/>구독 유도 플로우"]
    PLAN_CHECK -- Starter --> PAID_EXHAUSTED["유료 크레딧 소진<br/>추가 크레딧 구매 안내"]

    PAID_EXHAUSTED --> EXTRA_CREDIT{추가 크레딧?}
    EXTRA_CREDIT -- 구매 --> BUY_CREDITS["추가 크레딧 구매<br/>10건/₩5,000<br/>30건/₩12,000"]
    EXTRA_CREDIT -- 다음 달 대기 --> WAIT_RESET["다음 갱신일까지 대기<br/>갱신일 표시"]
    EXTRA_CREDIT -- 플랜 업그레이드 --> UPGRADE["Pro 플랜 안내<br/>₩49,000/월, 150건"]

    BUY_CREDITS --> GENERATE
    UPGRADE --> GENERATE

    GENERATE --> CREDIT_UPDATE["크레딧 상태 업데이트<br/>'이번 달 N/30건 사용'"]

    style FREE_EXHAUSTED fill:#d97706,color:#fff
    style PAID_EXHAUSTED fill:#d97706,color:#fff
    style GENERATE fill:#059669,color:#fff
```

### 6.3 구독 관리 플로우

```mermaid
flowchart TD
    SUB_MANAGE([구독 관리]) --> SUB_STATUS["현재 구독 상태<br/>Starter / ₩9,900/월<br/>다음 갱신일: 2026-03-09<br/>잔여 크레딧: 18/30건"]

    SUB_STATUS --> SUB_ACTION{관리 액션}
    SUB_ACTION -- 플랜 변경 --> CHANGE_PLAN["플랜 업그레이드/다운그레이드"]
    SUB_ACTION -- 결제 수단 변경 --> CHANGE_PAYMENT["결제 수단 변경"]
    SUB_ACTION -- 구독 취소 --> CANCEL_FLOW["취소 플로우"]
    SUB_ACTION -- 결제 내역 --> HISTORY["결제 내역 조회"]

    CANCEL_FLOW --> CANCEL_REASON["취소 이유 선택<br/>□ 가격이 비싸요<br/>□ 사용을 잘 안 해요<br/>□ 품질이 기대 이하<br/>□ 다른 서비스 사용 중"]
    CANCEL_REASON --> CANCEL_OFFER{리텐션 오퍼}
    CANCEL_OFFER -- 가격 이유 --> DISCOUNT_OFFER["50% 할인 오퍼<br/>'다음 달 ₩4,950에 이용해보세요'"]
    CANCEL_OFFER -- 품질 이유 --> QUALITY_PROMISE["품질 개선 약속<br/>+ 무료 1개월 연장"]
    CANCEL_OFFER -- 기타 --> FINAL_CANCEL["최종 취소 확인"]

    DISCOUNT_OFFER --> ACCEPT_OFFER{수락?}
    QUALITY_PROMISE --> ACCEPT_OFFER
    ACCEPT_OFFER -- 수락 --> KEEP_SUB["구독 유지"]
    ACCEPT_OFFER -- 거절 --> FINAL_CANCEL

    FINAL_CANCEL --> CANCEL_CONFIRM["구독 취소 완료<br/>'현재 결제 주기 끝까지<br/>Starter 기능 사용 가능'"]
    CANCEL_CONFIRM --> FREE_DOWNGRADE["결제 주기 종료 시<br/>Free 플랜 자동 전환"]

    style CANCEL_FLOW fill:#dc2626,color:#fff
    style KEEP_SUB fill:#059669,color:#fff
```

**결제 실패 자동 처리:**

| 시점 | 액션 | 사용자 알림 |
|------|------|-----------|
| 갱신일 결제 실패 | 자동 재시도 1회 | "결제에 실패했습니다. 결제 수단을 확인해주세요" (이메일) |
| +1일 | 자동 재시도 2회 | "결제가 처리되지 않았습니다" (푸시 + 이메일) |
| +3일 | 자동 재시도 3회 (최종) | "결제 수단을 업데이트해주세요. 미처리 시 Free 플랜으로 전환됩니다" (이메일) |
| +7일 | Free 플랜 다운그레이드 | "구독이 만료되었습니다. 재구독하면 이전 영상 기록이 복원됩니다" (이메일) |

**환불 정책 플로우:**

| 조건 | 환불 | 처리 |
|------|------|------|
| 구독 시작 7일 이내 | 전액 환불 | 즉시 Free 플랜 전환, 생성 영상은 유지 |
| 7일 초과 | 환불 불가 | 현재 주기 끝까지 이용 후 취소 |
| 이중 결제 | 중복분 즉시 환불 | 자동 감지 + 24시간 내 처리 |
