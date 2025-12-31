import type { ConnectionState } from "@/hooks/use-webrtc";

interface ConnectionStatusProps {
  state: ConnectionState;
  error: string | null;
}

const statusConfig: Record<
  ConnectionState,
  { colorClass: string; text: string }
> = {
  disconnected: { colorClass: "bg-destructive", text: "Disconnected" },
  connecting: {
    colorClass: "bg-accent animate-pulse",
    text: "Connecting to server...",
  },
  waiting: {
    colorClass: "bg-accent animate-pulse",
    text: "Waiting for peer to join...",
  },
  signaling: {
    colorClass: "bg-secondary animate-pulse",
    text: "Establishing P2P connection...",
  },
  connected: { colorClass: "bg-chart-2", text: "Connected (P2P)" },
};

export function ConnectionStatus({ state, error }: ConnectionStatusProps) {
  const { colorClass, text } = statusConfig[state];

  return (
    <div className="flex items-center gap-2">
      <div className={`h-2 w-2 rounded-full ${colorClass}`} />
      <span className="text-xs text-muted-foreground">{error || text}</span>
    </div>
  );
}
