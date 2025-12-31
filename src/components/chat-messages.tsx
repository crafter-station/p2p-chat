"use client";

import { useCallback } from "react";
import type { Message } from "@/hooks/use-webrtc";
import { Avatar } from "./avatar";

interface ChatMessagesProps {
  messages: Message[];
  localUserId: string;
}

export function ChatMessages({ messages, localUserId }: ChatMessagesProps) {
  const scrollRef = useCallback((node: HTMLDivElement | null) => {
    node?.scrollIntoView({ behavior: "smooth" });
  }, []);

  if (messages.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center text-center">
        <div className="mb-4 rounded-full bg-muted p-4">
          <svg
            className="h-8 w-8 text-muted-foreground"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
            />
          </svg>
        </div>
        <p className="text-lg font-medium text-foreground">No messages yet</p>
        <p className="text-sm text-muted-foreground">
          Say hello to start the conversation!
        </p>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col space-y-3 overflow-y-auto py-4">
      {messages.map((msg) => {
        const isMe = msg.senderId === localUserId;
        return (
          <div
            key={msg.id}
            className={`flex items-end gap-2 ${isMe ? "flex-row-reverse" : "flex-row"}`}
          >
            <Avatar name={msg.senderName} isLocal={isMe} size="sm" />
            <div
              className={`max-w-[75%] rounded-2xl px-4 py-2 shadow-sm ${
                isMe
                  ? "rounded-br-md bg-primary text-primary-foreground"
                  : "rounded-bl-md bg-card text-card-foreground border border-border"
              }`}
            >
              <p
                className={`text-xs font-medium ${isMe ? "opacity-80" : "text-muted-foreground"}`}
              >
                {msg.senderName}
              </p>
              <p className="break-words">{msg.content}</p>
              <p
                className={`mt-1 text-xs ${
                  isMe ? "opacity-70" : "text-muted-foreground"
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
      <div key={messages.length} ref={scrollRef} />
    </div>
  );
}
