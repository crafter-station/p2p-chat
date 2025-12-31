import type { ConnectionState } from "@/hooks/use-webrtc";

interface ConnectionStatusProps {
  state: ConnectionState;
  error: string | null;
}

const statusConfig: Record<ConnectionState, { color: string; text: string }> = {
  disconnected: { color: "bg-red-500", text: "Disconnected" },
  connecting: {
    color: "bg-yellow-500 animate-pulse",
    text: "Connecting to server...",
  },
  waiting: {
    color: "bg-yellow-500 animate-pulse",
    text: "Waiting for peer to join...",
  },
  signaling: {
    color: "bg-blue-500 animate-pulse",
    text: "Establishing P2P connection...",
  },
  connected: { color: "bg-green-500", text: "Connected (P2P)" },
};

export function ConnectionStatus({ state, error }: ConnectionStatusProps) {
  const { color, text } = statusConfig[state];

  return (
    <div className="flex items-center gap-2">
      <div className={`h-2.5 w-2.5 rounded-full ${color}`} />
      <span className="text-sm text-gray-400">{error || text}</span>
    </div>
  );
}
