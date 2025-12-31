"use client";

import Link from "next/link";
import { use, useEffect, useRef, useState } from "react";
import { Avatar } from "@/components/avatar";
import { ChatInput } from "@/components/chat-input";
import { ChatMessages } from "@/components/chat-messages";
import { ConnectionStatus } from "@/components/connection-status";
import { CopyLinkButton } from "@/components/copy-link-button";
import { useWebRTC } from "@/hooks/use-webrtc";

interface ChatRoomProps {
  params: Promise<{ roomId: string }>;
}

export default function ChatRoom({ params }: ChatRoomProps) {
  const { roomId } = use(params);
  const {
    connectionState,
    messages,
    sendMessage,
    error,
    localUser,
    peer,
    updateLocalUserName,
  } = useWebRTC(roomId);
  const isConnected = connectionState === "connected";

  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(localUser.name);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing) {
      inputRef.current?.focus();
    }
  }, [isEditing]);

  const handleSaveName = () => {
    const trimmed = editName.trim();
    if (trimmed && trimmed !== localUser.name) {
      updateLocalUserName(trimmed);
    }
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSaveName();
    } else if (e.key === "Escape") {
      setEditName(localUser.name);
      setIsEditing(false);
    }
  };

  return (
    <div className="flex h-screen flex-col bg-gray-900">
      {/* Header */}
      <header className="flex items-center justify-between border-b border-gray-700 px-4 py-3">
        <div className="flex items-center gap-4">
          <Link href="/" className="text-gray-400 hover:text-white">
            Back
          </Link>
          <div>
            <h1 className="font-medium text-white">Room: {roomId}</h1>
            <ConnectionStatus state={connectionState} error={error} />
          </div>
        </div>

        {/* Participants */}
        <div className="flex items-center gap-4">
          {/* Peer */}
          {peer && (
            <div className="flex items-center gap-2">
              <Avatar name={peer.name} size="sm" />
              <span className="text-sm text-gray-300">{peer.name}</span>
            </div>
          )}

          {/* Local User */}
          <div className="flex items-center gap-2">
            <Avatar name={localUser.name} isLocal size="sm" />
            {isEditing ? (
              <input
                ref={inputRef}
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                onBlur={handleSaveName}
                onKeyDown={handleKeyDown}
                className="w-24 rounded bg-gray-800 px-2 py-1 text-sm text-white outline-none ring-1 ring-blue-500"
              />
            ) : (
              <button
                type="button"
                onClick={() => {
                  setEditName(localUser.name);
                  setIsEditing(true);
                }}
                className="text-sm text-gray-300 hover:text-white hover:underline"
                title="Click to rename"
              >
                {localUser.name} (you)
              </button>
            )}
          </div>

          <CopyLinkButton />
        </div>
      </header>

      {/* Messages */}
      <ChatMessages messages={messages} localUserId={localUser.id} />

      {/* Input */}
      <ChatInput onSend={sendMessage} disabled={!isConnected} />
    </div>
  );
}
