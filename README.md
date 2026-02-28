# EEvolution 2.0 | Digital Hub for Batch 2

![EEvolution 2.0 Banner](https://api.dicebear.com/9.x/shapes/svg?seed=EEvolution2&backgroundColor=00e1ff)

**EEvolution 2.0** is a centralized web application designed for students of the **Electrical Engineering Batch 2 at Haldia Institute of Technology**. It serves as a digital headquarters for class resources, community interaction, and academic progress tracking.

## 🚀 Key Features

*   **🔒 Secure Student Portal**: Exclusive registration for Batch 2 members with automated roll number verification (via `students.json`).
*   **📚 Study Hub**: Organized repository for class modules, daily Evo-Digests, lab notes, and exam resources.
*   **💬 Private Community Feed**: A secure space for Batch 2 members to share updates, with real-time liking and interaction (powered by Supabase).
*   **📸 Batch Memories**: A digital photo gallery allowing students to relive shared moments with comments and appreciation.
*   **⭐ Points & Credits Engine**: Detailed tracking for Mandatory Additional Requirements (MAR) and MOOCs points.
*   **🏆 Hall of Heroes**: A live leaderboard celebrating top contributors and donators who support the platform.
*   **🎨 Personalized UI**: Interactive avatar selection (DiceBear API), customizable theme colors, and a sleek dark-mode aesthetic.

## 🛠️ Technology Stack

*   **Frontend**: Vanilla JavaScript (ES6+), HTML5, CSS3 (Vanilla).
*   **Database & Auth**: [Supabase](https://supabase.com/) (PostgreSQL & GoTrue).
*   **Icons**: [Phosphor Icons](https://phosphoricons.com/).
*   **Avatars**: [DiceBear API](https://www.dicebear.com/).
*   **Data Store**: Local JSON-based caching for students and academic resources.

## 📁 Project Structure

```text
├── index.html          # Main application gateway (SPA)
├── auth.html           # Authentication portal (Login/Register)
├── admin.html          # Administrative dashboard
├── reset-password.html # Password recovery UI
├── css/                # Global style system & theme variables
├── js/                 
│   ├── app.js          # Core rendering and navigation logic
│   ├── auth-pages.js   # Registration & verification logic
│   ├── global-auth.js  # Global session & guest-mode management
│   ├── feed-memories.js# Community feed & gallery interaction
│   └── supabase-config.js # Client initialization
└── data/               # JSON-based dictionaries (Students, Donators, etc.)
```

## ⚙️ Setup & Development

1.  **Clone the Repository**:
    ```bash
    git clone https://github.com/sayanjc3639q/eevolution2.0.git
    ```
2.  **Supabase Configuration**:
    Configure your environment in `js/supabase-config.js` with your project URL and Anon Key.
3.  **Local Server**:
    Use "Live Server" (VS Code) or any static file server to launch `index.html`.
4.  **Database Schema**:
    Ensure your Supabase instance has the following tables:
    *   `profiles` (roll_number, name, evo_coins, upload_count, is_batch2_verified, is_admin)
    *   `batch_feed` (content, roll_number, likes, dislikes)
    *   `memories` (student_name, roll_number, image_url, caption)
    *   `memories_comments` (photo_id, roll_number, comment_text)

## ❤️ Acknowledgements

Sparked with ❤️ for **Electrical Engineering Batch 2**.  
Lead Developer: **Sayan Maity**

---
© 2026 EEvolution Project. All Rights Reserved.
