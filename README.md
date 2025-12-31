# P2P Chat

A peer-to-peer messaging application where users can send messages directly to each other without the server accessing message content. The server only facilitates initial connection (signaling), after which all communication is direct between users via WebRTC DataChannels.

## Features

- **True P2P Messaging**: Messages go directly between peers, never through the server
- **No Account Required**: Just create a room and share the link
- **Real-time Communication**: Instant messaging via WebRTC DataChannels
- **Connection Status**: Visual indicator showing connection state
- **Privacy First**: Server only handles signaling, never sees message content

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | Next.js 16 (App Router), React 19, TypeScript |
| Styling | Tailwind CSS v4 |
| Signaling | Socket.io |
| P2P | WebRTC DataChannels |
| Package Manager | Bun |

## Getting Started

### Prerequisites

- [Bun](https://bun.sh/) installed

### Local Development

1. **Clone the repository**
   ```bash
   git clone https://github.com/crafter-station/p2p-chat.git
   cd p2p-chat
   ```

2. **Install dependencies**
   ```bash
   # Frontend
   bun install

   # Signaling server
   cd signaling && bun install
   ```

3. **Start the signaling server** (Terminal 1)
   ```bash
   cd signaling
   bun dev
   ```

4. **Start the frontend** (Terminal 2)
   ```bash
   bun dev
   ```

5. **Open the app**
   - Navigate to http://localhost:3000
   - Create a room and share the link with another user

### Environment Variables

#### Frontend (.env.local)
```bash
NEXT_PUBLIC_SIGNALING_URL=http://localhost:3001
```

#### Signaling Server (.env)
```bash
PORT=3001
FRONTEND_URL=http://localhost:3000
```

## Deployment

### Frontend (Vercel)

1. Import repo to [Vercel](https://vercel.com)
2. Set environment variable:
   - `NEXT_PUBLIC_SIGNALING_URL` = your Railway signaling server URL

### Signaling Server (Railway)

1. Create new project on [Railway](https://railway.app)
2. Set root directory to `signaling`
3. Set environment variable:
   - `FRONTEND_URL` = your Vercel frontend URL

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        FRONTEND                              │
│                     (Next.js 16)                            │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │  Landing    │  │  Chat Room  │  │  WebRTC Hook        │  │
│  │  Page       │  │  Component  │  │  (P2P Logic)        │  │
│  └─────────────┘  └─────────────┘  └─────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                              │
                              │ WebSocket (signaling only)
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    SIGNALING SERVER                          │
│                  (Socket.io + Bun)                          │
│                                                              │
│  • Room management (join/leave)                              │
│  • SDP offer/answer relay                                    │
│  • ICE candidate relay                                       │
│  • NO message storage, NO logging of content                 │
└─────────────────────────────────────────────────────────────┘
                              │
                              │ STUN (NAT traversal)
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    EXTERNAL SERVICES                         │
│                                                              │
│  • Google STUN servers (free)                                │
│  • stun:stun.l.google.com:19302                             │
└─────────────────────────────────────────────────────────────┘
```

### WebRTC Flow

1. User creates/joins room via frontend
2. Frontend connects to signaling server via WebSocket
3. Signaling server relays SDP offers/answers and ICE candidates
4. Once P2P connection established, all messages go directly between peers
5. Signaling server never sees message content

## Scripts

```bash
# Frontend
bun dev          # Start development server
bun build        # Production build
bun start        # Start production server
bun lint         # Check for linting errors
bun format       # Format code

# Signaling Server
cd signaling
bun dev          # Start development server
bun run build    # Compile TypeScript
```

## License

MIT
