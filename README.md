<div align="center">
  <h1>Movix</h1>
  <p>Your ultimate companion for discovering and tracking movies and TV shows.</p>
  
  <p>
    <img src="https://img.shields.io/badge/Next.js-15-black?style=for-the-badge&logo=next.js" alt="Next.js" />
    <img src="https://img.shields.io/badge/React-19-blue?style=for-the-badge&logo=react" alt="React" />
    <img src="https://img.shields.io/badge/TypeScript-5-blue?style=for-the-badge&logo=typescript" alt="TypeScript" />
    <img src="https://img.shields.io/badge/Tailwind_CSS-4-38B2AC?style=for-the-badge&logo=tailwind-css" alt="Tailwind CSS" />
    <img src="https://img.shields.io/badge/Prisma-7-2D3748?style=for-the-badge&logo=prisma" alt="Prisma" />
    <img src="https://img.shields.io/badge/PostgreSQL-316192?style=for-the-badge&logo=postgresql" alt="PostgreSQL" />
  </p>
</div>

---

## What is Movix?

Movix is a premium, feature-rich web application built for entertainment enthusiasts. It provides a beautiful, seamless interface to discover new content, track what you're watching, and curate your personal library of favorite movies and TV shows.

---

## Core Features

*Click on any feature below to learn more!*

<details>
<summary><b>Discover & Search</b></summary>
<br/>
Dive into trending movies and TV shows right from the homepage. Search the vast TMDB database for specific titles, get real-time suggestions, and explore different genres seamlessly.
</details>

<details>
<summary><b>Rich Media Details</b></summary>
<br/>
Read detailed plot overviews, view high-quality posters and backdrop images, and see full cast and crew information. You can even watch official trailers directly within the app via an embedded video player.
</details>

<details>
<summary><b>Personal Library & Watchlists</b></summary>
<br/>
Keep a dedicated watchlist of things you want to see. Mark your top movies and series as favorites, and manage everything in a beautifully organized, centralized "Library" view.
</details>

<details>
<summary><b>Advanced TV Show Tracking</b></summary>
<br/>
Track your exact progress across multiple seasons. Mark specific episodes as watched, and record your ratings or emotional reactions (e.g., funny, sad, wow) to individual episodes.
</details>

<details>
<summary><b>Secure Accounts & Sync</b></summary>
<br/>
Create a secure account using email/password or log in instantly with <b>Google OAuth</b>. Your entire library is securely synced to the database, ensuring it's accessible from anywhere.
</details>

---

## The Tech Stack

Movix is built using the bleeding edge of modern web development to ensure blistering speed and a premium user experience.

### Frontend
- **Framework:** [Next.js 15](https://nextjs.org/) (App Router & Turbopack)
- **UI Library:** [React 19](https://react.dev/)
- **Styling:** [Tailwind CSS v4](https://tailwindcss.com/)
- **Animations:** [Framer Motion](https://www.framer.com/motion/) for buttery smooth micro-interactions

### Backend & Data
- **Database:** [PostgreSQL](https://www.postgresql.org/)
- **ORM:** [Prisma v7](https://www.prisma.io/)
- **Authentication:** [Auth.js / NextAuth (v5)](https://authjs.dev/)
- **Data Validation:** [Zod](https://zod.dev/)

### External APIs
- **[TMDB API](https://developer.themoviedb.org/docs/getting-started):** Powers the comprehensive catalog of movies, shows, images, and trailers.

---

## Architecture Highlights

- **React Server Components:** Heavy lifting is done on the server, ensuring fast initial page loads, secure database calls directly from components, and minimal JavaScript sent to the client.
- **Standalone Mode:** Fully optimized for Docker deployments. The build process creates a minimal, self-contained server.
- **Mobile-First Responsive Design:** The UI is designed to look gorgeous and function perfectly across phones, tablets, and large desktop displays.
