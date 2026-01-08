# PasteBin Clone - Production Ready

A modern, full-stack Pastebin application built with Next.js, PostgreSQL, and containerized with Docker. Deploy on Vercel or run locally with Docker.

## Features

- ✅ Create text pastes with unique shareable links
- ⏰ Time-based expiration (hours)
- 👁️ View-based expiration (auto-delete after N views)
- 🔒 Input validation and sanitization
- ⚡ Optimized database queries with indexes
- 🎯 Atomic view counting (race condition safe)
- 🏥 Health check endpoint
- 🐳 Docker & Docker Compose support
- ⚙️ ESLint configuration
- 📦 Vercel deployment ready

## Tech Stack

- **Frontend**: Next.js 14 (App Router), React, Tailwind CSS
- **Backend**: Next.js API Routes
- **Database**: PostgreSQL (Neon/Local)
- **Validation**: Zod
- **Containerization**: Docker & Docker Compose
- **Deployment**: Vercel or Docker
- **Code Quality**: ESLint

## API Endpoints

### POST /api/pastes
Create a new paste.

**Request:**
```json
{
  "content": "Your text content here",
  "title": "Optional title",
  "expiresIn": 24,
  "maxViews": 10
}
```

**Response (201):**
```json
{
  "success": true,
  "data": {
    "id": "V1StGXR8_Z",
    "url": "https://yourapp.vercel.app?id=V1StGXR8_Z",
    "createdAt": "2026-01-08T12:00:00Z",
    "expiresAt": "2026-01-09T12:00:00Z"
  }
}
```

### GET /api/pastes/:id
Retrieve a paste (increments view count).

**Response (200):**
```json
{
  "success": true,
  "data": {
    "id": "V1StGXR8_Z",
    "title": "My Paste",
    "content": "Text content",
    "viewCount": 5,
    "maxViews": 10,
    "isLastView": false
  }
}
```

### GET /api/health
Health check endpoint.

**Response (200):**
```json
{
  "success": true,
  "status": "healthy",
  "database": "connected"
}
```

## Local Development

### Option 1: Standard Development (Node.js)

1. Clone the repository
```bash
git clone https://github.com/aryanmatrix/pastebin-app
cd pastebin-app
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables in `.env.local`:
```env
DATABASE_URL=postgresql://user:pass@host/db
```

4. Run development server:
```bash
npm run dev
```

5. Open http://localhost:3000

### Option 2: Docker Development

1. Clone the repository
```bash
git clone https://github.com/YOUR_USERNAME/pastebin-app.git
cd pastebin-app
```

2. Build and run with Docker Compose:
```bash
docker-compose up --build
```

3. Open http://localhost:3000

The `docker-compose.yml` includes:
- Next.js application container
- PostgreSQL database container
- Automatic database connectivity

### Database Setup (if needed)

Run the database schema setup:
```bash
node check-db.js
```

This validates your database connection and initializes required tables.

## Project Structure

```
pastebin-app/
├── app/                           # Next.js App Router
│   ├── layout.tsx                 # Root layout
│   ├── page.tsx                   # Homepage
│   ├── globals.css                # Global styles
│   └── api/                       # API Routes
│       ├── health/route.js        # Health check endpoint
│       └── pastes/
│           ├── route.js           # GET (list), POST (create)
│           └── [id]/route.js      # GET (retrieve), DELETE (remove)
├── lib/
│   ├── db.js                      # Database connection & queries
│   └── validation.js              # Input validation schemas (Zod)
├── public/                        # Static assets
├── Dockerfile                     # Docker image configuration
├── docker-compose.yml             # Docker Compose for local dev
├── check-db.js                    # Database initialization script
├── next.config.ts                 # Next.js configuration
├── tsconfig.json                  # TypeScript configuration
├── eslint.config.mjs              # ESLint rules
├── postcss.config.mjs             # PostCSS configuration
└── package.json                   # Dependencies & scripts
```

## Deployment

### Deploy to Vercel (Recommended)

1. Push code to GitHub:
```bash
git push origin main
```

2. Import project in Vercel (https://vercel.com/new)
3. Add environment variable: `DATABASE_URL` with your PostgreSQL connection string
4. Deploy!

### Deploy with Docker

1. Build the Docker image:
```bash
docker build -t pastebin-app .
```

2. Run the container:
```bash
docker run -p 3000:3000 \
  -e DATABASE_URL="postgresql://user:pass@host/db" \
  pastebin-app
```

3. Access at http://localhost:3000

## Database Schema
```sql
CREATE TABLE pastes (
  id VARCHAR(50) PRIMARY KEY,
  title VARCHAR(255) NOT NULL DEFAULT 'Untitled',
  content TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP,
  max_views INT,
  view_count INT DEFAULT 0
);
```

## Architecture Decisions

### Why PostgreSQL?
- ACID compliance for atomic operations
- Better indexing for expiration queries
- Reliable for view counting

### Why Server-Side Expiration?
- Cannot trust client-side logic
- Consistent timezone handling
- Prevents data leakage

### Race Condition Prevention
```sql
UPDATE pastes SET view_count = view_count + 1 WHERE id = $1
```
Atomic increment prevents concurrent request issues.

## Performance

- Database connection pooling
- Indexed queries for fast lookups
- Efficient expiration checks

## Security

- Input validation with Zod
- Parameterized SQL queries (SQL injection prevention)
- Content size limits (10MB max)
- Rate limiting ready

## License

MIT