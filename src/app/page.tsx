"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { CrafterLogo, Navbar } from "@/components/navbar";

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
      const match = joinRoomId.match(/\/chat\/([a-zA-Z0-9-]+)/);
      const roomId = match ? match[1] : joinRoomId.trim();
      router.push(`/chat/${roomId}`);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Navbar />

      <main className="flex flex-1 flex-col">
        {/* Hero Section */}
        <section className="relative overflow-hidden border-b border-border">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/10" />
          <div className="relative mx-auto max-w-4xl px-4 py-20 text-center">
            <div className="mb-6 flex justify-center">
              <div className="rounded-2xl bg-card p-4 shadow-lg">
                <CrafterLogo className="h-16 w-16" />
              </div>
            </div>
            <h1 className="mb-4 text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
              Private conversations,
              <br />
              <span className="text-primary">crafted with care</span>
            </h1>
            <p className="mx-auto mb-8 max-w-2xl text-lg text-muted-foreground">
              Crafter Chat connects you directly with others using peer-to-peer
              technology. Your messages never touch our servers.{" "}
              <span className="font-medium text-foreground">
                No accounts. No tracking. Just chat.
              </span>
            </p>
            <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
              <button
                type="button"
                onClick={handleCreateRoom}
                className="inline-flex h-12 items-center justify-center gap-2 rounded-lg bg-primary px-8 text-base font-medium text-primary-foreground shadow-md transition-all hover:bg-primary/90 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
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
                    d="M12 4v16m8-8H4"
                  />
                </svg>
                Start New Chat
              </button>
              <span className="text-sm text-muted-foreground">or</span>
              <form onSubmit={handleJoinRoom} className="flex gap-2">
                <input
                  type="text"
                  value={joinRoomId}
                  onChange={(e) => setJoinRoomId(e.target.value)}
                  placeholder="Paste room link or ID"
                  className="h-12 w-64 rounded-lg border border-border bg-card px-4 text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/20"
                />
                <button
                  type="submit"
                  disabled={!joinRoomId.trim()}
                  className="inline-flex h-12 items-center justify-center rounded-lg bg-muted px-6 font-medium text-foreground transition-colors hover:bg-muted/80 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Join
                </button>
              </form>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="py-16">
          <div className="mx-auto max-w-4xl px-4">
            <h2 className="mb-12 text-center text-2xl font-semibold text-foreground">
              Why Crafter Chat?
            </h2>
            <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
              <FeatureCard
                icon={
                  <svg
                    className="h-6 w-6"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                    />
                  </svg>
                }
                title="End-to-End Encrypted"
                description="WebRTC connections are encrypted by default. Your messages are secure from the moment they leave your device."
              />
              <FeatureCard
                icon={
                  <svg
                    className="h-6 w-6"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                    />
                  </svg>
                }
                title="Direct P2P Connection"
                description="Messages travel directly between you and your peer. No middleman, no server storing your conversations."
              />
              <FeatureCard
                icon={
                  <svg
                    className="h-6 w-6"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M13 10V3L4 14h7v7l9-11h-7z"
                    />
                  </svg>
                }
                title="Instant & Lightweight"
                description="No signup, no app download, no configuration. Just create a room and share the link to start chatting."
              />
              <FeatureCard
                icon={
                  <svg
                    className="h-6 w-6"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                }
                title="Works Everywhere"
                description="Built on web standards. Works on any modern browser, any device, anywhere in the world."
              />
              <FeatureCard
                icon={
                  <svg
                    className="h-6 w-6"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                    />
                  </svg>
                }
                title="No Tracking"
                description="We don't track you. No analytics, no cookies, no personal data collection. Your privacy is respected."
              />
              <FeatureCard
                icon={
                  <svg
                    className="h-6 w-6"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"
                    />
                  </svg>
                }
                title="Open Source"
                description="Crafter Chat is open source. Inspect the code, verify our claims, and contribute to make it better."
              />
            </div>
          </div>
        </section>

        {/* How It Works Section */}
        <section className="border-t border-border bg-muted/30 py-16">
          <div className="mx-auto max-w-4xl px-4">
            <h2 className="mb-12 text-center text-2xl font-semibold text-foreground">
              How It Works
            </h2>
            <div className="flex flex-col gap-8 md:flex-row md:gap-4">
              <Step
                number={1}
                title="Create a Room"
                description="Click 'Start New Chat' to create a private room with a unique link."
              />
              <StepArrow />
              <Step
                number={2}
                title="Share the Link"
                description="Send the room link to your friend through any channel you trust."
              />
              <StepArrow />
              <Step
                number={3}
                title="Chat Privately"
                description="Once connected, messages flow directly between you. No server in the middle."
              />
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-16">
          <div className="mx-auto max-w-4xl px-4 text-center">
            <h2 className="mb-4 text-2xl font-semibold text-foreground">
              Ready to chat privately?
            </h2>
            <p className="mb-8 text-muted-foreground">
              No signup required. Start a conversation in seconds.
            </p>
            <button
              type="button"
              onClick={handleCreateRoom}
              className="inline-flex h-12 items-center justify-center gap-2 rounded-lg bg-primary px-8 text-base font-medium text-primary-foreground shadow-md transition-all hover:bg-primary/90 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
            >
              Start New Chat
            </button>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-border py-8">
        <div className="mx-auto max-w-4xl px-4 text-center text-sm text-muted-foreground">
          <p>Built with WebRTC. Your messages never touch our servers.</p>
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-6 shadow-sm transition-shadow hover:shadow-md">
      <div className="mb-4 inline-flex rounded-lg bg-primary/10 p-3 text-primary">
        {icon}
      </div>
      <h3 className="mb-2 font-semibold text-foreground">{title}</h3>
      <p className="text-sm leading-relaxed text-muted-foreground">
        {description}
      </p>
    </div>
  );
}

function Step({
  number,
  title,
  description,
}: {
  number: number;
  title: string;
  description: string;
}) {
  return (
    <div className="flex flex-1 flex-col items-center text-center">
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary text-xl font-bold text-primary-foreground">
        {number}
      </div>
      <h3 className="mb-2 font-semibold text-foreground">{title}</h3>
      <p className="text-sm text-muted-foreground">{description}</p>
    </div>
  );
}

function StepArrow() {
  return (
    <div className="hidden items-center justify-center md:flex">
      <svg
        className="h-6 w-6 text-muted-foreground"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
        aria-hidden="true"
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
      </svg>
    </div>
  );
}
