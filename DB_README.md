# Database Implementation for Dev Tracker

This document explains how to use the database implementation to avoid API rate limits.

## Overview

Instead of directly fetching data from the Odin API for each user request, we now:

1. Fetch data from the Odin API once and store it in a MongoDB database
2. Set up a periodic sync to keep the database updated
3. Serve data to the frontend from our database instead of the Odin API

This approach significantly reduces the number of API calls to Odin, preventing rate limit issues.

## Setup

### Prerequisites

- MongoDB installed locally or a MongoDB Atlas account
- Node.js and npm

### Configuration

1. Create a `.env` file in the project root with the following content:

```
PORT=3001
MONGODB_URI=mongodb://localhost:27017/dev-tracker
```

Replace the MongoDB URI with your own if you're using MongoDB Atlas.

## Running the Database Server

The database server is responsible for:
- Syncing data from the Odin API to the database
- Serving data to the frontend

To run the database server:

```bash
npm run server:dev
```

This will start the server in development mode with auto-restart on file changes.

## Testing the Database Implementation

To verify that the database implementation is working correctly:

```bash
npm run test:db
```

This will:
1. Fetch a small sample of creators from the Odin API
2. Save them to the database
3. Retrieve them from the database
4. Compare the results

## API Endpoints

The database server exposes the following endpoints:

- `GET /api/creators` - Get all creators
- `GET /api/creators/with-tokens` - Get all creators with their tokens
- `GET /api/tokens` - Get all tokens
- `GET /health` - Health check endpoint

## Frontend Integration

The frontend has been updated to fetch data from the database server instead of directly from the Odin API. The changes include:

1. New `dbApi.ts` service for interacting with the database API
2. Updated Dashboard component to use the database API

## Production Deployment

For production deployment:

1. Build the server:

```bash
npm run server:build
```

2. Start the server:

```bash
npm run server:start
```

## Sync Schedule

By default, the database syncs with the Odin API every 15 minutes. You can adjust this interval in `src/db/services/syncService.ts`. 