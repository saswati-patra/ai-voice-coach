import { useCallback, useEffect, useRef, useState } from "react";

import {
  ApiError,
  buildWebSocketUrl,
  getMe,
  ingestStudyMaterial,
  listReviewItems,
  listStudyMaterials,
  type ReviewItem,
  type StudyMaterial,
  uploadStudyMaterial,
} from "@/api";
import {
  INPUT_SAMPLE_RATE,
  OUTPUT_SAMPLE_RATE,
  arrayBufferToBase64,
  base64ToArrayBuffer,
  buildRecorderWorkletUrl,
  downsampleToPcm16,
  parseSampleRate,
  pcm16ToFloat32,
} from "@/audio";
import { apiBaseUrl, authMode, displayTarget, requiresFirebaseAuth, wsBaseUrl } from "@/config";
import {
  auth,
  firebaseConfigured,
  getCurrentIdToken,
  onAuthStateChanged,
  signInWithGoogleAccount,
  signOut,
  type User,
} from "@/firebase";

export type VoiceStatus = "disconnected" | "connecting" | "connected" | "recording" | "error";

type ServerEvent = {
  type: string;
  payload?: Record<string, string>;
};

function messageFromError(error: unknown, fallback: string): string {
  if (error instanceof ApiError && error.status === 401) {
    return "Sign in again. Your session is missing or expired.";
  }

  if (error instanceof Error) {
    return error.message;
  }

  return fallback;
}

export function useVoiceCoachWorkspace() {
  const [authReady, setAuthReady] = useState(!firebaseConfigured);
  const [authUser, setAuthUser] = useState<User | null>(null);
  const [profile, setProfile] = useState("");
  const [authMessage, setAuthMessage] = useState("");
  const [materials, setMaterials] = useState<StudyMaterial[]>([]);
  const [reviewItems, setReviewItems] = useState<ReviewItem[]>([]);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [loading, setLoading] = useState(false);
  const [voiceStatus, setVoiceStatus] = useState<VoiceStatus>("disconnected");
  const [voiceLog, setVoiceLog] = useState<string[]>([]);

  const socketRef = useRef<WebSocket | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const micSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const recorderNodeRef = useRef<AudioWorkletNode | null>(null);
  const playbackContextRef = useRef<AudioContext | null>(null);
  const nextPlaybackTimeRef = useRef(0);

  const appendVoiceLog = useCallback((message: string) => {
    setVoiceLog((current) => [
      ...current.slice(-80),
      `[${new Date().toLocaleTimeString()}] ${message}`,
    ]);
  }, []);

  const refreshData = useCallback(
    async (currentUser: User | null = authUser) => {
      if (requiresFirebaseAuth && !firebaseConfigured) {
        setProfile("Sign-in config missing");
        setMaterials([]);
        setReviewItems([]);
        setAuthMessage("Sign-in settings are missing for this local build.");
        return;
      }

      if (requiresFirebaseAuth && !currentUser) {
        setProfile("Signed out");
        setMaterials([]);
        setReviewItems([]);
        setAuthMessage("Sign in to use the cloud workspace.");
        return;
      }

      setLoading(true);
      try {
        const [me, studyMaterials, reviews] = await Promise.all([
          getMe(),
          listStudyMaterials(),
          listReviewItems(),
        ]);
        setProfile(`${me.display_name} (${me.id})`);
        setMaterials(studyMaterials);
        setReviewItems(reviews);
        setAuthMessage("");
      } catch (error) {
        setAuthMessage(messageFromError(error, "Unable to load data."));
      } finally {
        setLoading(false);
      }
    },
    [authUser]
  );

  useEffect(() => {
    if (!auth) {
      setAuthReady(true);
      refreshData(null);
      return undefined;
    }

    return onAuthStateChanged(auth, (user) => {
      setAuthUser(user);
      setAuthReady(true);
      refreshData(user);
    });
  }, [refreshData]);

  async function signIn() {
    if (!auth) {
      setAuthMessage("Sign-in settings are missing.");
      return;
    }

    try {
      await signInWithGoogleAccount();
      setAuthMessage("Signed in.");
    } catch (error) {
      setAuthMessage(messageFromError(error, "Sign in failed."));
    }
  }

  async function signOutUser() {
    if (!auth) {
      return;
    }

    await disconnectVoice();
    await signOut(auth);
    setAuthMessage("Signed out.");
  }

  async function uploadSelectedFile() {
    if (!canUseProtectedApi) {
      setAuthMessage(authGateMessage);
      return;
    }

    if (!selectedFile) {
      setAuthMessage("Select a file first.");
      return;
    }

    setLoading(true);
    try {
      await uploadStudyMaterial(selectedFile, title);
      setSelectedFile(null);
      setTitle("");
      await refreshData();
    } catch (error) {
      setAuthMessage(messageFromError(error, "Upload failed."));
    } finally {
      setLoading(false);
    }
  }

  async function ingestMaterial(materialId: string) {
    if (!canUseProtectedApi) {
      setAuthMessage(authGateMessage);
      return;
    }

    setLoading(true);
    try {
      await ingestStudyMaterial(materialId);
      await refreshData();
    } catch (error) {
      setAuthMessage(messageFromError(error, "Ingestion failed."));
    } finally {
      setLoading(false);
    }
  }

  function socketIsOpen() {
    return socketRef.current?.readyState === WebSocket.OPEN;
  }

  function sendVoiceEvent(type: string, payload: Record<string, string> = {}) {
    if (!socketIsOpen()) {
      appendVoiceLog("WebSocket is not connected.");
      return;
    }

    socketRef.current?.send(JSON.stringify({ type, payload }));
  }

  async function connectVoice() {
    if (socketIsOpen() || voiceStatus === "connecting") {
      return;
    }

    if (!canUseProtectedApi) {
      appendVoiceLog(authGateMessage);
      setAuthMessage(authGateMessage);
      return;
    }

    const token = await getCurrentIdToken();
    if (requiresFirebaseAuth && !token) {
      appendVoiceLog("Sign in before connecting.");
      setAuthMessage("Sign in before connecting the voice session.");
      return;
    }

    setVoiceStatus("connecting");
    const socket = new WebSocket(buildWebSocketUrl(token));
    socketRef.current = socket;

    socket.addEventListener("open", () => {
      setVoiceStatus("connected");
      appendVoiceLog("connected");
      socket.send(JSON.stringify({ type: "session.start", payload: {} }));
    });

    socket.addEventListener("message", (event) => {
      try {
        handleServerEvent(JSON.parse(event.data) as ServerEvent);
      } catch {
        appendVoiceLog("Received unreadable server event.");
      }
    });

    socket.addEventListener("close", (event) => {
      appendVoiceLog(event.reason ? `closed: ${event.code} ${event.reason}` : "closed");
      socketRef.current = null;
      setVoiceStatus("disconnected");
    });

    socket.addEventListener("error", () => {
      appendVoiceLog("WebSocket error");
      setVoiceStatus("error");
    });
  }

  async function startMic() {
    if (!socketIsOpen()) {
      appendVoiceLog("Connect first.");
      return;
    }

    const mediaStream = await navigator.mediaDevices.getUserMedia({
      audio: {
        channelCount: 1,
        echoCancellation: true,
        noiseSuppression: true,
      },
    });
    const audioContext = new AudioContext();
    const workletUrl = buildRecorderWorkletUrl();
    await audioContext.audioWorklet.addModule(workletUrl);
    URL.revokeObjectURL(workletUrl);

    const micSource = audioContext.createMediaStreamSource(mediaStream);
    const recorderNode = new AudioWorkletNode(audioContext, "pcm-recorder");
    const queuedSamples: Float32Array[] = [];
    let queuedSampleCount = 0;
    const targetChunkSamples = Math.floor(audioContext.sampleRate / 10);

    recorderNode.port.onmessage = (event: MessageEvent<Float32Array>) => {
      if (!socketIsOpen()) {
        return;
      }

      queuedSamples.push(event.data);
      queuedSampleCount += event.data.length;

      if (queuedSampleCount < targetChunkSamples) {
        return;
      }

      const chunk = new Float32Array(queuedSampleCount);
      let offset = 0;

      for (const samples of queuedSamples) {
        chunk.set(samples, offset);
        offset += samples.length;
      }

      queuedSamples.length = 0;
      queuedSampleCount = 0;

      const pcmBuffer = downsampleToPcm16(chunk, audioContext.sampleRate, INPUT_SAMPLE_RATE);

      sendVoiceEvent("audio.chunk", {
        data: arrayBufferToBase64(pcmBuffer),
        mime_type: `audio/pcm;rate=${INPUT_SAMPLE_RATE}`,
      });
    };

    mediaStreamRef.current = mediaStream;
    audioContextRef.current = audioContext;
    micSourceRef.current = micSource;
    recorderNodeRef.current = recorderNode;

    micSource.connect(recorderNode);
    recorderNode.connect(audioContext.destination);
    setVoiceStatus("recording");
    appendVoiceLog(`recording microphone at ${audioContext.sampleRate} Hz`);
  }

  async function stopMic() {
    const hadMic = Boolean(mediaStreamRef.current || audioContextRef.current);

    recorderNodeRef.current?.disconnect();
    micSourceRef.current?.disconnect();
    mediaStreamRef.current?.getTracks().forEach((track) => track.stop());
    await audioContextRef.current?.close();

    recorderNodeRef.current = null;
    micSourceRef.current = null;
    mediaStreamRef.current = null;
    audioContextRef.current = null;

    if (socketIsOpen()) {
      sendVoiceEvent("session.stop");
    }

    setVoiceStatus(socketIsOpen() ? "connected" : "disconnected");
    if (hadMic) {
      appendVoiceLog("microphone stopped");
    }
  }

  async function disconnectVoice() {
    if (mediaStreamRef.current) {
      await stopMic();
    }

    socketRef.current?.close();
    socketRef.current = null;
  }

  async function handleServerEvent(event: ServerEvent) {
    if (event.type === "coach.message") {
      appendVoiceLog(`coach: ${event.payload?.text || ""}`);
      return;
    }

    if (event.type === "transcript.partial") {
      appendVoiceLog(`you: ${event.payload?.text || ""}`);
      return;
    }

    if (event.type === "audio.chunk") {
      await playAudioChunk(event.payload);
      return;
    }

    if (event.type === "error") {
      appendVoiceLog(`error: ${event.payload?.message || "unknown error"}`);
      setVoiceStatus("error");
      return;
    }

    appendVoiceLog(event.type);
  }

  async function playAudioChunk(payload: Record<string, string> | undefined) {
    if (!payload?.data) {
      return;
    }

    const sampleRate = parseSampleRate(payload.mime_type, OUTPUT_SAMPLE_RATE);
    const samples = pcm16ToFloat32(base64ToArrayBuffer(payload.data));
    playbackContextRef.current ||= new AudioContext({ sampleRate });

    const playbackContext = playbackContextRef.current;
    const audioBuffer = playbackContext.createBuffer(1, samples.length, sampleRate);
    audioBuffer.copyToChannel(new Float32Array(samples), 0);

    const source = playbackContext.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(playbackContext.destination);

    const startAt = Math.max(playbackContext.currentTime, nextPlaybackTimeRef.current);
    source.start(startAt);
    nextPlaybackTimeRef.current = startAt + audioBuffer.duration;
  }

  const canUseProtectedApi =
    authReady && (!requiresFirebaseAuth || (firebaseConfigured && Boolean(authUser)));
  const authGateMessage = !firebaseConfigured
    ? "Sign-in settings are missing for this local build."
    : "Sign in to use the cloud backend.";
  const showFirebaseControls = requiresFirebaseAuth && firebaseConfigured;
  const isConnected = voiceStatus === "connected" || voiceStatus === "recording";
  const isConnecting = voiceStatus === "connecting";
  const isRecording = voiceStatus === "recording";
  const canSignIn = Boolean(showFirebaseControls && auth && authReady && !loading);
  const authStateLabel = (() => {
    if (!requiresFirebaseAuth || !firebaseConfigured) {
      return "dev fallback";
    }

    if (!authReady) {
      return "checking";
    }

    return authUser ? "signed in" : "signed out";
  })();
  const authStatusTone: "secondary" | "success" | "warning" = !requiresFirebaseAuth
    ? "secondary"
    : authUser
      ? "success"
      : "warning";
  const protectedDisabled = loading || !canUseProtectedApi;

  return {
    auth: {
      apiTarget: displayTarget(apiBaseUrl),
      authGateMessage,
      authMode,
      authReady,
      authStateLabel,
      authStatusTone,
      authUser,
      canSignIn,
      canUseProtectedApi,
      firebaseConfigured,
      message: authMessage,
      profile,
      refreshData,
      requiresFirebaseAuth,
      showFirebaseControls,
      signIn,
      signOut: signOutUser,
      wsTarget: displayTarget(wsBaseUrl),
    },
    loading,
    protectedDisabled,
    review: {
      items: reviewItems,
    },
    study: {
      ingestMaterial,
      materials,
      selectedFile,
      setSelectedFile,
      setTitle,
      title,
      uploadSelectedFile,
    },
    voice: {
      appendVoiceLog,
      connectVoice,
      disconnectVoice,
      isConnected,
      isConnecting,
      isRecording,
      log: voiceLog,
      startMic,
      status: voiceStatus,
      stopMic,
    },
  };
}

export type VoiceCoachWorkspace = ReturnType<typeof useVoiceCoachWorkspace>;
