# Adobisphere

Adobisphere is a capstone-style, multi-page web experience that brings Adobe-focused events, blogs, and creator profiles into one place. It includes authentication, saving/unsaving content, event registration, comments, and a lightweight blog editor — implemented as a static site with a local data layer.

This project is intentionally built as an MVP: it prioritizes clarity, separation of concerns, and maintainability over adding a full backend.

## Tech Stack (and why)

- **Vanilla HTML/CSS/JavaScript (no framework, no bundler):** keeps the architecture easy to review in a capstone setting and highlights core fundamentals (routing, state, rendering, and component-like patterns) without hiding logic behind build tools.
- **Static JSON “data layer” (`data/*.json`):** makes the site deterministic and easy to demo. It also mirrors how a real backend API might return structured objects.
- **Browser storage (`localStorage` / `sessionStorage`):** used as an MVP persistence layer for session/user state, saved items, and drafts.
- **bcrypt.js via CDN:** used for password hashing to demonstrate a security mindset (even though storage is local-only in this MVP).

## Folder Structure

```text
AdobeEcosystem/
├── index.html                 # Home page
├── pages/                     # All secondary pages
├── assets/                    # Images/videos used by pages and JSON data
├── data/                      # JSON files (events, blogs, creators, about/FAQ)
├── css/                       # global + per-page stylesheets
└── js/                        # shared modules + per-page scripts
```

### What lives where

- `pages/`: individual page templates (`explore`, `event`, `blog`, `blog-editor`, `creator-profile`, `user-profile`, `about`, `contact`, `login`, `signup`).
- `js/`: browser-global modules and page controllers.
  - `utils.js`: shared helpers + card builders used across pages.
  - `storage.js`: a single storage abstraction (wraps `localStorage`/`sessionStorage`).
  - `auth.js`: authentication logic and navbar auth state updates.
  - `router.js`: centralized URL parameter helpers and navigation.
  - `navbar.js` / `footer.js`: shared UI behavior.
- `css/global.css`: design tokens + shared primitives (buttons, cards, form styles, toast, reveal animation).
- `css/*.css`: page-specific layout styles to keep concerns isolated.

## How to Run Locally

This project **must be served over HTTP** (not opened via `file://`) because pages load JSON using `fetch()`.

Recommended options:

1. **VS Code Live Server**
    - Right click `index.html` → **Open with Live Server**

2. **Any static server from the repo root**
    - Example: `npx serve .` (or any equivalent)

## Key Architectural Decisions

- **`window.Storage` (storage abstraction):** provides a single source of truth for persistence and hides key naming from page scripts. This reduces duplication, prevents “storage leaks” (direct key usage everywhere), and makes it straightforward to swap in a real backend later.
- **`window.Auth` (auth logic):** centralizes registration/login/logout and navbar state updates so pages don’t re-implement auth rules.
- **`window.Utils` (shared rendering + helpers):** enforces DRY patterns. One card layout is reused via `buildEventCard()`, `buildBlogCard()`, and `buildCreatorCard()` across multiple pages.
- **`window.Router` (URL params + navigation):** keeps param reading and redirect building consistent across pages and reduces brittle `location.search` parsing scattered everywhere.
- **bcrypt.js (password hashing):** even in a localStorage-backed MVP, hashing demonstrates awareness of credential handling and avoids storing plaintext passwords.
- **Per-page CSS files (plus shared `global.css`):** keeps styles modular, makes debugging easier, and reduces cross-page specificity conflicts compared to one giant stylesheet.

## Features

- Authentication (register/login/logout) with password hashing (bcrypt.js)
- User profile editing + avatar upload preview
- Save/unsave blogs and events
- Event registration workflow
- Blog editor (block-based content + draft autosave/recovery)
- Blog comments (stored locally)
- Creator profiles and related content
- Reveal-on-scroll animations (IntersectionObserver)
- Explore search & filtering across events/blogs/creators
- Responsive navbar with mobile drawer

## Known Limitations (MVP vs Production)

- **No real backend:** all persistence is local to the browser; data does not sync across devices.
- **Not multi-user:** storage is effectively “single-user per browser profile” (no server-side accounts).
- **No JWT / server sessions:** auth is a demo implementation suitable for a capstone, not a production security model.
- **Blocking dialogs in the editor:** the blog editor uses browser-native dialogs (`prompt` / `confirm`) for MVP simplicity and clearly documents where production would use custom modals.
- **Hosting assumptions:** internal links use absolute `/pages/...` paths; the site is expected to be served from a web root.

## Data Notes

- `data/campaigns.json`, `data/blogs.json`, `data/creators.json` are intentionally structured like API payloads.
- Cross-references are consistent (creator `blogIds`/`eventIds` and blog `author.id` mappings).
