## 1. Toss payment API parsing hardening

- [x] 1.1 Add deterministic JSON parse handling in `TossPaymentsClient.request`.

## 2. Web API client parsing hardening

- [x] 2.1 Add shared JSON parse helper for `fetchApi` and `uploadApi`.
- [x] 2.2 Apply the same parser in `shareToSocial` and keep current success/error behavior.
