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

  // Track current peer's socket ID for proper cleanup and signaling
  const currentPeerIdRef = useRef<string | null>(null);

  // Track if we've already joined to prevent duplicate joins on socket reconnect
  const hasJoinedRef = useRef<boolean>(false);

  // Mounted flag to prevent state updates after unmount
  const isMountedRef = useRef<boolean>(true);

  // For polite peer pattern: determines who yields on glare (simultaneous offers)
  // The peer with the "lower" socket ID is the "polite" peer and will rollback
  const isPoliteRef = useRef<boolean>(false);
  const makingOfferRef = useRef<boolean>(false);
  const ignoreOfferRef = useRef<boolean>(false);

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

  // ============ Cleanup Helper ============
  const cleanupPeerConnection = useCallback(() => {
    console.log("[Cleanup] Cleaning up peer connection");

    if (dataChannelRef.current) {
      dataChannelRef.current.onopen = null;
      dataChannelRef.current.onclose = null;
      dataChannelRef.current.onerror = null;
      dataChannelRef.current.onmessage = null;
      dataChannelRef.current.close();
      dataChannelRef.current = null;
    }

    if (peerConnectionRef.current) {
      peerConnectionRef.current.onicecandidate = null;
      peerConnectionRef.current.oniceconnectionstatechange = null;
      peerConnectionRef.current.ondatachannel = null;
      peerConnectionRef.current.onnegotiationneeded = null;
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }

    pendingCandidatesRef.current = [];
    currentPeerIdRef.current = null;
    makingOfferRef.current = false;
    ignoreOfferRef.current = false;
  }, []);

  // ============ Data Channel Setup ============
  const setupDataChannel = useCallback((channel: RTCDataChannel) => {
    dataChannelRef.current = channel;

    channel.onopen = () => {
      if (!isMountedRef.current) return;
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
      if (!isMountedRef.current) return;
      console.log("[DataChannel] Closed");
      // Don't immediately transition - wait for peer-left or reconnection
    };

    channel.onerror = (event) => {
      if (!isMountedRef.current) return;
      console.error("[DataChannel] Error:", event);
      setError("Connection error. Please try again.");
    };

    channel.onmessage = (event) => {
      if (!isMountedRef.current) return;
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

      // Clean up any existing connection first
      cleanupPeerConnection();

      currentPeerIdRef.current = peerId;

      const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
      peerConnectionRef.current = pc;

      pc.onicecandidate = (event) => {
        if (event.candidate && currentPeerIdRef.current) {
          console.log("[WebRTC] Sending ICE candidate");
          socketRef.current?.emit("ice-candidate", {
            to: currentPeerIdRef.current,
            candidate: event.candidate.toJSON(),
          });
        }
      };

      pc.oniceconnectionstatechange = () => {
        if (!isMountedRef.current) return;
        console.log("[WebRTC] ICE state:", pc.iceConnectionState);

        switch (pc.iceConnectionState) {
          case "failed":
            setError(
              "Connection failed. You may need a different network or TURN server.",
            );
            setConnectionState("waiting");
            cleanupPeerConnection();
            setPeer(null);
            break;

          case "disconnected":
            // ICE disconnected - peer may have left or network issue
            // Don't immediately cleanup, wait for reconnection or peer-left
            console.log("[WebRTC] ICE disconnected - waiting for recovery");
            break;

          case "closed":
            if (isMountedRef.current) {
              setConnectionState("waiting");
              setPeer(null);
            }
            break;
        }
      };

      pc.ondatachannel = (event) => {
        console.log("[WebRTC] Received data channel");
        setupDataChannel(event.channel);
      };

      return pc;
    },
    [cleanupPeerConnection, setupDataChannel],
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

    isMountedRef.current = true;
    hasJoinedRef.current = false;

    console.log("[Init] Connecting to signaling server...");
    setConnectionState("connecting");

    const socket = io(SIGNALING_URL, {
      transports: ["websocket"],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });
    socketRef.current = socket;

    // --- Socket Events ---
    socket.on("connect", () => {
      if (!isMountedRef.current) return;
      console.log("[Socket] Connected, socket id:", socket.id);

      // Prevent duplicate joins on reconnection
      if (!hasJoinedRef.current) {
        console.log("[Socket] Joining room:", roomId);
        socket.emit("join-room", roomId);
        hasJoinedRef.current = true;
      } else {
        // On reconnection, rejoin the room
        console.log("[Socket] Reconnected, rejoining room:", roomId);
        // Clean up existing connection as peer IDs will change
        cleanupPeerConnection();
        setPeer(null);
        socket.emit("join-room", roomId);
      }
    });

    socket.on("connect_error", (err) => {
      if (!isMountedRef.current) return;
      console.error("[Socket] Connection error:", err);
      setError("Cannot connect to server. Please try again.");
      setConnectionState("disconnected");
    });

    socket.on("room-joined", async ({ peers }) => {
      if (!isMountedRef.current) return;
      console.log("[Room] Joined. Peers:", peers);

      if (peers.length === 0) {
        setConnectionState("waiting");
        return;
      }

      // We have a peer, start signaling
      setConnectionState("signaling");
      const peerId = peers[0]; // For MVP, only handle 1 peer

      // Determine politeness: lower socket ID is polite
      // This is used for handling glare (simultaneous offers)
      const socketId = socket.id ?? "";
      isPoliteRef.current = socketId < peerId;
      console.log(
        "[WebRTC] We are the",
        isPoliteRef.current ? "polite" : "impolite",
        "peer",
      );

      const pc = createPeerConnection(peerId);

      // Create data channel (only initiator creates it)
      const channel = pc.createDataChannel("messages", DATA_CHANNEL_CONFIG);
      setupDataChannel(channel);

      // Create and send offer
      try {
        makingOfferRef.current = true;
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);

        socket.emit("signal", {
          to: peerId,
          signal: { type: "offer", sdp: offer.sdp },
        });
      } catch (e) {
        console.error("[WebRTC] Failed to create offer:", e);
        if (isMountedRef.current) {
          setError("Failed to initiate connection");
        }
      } finally {
        makingOfferRef.current = false;
      }
    });

    socket.on("peer-joined", ({ peerId }) => {
      if (!isMountedRef.current) return;
      console.log("[Room] Peer joined:", peerId);

      // Clean up any existing connection before new peer
      cleanupPeerConnection();
      setPeer(null);

      setConnectionState("signaling");

      // Determine politeness for glare handling
      const socketId = socket.id ?? "";
      isPoliteRef.current = socketId < peerId;
      console.log(
        "[WebRTC] We are the",
        isPoliteRef.current ? "polite" : "impolite",
        "peer",
      );

      // New peer will send us an offer, so just prepare
      createPeerConnection(peerId);
    });

    socket.on("signal", async ({ from, signal }) => {
      if (!isMountedRef.current) return;
      console.log("[Signal] Received", signal.type, "from:", from);

      let pc = peerConnectionRef.current;

      // Verify the signal is from our current peer
      if (currentPeerIdRef.current && currentPeerIdRef.current !== from) {
        console.warn(
          "[Signal] Ignoring signal from unknown peer:",
          from,
          "expected:",
          currentPeerIdRef.current,
        );
        return;
      }

      if (signal.type === "offer") {
        // Handle glare (simultaneous offers) using polite peer pattern
        const offerCollision =
          makingOfferRef.current ||
          (pc?.signalingState !== "stable" && pc?.signalingState !== undefined);

        ignoreOfferRef.current = !isPoliteRef.current && offerCollision;

        if (ignoreOfferRef.current) {
          console.log(
            "[WebRTC] Ignoring offer due to glare (we are impolite peer)",
          );
          return;
        }

        // We received an offer, create answer
        if (!pc) {
          pc = createPeerConnection(from);
        }

        try {
          // If we're the polite peer and there's a collision, rollback
          if (offerCollision && isPoliteRef.current) {
            console.log(
              "[WebRTC] Rolling back local description (polite peer)",
            );
            await pc.setLocalDescription({ type: "rollback" });
          }

          await pc.setRemoteDescription(new RTCSessionDescription(signal));

          // Add any pending ICE candidates
          for (const candidate of pendingCandidatesRef.current) {
            try {
              await pc.addIceCandidate(new RTCIceCandidate(candidate));
            } catch (e) {
              console.warn("[WebRTC] Failed to add pending ICE candidate:", e);
            }
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
          if (isMountedRef.current) {
            setError("Connection negotiation failed");
          }
        }
      } else if (signal.type === "answer") {
        // We received an answer to our offer
        if (!pc) {
          console.warn(
            "[WebRTC] Received answer but no peer connection exists",
          );
          return;
        }

        // Check signaling state before setting remote description
        if (pc.signalingState !== "have-local-offer") {
          console.warn(
            "[WebRTC] Received answer in unexpected state:",
            pc.signalingState,
          );
          return;
        }

        try {
          await pc.setRemoteDescription(new RTCSessionDescription(signal));

          // Add any pending ICE candidates
          for (const candidate of pendingCandidatesRef.current) {
            try {
              await pc.addIceCandidate(new RTCIceCandidate(candidate));
            } catch (e) {
              console.warn("[WebRTC] Failed to add pending ICE candidate:", e);
            }
          }
          pendingCandidatesRef.current = [];
        } catch (e) {
          console.error("[WebRTC] Failed to handle answer:", e);
        }
      }
    });

    socket.on("ice-candidate", async ({ from, candidate }) => {
      if (!isMountedRef.current) return;

      // Verify the candidate is from our current peer
      if (currentPeerIdRef.current && currentPeerIdRef.current !== from) {
        console.warn(
          "[ICE] Ignoring candidate from unknown peer:",
          from,
          "expected:",
          currentPeerIdRef.current,
        );
        return;
      }

      const pc = peerConnectionRef.current;

      if (pc?.remoteDescription?.type) {
        try {
          await pc.addIceCandidate(new RTCIceCandidate(candidate));
        } catch (e) {
          // Ignore errors for candidates that arrive after connection is established
          if (pc.iceConnectionState !== "connected") {
            console.warn("[WebRTC] Failed to add ICE candidate:", e);
          }
        }
      } else {
        // Queue candidate if we don't have remote description yet
        pendingCandidatesRef.current.push(candidate);
      }
    });

    socket.on("peer-left", ({ peerId }) => {
      if (!isMountedRef.current) return;
      console.log("[Room] Peer left:", peerId);

      // Only cleanup if it's our current peer
      if (currentPeerIdRef.current === peerId) {
        cleanupPeerConnection();
        setPeer(null);
        setConnectionState("waiting");
      }
    });

    // --- Cleanup ---
    return () => {
      console.log("[Cleanup] Disconnecting...");
      isMountedRef.current = false;
      hasJoinedRef.current = false;

      cleanupPeerConnection();
      socket.disconnect();
      socketRef.current = null;
    };
  }, [roomId, createPeerConnection, setupDataChannel, cleanupPeerConnection]);

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
