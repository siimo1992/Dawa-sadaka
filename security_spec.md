# Security Specification (Phase 0: Payload-First Security TDD)

## 1. Data Invariants

1. **Global Default-Deny**: All unlisted paths (`/{document=**}`) deny `read` and `write` unconditionally.
2. **Verified Authentication**: Every write (`create`, `update`, `delete`) requires `request.auth != null && request.auth.token.email_verified == true`.
3. **User Profile Ownership (`/users/{userId}`)**:
   - `userId` must match `isValidId(userId)` (`^[a-zA-Z0-9_\-]+$`, max 128 chars) and equal `request.auth.uid`.
   - `uid` inside payload must equal `userId` and `request.auth.uid`.
   - PII Isolation: No raw email/phone is stored in `/users/{userId}`, and `get`/`list` access is restricted strictly to `request.auth.uid == userId`.
   - Temporal Integrity: `createdAt == request.time` on create; `createdAt == existing().createdAt` and `updatedAt == request.time` on update.
4. **Master Gate Relational Sync (`/users/{userId}/chatSessions/{sessionId}` and `/users/{userId}/savedNews/{newsId}`)**:
   - Sub-resources cannot exist or be modified unless the parent `/users/{userId}` document exists and its `uid == request.auth.uid` (verified via `get(/databases/$(database)/documents/users/$(userId)).data.uid == request.auth.uid`).
   - `ownerId` must equal `request.auth.uid` and `userId`, and is immutable on update.
   - `list` queries on subcollections strictly enforce `resource.data.ownerId == request.auth.uid` without calling `get()` or `exists()` inside `allow list`.

---

## 2. The "Dirty Dozen" Payloads

1. **Payload 1 (Identity Spoofing on User Profile)**: Authenticated user `user_A` attempts to create `/users/user_B` with `uid: "user_B"`. -> `PERMISSION_DENIED`
2. **Payload 2 (Unverified Email Write)**: User with `email_verified: false` attempts to create `/users/user_A`. -> `PERMISSION_DENIED`
3. **Payload 3 (Shadow/Ghost Field Injection)**: User sends `isAdmin: true` or `role: "admin"` when creating `/users/user_A`. -> `PERMISSION_DENIED`
4. **Payload 4 (Client Timestamp Forgery)**: User sends a past or future timestamp instead of `request.time` for `createdAt` or `updatedAt`. -> `PERMISSION_DENIED`
5. **Payload 5 (Immortal Field Mutation)**: User attempts to update `createdAt` or `ownerId` on an existing `/users/user_A/chatSessions/sess_1`. -> `PERMISSION_DENIED`
6. **Payload 6 (Orphaned Subcollection Write)**: User attempts to create `/users/user_A/chatSessions/sess_1` when parent `/users/user_A` does not exist. -> `PERMISSION_DENIED`
7. **Payload 7 (Path ID Poisoning)**: User attempts to create `/users/user_A/chatSessions/invalid$id!@#` with non-alphanumeric characters. -> `PERMISSION_DENIED`
8. **Payload 8 (Denial of Wallet / Oversized String)**: User attempts to set `title` to a 5,000-character string (exceeding `maxLength: 200`). -> `PERMISSION_DENIED`
9. **Payload 9 (Update-Gap / Value Poisoning)**: User updates allowed key `title` on `chatSessions` with a `number` or empty string `""`. -> `PERMISSION_DENIED`
10. **Payload 10 (Unauthorized Partial Update Key)**: User updates `agentId` during a `RenameSession` action where only `['title', 'updatedAt']` or valid session update keys are allowed. -> `PERMISSION_DENIED`
11. **Payload 11 (Cross-Tenant Read/List Leak)**: Authenticated `user_B` attempts `get` or `list` on `/users/user_A/chatSessions`. -> `PERMISSION_DENIED`
12. **Payload 12 (Invalid Enum Injection in SavedNewsItem)**: User creates `/users/user_A/savedNews/news_1` with `category: "hacked_category"`. -> `PERMISSION_DENIED`
