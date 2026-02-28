# EEvolution 2.0 | Digital Hub for Batch 2

![EEvolution 2.0 Banner](https://api.dicebear.com/9.x/shapes/svg?seed=EEvolution2&backgroundColor=00e1ff)

**EEvolution 2.0** is a centralized, live digital headquarters designed for students of the **Electrical Engineering Batch 2 at Haldia Institute of Technology**.

---

## 🌐 Live Application
This project is fully functional and deployed. Instead of cloning to understand the system, we encourage you to explore the **Web Architecture** described below to see how a high-performance, real-time application is built using pure Vanilla JavaScript and Serverless technologies.

---

## 🏗️ Web Architecture

EEvolution 2.0 follows a **Decoupled Serverless Architecture** designed for speed, scalability, and zero maintenance.

### 1. Frontend: The "Ultra-Light" SPA
*   **Architecture Pattern**: Single Page Application (SPA).
*   **Routing**: State-based fragment routing (`window.location.hash`). Navigation is handled by a central `navigateTo()` function that toggles DOM visibility without a single browser refresh.
*   **No Frameworks**: Built using pure **Vanilla JavaScript**. This eliminates virtual DOM overhead and provides the fastest possible execution time on low-end mobile devices common in student environments.
*   **Template Engine**: Uses JS Template Literals for dynamic component rendering (Feed posts, Memories gallery, Subjects list), making the UI feel reactive and alive.

### 2. Hybrid Data Management Strategy
The app uses two distinct data layers to optimize performance:
*   **Layer A: Local JSON Dictionaries (`/data`)**: Static and slow-changing data (Student lists, MOOCs points tables, Course modules) are stored in optimized JSON files. This prevents expensive database queries for data that doesn't change frequently.
*   **Layer B: Real-time Cloud Store (Supabase)**: User-generated content (Batch Feed, Memories, Profiles, Leaderboards) is stored in a hosted PostgreSQL database.

### 3. Backend-as-a-Service (BaaS)
We leverage **Supabase** for critical infrastructure:
*   **Authentication**: Secure JWT-based registration and login, including automated roll-number verification logic.
*   **PostgreSQL Database**: Handles all relational data with Row Level Security (RLS) for data protection.
*   **Real-time Engine**: The Batch Feed uses **Postgres Changes** (WebSockets) to instantly push new posts to all active users without them needing to refresh the page.

### 4. UI/UX Style System
*   **Atomic CSS**: A custom-built style system in `css/style.css` using CSS Variables for instant global theme switching (Electric Blue, Emerald, Royal Purple, etc.).
*   **Mobile-First Design**: The architecture prioritizes mobile viewport scaling, essential for students accessing class notes on the go.

---

## 🚀 Key Features
*   **Exclusive Verification**: Only verified Batch 2 members (matched via `students.json`) can register.
*   **Guest Mode**: Unverified users get read-only access to resources but cannot post to the community feed.
*   **Evo-Coins & Gamification**: A reward system that tracks student contributions and contributions.
*   **Study Repository**: Organized access to Evo-Digests, Lab Notes, and archived semesters.

---

## 📁 Project Map for Code Reviewers

*   [`index.html`](index.html): The main entry point and UI structure.
*   [`js/app.js`](js/app.js): The "Brain" - Handles the SPA navigation, home data rendering, and subject selection.
*   [`js/global-auth.js`](js/global-auth.js): The "Gatekeeper" - Manages sessions, guest-mode restrictions, and the profile system.
*   [`js/feed-memories.js`](js/feed-memories.js): The "Social Engine" - Integrates Supabase Real-time for the community feed.
*   [`data/`](data/): The "Knowledge Base" - Local JSON files providing instant reference data.

---

**Sparked with ❤️ for Electrical Engineering Batch 2.**  
Architect & Lead Developer: **Sayan Maity**
