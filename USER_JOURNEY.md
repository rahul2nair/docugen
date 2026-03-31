# User Journey

## Product Context

This product is a session-based document generation workspace for fast, branded, repeatable document assembly.

Key model:
- No user accounts
- Workspace is accessed via secure shareable link
- Workspace expires automatically (default 48 hours)
- Version history is stored as snapshots inside the active workspace session

## Primary User Jobs

1. Create a document quickly from existing template packs
2. Customize fields, clauses, and branding for each run
3. Save and restore working versions during collaboration
4. Share an active workspace link with teammates
5. Generate and download polished HTML/PDF outputs

## Personas

1. Operations manager
- Needs rapid document turnaround
- Reuses similar docs repeatedly

2. HR coordinator
- Generates offer letters and internship documents
- Needs consistent formatting and quick edits

3. Founder or small team operator
- Handles contracts, NDAs, and invoices without legal ops tooling
- Wants speed and reliability over complexity

## End-to-End Journey

### Stage 1: Workspace Creation

1. User lands on the app and selects Start Workspace.
2. Backend creates an anonymous workspace session:
- sessionId (internal)
- publicToken (for shareable link)
- expiresAt (for example, now + 48 hours)
- initial state object
3. User is redirected to workspace URL:
- /workspace?s=<publicToken>
4. UI shows session expiry banner and remaining time.

Success criteria:
- Workspace opens in under 2 seconds
- Session token is unguessable
- Expiry time is visible to user

### Stage 2: Template and Content Setup

1. User selects a template pack (for example offer letter, NDA, contractor agreement).
2. User fills dynamic fields.
3. User configures company branding (name, logo URL, colors, footer, signer).
4. User toggles optional clauses and edits clause text where allowed.
5. User adds custom clauses when needed.

Success criteria:
- Required fields clearly marked and validated
- Clause changes update preview state immediately
- Branding is reflected in preview and final output

### Stage 3: Save Snapshot (Versioning)

1. User clicks Save Snapshot, or snapshot is auto-created on Generate.
2. System stores immutable snapshot in session history:
- revision number
- editorId (anonymous per browser)
- timestamp
- full document config payload
- optional note
3. Snapshot list is shown in Version History panel.
4. User can restore any prior snapshot.

Success criteria:
- Snapshot write is atomic
- Restore does not remove newer history
- Max snapshot count is enforced (trim oldest)

### Stage 4: Multi-Person Collaboration (No Accounts)

1. User shares workspace link with collaborator.
2. Collaborator opens same workspace URL and edits document.
3. Each browser has anonymous editorId and edits against current revision.
4. Save uses optimistic concurrency:
- Request sends baseRevision
- Server accepts only if baseRevision equals currentRevision
5. If conflict:
- Server returns conflict response
- Latest state is returned
- Losing edit can be preserved as conflict snapshot

Success criteria:
- No silent overwrite
- Conflicts are recoverable
- Both contributors can continue without lock dependency

### Stage 5: Generate Output

1. User clicks Generate.
2. Frontend submits generation request with current state.
3. API validates payload and enqueues job.
4. Worker renders HTML and generates PDF.
5. Outputs are uploaded to object storage and job is marked completed.
6. UI polls status and displays output links when ready.

Success criteria:
- Failed jobs return clear error status
- Successful jobs return download links and expiry
- Preview and downloads match selected clauses and branding

### Stage 6: Download and Share Outputs

1. User downloads HTML or PDF output.
2. User can share output link if enabled by session policy.
3. Output availability follows session retention policy.

Success criteria:
- Output content type and file naming are correct
- Expired outputs are blocked gracefully with clear message

### Stage 7: Session Expiry

1. At expiry time, workspace session is invalidated.
2. Session state and snapshots are removed automatically by TTL cleanup.
3. User sees Session Expired view with Create New Workspace action.

Success criteria:
- Expired links do not expose session data
- Cleanup runs automatically without manual intervention

## Journey Variants

### Variant A: Solo Fast Path

1. Create workspace
2. Fill fields
3. Save one snapshot
4. Generate and download

Target completion: under 5 minutes

### Variant B: Collaborative Revision Path

1. Create and share workspace
2. Two editors update clauses and fields
3. Resolve one or more revision conflicts
4. Restore preferred snapshot
5. Generate final outputs

Target completion: under 20 minutes

### Variant C: High-Volume Operations Path

1. Create workspace
2. Load preset field and clause configuration
3. Run repeated generations across templates
4. Use version snapshots for rollback when needed

Target outcome: reduce repetitive drafting time by 60%+

## Core UX Rules

1. Always show current revision number in editor.
2. Always show session expiry time.
3. Never overwrite on conflict; require explicit user action.
4. Snapshot creation should be low-friction and visible.
5. Restore action should clearly indicate which state will be loaded.

## Data and Lifecycle Model

1. Session is the ownership boundary.
2. All editable state is scoped to session token.
3. Snapshots are immutable and session-scoped.
4. Retention is time-bound using TTL.
5. Generated files are linked to session and follow same expiry policy.

## Non-Goals (Current Stage)

1. No legal compliance or legal approval guarantees
2. No account signup/login
3. No long-term permanent archive beyond retention window
4. No enterprise policy engine

## Metrics to Validate Journey Quality

1. Time to first document generated
2. Snapshot restore success rate
3. Conflict incidence and conflict recovery rate
4. Generate success rate
5. Average completion time per workspace session
6. Session-to-download conversion rate

## Definition of Done for Journey

1. A first-time user can create, edit, version, generate, and download within one session link.
2. Two simultaneous editors can collaborate without data loss.
3. Session expiry is enforced and communicated.
4. Generated outputs reflect latest restored revision state.
