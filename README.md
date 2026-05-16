# Campus Hiring Evaluation - Full Stack

This repository contains the complete submission for the Affordmed Campus Hiring Evaluation (Full Stack role). The assessment revolves around designing and implementing a real-time campus notification platform for students (placements, events, and results).

## Project Structure & Deliverables

The evaluation is broken down into multiple stages, from foundational middleware development to system architecture design, and ultimately a full-stack implementation. 

### 1. `logging-middleware/` (Pre-Test Setup)
A custom Node.js logging middleware built to replace standard console logging.
- Supports structured JSON logs.
- Implements 5 log levels (DEBUG, INFO, WARN, ERROR, FATAL).


### 2. `notification_system_design.md` (Stages 1-5)
A comprehensive architectural and design markdown document containing:
- **Stage 1**: REST API Endpoints, JSON schemas, and Server-Sent Events (SSE) strategy for real-time notifications.
- **Stage 2**: Database selection (PostgreSQL), full DB schema, query logic, and strategies for scaling data volume.
- **Stage 3**: SQL Query analysis and optimization using partial composite indexes.
- **Stage 4**: Multi-tier performance optimization strategies (Redis read-through cache + SSE) to handle heavy DB loads.
- **Stage 5**: Redesign of a synchronous, failing bulk-email architecture into a decoupled, asynchronous message-queue-based architecture.

### 3. `stage6-priority-inbox/` (Stage 6)
A Node.js implementation of a "Priority Inbox" algorithm.
- Uses a **Min-Heap** data structure to extract the top 10 most important unread notifications efficiently in `O(M log N)` time.


### 4. `stage7-frontend/` (Stage 7)
A production-ready responsive frontend application built with **Next.js** and **Material UI**.
- Features a dark-themed, premium UI with smooth micro-animations and gradients.

