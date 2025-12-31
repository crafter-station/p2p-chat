# AGENTS.md

This file provides guidance for AI coding agents working in this repository.

## Project Overview

P2P Chat is a peer-to-peer messaging application where users can send messages directly to each other without the server accessing message content. The server only facilitates initial connection (signaling), after which all communication is direct between users via WebRTC DataChannels.

**Core Value Proposition:** True privacy - messages never touch the server. When both users are online, they communicate directly.

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **UI Library**: React 19
- **Language**: TypeScript 5.x (strict mode)
- **Styling**: Tailwind CSS v4 with PostCSS
- **Linting/Formatting**: Biome 2.2.0
- **Package Manager**: Bun
- **P2P Communication**: WebRTC DataChannels
- **Signaling**: Socket.io (separate server)

## Project Structure

```
src/
  app/
    page.tsx                 # Landing page (create/join rooms)
    layout.tsx               # Root layout with metadata
    chat/[roomId]/
      page.tsx               # Chat room page
  components/
    chat-input.tsx           # Message input component
    chat-messages.tsx        # Message display component
    connection-status.tsx    # Connection state indicator
    copy-link-button.tsx     # Share room link button
  hooks/
    use-webrtc.ts            # Core WebRTC/P2P logic
signaling/
  index.ts                   # Signaling server (Socket.io)
  package.json               # Server dependencies
  tsconfig.json              # TypeScript config
  Dockerfile                 # Container deployment
```

## Build/Dev Commands

```bash
# Frontend - Development server
bun dev

# Frontend - Production build
bun build

# Frontend - Start production server
bun start

# Frontend - Linting (check for issues)
bun lint

# Frontend - Format code
bun format

# Signaling Server - Development
cd signaling && bun dev

# Signaling Server - Production
cd signaling && bun run index.ts
```

## Code Style Guidelines

### Formatting (Biome)

- **Indent**: 2 spaces (no tabs)
- **Quotes**: Double quotes for strings
- **Semicolons**: Required
- **Line width**: Default (80 characters recommended)
- **Trailing commas**: ES5 compatible

Run `bun format` to auto-format all files.

### TypeScript

- **Strict mode**: Enabled - all strict type checks are enforced
- **No implicit any**: Types must be explicit or inferable
- **Path aliases**: Use `@/*` for imports from `src/*`
- **Type imports**: Use `import type` for type-only imports

```typescript
// Good
import type { Metadata } from "next";
import { useState } from "react";

// Avoid
import { Metadata } from "next"; // when only used as type
```

### Imports Organization

Biome organizes imports automatically. The order should be:

1. External packages (react, next, etc.)
2. Internal aliases (`@/*`)
3. Relative imports (`./`, `../`)

### Naming Conventions

- **Files**: kebab-case for all files (`chat-input.tsx`, `use-webrtc.ts`)
- **Components**: PascalCase (`ChatInput`, `ConnectionStatus`)
- **Functions/Variables**: camelCase
- **Types/Interfaces**: PascalCase, prefer `type` over `interface`

### React Components

- Use function declarations for page/layout components
- Use `Readonly<>` wrapper for props with children
- Export components as default for pages/layouts
- Use named exports for reusable components

## Environment Variables

### Frontend (.env.local)
```bash
NEXT_PUBLIC_SIGNALING_URL=http://localhost:3001  # Signaling server URL
```

### Signaling Server
```bash
PORT=3001                           # Server port
FRONTEND_URL=http://localhost:3000  # CORS allowed origin
```

## Architecture Notes

### WebRTC Flow
1. User creates/joins room via frontend
2. Frontend connects to signaling server via WebSocket
3. Signaling server relays SDP offers/answers and ICE candidates
4. Once P2P connection established, all messages go directly between peers
5. Signaling server never sees message content

### Connection States
- `disconnected`: Initial state
- `connecting`: Connecting to signaling server
- `waiting`: In room, waiting for peer
- `signaling`: Exchanging SDP/ICE
- `connected`: P2P connection established

## Pre-commit Checklist

1. Run `bun lint` to check for linting errors
2. Run `bun format` to format code
3. Run `bun build` to ensure production build succeeds
4. Verify TypeScript has no errors (checked during build)
