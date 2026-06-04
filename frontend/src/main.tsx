import React, { useCallback, useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  AlertTriangle,
  BookOpen,
  CheckCircle2,
  Cloud,
  FileUp,
  Info,
  LogIn,
  LogOut,
  Mic,
  Plug,
  RefreshCw,
  ShieldCheck,
  Square,
  UploadCloud,
  UserPlus,
  Volume2,
} from "lucide-react";
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
} from "./api";
import {
  INPUT_SAMPLE_RATE,
  OUTPUT_SAMPLE_RATE,
  arrayBufferToBase64,
  base64ToArrayBuffer,
  buildRecorderWorkletUrl,
  downsampleToPcm16,
  parseSampleRate,
  pcm16ToFloat32,
} from "./audio";
import { apiBaseUrl, authMode, displayTarget, requiresFirebaseAuth, wsBaseUrl } from "./config";
import {
  auth,
  createUserWithEmailAndPassword,
  firebaseConfigured,
  getCurrentIdToken,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  type User,
} from "./firebase";
import "./styles.css";

type VoiceStatus = "disconnected" | "connecting" | "connected" | "recording" | "error";
type ServerEvent = {
  type: string;
  payload?: Record<string, string>;
};

function messageFromError(error: unknown, fallback: string): string {
  if (error instanceof ApiError && error.status === 401) {
    return "Sign in again. Firebase token is missing or expired.";
  }

  if (error instanceof Error) {
    return error.message;
  }

  return fallback;
}

function App() {
  const [authReady, setAuthReady] = useState(!firebaseConfigured);
  const [authUser, setAuthUser] = useState<User | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
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
        setProfile("Firebase config missing");
        setMaterials([]);
        setReviewItems([]);
        setAuthMessage("Set VITE_FIREBASE_* values before using Firebase auth mode.");
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
      return;
    }

    return onAuthStateChanged(auth, (user) => {
      setAuthUser(user);
      setAuthReady(true);
      refreshData(user);
    });
  }, [refreshData]);

  async function signIn() {
    if (!auth) {
      setAuthMessage("Firebase is not configured.");
      return;
    }

    if (!email || !password) {
      setAuthMessage("Enter email and password.");
      return;
    }

    try {
      await signInWithEmailAndPassword(auth, email, password);
      setPassword("");
      setAuthMessage("Signed in.");
    } catch (error) {
      setAuthMessage(messageFromError(error, "Sign in failed."));
    }
  }

  async function createAccount() {
    if (!auth) {
      setAuthMessage("Firebase is not configured.");
      return;
    }

    if (!email || !password) {
      setAuthMessage("Enter email and password.");
      return;
    }

    try {
      await createUserWithEmailAndPassword(auth, email, password);
      setPassword("");
      setAuthMessage("Account created.");
    } catch (error) {
      setAuthMessage(messageFromError(error, "Account creation failed."));
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
    ? "Firebase auth mode needs frontend Firebase config."
    : "Sign in to use the cloud backend.";
  const showFirebaseControls = requiresFirebaseAuth && firebaseConfigured;
  const isConnected = voiceStatus === "connected" || voiceStatus === "recording";
  const isConnecting = voiceStatus === "connecting";
  const isRecording = voiceStatus === "recording";
  const canSubmitCredentials = Boolean(showFirebaseControls && auth && email && password && !loading);
  const authStateLabel = (() => {
    if (!requiresFirebaseAuth || !firebaseConfigured) {
      return "dev fallback";
    }

    if (!authReady) {
      return "checking";
    }

    return authUser ? "signed in" : "signed out";
  })();
  const authStatusClass = !requiresFirebaseAuth ? "dev" : authUser ? "signed-in" : "signed-out";
  const protectedDisabled = loading || !canUseProtectedApi;

  return (
    <main className="app-shell">
      <header className="top-bar">
        <div>
          <h1>AI Voice Coach</h1>
          <p>{profile || "Local study workspace"}</p>
        </div>
        <div className="top-actions">
          <span className={`status-pill ${authMode}`}>{authMode}</span>
          <button className="icon-button secondary" onClick={() => refreshData()} disabled={loading}>
            <RefreshCw size={17} />
            Refresh
          </button>
        </div>
      </header>

      <section className="panel auth-panel">
        <div className="section-heading">
          <ShieldCheck size={19} />
          <h2>Auth</h2>
          <span className={`status-pill ${authStatusClass}`}>{authStateLabel}</span>
        </div>

        <div className="config-grid">
          <span>
            <Cloud size={15} />
            API {displayTarget(apiBaseUrl)}
          </span>
          <span>
            <Plug size={15} />
            WS {displayTarget(wsBaseUrl)}
          </span>
          <span>
            {firebaseConfigured ? <CheckCircle2 size={15} /> : <Info size={15} />}
            Firebase {firebaseConfigured ? "configured" : "not configured"}
          </span>
        </div>

        {requiresFirebaseAuth && !canUseProtectedApi ? (
          <div className="notice warning">
            <AlertTriangle size={17} />
            {authGateMessage}
          </div>
        ) : null}

        {showFirebaseControls && authUser ? (
          <div className="identity-line">
            <strong>{authUser.email || "Firebase user"}</strong>
            <span>{authUser.uid}</span>
            <button className="icon-button secondary" onClick={signOutUser}>
              <LogOut size={17} />
              Sign Out
            </button>
          </div>
        ) : showFirebaseControls ? (
          <div className="auth-grid">
            <input
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              type="email"
              placeholder="Email"
              autoComplete="email"
              disabled={!authReady || loading}
            />
            <input
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              type="password"
              placeholder="Password"
              autoComplete="current-password"
              disabled={!authReady || loading}
            />
            <button className="icon-button" onClick={signIn} disabled={!canSubmitCredentials}>
              <LogIn size={17} />
              Sign In
            </button>
            <button
              className="icon-button secondary"
              onClick={createAccount}
              disabled={!canSubmitCredentials}
            >
              <UserPlus size={17} />
              Create
            </button>
          </div>
        ) : (
          <p className="muted">Dev auth uses the backend fixed local user.</p>
        )}
        <div className="message-line">{authMessage || authUser?.email || "Ready"}</div>
      </section>

      <section className="panel">
        <div className="section-heading">
          <FileUp size={19} />
          <h2>Study Materials</h2>
        </div>
        <div className="upload-row">
          <input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Title"
            disabled={protectedDisabled}
          />
          <input
            type="file"
            accept=".pdf,.txt,text/plain,application/pdf"
            onChange={(event) => setSelectedFile(event.target.files?.[0] || null)}
            disabled={protectedDisabled}
          />
          <button
            className="icon-button"
            onClick={uploadSelectedFile}
            disabled={protectedDisabled || !selectedFile}
          >
            <UploadCloud size={17} />
            Upload
          </button>
        </div>
        <div className="material-list">
          {materials.length ? (
            materials.map((material) => (
              <article className="material-item" key={material.id}>
                <div>
                  <h3>{material.title}</h3>
                  <p>
                    {material.source_type} / {material.ingestion_status.replace("_", " ")}
                  </p>
                </div>
                <button
                  className="icon-button secondary"
                  onClick={() => ingestMaterial(material.id)}
                  disabled={protectedDisabled || !material.storage_path}
                >
                  <BookOpen size={17} />
                  Ingest
                </button>
                {material.summary ? <p className="summary">{material.summary}</p> : null}
                {material.key_concepts.length ? (
                  <div className="concept-list">
                    {material.key_concepts.map((concept) => (
                      <span key={concept}>{concept}</span>
                    ))}
                  </div>
                ) : null}
              </article>
            ))
          ) : (
            <p className="empty-state">No study materials yet.</p>
          )}
        </div>
      </section>

      <section className="panel">
        <div className="section-heading">
          <BookOpen size={19} />
          <h2>Review Items</h2>
        </div>
        <div className="review-list">
          {reviewItems.length ? (
            reviewItems.map((item) => <span key={item.id}>{item.concept}</span>)
          ) : (
            <p className="empty-state">No review items yet.</p>
          )}
        </div>
      </section>

      <section className="panel">
        <div className="section-heading">
          <Volume2 size={19} />
          <h2>Voice Session</h2>
          <span className={`status-pill ${voiceStatus}`}>{voiceStatus}</span>
        </div>
        <div className="controls">
          <button
            className="icon-button"
            onClick={connectVoice}
            disabled={protectedDisabled || isConnected || isConnecting}
          >
            <Plug size={17} />
            Connect
          </button>
          <button
            className="icon-button secondary"
            onClick={() => startMic().catch((error) => appendVoiceLog(error.message))}
            disabled={!isConnected || isRecording}
          >
            <Mic size={17} />
            Start Mic
          </button>
          <button className="icon-button secondary" onClick={stopMic} disabled={!isRecording}>
            <Square size={17} />
            Stop Mic
          </button>
          <button className="icon-button secondary" onClick={disconnectVoice} disabled={!isConnected}>
            <LogOut size={17} />
            Disconnect
          </button>
        </div>
        <pre className="voice-log">{voiceLog.join("\n")}</pre>
      </section>
    </main>
  );
}

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
