import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";
import * as Y from "yjs";
import type { DocCollaborationOperation } from "@/types";
import {
  appendDocOperations,
  createDocRealtimeChannel,
  type DocCollaborationOperationInput,
} from "@/services/docs";
import {
  LOCAL_ORIGIN,
  REMOTE_ORIGIN,
  decodeUpdate,
  encodeUpdate,
  materializeFromState,
  serializeDoc,
} from "@/utils/crdt";
import { MarkdownEditor } from "./MarkdownEditor";

export type CollaborationStatus = {
  connectedPeers: number;
  offline: boolean;
  pendingUpdates: number;
  channelState: "idle" | "connecting" | "connected" | "error";
  lastSyncedAt?: string;
};

export type CollaborativeContentState = {
  markdown: string;
  snapshot: string;
  stateVector: string;
  operations: DocCollaborationOperationInput[];
};

export type CollaborativeMarkdownEditorHandle = {
  getContentState: () => CollaborativeContentState;
  reset: (state: {
    markdown: string;
    snapshot?: string | null;
    operations?: string[];
  }) => void;
};

const RTC_CONFIGURATION: RTCConfiguration = {
  iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
};

type CollaborativeMarkdownEditorProps = {
  docId: string;
  initialValue: string;
  initialSnapshot?: string | null;
  initialStateVector?: string | null;
  initialOperations?: DocCollaborationOperation[];
  onChange?: (value: string) => void;
  onStatusChange?: (status: CollaborationStatus) => void;
  readOnly?: boolean;
};

type SignalPayload = {
  type: "offer" | "answer" | "ice";
  from: string;
  target: string;
  payload: RTCSessionDescriptionInit | RTCIceCandidateInit;
};

function generateClientId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `client-${Math.random().toString(36).slice(2)}`;
}

function loadPendingOperations(key: string): DocCollaborationOperationInput[] {
  if (typeof localStorage === "undefined") return [];
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((item) => {
        if (!item || typeof item.update !== "string" || typeof item.clientId !== "string") {
          return null;
        }
        return {
          update: item.update,
          clientId: item.clientId,
          createdAt: typeof item.createdAt === "string" ? item.createdAt : new Date().toISOString(),
          offline: Boolean(item.offline),
        } satisfies DocCollaborationOperationInput;
      })
      .filter(Boolean) as DocCollaborationOperationInput[];
  } catch (error) {
    console.error("Unable to load pending doc operations", error);
    return [];
  }
}

function persistPendingOperations(key: string, operations: DocCollaborationOperationInput[]) {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(key, JSON.stringify(operations));
  } catch (error) {
    console.error("Unable to persist pending doc operations", error);
  }
}

export const CollaborativeMarkdownEditor = forwardRef<
  CollaborativeMarkdownEditorHandle,
  CollaborativeMarkdownEditorProps
>(function CollaborativeMarkdownEditor(
  {
    docId,
    initialValue,
    initialSnapshot,
    initialOperations,
    onChange,
    onStatusChange,
    readOnly,
  },
  ref
) {
  const [value, setValue] = useState(initialValue ?? "");
  const [status, setStatus] = useState<CollaborationStatus>(() => ({
    connectedPeers: 0,
    offline: typeof navigator !== "undefined" ? !navigator.onLine : false,
    pendingUpdates: 0,
    channelState: "idle",
    lastSyncedAt: undefined,
  }));
  const clientIdRef = useRef(generateClientId());
  const ydocRef = useRef<Y.Doc | null>(null);
  const channelRef = useRef<ReturnType<typeof createDocRealtimeChannel> | null>(null);
  const pendingOperationsRef = useRef<DocCollaborationOperationInput[]>([]);
  const suppressBroadcastRef = useRef(false);
  const cleanupRef = useRef<(() => void) | null>(null);
  const offlineKey = useMemo(() => `doc:${docId}:pending`, [docId]);
  const webrtcPeersRef = useRef(new Map<string, RTCPeerConnection>());
  const webrtcChannelsRef = useRef(new Map<string, RTCDataChannel>());
  const pendingCandidatesRef = useRef(new Map<string, RTCIceCandidateInit[]>());

  const applyMarkdownFromDoc = useCallback(
    (doc: Y.Doc) => {
      const text = doc.getText("content");
      const nextValue = text.toString();
      setValue(nextValue);
      onChange?.(nextValue);
    },
    [onChange]
  );

  const updatePendingCount = useCallback(
    (count: number) => {
      setStatus((previous) => ({ ...previous, pendingUpdates: count }));
    },
    []
  );

  const queuePendingOperation = useCallback(
    (operation: DocCollaborationOperationInput) => {
      pendingOperationsRef.current = [...pendingOperationsRef.current, operation];
      updatePendingCount(pendingOperationsRef.current.length);
      persistPendingOperations(offlineKey, pendingOperationsRef.current);
    },
    [offlineKey, updatePendingCount]
  );

  const broadcastUpdate = useCallback(
    (operation: DocCollaborationOperationInput) => {
      const message = {
        type: "update",
        update: operation.update,
        clientId: operation.clientId,
        createdAt: operation.createdAt,
      };

      const channel = channelRef.current;
      if (channel) {
        channel.send({
          type: "broadcast",
          event: "doc:update",
          payload: message,
        });
      }

      const payload = JSON.stringify(message);
      webrtcChannelsRef.current.forEach((dataChannel) => {
        if (dataChannel.readyState === "open") {
          try {
            dataChannel.send(payload);
          } catch (error) {
            console.error("Failed to broadcast WebRTC update", error);
          }
        }
      });
    },
    []
  );

  const flushPendingOperations = useCallback(async () => {
    if (!pendingOperationsRef.current.length) return;
    if (typeof navigator !== "undefined" && !navigator.onLine) return;

    const operations = [...pendingOperationsRef.current];
    try {
      await appendDocOperations(docId, operations);
      pendingOperationsRef.current = [];
      persistPendingOperations(offlineKey, []);
      updatePendingCount(0);
      setStatus((previous) => ({
        ...previous,
        lastSyncedAt: new Date().toISOString(),
      }));
    } catch (error) {
      console.error("Unable to flush collaboration operations", error);
    }
  }, [docId, offlineKey, updatePendingCount]);

  const handleLocalUpdate = useCallback(
    (update: Uint8Array) => {
      const encoded = encodeUpdate(update);
      const operation: DocCollaborationOperationInput = {
        update: encoded,
        clientId: clientIdRef.current,
        createdAt: new Date().toISOString(),
        offline: typeof navigator !== "undefined" ? !navigator.onLine : false,
      };
      queuePendingOperation(operation);
      broadcastUpdate(operation);
    },
    [broadcastUpdate, queuePendingOperation]
  );

  const handleRemoteUpdate = useCallback((payload: { update: string; clientId: string }) => {
    if (payload.clientId === clientIdRef.current) return;
    const update = decodeUpdate(payload.update);
    if (!update || !ydocRef.current) return;

    suppressBroadcastRef.current = true;
    try {
      Y.applyUpdate(ydocRef.current, update, REMOTE_ORIGIN);
    } finally {
      suppressBroadcastRef.current = false;
    }
  }, []);

  const attachDoc = useCallback(
    (snapshot: string | null | undefined, operations: string[], fallback: string) => {
      ydocRef.current?.destroy();
      const { doc } = materializeFromState({
        snapshot: snapshot ?? undefined,
        operations,
        fallback,
      });
      ydocRef.current = doc;
      const text = doc.getText("content");

      const updateListener = (update: Uint8Array, origin: unknown) => {
        if (origin === REMOTE_ORIGIN || suppressBroadcastRef.current) {
          return;
        }
        handleLocalUpdate(update);
      };

      const textListener = () => {
        applyMarkdownFromDoc(doc);
      };

      doc.on("update", updateListener);
      text.observe(textListener);
      applyMarkdownFromDoc(doc);

      return () => {
        text.unobserve(textListener);
        doc.off("update", updateListener);
        doc.destroy();
        ydocRef.current = null;
      };
    },
    [applyMarkdownFromDoc, handleLocalUpdate]
  );

  useEffect(() => {
    cleanupRef.current?.();
    const cleanup = attachDoc(
      initialSnapshot,
      (initialOperations ?? []).map((operation) => operation.update),
      initialValue ?? ""
    );
    cleanupRef.current = cleanup ?? null;

    const pending = loadPendingOperations(offlineKey);
    if (pending.length && ydocRef.current) {
      pendingOperationsRef.current = pending;
      updatePendingCount(pending.length);
      suppressBroadcastRef.current = true;
      try {
        for (const operation of pending) {
          const update = decodeUpdate(operation.update);
          if (!update) continue;
          Y.applyUpdate(ydocRef.current, update, LOCAL_ORIGIN);
        }
      } finally {
        suppressBroadcastRef.current = false;
      }
      applyMarkdownFromDoc(ydocRef.current);
    } else {
      pendingOperationsRef.current = [];
      updatePendingCount(0);
      persistPendingOperations(offlineKey, []);
    }

    const peersStore = webrtcPeersRef.current;
    const channelsStore = webrtcChannelsRef.current;
    const candidatesStore = pendingCandidatesRef.current;

    return () => {

      cleanupRef.current?.();
      cleanupRef.current = null;

      peersStore.forEach((peer) => {
        try {
          peer.close();
        } catch (error) {
          console.error("Unable to close peer connection", error);
        }
      });
      peersStore.clear();

      channelsStore.forEach((channel) => {
        try {
          channel.close();
        } catch (error) {
          console.error("Unable to close data channel", error);
        }
      });
      channelsStore.clear();

      candidatesStore.clear();
    };
  }, [attachDoc, applyMarkdownFromDoc, initialOperations, initialSnapshot, initialValue, offlineKey, updatePendingCount]);

  useEffect(() => {
    onStatusChange?.(status);
  }, [status, onStatusChange]);

  useEffect(() => {
    const flush = () => flushPendingOperations();
    const interval = window.setInterval(flush, 4000);
    window.addEventListener("online", flush);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener("online", flush);
    };
  }, [flushPendingOperations]);

  useEffect(() => {
    const handleNetwork = () => {
      setStatus((previous) => ({
        ...previous,
        offline: typeof navigator !== "undefined" ? !navigator.onLine : previous.offline,
      }));
    };
    window.addEventListener("online", handleNetwork);
    window.addEventListener("offline", handleNetwork);
    return () => {
      window.removeEventListener("online", handleNetwork);
      window.removeEventListener("offline", handleNetwork);
    };
  }, []);

  const sendSignal = useCallback(
    (payload: SignalPayload) => {
      const channel = channelRef.current;
      if (!channel) return;
      channel.send({ type: "broadcast", event: "doc:signal", payload });
    },
    []
  );

  const ensurePeerConnection = useCallback(
    (peerId: string): RTCPeerConnection => {
      let connection = webrtcPeersRef.current.get(peerId);
      if (connection) return connection;

      connection = new RTCPeerConnection(RTC_CONFIGURATION);
      connection.onicecandidate = (event) => {
        if (event.candidate) {
          sendSignal({
            type: "ice",
            from: clientIdRef.current,
            target: peerId,
            payload: event.candidate,
          });
        }
      };
      connection.onconnectionstatechange = () => {
        if (
          connection?.connectionState === "failed" ||
          connection?.connectionState === "closed"
        ) {
          webrtcPeersRef.current.delete(peerId);
          const channel = webrtcChannelsRef.current.get(peerId);
          channel?.close();
          webrtcChannelsRef.current.delete(peerId);
        }
      };
      connection.ondatachannel = (event) => {
        const channel = event.channel;
        channel.onmessage = (event) => {
          try {
            const parsed = JSON.parse(event.data);
            if (parsed?.type === "update") {
              handleRemoteUpdate(parsed);
            }
          } catch (error) {
            console.error("Unable to parse WebRTC payload", error);
          }
        };
        webrtcChannelsRef.current.set(peerId, channel);
      };

      webrtcPeersRef.current.set(peerId, connection);
      return connection;
    },
    [handleRemoteUpdate, sendSignal]
  );

  const flushPendingCandidates = useCallback(
    async (peerId: string, connection: RTCPeerConnection) => {
      const pending = pendingCandidatesRef.current.get(peerId);
      if (!pending?.length) return;
      for (const candidateInit of pending) {
        try {
          await connection.addIceCandidate(new RTCIceCandidate(candidateInit));
        } catch (error) {
          console.error("Unable to apply queued ICE candidate", error);
        }
      }
      pendingCandidatesRef.current.delete(peerId);
    },
    []
  );

  const startWebRtcOffer = useCallback(
    async (peerId: string) => {
      if (webrtcPeersRef.current.has(peerId)) return;
      const connection = ensurePeerConnection(peerId);
      const dataChannel = connection.createDataChannel("doc");
      dataChannel.onmessage = (event) => {
        try {
          const parsed = JSON.parse(event.data);
          if (parsed?.type === "update") {
            handleRemoteUpdate(parsed);
          }
        } catch (error) {
          console.error("Unable to parse WebRTC update", error);
        }
      };
      webrtcChannelsRef.current.set(peerId, dataChannel);

      const offer = await connection.createOffer();
      await connection.setLocalDescription(offer);
      sendSignal({
        type: "offer",
        from: clientIdRef.current,
        target: peerId,
        payload: offer,
      });
    },
    [ensurePeerConnection, handleRemoteUpdate, sendSignal]
  );

  const handleSignalMessage = useCallback(
    async (message: SignalPayload) => {
      if (message.target !== clientIdRef.current) return;
      if (message.from === clientIdRef.current) return;
      const peerConnection = ensurePeerConnection(message.from);

      switch (message.type) {
        case "offer": {
          await peerConnection.setRemoteDescription(new RTCSessionDescription(message.payload as RTCSessionDescriptionInit));
          const answer = await peerConnection.createAnswer();
          await peerConnection.setLocalDescription(answer);
          await flushPendingCandidates(message.from, peerConnection);
          sendSignal({
            type: "answer",
            from: clientIdRef.current,
            target: message.from,
            payload: answer,
          });
          break;
        }
        case "answer": {
          if (!peerConnection.currentRemoteDescription) {
            await peerConnection.setRemoteDescription(
              new RTCSessionDescription(message.payload as RTCSessionDescriptionInit)
            );
          }
          await flushPendingCandidates(message.from, peerConnection);
          break;
        }
        case "ice": {
          const candidate = new RTCIceCandidate(message.payload as RTCIceCandidateInit);
          if (peerConnection.remoteDescription) {
            await peerConnection.addIceCandidate(candidate);
          } else {
            const existing = pendingCandidatesRef.current.get(message.from) ?? [];
            pendingCandidatesRef.current.set(message.from, [...existing, message.payload as RTCIceCandidateInit]);
          }
          break;
        }
        default:
          break;
      }
    },
    [ensurePeerConnection, flushPendingCandidates, sendSignal]
  );

  useEffect(() => {
    const channel = createDocRealtimeChannel(docId, {
      config: {
        broadcast: { ack: true },
        presence: { key: clientIdRef.current },
      },
    });
    channelRef.current = channel;
    setStatus((previous) => ({ ...previous, channelState: "connecting" }));

    channel.on("broadcast", { event: "doc:update" }, (event) => {
      if (!event?.payload) return;
      handleRemoteUpdate(event.payload as { update: string; clientId: string });
    });

    channel.on("broadcast", { event: "doc:signal" }, (event) => {
      if (!event?.payload) return;
      handleSignalMessage(event.payload as SignalPayload);
    });

    channel.on("presence", { event: "sync" }, ({ currentPresences }) => {
      const peers = Object.keys(currentPresences ?? {}).filter(
        (key) => key !== clientIdRef.current
      );
      setStatus((previous) => ({ ...previous, connectedPeers: peers.length }));
      peers.forEach((peerId) => {
        if (clientIdRef.current > peerId) {
          startWebRtcOffer(peerId);
        }
      });
    });

    const subscribe = async () => {
      try {
        const subscription = await channel.subscribe((state) => {
          if (state === "SUBSCRIBED") {
            setStatus((previous) => ({ ...previous, channelState: "connected" }));
            channel.track({
              joinedAt: new Date().toISOString(),
              clientId: clientIdRef.current,
            });
            flushPendingOperations();
          }
          if (state === "CHANNEL_ERROR" || state === "TIMED_OUT") {
            setStatus((previous) => ({ ...previous, channelState: "error" }));
          }
        });
        if ((subscription as any)?.error) {
          console.error("Unable to subscribe to doc channel", (subscription as any).error);
          setStatus((previous) => ({ ...previous, channelState: "error" }));
        }
      } catch (error) {
        console.error("Unable to connect to doc channel", error);
        setStatus((previous) => ({ ...previous, channelState: "error" }));
      }
    };

    subscribe();

    return () => {
      channelRef.current = null;
      channel.unsubscribe();
    };
  }, [docId, flushPendingOperations, handleRemoteUpdate, handleSignalMessage, startWebRtcOffer]);

  useImperativeHandle(
    ref,
    () => ({
      getContentState: () => {
        const doc = ydocRef.current;
        if (!doc) {
          return {
            markdown: value,
            snapshot: "",
            stateVector: "",
            operations: [...pendingOperationsRef.current],
          };
        }
        const serialized = serializeDoc(doc);
        return {
          markdown: serialized.markdown,
          snapshot: serialized.snapshot,
          stateVector: serialized.stateVector,
          operations: [...pendingOperationsRef.current],
        };
      },
      reset: (state) => {
        cleanupRef.current?.();
        cleanupRef.current = attachDoc(state.snapshot, state.operations ?? [], state.markdown) ?? null;
        pendingOperationsRef.current = [];
        updatePendingCount(0);
        persistPendingOperations(offlineKey, []);
      },
    }),
    [attachDoc, offlineKey, updatePendingCount, value]
  );

  const handleEditorChange = useCallback(
    (nextValue: string) => {
      if (!ydocRef.current) {
        setValue(nextValue);
        onChange?.(nextValue);
        return;
      }
      const doc = ydocRef.current;
      const text = doc.getText("content");
      suppressBroadcastRef.current = true;
      try {
        doc.transact(() => {
          text.delete(0, text.length);
          if (nextValue) {
            text.insert(0, nextValue);
          }
        }, LOCAL_ORIGIN);
      } finally {
        suppressBroadcastRef.current = false;
      }
      setValue(nextValue);
      onChange?.(nextValue);
    },
    [onChange]
  );

  return (
    <MarkdownEditor value={value} onChange={handleEditorChange} disabled={readOnly} />
  );
});
