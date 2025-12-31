"use client";

import Link from "next/link";
import { use } from "react";
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
  const { connectionState, messages, sendMessage, error } = useWebRTC(roomId);
  const isConnected = connectionState === "connected";

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
        <CopyLinkButton />
      </header>

      {/* Messages */}
      <ChatMessages messages={messages} />

      {/* Input */}
      <ChatInput onSend={sendMessage} disabled={!isConnected} />
    </div>
  );
}
