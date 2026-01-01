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

  // Sync editName when localUser hydrates from localStorage
  useEffect(() => {
    if (!isEditing) {
      setEditName(localUser.name);
    }
  }, [localUser.name, isEditing]);

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
        <div className="mx-auto max-w-4xl px-3 py-2 sm:px-4">
          {/* Top row: Navigation, Room ID, Copy Link */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 sm:gap-3">
              <Link
                href="/"
                className="flex shrink-0 items-center gap-1.5 text-muted-foreground transition-colors hover:text-foreground"
              >
                <svg
                  className="h-4 w-4 sm:h-5 sm:w-5"
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
                <CrafterLogo className="h-5 w-5 sm:h-6 sm:w-6" />
              </Link>
              <div className="h-5 w-px bg-border" />
              <h1 className="text-sm font-medium text-foreground sm:text-base">
                <span className="font-mono text-xs text-muted-foreground sm:text-sm">
                  {roomId}
                </span>
              </h1>
            </div>

            <CopyLinkButton />
          </div>

          {/* Bottom row: Connection status and participants */}
          <div className="mt-2 flex items-center justify-between">
            <ConnectionStatus state={connectionState} error={error} />

            {/* Participants */}
            <div className="flex items-center gap-2">
              {/* Peer */}
              {peer && (
                <div className="flex items-center gap-1.5" title={peer.name}>
                  <Avatar name={peer.name} size="sm" />
                  <span className="hidden text-sm text-muted-foreground sm:inline">
                    {peer.name}
                  </span>
                </div>
              )}

              {/* Local User */}
              <div className="flex items-center gap-1.5">
                <Avatar name={localUser.name} isLocal size="sm" />
                {isEditing ? (
                  <input
                    ref={inputRef}
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    onBlur={handleSaveName}
                    onKeyDown={handleKeyDown}
                    className="w-20 rounded-md border border-ring bg-card px-1.5 py-0.5 text-xs text-foreground outline-none ring-2 ring-ring/20 sm:w-24 sm:px-2 sm:py-1 sm:text-sm"
                  />
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setEditName(localUser.name);
                      setIsEditing(true);
                    }}
                    className="text-xs text-muted-foreground transition-colors hover:text-foreground hover:underline sm:text-sm"
                    title="Click to rename"
                  >
                    <span className="sm:hidden">{localUser.name}</span>
                    <span className="hidden sm:inline">
                      {localUser.name} (you)
                    </span>
                  </button>
                )}
              </div>
            </div>
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
