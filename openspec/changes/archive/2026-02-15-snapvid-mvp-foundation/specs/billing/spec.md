## ADDED Requirements

### Requirement: Two-tier plan structure
The system SHALL support 2 plan tiers in MVP: Free (₩0) and Starter (₩9,900/month, ₩7,900/month annual). Plan definitions MUST be stored in the `plans` table and include: monthly_quota, max_video_length_sec, watermark_required, multi_platform_enabled, bgm_library_tier, tts_voice_count.

#### Scenario: Free plan limits
- **WHEN** a user is on the Free plan
- **THEN** they have: 3 videos/month, max 15 seconds, mandatory watermark, 1 platform output, 20 BGM tracks, 1 TTS voice

#### Scenario: Starter plan limits
- **WHEN** a user is on the Starter plan
- **THEN** they have: 30 videos/month, max 30 seconds, optional watermark, 3 platform outputs, 200+ BGM tracks, 3 TTS voices

---

### Requirement: Credit/quota management
The system SHALL track video generation credits per user per billing cycle. Credits MUST reset at the start of each billing period. Unused credits MUST NOT roll over to the next period. Credit check MUST occur before queuing a generation job. Watermark bonus credits (up to +5/month for Starter) MUST be tracked separately.

#### Scenario: Credit check before generation
- **WHEN** a user requests video generation with 2 remaining credits
- **THEN** the generation is allowed and remaining credits decrease to 1

#### Scenario: Zero credits block generation
- **WHEN** a user with 0 remaining credits requests video generation
- **THEN** the system returns HTTP 402 with "이번 달 영상 생성 한도를 모두 사용했습니다" and an upgrade/purchase prompt

#### Scenario: Monthly credit reset
- **WHEN** a new billing period starts for a Starter user
- **THEN** credits reset to 30 (base) + 0 (watermark bonus, earned during the cycle) regardless of previous remaining credits

#### Scenario: Watermark bonus credit accumulation
- **WHEN** a Starter user generates a video with watermark included (3rd time this month)
- **THEN** bonus credits increase from 2 to 3 (max 5/month) and total available credits increase accordingly

#### Scenario: Watermark bonus cap
- **WHEN** a Starter user has already earned 5 watermark bonus credits this month
- **THEN** including watermark on additional videos does not grant more bonus credits

---

### Requirement: Subscription lifecycle management
The system SHALL manage subscription state transitions: TRIALING → ACTIVE → PAST_DUE → CANCELED → EXPIRED. SubscriptionManager MUST handle: upgrade (Free→Starter), downgrade (Starter→Free), renewal, payment failure, and cancellation. EntitlementSnapshot MUST be captured at each state change for audit.

#### Scenario: Upgrade from Free to Starter
- **WHEN** a user subscribes to the Starter plan
- **THEN** subscription status transitions to ACTIVE, entitlements upgrade immediately (30 credits, 30s video, 3 platforms), and prorated billing starts

#### Scenario: Subscription renewal
- **WHEN** the billing period ends and payment succeeds
- **THEN** subscription renews with reset credits and updated period dates

#### Scenario: Payment failure → PAST_DUE
- **WHEN** automatic renewal payment fails
- **THEN** subscription transitions to PAST_DUE, user retains Starter entitlements for a 3-day grace period, and auto-retry happens 3 times over 3 days

#### Scenario: PAST_DUE → EXPIRED
- **WHEN** all 3 payment retries fail within the grace period
- **THEN** subscription transitions to EXPIRED and entitlements downgrade to Free plan immediately

#### Scenario: User-initiated cancellation
- **WHEN** a user cancels their Starter subscription
- **THEN** subscription transitions to CANCELED, Starter entitlements remain until the end of the current billing period, then downgrade to Free at period end

#### Scenario: 72-hour limited-time offer
- **WHEN** a Free user exhausts all 3 monthly credits
- **THEN** the system shows "지금 구독하면 첫 달 50% 할인" offer that expires in 72 hours

---

### Requirement: Payment processing with TossPayments
The system SHALL integrate TossPayments (토스페이먼츠) for payment processing. Supported methods: Kakao Pay, Toss Pay, credit card. Annual billing MUST apply a 20% discount (₩7,900/month vs ₩9,900/month). 7-day full refund policy MUST be enforced.

#### Scenario: Monthly subscription payment
- **WHEN** a user selects Starter monthly and pays via Kakao Pay
- **THEN** TossPayments processes ₩9,900, subscription activates, and a payment receipt is recorded

#### Scenario: Annual subscription payment
- **WHEN** a user selects Starter annual plan
- **THEN** TossPayments processes ₩94,800 (₩7,900 × 12) with 20% discount applied

#### Scenario: Refund within 7 days
- **WHEN** a user requests a refund within 7 days of subscription start
- **THEN** a full refund is processed via TossPayments and the subscription transitions to CANCELED/Free

#### Scenario: Refund after 7 days
- **WHEN** a user requests a refund after 7 days
- **THEN** the system denies the refund with message "구독 시작 7일 이후에는 환불이 불가합니다. 다음 결제일까지 서비스를 이용하실 수 있습니다"

#### Scenario: Duplicate payment detection
- **WHEN** the system detects two payments for the same subscription period
- **THEN** the duplicate payment is automatically refunded and an alert is logged

---

### Requirement: Payment webhook idempotent processing
The system SHALL process TossPayments webhook events idempotently. Each webhook MUST be verified via signature. Event IDs MUST be stored in `webhook_events` table to prevent duplicate processing. Out-of-order events MUST be handled via version/timestamp comparison.

#### Scenario: Successful webhook processing
- **WHEN** TossPayments sends a payment.confirmed webhook
- **THEN** the system verifies the signature, processes the event, stores the event_id, and updates subscription status

#### Scenario: Duplicate webhook
- **WHEN** TossPayments sends the same webhook event_id twice
- **THEN** the second request is acknowledged (HTTP 200) but no state changes occur

#### Scenario: Invalid webhook signature
- **WHEN** a webhook request arrives with an invalid signature
- **THEN** the system returns HTTP 401 and logs a security alert

#### Scenario: Out-of-order webhook events
- **WHEN** a "payment.failed" webhook arrives after a "payment.confirmed" for the same subscription
- **THEN** the system compares timestamps/versions and ignores the stale event

---

### Requirement: Cost budget control
The system SHALL implement pre-generation cost budget checks. Before queuing a job, the system MUST estimate the cost based on the user's plan and selected options. If estimated cost exceeds the user's remaining budget, the job MUST be blocked with an upgrade prompt. Actual costs MUST be recorded after generation completes.

#### Scenario: Cost estimation before generation
- **WHEN** a Starter user requests generation
- **THEN** the system estimates cost (~$0.93 for Runway) and verifies it's within budget before queuing

#### Scenario: Budget exceeded
- **WHEN** monthly cost budget for the user's plan tier is exceeded
- **THEN** the system blocks the generation with "비용 한도에 도달했습니다" (internal safeguard, not user-facing credit limit)

#### Scenario: Actual cost recording
- **WHEN** video generation completes
- **THEN** the actual API costs (I2V provider, background removal, copy, BGM, TTS, subtitle) are recorded per job for analytics
