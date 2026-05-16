# Notification System Design

---

# Stage 1

## Core Actions

The notification platform must support the following core actions:

| # | Action | Description |
|---|--------|-------------|
| 1 | Fetch all notifications | Retrieve a paginated list of all notifications for the logged-in user |
| 2 | Fetch unread notifications | Retrieve only unread notifications for the user |
| 3 | Mark notification as read | Mark a single notification as read |
| 4 | Mark all as read | Bulk-mark every unread notification as read |
| 5 | Get notification by ID | Retrieve the full details of a specific notification |
| 6 | Get unread count | Return the count of unread notifications (badge) |
| 7 | Filter by type | Fetch notifications filtered by type (Event / Result / Placement) |
| 8 | Create notification | Admin/system creates a new notification for one or more users |
| 9 | Delete notification | Remove a notification from the user's inbox |

---

## REST API Endpoints

### Common Headers (All Requests)

```json
{
  "Content-Type": "application/json",
  "Accept": "application/json",
  "Authorization": "Bearer <jwt_token>",
  "X-Request-Id": "<uuid>"
}
```

### Common Response Headers

```json
{
  "Content-Type": "application/json",
  "X-Request-Id": "<uuid>",
  "X-RateLimit-Remaining": "<number>"
}
```

---

### 1. GET /api/notifications

Fetch paginated notifications for the authenticated user.

**Query Parameters:**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| page | integer | 1 | Page number |
| limit | integer | 20 | Items per page (max 100) |
| notification_type | string | — | Filter: `Event`, `Result`, `Placement` |
| is_read | boolean | — | Filter read/unread |
| sort | string | `createdAt:desc` | Sort field and order |

**Response (200 OK):**

```json
{
  "success": true,
  "data": {
    "notifications": [
      {
        "id": "d146095a-0d86-4a34-9e69-3900a14576bc",
        "type": "Result",
        "message": "mid-sem",
        "isRead": false,
        "createdAt": "2026-04-22T17:51:30Z",
        "updatedAt": "2026-04-22T17:51:30Z"
      }
    ],
    "pagination": {
      "currentPage": 1,
      "totalPages": 5,
      "totalItems": 98,
      "limit": 20
    }
  }
}
```

**Error Response (401 Unauthorized):**

```json
{
  "success": false,
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Invalid or missing authentication token"
  }
}
```

---

### 2. GET /api/notifications/:id

Fetch a single notification by its ID.

**Response (200 OK):**

```json
{
  "success": true,
  "data": {
    "id": "d146095a-0d86-4a34-9e69-3900a14576bc",
    "type": "Result",
    "message": "mid-sem",
    "isRead": true,
    "createdAt": "2026-04-22T17:51:30Z",
    "updatedAt": "2026-04-22T17:52:00Z"
  }
}
```

**Error Response (404 Not Found):**

```json
{
  "success": false,
  "error": {
    "code": "NOT_FOUND",
    "message": "Notification not found"
  }
}
```

---

### 3. PATCH /api/notifications/:id/read

Mark a single notification as read.

**Request Body:** _(empty)_

**Response (200 OK):**

```json
{
  "success": true,
  "data": {
    "id": "d146095a-0d86-4a34-9e69-3900a14576bc",
    "isRead": true,
    "updatedAt": "2026-04-22T17:55:00Z"
  }
}
```

---

### 4. PATCH /api/notifications/read-all

Mark all notifications as read for the authenticated user.

**Request Body:** _(empty)_

**Response (200 OK):**

```json
{
  "success": true,
  "data": {
    "modifiedCount": 12
  }
}
```

---

### 5. GET /api/notifications/unread-count

Get the count of unread notifications (for badge display).

**Response (200 OK):**

```json
{
  "success": true,
  "data": {
    "unreadCount": 12
  }
}
```

---

### 6. POST /api/notifications

Create a new notification (system/admin endpoint).

**Request Body:**

```json
{
  "studentIds": ["1042", "1043", "1044"],
  "type": "Placement",
  "message": "CSX Corporation hiring"
}
```

**Response (201 Created):**

```json
{
  "success": true,
  "data": {
    "notificationId": "b283218f-ea5a-4b7c-93a9-1f2f240d64b0",
    "recipientCount": 3,
    "createdAt": "2026-04-22T17:51:18Z"
  }
}
```

---

### 7. DELETE /api/notifications/:id

Delete a notification.

**Response (200 OK):**

```json
{
  "success": true,
  "data": {
    "deleted": true
  }
}
```

---

## Real-Time Notification Mechanism

### Approach: Server-Sent Events (SSE) + Fallback Polling

**Why SSE over WebSockets?**

| Criteria | SSE | WebSocket |
|----------|-----|-----------|
| Direction | Server → Client (sufficient for notifications) | Bidirectional |
| Complexity | Simple HTTP | Requires upgrade handshake |
| Reconnection | Built-in auto-reconnect | Manual implementation |
| Load balancers | Works out of the box | Needs sticky sessions |
| Browser support | All modern browsers | All modern browsers |

Notifications are inherently **unidirectional** (server pushes to client). SSE is simpler, lighter, and natively handles reconnection. For the rare case where SSE is unavailable, the client falls back to polling every 30 seconds.

### SSE Endpoint

**GET /api/notifications/stream**

```
Headers:
  Accept: text/event-stream
  Authorization: Bearer <jwt_token>

Response (200, Content-Type: text/event-stream):
  event: notification
  data: {"id":"abc123","type":"Placement","message":"CSX Corp hiring","createdAt":"2026-04-22T17:51:18Z"}

  event: heartbeat
  data: {"timestamp":"2026-04-22T17:52:00Z"}
```

The server sends a `heartbeat` event every 30 seconds to keep the connection alive. When a new notification is created via `POST /api/notifications`, the backend publishes an event to the SSE channel for each recipient who has an active connection.

---

# Stage 2

## Persistent Storage Choice: PostgreSQL

### Why PostgreSQL?

| Factor | PostgreSQL | MongoDB | MySQL |
|--------|-----------|---------|-------|
| ACID compliance | Full | Limited (multi-doc txns since 4.0) | Full |
| JSON support | Native JSONB with indexing | Native | JSON type (no indexing) |
| Indexing | Partial, expression, GIN, GiST | Secondary indexes | B-Tree, Full-text |
| Partitioning | Native range/list/hash | Sharding | Limited |
| Enum types | Native ENUM | No native enum | Native ENUM |
| Scalability | Read replicas, partitioning | Horizontal sharding | Read replicas |
| Community | Excellent | Excellent | Excellent |

**Decision:** PostgreSQL is chosen because:

1. **Structured schema** — Notifications have a well-defined schema (id, type, message, isRead, studentID, timestamps). A relational model fits naturally.
2. **ACID guarantees** — When marking notifications as read or bulk operations, we need transactional consistency.
3. **Powerful indexing** — Composite indexes, partial indexes (e.g., only on `isRead = false` rows) dramatically speed up common queries.
4. **Enum support** — `notification_type` maps cleanly to PostgreSQL `ENUM`.
5. **Partitioning** — As data grows, we can partition by date range without application changes.

---

## Database Schema

```sql
-- Enum for notification types
CREATE TYPE notification_type AS ENUM ('Event', 'Result', 'Placement');

-- Students table
CREATE TABLE students (
    id              SERIAL PRIMARY KEY,
    student_id      VARCHAR(20) UNIQUE NOT NULL,
    name            VARCHAR(255) NOT NULL,
    email           VARCHAR(255) UNIQUE NOT NULL,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Notifications table
CREATE TABLE notifications (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id      INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    type            notification_type NOT NULL,
    message         TEXT NOT NULL,
    is_read         BOOLEAN DEFAULT FALSE,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for common query patterns
CREATE INDEX idx_notifications_student_unread
    ON notifications (student_id, is_read, created_at DESC)
    WHERE is_read = FALSE;

CREATE INDEX idx_notifications_student_type
    ON notifications (student_id, type, created_at DESC);

CREATE INDEX idx_notifications_created_at
    ON notifications (created_at DESC);
```

### Schema Design Rationale

- **UUID for notification ID** — Globally unique, safe for distributed systems, avoids sequential ID guessing.
- **Foreign key to students** — Enforces referential integrity; cascading delete cleans up when a student is removed.
- **Partial index on `is_read = FALSE`** — Most queries fetch *unread* notifications. A partial index only indexes the unread rows, keeping the index small and fast even with millions of records.
- **Composite index `(student_id, is_read, created_at DESC)`** — Covers the most common query: "get unread notifications for a student, newest first."

---

## Problems as Data Volume Increases

### Problem 1: Table Bloat — Slow Sequential Scans

**Cause:** With millions of rows, queries without proper indexes degrade to full table scans.

**Solution:** Table partitioning by date range.

```sql
CREATE TABLE notifications (
    id              UUID DEFAULT gen_random_uuid(),
    student_id      INTEGER NOT NULL,
    type            notification_type NOT NULL,
    message         TEXT NOT NULL,
    is_read         BOOLEAN DEFAULT FALSE,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (id, created_at)
) PARTITION BY RANGE (created_at);

-- Monthly partitions
CREATE TABLE notifications_2026_01 PARTITION OF notifications
    FOR VALUES FROM ('2026-01-01') TO ('2026-02-01');
CREATE TABLE notifications_2026_02 PARTITION OF notifications
    FOR VALUES FROM ('2026-02-01') TO ('2026-03-01');
-- ... auto-create future partitions via pg_partman or cron job
```

### Problem 2: Hot Index — Write Amplification

**Cause:** Every INSERT updates all indexes. With high notification volume (50k students × multiple events), index maintenance becomes a bottleneck.

**Solution:**
- Use partial indexes (only index `is_read = FALSE` rows — a much smaller set).
- Archive old read notifications to a separate `notifications_archive` table periodically.

### Problem 3: Connection Pool Exhaustion

**Cause:** 50,000 students hitting the API simultaneously exhausts database connections.

**Solution:** Use PgBouncer for connection pooling and implement read replicas for GET queries.

---

## SQL Queries for REST API Endpoints

### GET /api/notifications (fetch paginated notifications)

```sql
SELECT id, type, message, is_read, created_at, updated_at
FROM notifications
WHERE student_id = $1
ORDER BY created_at DESC
LIMIT $2 OFFSET $3;
```

### GET /api/notifications?is_read=false (fetch unread)

```sql
SELECT id, type, message, is_read, created_at, updated_at
FROM notifications
WHERE student_id = $1 AND is_read = FALSE
ORDER BY created_at DESC
LIMIT $2 OFFSET $3;
```

### GET /api/notifications?notification_type=Placement

```sql
SELECT id, type, message, is_read, created_at, updated_at
FROM notifications
WHERE student_id = $1 AND type = 'Placement'
ORDER BY created_at DESC
LIMIT $2 OFFSET $3;
```

### GET /api/notifications/unread-count

```sql
SELECT COUNT(*) AS unread_count
FROM notifications
WHERE student_id = $1 AND is_read = FALSE;
```

### PATCH /api/notifications/:id/read

```sql
UPDATE notifications
SET is_read = TRUE, updated_at = NOW()
WHERE id = $1 AND student_id = $2
RETURNING id, is_read, updated_at;
```

### PATCH /api/notifications/read-all

```sql
UPDATE notifications
SET is_read = TRUE, updated_at = NOW()
WHERE student_id = $1 AND is_read = FALSE;
```

### POST /api/notifications

```sql
INSERT INTO notifications (student_id, type, message)
VALUES ($1, $2, $3)
RETURNING id, type, message, is_read, created_at;
```

### DELETE /api/notifications/:id

```sql
DELETE FROM notifications
WHERE id = $1 AND student_id = $2
RETURNING id;
```

---

# Stage 3

## Query Analysis

The original slow query:

```sql
SELECT * FROM notifications
WHERE studentID = 1042 AND isRead = false
ORDER BY createdAt ASC;
```

### Is this query accurate?

**Partially.** The query is functionally correct — it fetches all unread notifications for student 1042 ordered by creation time. However, several issues exist:

1. **`SELECT *` is wasteful** — It fetches all columns including potentially large TEXT fields. The API likely only needs `id`, `type`, `message`, `created_at`.
2. **`ORDER BY createdAt ASC`** — Users typically want the *newest* notifications first (`DESC`), not oldest first.
3. **No pagination (`LIMIT`/`OFFSET`)** — With 5 million rows, even if only 500 belong to this student, returning all at once is unnecessary.

### Why is it slow?

With 50,000 students and 5,000,000 notifications (average ~100 per student):

1. **No composite index on `(studentID, isRead, createdAt)`** — The DB must do a sequential scan or use a suboptimal single-column index.
2. **`SELECT *`** — Forces the DB to read full rows from the heap even if an index-only scan could suffice.
3. **No LIMIT** — The DB must sort *all* matching rows before returning.

**Likely computation cost without indexes:** Full table scan = O(5,000,000 rows). Even with a single index on `studentID`, sorting the filtered rows on `createdAt` requires an in-memory or disk sort.

### Should we add indexes on every column?

**No. This is bad advice.** Here's why:

| Factor | More Indexes (every column) | Targeted Indexes |
|--------|-----------------------------|------------------|
| Write performance | ❌ Severely degraded — every INSERT/UPDATE must update all indexes | ✅ Minimal overhead |
| Storage | ❌ Each index is ~20-40% of table size | ✅ Only what's needed |
| Planner confusion | ❌ Optimizer may choose suboptimal index | ✅ Clear, optimal path |
| Read performance | ❌ Single-column indexes rarely help multi-column WHERE clauses | ✅ Composite indexes cover exact query patterns |

**The correct approach:** Create targeted composite indexes that match actual query patterns.

### Optimized Query

```sql
SELECT id, type, message, created_at
FROM notifications
WHERE student_id = 1042 AND is_read = FALSE
ORDER BY created_at DESC
LIMIT 20 OFFSET 0;
```

### Required Index

```sql
CREATE INDEX idx_notifications_student_unread
    ON notifications (student_id, is_read, created_at DESC)
    WHERE is_read = FALSE;
```

This **partial composite index** is optimal because:
- It only indexes unread rows (much smaller than the full table)
- Column order matches the WHERE clause + ORDER BY
- The DB can do an **index-only scan** if we avoid `SELECT *`

### Query: Find all students with a placement notification in the last 7 days

```sql
SELECT DISTINCT s.student_id, s.name, s.email, n.message, n.created_at
FROM notifications n
JOIN students s ON s.id = n.student_id
WHERE n.type = 'Placement'
  AND n.created_at >= NOW() - INTERVAL '7 days'
ORDER BY n.created_at DESC;
```

**Supporting index:**

```sql
CREATE INDEX idx_notifications_type_date
    ON notifications (type, created_at DESC);
```

---

# Stage 4

## Problem Statement

Notifications are fetched from the database on **every page load** for every student. With 50,000 students and frequent page loads, the DB is overwhelmed, causing a poor user experience.

## Solution Architecture

### Strategy 1: Application-Level Caching with Redis

**How it works:**
- On first page load, fetch notifications from PostgreSQL and store in Redis with key `notifications:{studentId}`.
- Set TTL of 60 seconds.
- Subsequent page loads within TTL serve from Redis (sub-millisecond).
- When a new notification is created, invalidate the cache for affected students.

```
Page Load → Check Redis → HIT? Return cached → MISS? Query PostgreSQL → Store in Redis → Return
```

**Tradeoffs:**

| Pros | Cons |
|------|------|
| ⚡ Sub-millisecond reads | 💾 Additional infrastructure (Redis) |
| 📉 90%+ reduction in DB queries | ⚠️ Cache invalidation complexity |
| 🔄 Simple to implement | 📊 Stale data possible within TTL window |

---

### Strategy 2: HTTP Caching with ETags + CDN

**How it works:**
- Backend generates an ETag (hash of notification data) with each response.
- Client sends `If-None-Match` header on subsequent requests.
- If data hasn't changed, backend returns `304 Not Modified` (no body).

**Tradeoffs:**

| Pros | Cons |
|------|------|
| 📉 Reduces response payload | 🗃️ Still hits the backend on every request |
| 🌐 Standard HTTP — no extra infra | ❌ Does not reduce DB load significantly |
| 🔌 Works with CDNs | ⚠️ ETag computation has its own cost |

---

### Strategy 3: Client-Side Caching + SSE for Updates

**How it works:**
- Client fetches notifications once and stores in local state (React state / localStorage).
- Client opens an SSE connection for real-time updates.
- New notifications arrive via SSE and are prepended to the local list.
- Full re-fetch only on page hard refresh.

**Tradeoffs:**

| Pros | Cons |
|------|------|
| 📉 Near-zero DB load after initial fetch | 💻 Increases client complexity |
| ⚡ Instant updates via SSE | 🔌 SSE connections consume server memory |
| 🔄 No stale data | ❌ Not suitable for users who clear cache often |

---

### Strategy 4: Database Query Optimization + Read Replicas

**How it works:**
- Route all read queries (GET notifications) to read replicas.
- Use materialized views for common queries (unread count, latest 20).
- Refresh materialized views every 30 seconds.

**Tradeoffs:**

| Pros | Cons |
|------|------|
| 🗃️ Offloads primary DB | 💰 Read replicas cost $$ |
| 🔄 No cache invalidation needed | ⏱️ Replication lag (seconds) |
| 📊 Materialized views are fast | 🔄 View refresh adds load |

---

### Recommended Combination

**Use Strategy 1 (Redis) + Strategy 3 (SSE):**

1. **Redis** as a read-through cache with 60-second TTL eliminates 90%+ of DB reads.
2. **SSE** keeps clients updated in real-time without polling.
3. **Cache invalidation** on write: when `POST /api/notifications` is called, delete the Redis key for affected students and push the event via SSE.

This combination reduces DB load by ~95% while keeping data fresh.

---

# Stage 5

## Analysis of the Proposed Implementation

```
function notify_all(student_ids: array, message: string):
    for student_id in student_ids:
        send_email(student_id, message)     # calls Email API
        save_to_db(student_id, message)      # DB insert
        push_to_app(student_id, message)     # real-time push
```

### Shortcomings

1. **Sequential processing** — 50,000 students are processed one-by-one. If each iteration takes ~200ms (email API call + DB insert + push), total time = 50,000 × 200ms = **~2.7 hours**.

2. **No error handling / retry** — If `send_email` fails for student #200, the loop continues. Those 200 students never get their email and there's no record of the failure.

3. **Atomic coupling** — Email, DB, and push are tightly coupled. If the email API is slow or down, it blocks DB inserts and push notifications too.

4. **No idempotency** — If the process crashes at student #25,000 and is restarted, students 1-25,000 get duplicate notifications.

5. **Single point of failure** — Runs on a single thread/process. If it crashes, the entire batch fails.

### What happened: `send_email` failed for 200 students

Since there's no error handling, those 200 students' emails are lost forever. The DB insert and push for those students *did* execute (they're after `send_email` in the code, but there's no rollback), OR they *didn't* execute (if `send_email` threw an exception that broke the loop). Either way, the system is in an inconsistent state.

### Should saving to DB and sending email happen together?

**No, they should NOT be tightly coupled.** Here's why:

- **DB insert is fast and reliable** (~5ms). It should always succeed first.
- **Email sending is slow and unreliable** (~200ms, depends on external API). It should be asynchronous.
- **Decoupling ensures consistency:** The notification is recorded in the DB immediately. Email delivery is a best-effort side effect processed asynchronously.

If they happen together (in a transaction), a slow email API would hold the DB transaction open, exhausting the connection pool.

### Redesigned Implementation

```
function notify_all(student_ids: array, message: string):
    // Step 1: Generate a unique batch ID for idempotency
    batch_id = generate_uuid()
    
    // Step 2: Bulk insert ALL notifications into DB in one query
    notification_records = []
    for student_id in student_ids:
        notification_records.append({
            id: generate_uuid(),
            student_id: student_id,
            message: message,
            batch_id: batch_id,
            email_status: "PENDING",
            push_status: "PENDING",
            created_at: now()
        })
    
    bulk_insert_to_db(notification_records)  // Single batch INSERT
    logger.info("Batch inserted", { batch_id, count: len(student_ids) })
    
    // Step 3: Push to message queue in chunks for async processing
    chunks = split_into_chunks(notification_records, chunk_size=500)
    for chunk in chunks:
        message_queue.publish("email_channel", {
            batch_id: batch_id,
            notifications: chunk
        })
        message_queue.publish("push_channel", {
            batch_id: batch_id,
            notifications: chunk
        })
    
    logger.info("All chunks queued", { batch_id, chunks: len(chunks) })
    return { batch_id: batch_id, queued: len(student_ids) }


// ─── Async Email Worker (runs independently) ───
function email_worker():
    while true:
        job = message_queue.consume("email_channel")
        for notification in job.notifications:
            try:
                send_email(notification.student_id, notification.message)
                update_db(notification.id, { email_status: "SENT" })
                logger.info("Email sent", { id: notification.id })
            catch error:
                update_db(notification.id, { email_status: "FAILED" })
                logger.error("Email failed", { id: notification.id, error })
                // Re-queue for retry with exponential backoff
                message_queue.publish("email_retry_channel", {
                    notification: notification,
                    retry_count: job.retry_count + 1,
                    retry_after: exponential_backoff(job.retry_count)
                })


// ─── Async Push Worker (runs independently) ───
function push_worker():
    while true:
        job = message_queue.consume("push_channel")
        for notification in job.notifications:
            try:
                push_to_app(notification.student_id, notification.message)
                update_db(notification.id, { push_status: "SENT" })
            catch error:
                update_db(notification.id, { push_status: "FAILED" })
                logger.error("Push failed", { id: notification.id, error })
                message_queue.publish("push_retry_channel", {
                    notification: notification,
                    retry_count: job.retry_count + 1
                })
```

### Key Improvements

| Aspect | Before | After |
|--------|--------|-------|
| Speed | Sequential (~2.7 hrs) | Bulk DB insert (<1s) + parallel async workers (~minutes) |
| Fault tolerance | None — crash loses everything | DB has all records; failed emails are retried |
| Email failures | Lost forever | Tracked per-notification, retried with backoff |
| Idempotency | None | `batch_id` prevents duplicate processing on restart |
| Observability | None | Every step logged with correlation IDs |
| DB + Email coupling | Tightly coupled | Fully decoupled via message queue |

---

# Stage 6

## Priority Inbox — Approach & Implementation

### Priority Scoring System

Notifications are ranked using a composite score based on **type weight** and **recency**:

| Type | Weight | Rationale |
|------|--------|-----------|
| Placement | 3 | Directly impacts career — highest urgency |
| Result | 2 | Academic outcomes — time-sensitive |
| Event | 1 | Informational — lowest urgency |

**Score formula:**

```
score = (typeWeight × 10^15) + timestamp_in_milliseconds
```

This guarantees that type is the primary sort key. Within the same type, more recent notifications rank higher.

### Data Structure: Min-Heap of Size N

To find the **top N** out of M notifications efficiently, we use a **Min-Heap** capped at size N:

1. Iterate through all M notifications.
2. For each notification, compute its priority score.
3. If the heap has fewer than N items, insert directly — O(log N).
4. If the heap is full and the new item's score > root (minimum), replace root and heapify down — O(log N).
5. If the new item's score ≤ root, skip — O(1).

**Time Complexity:** O(M log N) — far better than sorting all M items at O(M log M).
**Space Complexity:** O(N) — only N items in memory at any time.

### Maintaining Top N with Streaming Data

As new notifications arrive in real-time (via SSE), the top-N list is updated **incrementally**:

1. **Persistent MinHeap in Redis:**
   ```
   ZADD priority_inbox:<studentId> <score> <notificationJSON>
   ZREMRANGEBYRANK priority_inbox:<studentId> 0 -(N+1)
   ```
   Redis sorted sets maintain order automatically. `ZREMRANGEBYRANK` trims to keep only top N.

2. **On new notification:**
   - Compute score
   - `ZADD` the notification (Redis handles ordering)
   - Trim if size > N
   - Cost: O(log N) per insert

3. **On read:**
   - `ZREVRANGE priority_inbox:<studentId> 0 N-1` returns top N in descending priority
   - Cost: O(N)

### Implementation

The working code is in `stage6-priority-inbox/priority-inbox.js`. It:

- Fetches notifications from the evaluation API (`http://4.224.186.213/evaluation-service/notifications`)
- Falls back to sample data matching the API schema if the API returns 401
- Uses a custom MinHeap to extract top 10 priority notifications
- Uses the custom logging middleware exclusively (no `console.log`)
- Outputs a formatted table of the top 10 results

### Output

The program correctly ranks all Placement notifications first (highest priority), followed by Result, then Event. Within each type, more recent notifications appear first.
