import type { ConnectionState } from "@/hooks/use-webrtc";

interface ConnectionStatusProps {
  state: ConnectionState;
  error: string | null;
}

const statusConfig: Record<
  ConnectionState,
  { colorClass: string; text: string; shortText: string }
> = {
  disconnected: {
    colorClass: "bg-destructive",
    text: "Disconnected",
    shortText: "Disconnected",
  },
  connecting: {
    colorClass: "bg-accent animate-pulse",
    text: "Connecting to server...",
    shortText: "Connecting...",
  },
  waiting: {
    colorClass: "bg-accent animate-pulse",
    text: "Waiting for peer to join...",
    shortText: "Waiting...",
  },
  signaling: {
    colorClass: "bg-secondary animate-pulse",
    text: "Establishing P2P connection...",
    shortText: "Connecting P2P...",
  },
  connected: {
    colorClass: "bg-chart-2",
    text: "Connected (P2P)",
    shortText: "Connected",
  },
};

export function ConnectionStatus({ state, error }: ConnectionStatusProps) {
  const { colorClass, text, shortText } = statusConfig[state];

  // Truncate error message on mobile
  const shortError =
    error && error.length > 20 ? `${error.slice(0, 20)}...` : error;

  return (
    <div className="flex items-center gap-1.5">
      <div className={`h-2 w-2 shrink-0 rounded-full ${colorClass}`} />
      <span className="text-xs text-muted-foreground sm:hidden">
        {shortError || shortText}
      </span>
      <span className="hidden text-xs text-muted-foreground sm:inline">
        {error || text}
      </span>
    </div>
  );
}
