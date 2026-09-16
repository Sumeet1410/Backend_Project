# VideoTube - Enterprise Backend Platform

A production-grade, high-performance video streaming and content management backend built with **Node.js**, **Express.js**, **MongoDB**, **Redis**, and **BullMQ**. Designed following clean architecture principles, featuring asynchronous media processing with **FFmpeg**, multi-tiered **Redis caching**, distributed **rate limiting**, and **Docker** containerization.

---

## Architecture Overview

```mermaid
flowchart TD
    Client([Client Application]) -->|HTTP Requests| Express[Express.js Server]
    
    subgraph Security & Performance
        Express --> AuthMiddleware[JWT Auth & RBAC]
        Express --> RateLimiter[Redis Rate Limiting]
        Express --> CacheMiddleware[Redis Cache Middleware]
    end
    
    subgraph Data & Storage
        Express --> MongoDB[(MongoDB Database)]
        CacheMiddleware <--> RedisCache[(Redis In-Memory Cache)]
    end
    
    subgraph Asynchronous Pipeline
        Express -->|Video Upload Request| Producer[BullMQ Producer]
        Producer --> BullQueue[(BullMQ Video Queue)]
        BullQueue --> Worker[Video Worker Service]
        Worker --> FFmpeg[FFmpeg / FFprobe]
        FFmpeg --> Cloudinary[(Cloudinary Cloud Storage)]
        Worker -->|Update Status & URLs| MongoDB
    end
```

---

## Key Highlights & Features

### 1. Robust Authentication & User Management
- **Dual-Token JWT Strategy**: Short-lived Access Tokens (`1d`) coupled with secure, long-lived Refresh Tokens (`10d`) with automated rotation.
- **Bcrypt Password Security**: Automated password salting and hashing with pre-save mongoose hooks and secure comparison methods.
- **Profile & Channel Management**: Avatar & cover image uploads with Cloudinary integration, channel statistics (subscribers, subscribed-to counts), and tracked user watch history.

### 2. Asynchronous Video Processing Pipeline
- **Decoupled Architecture**: Video uploads are acknowledged immediately without blocking the HTTP request loop.
- **BullMQ Queue Management**: Jobs are dispatched to a Redis-backed queue (`video-processing`) with exponential backoff retries.
- **FFmpeg & Cloudinary Worker**: Dedicated background worker runs `fluent-ffmpeg` and `ffprobe` to compute video metadata/duration before uploading media assets to Cloudinary and publishing the video document in MongoDB.

### 3. High-Performance Redis Caching
- **Automated Cache Middleware**: Reusable, customizable TTL cache interceptor with dynamic key generation.
- **Cached Read Endpoints**: High-traffic routes like channel profiles, video details, comments pagination, and dashboard stats are cached to minimize database read overhead.

### 4. Distributed Rate Limiting
- **Redis-Backed Store**: Uses `rate-limit-redis` with custom key generation supporting authenticated users (by user ID) or guests (by IP).
- **Tiered Limiting Policies**:
  - **General Traffic**: 100 requests / 1 minute
  - **Authentication Routes**: 5 attempts / 15 minutes
  - **Media Uploads**: 5 uploads / 10 minutes
  - **Comment Activity**: 20 comments / 1 minute

### 5. Content & Social Engagement Suite
- **Video Feeds**: Full search, regex filtering, dynamic sorting, and cursor/page pagination powered by `mongoose-aggregate-paginate-v2`.
- **Engagement**: Nested comment threads, polymorphic like/unlike toggles (videos, comments, tweets), and playlist curation.
- **Subscriptions**: Real-time subscriber tracking and subscribed channels feed.
- **Channel Dashboard**: Comprehensive aggregated analytics for video count, total views, total subscribers, and total likes.

### 6. Containerization & Cloud Deployment Ready
- Separate Dockerfiles for the **API Server** ([`Dockerfile`](./Dockerfile)) and the **Background Worker** ([`Dockerfile.worker`](./Dockerfile.worker)).
- Multi-container orchestration via [`docker-compose.yml`](./docker-compose.yml).
- Built-in support for remote TLS-enabled cloud Redis providers (e.g. Upstash, Redis Cloud, AWS ElastiCache) with SNI verification.

---

## Tech Stack

| Domain | Technology |
|---|---|
| **Runtime & Framework** | Node.js (v18+), Express.js 5.x (ES Modules) |
| **Database & Modeling** | MongoDB, Mongoose 9.x |
| **Caching & In-Memory Store** | Redis, `redis` 5.x, `rate-limit-redis` |
| **Message Queue & Workers** | BullMQ 5.x, ioredis |
| **Media Processing & Storage** | Fluent-FFmpeg, FFmpeg-static, FFprobe-static, Cloudinary SDK |
| **Authentication & Security** | JWT (`jsonwebtoken`), Bcrypt, CORS, Cookie-Parser |
| **File Handling** | Multer (local temporary disk storage to cloud pipeline) |
| **DevOps & Tooling** | Docker, Docker Compose, Nodemon, Prettier |

---

## Repository Structure

```text
Backend_Project/
├── Dockerfile                  # Production container for Express API
├── Dockerfile.worker           # Dedicated container for BullMQ video worker
├── docker-compose.yml          # Multi-container orchestration (API + Worker)
├── package.json                # Project scripts and dependencies
├── src/
│   ├── app.js                  # Express app initialization, middlewares & routing
│   ├── index.js                # Server entrypoint (DB & Redis connection bootstrapping)
│   ├── constants.js            # Global constants (e.g., DB name)
│   ├── db/
│   │   └── index.js            # MongoDB connection logic via Mongoose
│   ├── models/
│   │   ├── user.model.js       # User schema with auth methods & tokens
│   │   ├── video.model.js      # Video schema with pagination plugin
│   │   ├── comment.model.js    # Comment schema
│   │   ├── like.model.js       # Polymorphic like schema (video/comment/tweet)
│   │   ├── playlist.model.js   # User playlist schema
│   │   ├── subscription.model.js# Channel subscription relationship schema
│   │   └── tweet.model.js      # Short tweet/post schema
│   ├── controllers/            # Controller handlers with business logic
│   ├── routes/                 # Express route definitions
│   ├── middlewares/
│   │   ├── auth.middleware.js  # JWT authentication verification
│   │   ├── multer.middleware.js# Multi-part form data parser
│   │   ├── rateLimit.middleware.js # Redis-backed rate limiting definitions
│   │   └── redis.middleware.js # Transparent route response cache middleware
│   ├── queue/
│   │   ├── queue.config.js     # Redis/BullMQ connection options & TLS configuration
│   │   ├── video.queue.js      # BullMQ queue definition
│   │   └── video.producer.js   # Job dispatch & queue enqueue logic
│   ├── workers/
│   │   └── video.worker.js     # BullMQ background worker (FFmpeg + Cloudinary)
│   └── utils/
│       ├── ApiError.js         # Standardized error class
│       ├── ApiResponse.js      # Standardized response wrapper
│       ├── asyncHandler.js     # Async wrapper for route controllers
│       ├── cloudinary.js       # Cloudinary upload helpers
│       └── redis.js            # Standalone Redis client instance
└── public/
    └── temp/                   # Transient directory for Multer file uploads
```

---

## Getting Started

### Prerequisites
- **Node.js**: v18.x or later
- **MongoDB**: Local MongoDB instance or MongoDB Atlas URI
- **Redis**: Local Redis server or managed cloud Redis (Upstash, Redis Cloud)
- **Cloudinary Account**: For media asset storage

### 1. Clone the Repository
```bash
git clone https://github.com/Sumeet1410/Backend_Project.git
cd Backend_Project
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Environment Configuration
Create a `.env` file in the root directory:

```env
PORT=8000
MONGODB_URI=mongodb+srv://<username>:<password>@cluster.mongodb.net
CORS_ORIGIN=*

# JWT Secrets
ACCESS_TOKEN_SECRET=your_jwt_access_token_secret_key_32+chars
ACCESS_TOKEN_EXPIRY=1d
REFRESH_TOKEN_SECRET=your_jwt_refresh_token_secret_key_32+chars
REFRESH_TOKEN_EXPIRY=10d

# Cloudinary Credentials
CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
CLOUDINARY_API_KEY=your_cloudinary_api_key
CLOUDINARY_API_SECRET=your_cloudinary_api_secret

# Redis Configuration (Local or Remote TLS URL e.g. Upstash)
REDIS_URL=rediss://default:your_redis_password@your-redis-host.upstash.io:6379
```

---

## Running the Application

### Option A: Local Development

Run the API server and the background queue worker in separate terminal windows:

**Terminal 1 — API Server:**
```bash
npm run dev
```

**Terminal 2 — Background Video Worker:**
```bash
npm run worker
```

**Production Start:**
```bash
npm start
```

---

### Option B: Docker Compose

Spin up both the web API and the background worker simultaneously in isolated containers:

```bash
# Build and run containers in background
docker-compose up --build -d

# View real-time logs
docker-compose logs -f

# Stop containers
docker-compose down
```

---

## Complete API Reference

All API endpoints are prefixed with `/api/v1`.

### 🔐 Authentication & Users (`/api/v1/users`)

| Method | Endpoint | Auth | Description |
|---|---|:---:|---|
| `POST` | `/register` | ❌ | Register user with `avatar` and optional `coverImage` (Rate limited) |
| `POST` | `/login` | ❌ | Authenticate user, returns Access and Refresh cookies (Rate limited) |
| `POST` | `/logout` | ✅ | Clear refresh token and logout user |
| `POST` | `/refresh-token` | ❌ | Generate a new access token using valid refresh token |
| `POST` | `/change-password` | ✅ | Change current password |
| `GET` | `/current-user` | ✅ | Fetch authenticated user details |
| `PATCH` | `/update-account` | ✅ | Update account full name and email |
| `PATCH` | `/update-avatar` | ✅ | Upload and replace profile avatar |
| `PATCH` | `/update-cover-image`| ✅ | Upload and replace channel cover image |
| `GET` | `/get-channel/:username` | ✅ | Fetch channel profile with subscriber stats *(Cached 300s)* |
| `GET` | `/history` | ✅ | Fetch user's video watch history *(Cached 60s)* |
| `GET` | `/videos` | ❌ | Get all videos by user query |

---

### 🎥 Videos (`/api/v1/videos`)

| Method | Endpoint | Auth | Description |
|---|---|:---:|---|
| `POST` | `/publish-video` | ✅ | Upload `videoFile` & `thumbnail`; queues background processing |
| `GET` | `/get-video/:videoId` | ❌ | Fetch video metadata and details *(Cached 300s)* |
| `PATCH` | `/update-video/:videoId` | ✅ | Update video title, description, or thumbnail image |
| `DELETE` | `/delete-video/:videoId` | ✅ | Delete a video and associated assets |
| `PATCH` | `/toggle-status/:videoId` | ✅ | Toggle video public/private publish status |
| `PATCH` | `/watch/:videoId` | ✅ | Record video view count and append to user history |
| `GET` | `/:videoId/comments` | ❌ | Fetch paginated comments for a video *(Cached 120s)* |
| `GET` | `/all-videos` | ❌ | Fetch paginated, searchable video feed *(Cached 300s)* |

---

### 💬 Comments (`/api/v1/comments`)

| Method | Endpoint | Auth | Description |
|---|---|:---:|---|
| `POST` | `/add-comment/:videoId` | ✅ | Add comment to a video (Rate limited) |
| `PATCH` | `/update-comment/:commentId` | ✅ | Edit existing comment |
| `DELETE` | `/delete-comment/:commentId` | ✅ | Delete a comment |

---

### 👍 Likes (`/api/v1/likes`)

| Method | Endpoint | Auth | Description |
|---|---|:---:|---|
| `POST` | `/toggle-video-like/:videoId` | ✅ | Like or unlike a video |
| `POST` | `/toggle-comment-like/:commentId` | ✅ | Like or unlike a comment |
| `POST` | `/toggle-tweet-like/:videoId` | ✅ | Like or unlike a tweet |
| `GET` | `/get-liked-videos` | ✅ | Retrieve all videos liked by authenticated user |

---

### 📑 Playlists (`/api/v1/playlists`)

| Method | Endpoint | Auth | Description |
|---|---|:---:|---|
| `POST` | `/create-playlist` | ✅ | Create a new playlist |
| `GET` | `/user-playlist/:userId` | ❌ | Get all public playlists of a specific user |
| `GET` | `/get-playlist/:playlistId` | ❌ | Get playlist details with populated video list |
| `POST` | `/add-video/:playlistId/videos/:videoId` | ✅ | Add a video to a playlist |
| `DELETE` | `/remove-video/:playlistId/videos/:videoId` | ✅ | Remove a video from a playlist |
| `PATCH` | `/update-playlist/:playlistId` | ✅ | Update playlist name and description |
| `DELETE` | `/delete-playlist/:playlistId` | ✅ | Remove an entire playlist |

---

### 🔔 Subscriptions (`/api/v1/subscriptions`)

| Method | Endpoint | Auth | Description |
|---|---|:---:|---|
| `POST` | `/toggle/:channelId` | ✅ | Subscribe or unsubscribe to a channel |
| `GET` | `/get-subscribers/:channelId` | ❌ | List all subscribers of a given channel |
| `GET` | `/get-subscribed/:subscriberId` | ❌ | List all channels subscribed to by a given user |

---

### 📊 Dashboard & Monitoring

| Method | Endpoint | Auth | Description |
|---|---|:---:|---|
| `GET` | `/api/v1/dashboard/channel-stats/:userId` | ❌ | Total views, subscribers, videos, and likes *(Cached 60s)* |
| `GET` | `/api/v1/dashboard/channel-videos/:userId`| ❌ | Fetch all videos uploaded by a channel |
| `GET` | `/api/v1/healthCheck` | ❌ | Healthcheck endpoint returning API uptime and status |
| `GET` | `/` | ❌ | Root base status check |

---

## Error Handling & Standard Responses

All responses are normalized using custom utility classes:

### Standard Success Response:
```json
{
  "statusCode": 200,
  "data": { ... },
  "message": "Success",
  "success": true
}
```

### Standard Error Response:
```json
{
  "statusCode": 400,
  "data": null,
  "message": "Invalid credentials provided",
  "success": false,
  "errors": []
}
```

---

## License

This project is open source and available under the [ISC License](LICENSE).
