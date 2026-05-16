/**
 * Stage 6 — Priority Inbox
 *
 * Fetches notifications from the evaluation API and displays the
 * top N most important unread notifications using a Min-Heap.
 *
 * Priority weights:
 *   Placement = 3 (highest)
 *   Result    = 2
 *   Event     = 1 (lowest)
 *
 * Tie-breaking: more recent notifications rank higher.
 *
 * Uses the custom logging middleware (no console.log).
 */

const path = require('path');
const { Logger } = require(path.join(__dirname, '..', 'logging-middleware'));
const axios = require('axios');

// ─── Configuration ───────────────────────────────────────────
const API_URL = 'http://4.224.186.213/evaluation-service/notifications';
const TOP_N = 10;

const logger = new Logger({
  level: 'DEBUG',
  serviceName: 'priority-inbox',
  enableFile: true,
  logDir: path.join(__dirname, 'logs'),
  enableColors: true,
});

// ─── Priority Weights ────────────────────────────────────────
const TYPE_WEIGHT = {
  Placement: 3,
  Result: 2,
  Event: 1,
};

/**
 * Calculate a priority score for a notification.
 * Higher score = higher priority.
 *
 * Score = (typeWeight * 1e15) + timestamp_ms
 *
 * This ensures type is the primary sort key and recency is the
 * secondary sort key within the same type.
 */
function computeScore(notification) {
  const typeWeight = TYPE_WEIGHT[notification.Type] || 0;
  const timestampMs = new Date(notification.Timestamp).getTime();
  return typeWeight * 1e15 + timestampMs;
}

// ─── Min-Heap Implementation ────────────────────────────────
// We maintain a min-heap of size N. The root is the LOWEST priority
// item in our top-N set. When a new item has higher priority than
// the root, we replace the root and heapify down.
// This gives O(M log N) to find top N out of M notifications.

class MinHeap {
  constructor(maxSize) {
    this.maxSize = maxSize;
    this.heap = [];
  }

  _parent(i) { return Math.floor((i - 1) / 2); }
  _left(i) { return 2 * i + 1; }
  _right(i) { return 2 * i + 2; }

  _swap(i, j) {
    [this.heap[i], this.heap[j]] = [this.heap[j], this.heap[i]];
  }

  _heapifyUp(i) {
    while (i > 0 && this.heap[i].score < this.heap[this._parent(i)].score) {
      this._swap(i, this._parent(i));
      i = this._parent(i);
    }
  }

  _heapifyDown(i) {
    const n = this.heap.length;
    let smallest = i;
    const left = this._left(i);
    const right = this._right(i);

    if (left < n && this.heap[left].score < this.heap[smallest].score) {
      smallest = left;
    }
    if (right < n && this.heap[right].score < this.heap[smallest].score) {
      smallest = right;
    }
    if (smallest !== i) {
      this._swap(i, smallest);
      this._heapifyDown(smallest);
    }
  }

  /**
   * Offer a notification to the heap.
   * If heap is not full, insert directly.
   * If heap is full and new item has higher score than root,
   * replace root and heapify down.
   */
  offer(item) {
    if (this.heap.length < this.maxSize) {
      this.heap.push(item);
      this._heapifyUp(this.heap.length - 1);
      return true;
    } else if (item.score > this.heap[0].score) {
      this.heap[0] = item;
      this._heapifyDown(0);
      return true;
    }
    return false;
  }

  /**
   * Extract all items sorted by descending score (highest priority first).
   */
  getSorted() {
    return [...this.heap].sort((a, b) => b.score - a.score);
  }

  size() {
    return this.heap.length;
  }
}

// ─── Fetch Notifications from API ────────────────────────────
async function fetchNotifications() {
  logger.info('Fetching notifications from API', { url: API_URL });

  try {
    const response = await axios.get(API_URL, {
      timeout: 10000,
      headers: { 'Accept': 'application/json' },
    });

    const data = response.data;
    const notifications = data.notifications || [];
    logger.info('Notifications fetched successfully', { count: notifications.length });
    return notifications;
  } catch (error) {
    logger.error('Failed to fetch notifications from API', {
      status: error.response?.status,
      message: error.message,
    });

    // Fallback: use sample data matching the API schema
    logger.warn('Using sample notification data as fallback');
    return getSampleNotifications();
  }
}

/**
 * Sample data matching the exact API response schema shown in the assignment.
 */
function getSampleNotifications() {
  return [
    { ID: "d146095a-0d86-4a34-9e69-3900a14576bc", Type: "Result", Message: "mid-sem", Timestamp: "2026-04-22 17:51:30" },
    { ID: "b283218f-ea5a-4b7c-93a9-1f2f240d64b0", Type: "Placement", Message: "CSX Corporation hiring", Timestamp: "2026-04-22 17:51:18" },
    { ID: "81589ada-0ad3-4f77-9554-f52fb558e09d", Type: "Event", Message: "farewell", Timestamp: "2026-04-22 17:51:06" },
    { ID: "0005513a-142b-4bbc-8678-eefec65e1ede", Type: "Result", Message: "mid-sem", Timestamp: "2026-04-22 17:50:54" },
    { ID: "ea836726-c25e-4f21-a72f-544a6af8a37f", Type: "Result", Message: "project-review", Timestamp: "2026-04-22 17:50:42" },
    { ID: "003cb427-8fc6-47f7-bb00-be228f6b0d2c", Type: "Result", Message: "external", Timestamp: "2026-04-22 17:50:30" },
    { ID: "e5c4ff20-31bf-4d40-8f02-72fda59e8918", Type: "Result", Message: "project-review", Timestamp: "2026-04-22 17:50:18" },
    { ID: "1cfce5ee-ad37-4894-8946-d707627176a5", Type: "Event", Message: "tech-fest", Timestamp: "2026-04-22 17:50:06" },
    { ID: "cf2885a6-45ac-4ba0-b548-6e9e9d4c52c8", Type: "Result", Message: "project-review", Timestamp: "2026-04-22 17:49:54" },
    { ID: "8a7412bd-6065-4d09-8501-a37f11cc848b", Type: "Placement", Message: "Advanced Micro Devices Inc. hiring", Timestamp: "2026-04-22 17:49:42" },
    { ID: "a1b2c3d4-e5f6-7890-abcd-ef1234567890", Type: "Placement", Message: "Google LLC campus drive", Timestamp: "2026-04-22 17:49:30" },
    { ID: "f9e8d7c6-b5a4-3210-fedc-ba0987654321", Type: "Event", Message: "orientation-day", Timestamp: "2026-04-22 17:49:18" },
    { ID: "11223344-5566-7788-99aa-bbccddeeff00", Type: "Result", Message: "final-exam", Timestamp: "2026-04-22 17:49:06" },
    { ID: "aabbccdd-eeff-0011-2233-445566778899", Type: "Placement", Message: "Microsoft internship 2026", Timestamp: "2026-04-22 17:48:54" },
    { ID: "deadbeef-cafe-babe-face-123456789abc", Type: "Event", Message: "hackathon-2026", Timestamp: "2026-04-22 17:48:42" },
  ];
}

// ─── Main: Find Top N Priority Notifications ─────────────────
async function findTopPriorityNotifications() {
  logger.info('=== Priority Inbox — Starting ===', { topN: TOP_N });

  const notifications = await fetchNotifications();

  if (notifications.length === 0) {
    logger.warn('No notifications found');
    return [];
  }

  // Build a min-heap of size TOP_N
  const heap = new MinHeap(TOP_N);

  for (const notif of notifications) {
    const score = computeScore(notif);
    heap.offer({ ...notif, score });
  }

  const topN = heap.getSorted();

  // ─── Display Results ─────────────────────────────────────
  logger.info(`\n${'═'.repeat(90)}`);
  logger.info(`  PRIORITY INBOX — Top ${TOP_N} Notifications`);
  logger.info(`${'═'.repeat(90)}`);

  logger.info(
    `${'Rank'.padEnd(6)}${'Type'.padEnd(14)}${'Message'.padEnd(40)}${'Timestamp'.padEnd(24)}${'Score'}`
  );
  logger.info(`${'─'.repeat(90)}`);

  topN.forEach((notif, index) => {
    const rank = `#${index + 1}`.padEnd(6);
    const type = (notif.Type || '').padEnd(14);
    const message = (notif.Message || '').padEnd(40);
    const timestamp = (notif.Timestamp || '').padEnd(24);
    const score = notif.score.toFixed(0);

    logger.info(`${rank}${type}${message}${timestamp}${score}`);
  });

  logger.info(`${'═'.repeat(90)}\n`);
  logger.info('=== Priority Inbox — Complete ===', { displayed: topN.length });

  return topN;
}

// ─── How to Maintain Top 10 Efficiently with Streaming Data ──
//
// As new notifications keep arriving, we do NOT need to re-sort the
// entire list. The MinHeap approach is optimal:
//
// 1. Maintain a persistent MinHeap of size N (in memory or Redis).
// 2. When a new notification arrives via SSE/webhook:
//    a. Compute its priority score.
//    b. Call heap.offer(newNotification).
//    c. If the new item's score > heap root's score, it replaces the
//       lowest-priority item in the top N. O(log N) operation.
//    d. If not, discard it. O(1).
// 3. Total cost: O(log N) per incoming notification.
//
// For persistence across restarts, serialize the heap to Redis:
//    ZADD priority_inbox:<studentId> <score> <notificationJson>
//    ZREMRANGEBYRANK priority_inbox:<studentId> 0 -(N+1)
//
// This keeps only the top N items in the sorted set at all times.

// ─── Run ─────────────────────────────────────────────────────
findTopPriorityNotifications().catch((err) => {
  logger.fatal('Unhandled error in Priority Inbox', { error: err.message, stack: err.stack });
  process.exit(1);
});
