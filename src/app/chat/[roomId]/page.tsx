"use client";

import Link from "next/link";
import { use, useEffect, useRef, useState } from "react";
import { Avatar } from "@/components/avatar";
import { ChatInput } from "@/components/chat-input";
import { ChatMessages } from "@/components/chat-messages";
import { ConnectionStatus } from "@/components/connection-status";
import { CopyLinkButton } from "@/components/copy-link-button";
import { CrafterLogo } from "@/components/navbar";
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
    <div className="flex h-screen flex-col bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="mx-auto flex h-14 max-w-4xl items-center justify-between px-4">
          <div className="flex items-center gap-4">
            <Link
              href="/"
              className="flex items-center gap-2 text-muted-foreground transition-colors hover:text-foreground"
            >
              <svg
                className="h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M10 19l-7-7m0 0l7-7m-7 7h18"
                />
              </svg>
              <CrafterLogo className="h-6 w-6" />
            </Link>
            <div className="h-6 w-px bg-border" />
            <div>
              <h1 className="font-medium text-foreground">
                Room:{" "}
                <span className="font-mono text-sm text-muted-foreground">
                  {roomId}
                </span>
              </h1>
              <ConnectionStatus state={connectionState} error={error} />
            </div>
          </div>

          {/* Participants */}
          <div className="flex items-center gap-3">
            {/* Peer */}
            {peer && (
              <div className="flex items-center gap-2">
                <Avatar name={peer.name} size="sm" />
                <span className="text-sm text-muted-foreground">
                  {peer.name}
                </span>
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
                  className="w-24 rounded-md border border-ring bg-card px-2 py-1 text-sm text-foreground outline-none ring-2 ring-ring/20"
                />
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setEditName(localUser.name);
                    setIsEditing(true);
                  }}
                  className="text-sm text-muted-foreground transition-colors hover:text-foreground hover:underline"
                  title="Click to rename"
                >
                  {localUser.name} (you)
                </button>
              )}
            </div>

            <div className="h-6 w-px bg-border" />

            <CopyLinkButton />
          </div>
        </div>
      </header>

      {/* Messages */}
      <div className="flex-1 overflow-hidden">
        <div className="mx-auto h-full max-w-4xl px-4">
          <ChatMessages messages={messages} localUserId={localUser.id} />
        </div>
      </div>

      {/* Input */}
      <div className="border-t border-border bg-background">
        <div className="mx-auto max-w-4xl px-4">
          <ChatInput onSend={sendMessage} disabled={!isConnected} />
        </div>
      </div>
    </div>
  );
}
