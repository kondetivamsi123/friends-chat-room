# Idea Vault Chat Application - Implementation Plan

This plan outlines the transition from the prototype to the full-featured, secure, and real-time "Idea Vault" platform as per the defined functional and technical requirements.

## 1. Architecture Overhaul

### Backend (Python/FastAPI)
- **Framework**: Switching from Flask to **FastAPI** for native `asyncio` and WebSocket support.
- **Database**: **MongoDB** (Async driver: Motor) for Users, Groups, Messages, and Ideas.
- **Authentication**: JWT-based session management.
- **Real-time**: Custom WebSocket manager for low-latency broadcasting (<200ms).

### Frontend (React)
- **State Management**: Handling groups and real-time socket connections.
- **Responsive UI**: Mobile-first design for Android/iOS/Web views.

---

## 2. Database Schema (MongoDB)

### Users
- `_id`, `name`, `email`, `password_hash`, `avatar`, `last_seen`, `status` (Online/Offline)

### Groups
- `_id`, `name`, `members[]` (User IDs), `admins[]` (User IDs), `is_private`

### Messages
- `_id`, `group_id`, `sender_id`, `content`, `type` (text/idea), `seen_by[]`, `timestamp`

### Ideas
- `_id`, `origin_msg_id`, `title`, `description`, `category`, `votes[]`, `status` (Brainstorming/Progress/Launched), `assigned_to`

---

## 3. Implementation Phases

### Phase 1: Authentication & Core API [FR-1, FR-2, FR-5]
- Setup FastAPI structure.
- Implementation of `/auth/signup` and `/auth/login`.
- JWT Token validation middleware.
- Create/Join Group logic with visibility rules.

### Phase 2: WebSocket & Real-Time Security [FR-8, FR-9, FR-10]
- WebSocket server for messaging.
- "Gatekeeper" verification: Check `members[]` before broadcasting.
- Typing indicators and Read Receipts.

### Phase 3: The Idea Vault Module [FR-11, FR-12, FR-13, FR-14]
- "Promote" message to Idea.
- Idea management dashboard (Feasibility voting, Status tracking).

### Phase 4: UI Refinement
- Full responsive overhaul.
- One-to-one chat treatment as 2-member groups.

---

## 4. Immediate Next Steps
1. Initialize a new FastAPI backend structure.
2. Setup MongoDB connection.
3. Implement Signup/Login with JWT.
