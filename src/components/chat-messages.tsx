"use client";

import { useCallback } from "react";
import type { Message } from "@/hooks/use-webrtc";
import { Avatar } from "./avatar";

interface ChatMessagesProps {
  messages: Message[];
  localUserId: string;
}

export function ChatMessages({ messages, localUserId }: ChatMessagesProps) {
  // Use a callback ref to scroll on each render when messages change
  const scrollRef = useCallback((node: HTMLDivElement | null) => {
    node?.scrollIntoView({ behavior: "smooth" });
  }, []);

  if (messages.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center text-gray-500">
        <p>No messages yet. Say hello!</p>
      </div>
    );
  }

  return (
    <div className="flex-1 space-y-3 overflow-y-auto p-4">
      {messages.map((msg) => {
        const isMe = msg.senderId === localUserId;
        return (
          <div
            key={msg.id}
            className={`flex items-end gap-2 ${isMe ? "flex-row-reverse" : "flex-row"}`}
          >
            <Avatar name={msg.senderName} isLocal={isMe} size="sm" />
            <div
              className={`max-w-[75%] rounded-2xl px-4 py-2 ${
                isMe
                  ? "rounded-br-md bg-blue-600 text-white"
                  : "rounded-bl-md bg-gray-700 text-white"
              }`}
            >
              <p className="text-xs font-medium opacity-75">{msg.senderName}</p>
              <p className="break-words">{msg.content}</p>
              <p
                className={`mt-1 text-xs ${
                  isMe ? "text-blue-200" : "text-gray-400"
                }`}
              >
                {msg.timestamp.toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
            </div>
          </div>
        );
      })}
      {/* Key forces re-render on message count change to trigger scroll */}
      <div key={messages.length} ref={scrollRef} />
    </div>
  );
}
