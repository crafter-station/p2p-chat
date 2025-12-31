import { Server } from "socket.io";

const PORT = process.env.PORT || 3001;

const allowedOrigins = process.env.FRONTEND_URL
  ? process.env.FRONTEND_URL.split(",")
  : ["http://localhost:3000", "http://192.168.1.62:3000"];

const io = new Server(Number(PORT), {
  cors: {
    origin: allowedOrigins,
    methods: ["GET", "POST"],
  },
});

interface RoomState {
  users: Set<string>;
  createdAt: Date;
}

const rooms = new Map<string, RoomState>();

// Cleanup empty rooms periodically
setInterval(() => {
  const now = new Date();
  rooms.forEach((state, roomId) => {
    if (state.users.size === 0) {
      const ageMinutes =
        (now.getTime() - state.createdAt.getTime()) / 1000 / 60;
      if (ageMinutes > 30) {
        rooms.delete(roomId);
        console.log(`[Cleanup] Deleted empty room: ${roomId}`);
      }
    }
  });
}, 60000);

io.on("connection", (socket) => {
  console.log(`[Connect] ${socket.id}`);

  let currentRoom: string | null = null;

  socket.on("join-room", (roomId: string) => {
    // Validate room ID format
    if (!/^[a-zA-Z0-9-]{4,32}$/.test(roomId)) {
      socket.emit("error", { message: "Invalid room ID" });
      return;
    }

    // Leave previous room if any
    if (currentRoom) {
      socket.leave(currentRoom);
      rooms.get(currentRoom)?.users.delete(socket.id);
    }

    currentRoom = roomId;
    socket.join(roomId);

    // Initialize room if new
    if (!rooms.has(roomId)) {
      rooms.set(roomId, { users: new Set(), createdAt: new Date() });
    }

    const room = rooms.get(roomId);
    if (!room) return;
    room.users.add(socket.id);

    console.log(
      `[Join] ${socket.id} joined ${roomId} (${room.users.size} users)`,
    );

    // Get other users in room
    const otherUsers = Array.from(room.users).filter((id) => id !== socket.id);

    // Tell the new user about existing peers
    socket.emit("room-joined", {
      roomId,
      peers: otherUsers,
      isInitiator: otherUsers.length > 0,
    });

    // Tell existing peers about new user
    socket.to(roomId).emit("peer-joined", { peerId: socket.id });
  });

  // Relay signaling data (SDP offers/answers)
  socket.on(
    "signal",
    ({
      to,
      signal,
    }: {
      to: string;
      signal: { type: string; sdp?: string };
    }) => {
      console.log(`[Signal] ${socket.id} -> ${to} (${signal.type})`);
      io.to(to).emit("signal", {
        from: socket.id,
        signal,
      });
    },
  );

  // Relay ICE candidates
  socket.on(
    "ice-candidate",
    ({ to, candidate }: { to: string; candidate: unknown }) => {
      io.to(to).emit("ice-candidate", {
        from: socket.id,
        candidate,
      });
    },
  );

  socket.on("disconnect", () => {
    console.log(`[Disconnect] ${socket.id}`);

    if (currentRoom) {
      const room = rooms.get(currentRoom);
      if (room) {
        room.users.delete(socket.id);
        socket.to(currentRoom).emit("peer-left", { peerId: socket.id });
      }
    }
  });
});

console.log(`Signaling server running on port ${PORT}`);
