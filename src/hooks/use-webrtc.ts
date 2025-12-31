"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { io, type Socket } from "socket.io-client";

// ============ Types ============
export interface Message {
  id: string;
  content: string;
  sender: "me" | "peer";
  timestamp: Date;
}

export type ConnectionState =
  | "disconnected" // Initial state
  | "connecting" // Connecting to signaling server
  | "waiting" // In room, waiting for peer
  | "signaling" // Exchanging SDP/ICE
  | "connected"; // P2P connection established

interface UseWebRTCReturn {
  connectionState: ConnectionState;
  messages: Message[];
  sendMessage: (content: string) => void;
  error: string | null;
}

// ============ Utilities ============
function generateId(): string {
  // Fallback for browsers without crypto.randomUUID (e.g., non-HTTPS contexts)
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // Simple fallback using Math.random
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

// ============ Configuration ============
const SIGNALING_URL =
  process.env.NEXT_PUBLIC_SIGNALING_URL || "http://localhost:3001";

const ICE_SERVERS: RTCIceServer[] = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
  { urls: "stun:stun2.l.google.com:19302" },
];

const DATA_CHANNEL_CONFIG: RTCDataChannelInit = {
  ordered: true, // Guaranteed order
  maxRetransmits: 10, // Retry failed messages
};

// ============ Hook ============
export function useWebRTC(roomId: string): UseWebRTCReturn {
  const [connectionState, setConnectionState] =
    useState<ConnectionState>("disconnected");
  const [messages, setMessages] = useState<Message[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Refs for mutable values that shouldn't trigger re-renders
  const socketRef = useRef<Socket | null>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const dataChannelRef = useRef<RTCDataChannel | null>(null);
  const pendingCandidatesRef = useRef<RTCIceCandidateInit[]>([]);

  // ============ Data Channel Setup ============
  const setupDataChannel = useCallback((channel: RTCDataChannel) => {
    dataChannelRef.current = channel;

    channel.onopen = () => {
      console.log("[DataChannel] Opened - P2P connection established");
      setConnectionState("connected");
      setError(null);
    };

    channel.onclose = () => {
      console.log("[DataChannel] Closed");
      setConnectionState("waiting");
    };

    channel.onerror = (event) => {
      console.error("[DataChannel] Error:", event);
      setError("Connection error. Please try again.");
    };

    channel.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        setMessages((prev) => [
          ...prev,
          {
            id: generateId(),
            content: data.content,
            sender: "peer",
            timestamp: new Date(data.timestamp),
          },
        ]);
      } catch (e) {
        console.error("[DataChannel] Failed to parse message:", e);
      }
    };
  }, []);

  // ============ Peer Connection Setup ============
  const createPeerConnection = useCallback(
    (peerId: string) => {
      console.log("[WebRTC] Creating peer connection for:", peerId);

      const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
      peerConnectionRef.current = pc;

      pc.onicecandidate = (event) => {
        if (event.candidate) {
          console.log("[WebRTC] Sending ICE candidate");
          socketRef.current?.emit("ice-candidate", {
            to: peerId,
            candidate: event.candidate.toJSON(),
          });
        }
      };

      pc.oniceconnectionstatechange = () => {
        console.log("[WebRTC] ICE state:", pc.iceConnectionState);

        if (pc.iceConnectionState === "failed") {
          setError(
            "Connection failed. You may need a different network or TURN server.",
          );
          setConnectionState("waiting");
        }

        if (pc.iceConnectionState === "disconnected") {
          setConnectionState("waiting");
        }
      };

      pc.ondatachannel = (event) => {
        console.log("[WebRTC] Received data channel");
        setupDataChannel(event.channel);
      };

      return pc;
    },
    [setupDataChannel],
  );

  // ============ Send Message ============
  const sendMessage = useCallback((content: string) => {
    const channel = dataChannelRef.current;

    if (!channel || channel.readyState !== "open") {
      console.warn("[SendMessage] Channel not ready");
      return;
    }

    const message = {
      content,
      timestamp: new Date().toISOString(),
    };

    try {
      channel.send(JSON.stringify(message));

      setMessages((prev) => [
        ...prev,
        {
          id: generateId(),
          content,
          sender: "me",
          timestamp: new Date(),
        },
      ]);
    } catch (e) {
      console.error("[SendMessage] Failed:", e);
      setError("Failed to send message");
    }
  }, []);

  // ============ Main Effect ============
  useEffect(() => {
    if (!roomId) return;

    console.log("[Init] Connecting to signaling server...");
    setConnectionState("connecting");

    const socket = io(SIGNALING_URL, {
      transports: ["websocket"],
      reconnection: true,
      reconnectionAttempts: 5,
    });
    socketRef.current = socket;

    // --- Socket Events ---
    socket.on("connect", () => {
      console.log("[Socket] Connected, joining room:", roomId);
      socket.emit("join-room", roomId);
    });

    socket.on("connect_error", (err) => {
      console.error("[Socket] Connection error:", err);
      setError("Cannot connect to server. Please try again.");
      setConnectionState("disconnected");
    });

    socket.on("room-joined", async ({ peers }) => {
      console.log("[Room] Joined. Peers:", peers);

      if (peers.length === 0) {
        setConnectionState("waiting");
        return;
      }

      // We have a peer, start signaling
      setConnectionState("signaling");
      const peerId = peers[0]; // For MVP, only handle 1 peer

      const pc = createPeerConnection(peerId);

      // Create data channel (only initiator creates it)
      const channel = pc.createDataChannel("messages", DATA_CHANNEL_CONFIG);
      setupDataChannel(channel);

      // Create and send offer
      try {
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);

        socket.emit("signal", {
          to: peerId,
          signal: { type: "offer", sdp: offer.sdp },
        });
      } catch (e) {
        console.error("[WebRTC] Failed to create offer:", e);
        setError("Failed to initiate connection");
      }
    });

    socket.on("peer-joined", ({ peerId }) => {
      console.log("[Room] Peer joined:", peerId);
      setConnectionState("signaling");

      // New peer will send us an offer, so just prepare
      createPeerConnection(peerId);
    });

    socket.on("signal", async ({ from, signal }) => {
      console.log("[Signal] Received", signal.type, "from:", from);

      let pc = peerConnectionRef.current;

      if (signal.type === "offer") {
        // We received an offer, create answer
        if (!pc) {
          pc = createPeerConnection(from);
        }

        try {
          await pc.setRemoteDescription(new RTCSessionDescription(signal));

          // Add any pending ICE candidates
          for (const candidate of pendingCandidatesRef.current) {
            await pc.addIceCandidate(new RTCIceCandidate(candidate));
          }
          pendingCandidatesRef.current = [];

          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);

          socket.emit("signal", {
            to: from,
            signal: { type: "answer", sdp: answer.sdp },
          });
        } catch (e) {
          console.error("[WebRTC] Failed to handle offer:", e);
          setError("Connection negotiation failed");
        }
      } else if (signal.type === "answer") {
        // We received an answer to our offer
        try {
          await pc?.setRemoteDescription(new RTCSessionDescription(signal));

          // Add any pending ICE candidates
          for (const candidate of pendingCandidatesRef.current) {
            await pc?.addIceCandidate(new RTCIceCandidate(candidate));
          }
          pendingCandidatesRef.current = [];
        } catch (e) {
          console.error("[WebRTC] Failed to handle answer:", e);
        }
      }
    });

    socket.on("ice-candidate", async ({ candidate }) => {
      const pc = peerConnectionRef.current;

      if (pc?.remoteDescription) {
        try {
          await pc.addIceCandidate(new RTCIceCandidate(candidate));
        } catch (e) {
          console.error("[WebRTC] Failed to add ICE candidate:", e);
        }
      } else {
        // Queue candidate if we don't have remote description yet
        pendingCandidatesRef.current.push(candidate);
      }
    });

    socket.on("peer-left", ({ peerId }) => {
      console.log("[Room] Peer left:", peerId);
      setConnectionState("waiting");

      // Cleanup
      dataChannelRef.current?.close();
      peerConnectionRef.current?.close();
      dataChannelRef.current = null;
      peerConnectionRef.current = null;
    });

    // --- Cleanup ---
    return () => {
      console.log("[Cleanup] Disconnecting...");
      dataChannelRef.current?.close();
      peerConnectionRef.current?.close();
      socket.disconnect();

      dataChannelRef.current = null;
      peerConnectionRef.current = null;
      socketRef.current = null;
      pendingCandidatesRef.current = [];
    };
  }, [roomId, createPeerConnection, setupDataChannel]);

  return {
    connectionState,
    messages,
    sendMessage,
    error,
  };
}
