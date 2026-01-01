"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { io, type Socket } from "socket.io-client";

// ============ Types ============
export interface Participant {
  id: string;
  name: string;
}

export interface Message {
  id: string;
  content: string;
  senderId: string;
  senderName: string;
  timestamp: Date;
}

export type ConnectionState =
  | "disconnected" // Initial state
  | "connecting" // Connecting to signaling server
  | "waiting" // In room, waiting for peer
  | "signaling" // Exchanging SDP/ICE
  | "connected"; // P2P connection established

// Message types sent over the data channel
type DataChannelMessage =
  | { type: "chat"; content: string; timestamp: string }
  | { type: "user-info"; user: Participant }
  | { type: "user-update"; user: Participant };

interface UseWebRTCReturn {
  connectionState: ConnectionState;
  messages: Message[];
  sendMessage: (content: string) => void;
  error: string | null;
  localUser: Participant;
  peer: Participant | null;
  updateLocalUserName: (name: string) => void;
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

const LOCAL_STORAGE_KEY = "p2p-chat-user";

// Default user for SSR - will be replaced on client
const DEFAULT_USER: Participant = { id: "", name: "Anonymous" };

// ============ User Helpers ============
function getOrCreateStoredUser(): Participant {
  const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
  if (stored) {
    try {
      const parsed = JSON.parse(stored);
      if (parsed.id && parsed.name) {
        return parsed;
      }
    } catch {
      // Ignore parse errors
    }
  }

  const newUser: Participant = {
    id: generateId(),
    name: "Anonymous",
  };
  localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(newUser));
  return newUser;
}

function saveUser(user: Participant): void {
  localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(user));
}

// ============ Hook ============
export function useWebRTC(roomId: string): UseWebRTCReturn {
  const [connectionState, setConnectionState] =
    useState<ConnectionState>("disconnected");
  const [messages, setMessages] = useState<Message[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [localUser, setLocalUser] = useState<Participant>(DEFAULT_USER);
  const [peer, setPeer] = useState<Participant | null>(null);

  // Hydrate local user from localStorage on mount
  useEffect(() => {
    const storedUser = getOrCreateStoredUser();
    setLocalUser(storedUser);
  }, []);

  // Refs for mutable values that shouldn't trigger re-renders
  const socketRef = useRef<Socket | null>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const dataChannelRef = useRef<RTCDataChannel | null>(null);
  const pendingCandidatesRef = useRef<RTCIceCandidateInit[]>([]);

  // Ref to access latest localUser in callbacks
  const localUserRef = useRef<Participant>(localUser);
  useEffect(() => {
    localUserRef.current = localUser;
  }, [localUser]);

  // Ref to access latest peer in callbacks
  const peerRef = useRef<Participant | null>(peer);
  useEffect(() => {
    peerRef.current = peer;
  }, [peer]);

  // ============ Data Channel Setup ============
  const setupDataChannel = useCallback((channel: RTCDataChannel) => {
    dataChannelRef.current = channel;

    channel.onopen = () => {
      console.log("[DataChannel] Opened - P2P connection established");
      setConnectionState("connected");
      setError(null);

      // Send our user info to peer
      const userInfoMessage: DataChannelMessage = {
        type: "user-info",
        user: localUserRef.current,
      };
      channel.send(JSON.stringify(userInfoMessage));
    };

    channel.onclose = () => {
      console.log("[DataChannel] Closed");
      setConnectionState("waiting");
      setPeer(null);
    };

    channel.onerror = (event) => {
      console.error("[DataChannel] Error:", event);
      setError("Connection error. Please try again.");
    };

    channel.onmessage = (event) => {
      try {
        const data: DataChannelMessage = JSON.parse(event.data);

        switch (data.type) {
          case "chat":
            // Use peer's actual name from ref, fallback to "peer" if not yet received
            setMessages((prev) => [
              ...prev,
              {
                id: generateId(),
                content: data.content,
                senderId: "peer",
                senderName: peerRef.current?.name ?? "peer",
                timestamp: new Date(data.timestamp),
              },
            ]);
            break;

          case "user-info":
          case "user-update":
            console.log("[DataChannel] Received user info:", data.user);
            setPeer(data.user);
            // Update sender names in existing messages from this peer
            // Do this for both user-info and user-update to handle messages
            // that arrived before we received peer info
            setMessages((prev) =>
              prev.map((msg) =>
                msg.senderId === "peer"
                  ? { ...msg, senderName: data.user.name }
                  : msg,
              ),
            );
            break;
        }
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

    const message: DataChannelMessage = {
      type: "chat",
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
          senderId: localUserRef.current.id,
          senderName: localUserRef.current.name,
          timestamp: new Date(),
        },
      ]);
    } catch (e) {
      console.error("[SendMessage] Failed:", e);
      setError("Failed to send message");
    }
  }, []);

  // ============ Update Local User Name ============
  const updateLocalUserName = useCallback((name: string) => {
    const updatedUser: Participant = { ...localUserRef.current, name };
    setLocalUser(updatedUser);
    saveUser(updatedUser);

    // Notify peer of name change
    const channel = dataChannelRef.current;
    if (channel && channel.readyState === "open") {
      const updateMessage: DataChannelMessage = {
        type: "user-update",
        user: updatedUser,
      };
      channel.send(JSON.stringify(updateMessage));
    }

    // Update our own messages with new name
    setMessages((prev) =>
      prev.map((msg) =>
        msg.senderId === localUserRef.current.id
          ? { ...msg, senderName: name }
          : msg,
      ),
    );
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
    localUser,
    peer,
    updateLocalUserName,
  };
}
