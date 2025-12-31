"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

function generateRoomId(): string {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export default function Home() {
  const router = useRouter();
  const [joinRoomId, setJoinRoomId] = useState("");

  const handleCreateRoom = () => {
    const roomId = generateRoomId();
    router.push(`/chat/${roomId}`);
  };

  const handleJoinRoom = (e: React.FormEvent) => {
    e.preventDefault();
    if (joinRoomId.trim()) {
      // Extract room ID from full URL if pasted
      const match = joinRoomId.match(/\/chat\/([a-zA-Z0-9-]+)/);
      const roomId = match ? match[1] : joinRoomId.trim();
      router.push(`/chat/${roomId}`);
    }
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-gray-900 to-gray-800 p-4">
      <div className="w-full max-w-md space-y-8">
        {/* Header */}
        <div className="text-center">
          <h1 className="mb-2 text-4xl font-bold text-white">P2P Chat</h1>
          <p className="text-gray-400">
            Private messaging. No server storage.
            <br />
            Messages go directly between you and your peer.
          </p>
        </div>

        {/* Create Room */}
        <div className="space-y-4 rounded-xl bg-gray-800 p-6">
          <h2 className="text-lg font-medium text-white">
            Start a conversation
          </h2>
          <button
            type="button"
            onClick={handleCreateRoom}
            className="w-full rounded-lg bg-blue-600 px-4 py-3 font-medium text-white transition-colors hover:bg-blue-700"
          >
            Create New Room
          </button>
        </div>

        {/* Join Room */}
        <div className="space-y-4 rounded-xl bg-gray-800 p-6">
          <h2 className="text-lg font-medium text-white">Join existing room</h2>
          <form onSubmit={handleJoinRoom} className="space-y-3">
            <input
              type="text"
              value={joinRoomId}
              onChange={(e) => setJoinRoomId(e.target.value)}
              placeholder="Paste room link or ID"
              className="w-full rounded-lg border border-gray-600 bg-gray-700 px-4 py-3 text-white focus:border-blue-500 focus:outline-none"
            />
            <button
              type="submit"
              disabled={!joinRoomId.trim()}
              className="w-full rounded-lg bg-gray-600 px-4 py-3 font-medium text-white transition-colors hover:bg-gray-500 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Join Room
            </button>
          </form>
        </div>

        {/* Info */}
        <div className="text-center text-sm text-gray-500">
          <p>End-to-end encrypted via WebRTC</p>
          <p>Direct peer-to-peer connection</p>
          <p>No accounts required</p>
        </div>
      </div>
    </main>
  );
}
