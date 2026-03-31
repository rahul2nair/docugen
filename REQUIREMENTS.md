# Product Requirements

## 1. Scope

Build a session-based document generation workspace that enables users to:
- create and edit documents from template packs
- apply branding and optional clauses
- save and restore snapshots (version history)
- collaborate via secure shareable workspace links
- generate downloadable HTML and PDF outputs

Constraints:
- no user accounts in this phase
- no legal compliance claims
- time-bound session retention with automatic expiry

## 2. Product Principles

1. Speed over complexity
2. Safe collaboration without silent data loss
3. Temporary by design (expiring workspaces)
4. Repeatability through templates, clauses, and snapshots
5. Clear user communication for conflict and expiry states

## 3. Functional Requirements

### 3.1 Workspace Session

1. System must create an anonymous workspace session on start.
2. Session must have:
- internal sessionId
- public share token
- createdAt and expiresAt
- current document state
- current revision number
3. Workspace URL must be token-based.
4. Session must expire automatically after configured TTL (default 48 hours).
5. Expired sessions must return a clear Session Expired response.

### 3.2 Template and Editing

1. User must be able to select built-in templates.
2. User must be able to fill template fields.
3. User must be able to configure branding values:
- company name
- logo URL
- colors
- footer text
- signer details
4. User must be able to manage clauses:
- toggle predefined clauses
- edit editable clause content
- add custom clauses
5. Client and server validation must enforce required fields and schema correctness.

### 3.3 Snapshot Versioning

1. System must support snapshot creation:
- manual save snapshot
- automatic snapshot on generate
2. Snapshot must be immutable and contain:
- revision number
- editorId
- timestamp
- full document configuration payload
- optional note
3. User must be able to list and restore prior snapshots.
4. System must enforce max snapshots per session (configurable).
5. Oldest snapshots must be trimmed when max is exceeded.

### 3.4 Concurrent Editing

1. Each browser must get anonymous editorId.
2. Save requests must include baseRevision.
3. Server must use optimistic concurrency control:
- accept save only when baseRevision == currentRevision
- reject stale saves with conflict response
4. Conflict response must include latest revision and latest state.
5. System must provide safe recovery path for stale client edits (for example conflict snapshot).
6. Silent overwrite is not allowed.

### 3.5 Shareable Links

1. Workspace must be shareable via secure link.
2. Token must be long, random, and unguessable.
3. Server must validate token and expiry on every workspace load.
4. System should support link rotation (invalidate old token, issue new token).
5. Optional PIN protection may be supported in later iteration.

### 3.6 Generation Pipeline

1. User must be able to request HTML and/or PDF generation.
2. API must validate request payload using schema validation.
3. Generation jobs must be queued asynchronously.
4. Worker must render document content using current workspace state.
5. Worker must produce outputs and upload to object storage.
6. UI must poll status and show queued, processing, completed, failed states.
7. Completed status must expose output download links and expiry metadata.

### 3.7 Output Access and Retention

1. Download endpoints must verify job/session validity.
2. Outputs must be available only within retention window.
3. Expired outputs must return clear error response.
4. Output file names and content types must be correct.

## 4. Non-Functional Requirements

### 4.1 Performance

1. Workspace load target: under 2 seconds for active session.
2. Save snapshot target: under 300 ms median.
3. Conflict check and save should be atomic and low latency.

### 4.2 Scalability

1. Active state must be stored in Redis, not app server memory.
2. Snapshot retention and payload limits must protect memory growth.
3. Queue and session workloads should be independently scalable.
4. System should support high concurrent sessions with bounded per-session storage.

### 4.3 Reliability

1. Save operation must be atomic (check revision + write + snapshot append).
2. Job processing must support retry policy.
3. On worker failures, system must return clear failed status and reason.
4. No data loss for accepted saves.

### 4.4 Security

1. Session tokens must be cryptographically strong.
2. Sensitive operations must be rate limited.
3. Inputs must be validated and sanitized.
4. Expired session/token access must be denied.
5. Logs must avoid exposing raw sensitive payloads.

### 4.5 Observability

1. System must log session lifecycle events.
2. System must log generation lifecycle events.
3. System must track conflict events and resolution actions.
4. Metrics must be available for core journey funnel.

## 5. Data Model Requirements

1. Session object must include:
- session metadata
- current state
- revision metadata
- expiry metadata
2. Snapshot object must include:
- snapshot id
- session id
- revision
- editor id
- timestamp
- payload
- optional note
3. Generation object must include:
- job id
- status
- output records
- createdAt, completedAt

## 6. API Requirements (Minimum)

1. Create session
2. Get session state
3. Save state with baseRevision
4. Save snapshot
5. List snapshots
6. Restore snapshot
7. Rotate share link
8. Submit generation job
9. Get generation status
10. Download output by format

## 7. UX Requirements

1. Show current revision number in workspace.
2. Show session expiry countdown/time.
3. Show active collaborator count based on ephemeral presence.
4. Show clear conflict banner with recovery options.
5. Show version history timeline with restore action.
6. Show generation status progression and errors.

## 8. Operational Limits (Initial Defaults)

1. Session TTL: 48 hours
2. Snapshot limit per session: 50
3. Snapshot payload max: configurable size cap
4. Generation retry attempts: 3
5. Job retention: aligned with session retention policy

## 9. Explicit Non-Goals

1. No account registration or login
2. No legal advice or legal compliance guarantees
3. No permanent archival storage in current phase
4. No enterprise approval workflows in current phase

## 10. Acceptance Criteria (Release Gate)

1. A user can complete create -> edit -> snapshot -> generate -> download in one shared session.
2. Two concurrent editors can save safely with conflict detection and no silent overwrite.
3. Snapshot restore works and updates workspace state correctly.
4. Session expiry is enforced end-to-end.
5. System remains stable under concurrent session load with configured limits.
