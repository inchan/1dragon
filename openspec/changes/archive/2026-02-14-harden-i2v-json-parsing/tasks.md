## 1. Common parsing guard

- [x] 1.1 Add JSON parse guard in `BaseI2VAdapter` that throws `I2VProviderError` on empty/invalid JSON.

## 2. Gemini adapter parity

- [x] 2.1 Replace fallback `response.json().catch(() => ({}))` usage in `GeminiVeoI2VAdapter.request`.
- [x] 2.2 Ensure non-JSON responses throw deterministic provider errors in both error and success paths.
