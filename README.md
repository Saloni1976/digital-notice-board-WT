# Digital Notice Board with Admin Control

A full-stack campus notice board. Students and visitors browse live notices on a public page, while administrators log in to create, schedule, pin, publish and manage notices from a dashboard.

**Stack:** React 18 (Vite) + Bootstrap 5 · Node.js + Express · MongoDB (Mongoose) · JWT auth · bcrypt · Multer (image uploads)

---

## Features

### Public board
- Notices grouped by category (Important Announcements, Events, Academic, Examination, Sports, General Notices)
- Search by title, description or venue
- Category filter chips and sorting (newest, oldest, title A-Z)
- Scrolling red **urgent ticker** for Important Announcements and Urgent-priority notices
- **Upcoming Events** sidebar
- Notice details popup with poster, dates, venue and organizer
- Pinned notices appear first (default sort)
- **Live updates:** the page polls the API every 5 seconds, so no refresh is needed
- Responsive layout, loading skeletons and empty states

### Admin panel (`/#/admin`)
- Secure login with JWT (8-hour token) and bcrypt-hashed password
- Login rate limiting (10 failed attempts per minute per IP)
- Dashboard with counts: total, active, scheduled, expired, unpublished, pinned
- Add / edit / delete notices with validation (client and server side)
- Poster upload (PNG, JPG, GIF, WEBP, max 3 MB) with preview
- Publish / unpublish and pin / unpin toggles
- Filtered views: Manage, Scheduled and Expired notices, with search, category, status and sort filters
- Activity log of admin actions (most recent 200 kept)
- Collapsible sidebar, mobile-friendly menu, toast notifications

### Automatic status
A notice's status is computed on every request, so no cron job is needed:

| Status | Condition |
|---|---|
| `draft` (shown as "unpublished") | `published` is false |
| `scheduled` | publish date is in the future |
| `expired` | expiry date has passed |
| `active` | everything else (visible on the public board) |

---

## Project structure

```
digital-notice-board/
├── client/                  # React frontend (Vite)
│   ├── index.html
│   ├── package.json
│   ├── vite.config.js       # dev server on :5173, proxies /api and /uploads to :5000
│   └── src/
│       ├── main.jsx         # entry + hash router (#/admin -> Admin, else Public)
│       ├── Public.jsx       # public notice board
│       ├── Admin.jsx        # login, dashboard, forms, lists, activity log
│       ├── api.js           # fetch wrapper, token storage, useLive() polling hook
│       ├── config.js        # brand name, categories, icons
│       ├── ui.jsx           # shared UI pieces (icon, empty state, skeleton, brand)
│       └── styles.css
└── server/                  # Express backend
    ├── index.js             # routes, auth, validation, uploads
    ├── db.js                # MongoDB connection
    ├── models.js            # Notice, Admin, Log schemas
    ├── seed.js              # creates admin user + sample notices
    ├── uploads/             # uploaded posters (created automatically)
    ├── .env                 # your configuration (create this, see below)
    └── package.json
```

> `db.json` (if present) is a leftover from an earlier file-based version. The app now uses MongoDB and does not read it, so it can be deleted.

---

## Requirements

- **Node.js 18+** (`node -v`)
- **MongoDB**, either:
  - a local server on `mongodb://127.0.0.1:27017`, or
  - a free [MongoDB Atlas](https://www.mongodb.com/atlas) cluster (use its connection string)

---

## Setup and run

### 1. Configure the backend

Create `server/.env`:

```env
MONGODB_URI=mongodb://127.0.0.1:27017/digital_notice_board
JWT_SECRET=replace_this_with_a_long_random_string
PORT=5000
ADMIN_USERNAME=admin
ADMIN_PASSWORD=Admin@123
```

All values are optional; the defaults are shown above (`JWT_SECRET` defaults to an insecure `dev_secret`).

### 2. Start the backend (Terminal 1)

```bash
cd server
npm install
npm run seed     # creates the admin user and sample notices
npm start        # http://localhost:5000
```

### 3. Start the frontend (Terminal 2)

```bash
cd client
npm install
npm run dev      # http://localhost:5173
```

### 4. Open the app

| Page | URL |
|---|---|
| Public board | http://localhost:5173 |
| Admin panel | http://localhost:5173/#/admin |

Default admin login: **`admin` / `Admin@123`**

---

## Environment variables (`server/.env`)

| Variable | Default | Purpose |
|---|---|---|
| `MONGODB_URI` | `mongodb://127.0.0.1:27017/digital_notice_board` | MongoDB connection string |
| `JWT_SECRET` | `dev_secret` | Secret used to sign login tokens. **Change it.** |
| `PORT` | `5000` | Backend port |
| `ADMIN_USERNAME` | `admin` | Admin username created by `npm run seed` |
| `ADMIN_PASSWORD` | `Admin@123` | Admin password created by `npm run seed` |

To change the admin credentials, edit `.env` and run `npm run seed` again. The admin is updated in place (upsert), and sample notices are only inserted if the notices collection is empty.

---

## Customising

- **Name and tagline:** edit `BRAND` in `client/src/config.js`
- **Categories:** edit `CATS`, `ORDER` and `ICON` in `client/src/config.js`, and the `CATS` array in `server/index.js` (both must match)
- **Colours:** CSS variables at the top of `client/src/styles.css`
- **Live-update interval:** the `ms` argument of `useLive()` in `client/src/api.js` (default 5000 ms)

---

## Database collections

| Collection | Stores |
|---|---|
| `notices` | title, description, category, priority, publishDate, expiryDate, eventDate, venue, organizer, poster, published, pinned, createdAt |
| `admins` | username, bcrypt password hash |
| `logs` | admin actions with user and timestamp (capped at the latest 200) |

**Categories:** Events, Sports, Academic, Examination, Important Announcements, General Notices
**Priorities:** Normal, High, Urgent

### Validation rules
- Title: 3-120 characters
- Description: at least 10 characters
- Expiry date must be after the publication date
- Poster: image only (PNG, JPG, GIF, WEBP), max 3 MB

---

## API reference

Base URL: `http://localhost:5000/api`

### Public

| Method | Endpoint | Description |
|---|---|---|
| GET | `/notices?search=&category=&sort=` | Active notices. `sort` = `newest` (default, pinned first), `oldest`, `title` |
| GET | `/notices/urgent` | Active Important Announcements and Urgent-priority notices (ticker) |
| GET | `/notices/events` | Active upcoming events, soonest first |
| GET | `/notices/:id` | One active notice |

### Auth

| Method | Endpoint | Body |
|---|---|---|
| POST | `/auth/login` | `{ "username": "...", "password": "..." }` returns `{ token, username }` |

### Admin (header: `Authorization: Bearer <token>`)

| Method | Endpoint | Description |
|---|---|---|
| GET | `/admin/notices?status=` | All notices with computed status (`active`, `scheduled`, `expired`, `draft`) |
| GET | `/admin/stats` | Dashboard counts |
| GET | `/admin/logs` | Activity log |
| POST | `/admin/notices` | Create (multipart form-data) |
| PUT | `/admin/notices/:id` | Update (multipart form-data) |
| PATCH | `/admin/notices/:id/publish` | Toggle publish / unpublish |
| PATCH | `/admin/notices/:id/pin` | Toggle pin / unpin |
| DELETE | `/admin/notices/:id` | Delete notice and its poster file |

**Create / update form fields:** `title`, `description`, `category`, `priority`, `publishDate`, `expiryDate`, `eventDate`, `venue`, `organizer`, `published`, `poster` (file)

### Testing with Postman
1. `POST http://localhost:5000/api/auth/login` with JSON `{"username":"admin","password":"Admin@123"}` and copy the `token`.
2. Add the header `Authorization: Bearer <token>` to every `/api/admin/*` request.
3. For create/update, use **Body → form-data**.

---

## Production build

```bash
cd client
npm run build     # outputs client/dist
```

The Express server does not serve `client/dist` by default. Host the built files on any static host (and route `/api` and `/uploads` to the backend), or add `express.static` for the `dist` folder in `server/index.js`.

---

## Troubleshooting

| Problem | Fix |
|---|---|
| `Could not connect to MongoDB` on start | Start your MongoDB service, or set a valid `MONGODB_URI` in `server/.env` |
| Admin login says "Invalid username or password" | Run `npm run seed` in `server/` (after checking `.env`) |
| "Too many attempts, wait a minute" | Login is rate limited; wait 60 seconds |
| Public page is empty | Run `npm run seed`, and make sure notices are published with a publish date in the past and no passed expiry |
| Posters do not load | Confirm the backend is running on port 5000 (Vite proxies `/uploads`) |
| Redirected to login unexpectedly | The token expired (8 hours) or `JWT_SECRET` changed; log in again |
| Port already in use | Change `PORT` in `.env` and update the proxy targets in `client/vite.config.js` |

---

## Security notes
- Change `JWT_SECRET` and the default admin password before deploying anywhere public.
- Passwords are hashed with bcrypt; admin routes require a valid JWT.
- Never commit `server/.env` or `server/uploads/` to Git; add them to `.gitignore`:

```
node_modules
dist
server/.env
server/uploads
```

- `multer@1.x` is flagged as deprecated by npm. Upgrading to `multer@2.x` is recommended.

---

## Publish to GitHub

```bash
git init
git add .
git commit -m "Digital Notice Board"
git branch -M main
git remote add origin <your-repo-url>
git push -u origin main
```

---

## License
For academic and learning use. Add your preferred license before public distribution.