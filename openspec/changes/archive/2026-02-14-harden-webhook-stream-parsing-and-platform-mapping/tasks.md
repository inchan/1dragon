## 1. Payments webhook parsing hardening

- [x] 1.1 Wrap Toss webhook JSON parse in `try/catch` and return a deterministic 400 payload for invalid JSON.

## 2. SSE stream parsing hardening

- [x] 2.1 Add a parser guard for SSE messages and only apply status updates for valid message shapes.

## 3. Platform mapping hardening

- [x] 3.1 Add normalization check and warning log for unknown platform values, then keep fallback behavior.
