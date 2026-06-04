import React, { useCallback, useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  BookOpen,
  FileUp,
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

type VoiceStatus = "disconnected" | "connected" | "recording" | "error";
type ServerEvent = {
  type: string;
  payload?: Record<string, string>;
};

function App() {
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

  const refreshData = useCallback(async () => {
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
      setAuthMessage(error instanceof Error ? error.message : "Unable to load data.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!auth) {
      refreshData();
      return;
    }

    return onAuthStateChanged(auth, (user) => {
      setAuthUser(user);
      refreshData();
    });
  }, [refreshData]);

  async function signIn() {
    if (!auth) {
      setAuthMessage("Firebase is not configured.");
      return;
    }

    try {
      await signInWithEmailAndPassword(auth, email, password);
      setPassword("");
      setAuthMessage("Signed in.");
    } catch (error) {
      setAuthMessage(error instanceof Error ? error.message : "Sign in failed.");
    }
  }

  async function createAccount() {
    if (!auth) {
      setAuthMessage("Firebase is not configured.");
      return;
    }

    try {
      await createUserWithEmailAndPassword(auth, email, password);
      setPassword("");
      setAuthMessage("Account created.");
    } catch (error) {
      setAuthMessage(error instanceof Error ? error.message : "Account creation failed.");
    }
  }

  async function signOutUser() {
    if (!auth) {
      return;
    }

    await signOut(auth);
    setAuthMessage("Signed out.");
  }

  async function uploadSelectedFile() {
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
      setAuthMessage(error instanceof Error ? error.message : "Upload failed.");
    } finally {
      setLoading(false);
    }
  }

  async function ingestMaterial(materialId: string) {
    setLoading(true);
    try {
      await ingestStudyMaterial(materialId);
      await refreshData();
    } catch (error) {
      setAuthMessage(error instanceof Error ? error.message : "Ingestion failed.");
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
    if (socketIsOpen()) {
      return;
    }

    const token = await getCurrentIdToken();
    const socket = new WebSocket(buildWebSocketUrl(token));
    socketRef.current = socket;
    setVoiceStatus("connected");

    socket.addEventListener("open", () => {
      appendVoiceLog("connected");
      sendVoiceEvent("session.start");
    });

    socket.addEventListener("message", (event) => {
      handleServerEvent(JSON.parse(event.data) as ServerEvent);
    });

    socket.addEventListener("close", () => {
      appendVoiceLog("closed");
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
    appendVoiceLog("microphone stopped");
  }

  async function disconnectVoice() {
    if (mediaStreamRef.current) {
      await stopMic();
    }

    socketRef.current?.close();
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

  const isConnected = voiceStatus === "connected" || voiceStatus === "recording";
  const isRecording = voiceStatus === "recording";

  return (
    <main className="app-shell">
      <header className="top-bar">
        <div>
          <h1>AI Voice Coach</h1>
          <p>{profile || "Local study workspace"}</p>
        </div>
        <button className="icon-button secondary" onClick={refreshData} disabled={loading}>
          <RefreshCw size={17} />
          Refresh
        </button>
      </header>

      <section className="panel auth-panel">
        <div className="section-heading">
          <ShieldCheck size={19} />
          <h2>Auth</h2>
        </div>
        {firebaseConfigured ? (
          <div className="auth-grid">
            <input
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              type="email"
              placeholder="Email"
              autoComplete="email"
            />
            <input
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              type="password"
              placeholder="Password"
              autoComplete="current-password"
            />
            <button className="icon-button" onClick={signIn}>
              <LogIn size={17} />
              Sign In
            </button>
            <button className="icon-button secondary" onClick={createAccount}>
              <UserPlus size={17} />
              Create
            </button>
            <button
              className="icon-button secondary"
              onClick={signOutUser}
              disabled={!authUser}
            >
              <LogOut size={17} />
              Sign Out
            </button>
          </div>
        ) : (
          <p className="muted">Firebase config missing. Dev auth mode can still use the backend.</p>
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
          />
          <input
            type="file"
            accept=".pdf,text/plain"
            onChange={(event) => setSelectedFile(event.target.files?.[0] || null)}
          />
          <button className="icon-button" onClick={uploadSelectedFile} disabled={loading}>
            <UploadCloud size={17} />
            Upload
          </button>
        </div>
        <div className="material-list">
          {materials.map((material) => (
            <article className="material-item" key={material.id}>
              <div>
                <h3>{material.title}</h3>
                <p>
                  {material.source_type} · {material.ingestion_status}
                </p>
              </div>
              <button
                className="icon-button secondary"
                onClick={() => ingestMaterial(material.id)}
                disabled={loading || !material.storage_path}
              >
                <BookOpen size={17} />
                Ingest
              </button>
              {material.summary ? <p className="summary">{material.summary}</p> : null}
            </article>
          ))}
        </div>
      </section>

      <section className="panel">
        <div className="section-heading">
          <BookOpen size={19} />
          <h2>Review Items</h2>
        </div>
        <div className="review-list">
          {reviewItems.map((item) => (
            <span key={item.id}>{item.concept}</span>
          ))}
        </div>
      </section>

      <section className="panel">
        <div className="section-heading">
          <Volume2 size={19} />
          <h2>Voice Session</h2>
          <span className={`status-pill ${voiceStatus}`}>{voiceStatus}</span>
        </div>
        <div className="controls">
          <button className="icon-button" onClick={connectVoice} disabled={isConnected}>
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
