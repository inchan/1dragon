## 1. Strategy And Spec

- [x] 1.1 `openspec/changes/add-live-media-validation-workflow`에 live validation proposal/design/spec를 작성한다.
- [x] 1.2 direct-provider, full-stack, stubbed, blocked stage 분류 규칙을 문서화한다.

## 2. Bash Validation Loop

- [x] 2.1 `tooling/gemini-video-review-loop.sh`를 추가해 기술 검증 → 프레임 추출 → Gemini 리뷰를 한 iteration으로 실행한다.
- [x] 2.2 스크립트가 source image, candidate video 목록, Gemini JSON 응답, 요약 리포트를 저장하도록 만든다.
- [x] 2.3 스크립트가 실패한 technical validation도 summary에 남기고 전체 루프는 계속 진행하도록 만든다.

## 3. Execution

- [x] 3.1 기준 source image와 video candidate를 정하고 loop를 5회 실행한다.
- [x] 3.2 `artifacts/gemini-review-loop/`에 결과 요약을 남기고 best candidate와 개선 포인트를 정리한다.
- [x] 3.3 결과를 커밋하고 원격 브랜치로 푸시한다.
