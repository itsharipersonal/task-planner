"use client";

import { useEffect, useRef, useState } from "react";

type SpeechRecognitionLike = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
};

type SpeechRecognitionEventLike = {
  resultIndex: number;
  results: {
    length: number;
    [index: number]: { isFinal: boolean; 0: { transcript: string } };
  };
};

function getSpeechRecognition(): SpeechRecognitionLike | null {
  const w = window as unknown as {
    SpeechRecognition?: new () => SpeechRecognitionLike;
    webkitSpeechRecognition?: new () => SpeechRecognitionLike;
  };
  const Ctor = w.SpeechRecognition ?? w.webkitSpeechRecognition;
  return Ctor ? new Ctor() : null;
}

type MediaCaptureProps = {
  mode: "video" | "audio";
  onRecordingChange: (recording: boolean) => void;
  onCaptured: (data: { durationSeconds: number; transcript: string }) => void;
};

/**
 * Records video/audio locally in the browser (nothing is uploaded — the
 * recording stays on the device). Captures a live transcript via the Web
 * Speech API where available; the transcript is what gets submitted for AI
 * evaluation.
 */
export function MediaCapture({ mode, onRecordingChange, onCaptured }: MediaCaptureProps) {
  const [phase, setPhase] = useState<"idle" | "recording" | "done">("idle");
  const [error, setError] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [playbackUrl, setPlaybackUrl] = useState<string | null>(null);
  // Only ever mounted client-side (the runner renders it after data loads).
  const [speechSupported] = useState(
    () => typeof window === "undefined" || getSpeechRecognition() !== null,
  );

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const transcriptRef = useRef("");
  const startedAtRef = useRef(0);
  const keepListeningRef = useRef(false);

  useEffect(() => {
    return () => {
      keepListeningRef.current = false;
      recognitionRef.current?.stop();
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  useEffect(() => {
    if (phase !== "recording") return;
    const interval = setInterval(
      () => setElapsed(Math.round((Date.now() - startedAtRef.current) / 1000)),
      500,
    );
    return () => clearInterval(interval);
  }, [phase]);

  async function start() {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: mode === "video",
        audio: true,
      });
      streamRef.current = stream;
      if (videoRef.current && mode === "video") {
        videoRef.current.srcObject = stream;
        void videoRef.current.play();
      }

      chunksRef.current = [];
      const recorder = new MediaRecorder(stream);
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.start(1000);
      recorderRef.current = recorder;

      transcriptRef.current = "";
      const recognition = getSpeechRecognition();
      if (recognition) {
        recognition.continuous = true;
        recognition.interimResults = false;
        recognition.lang = navigator.language || "en-US";
        recognition.onresult = (event) => {
          for (let i = event.resultIndex; i < event.results.length; i++) {
            if (event.results[i].isFinal) {
              transcriptRef.current += `${event.results[i][0].transcript} `;
            }
          }
        };
        // Chrome stops recognition after silences — restart while recording.
        recognition.onend = () => {
          if (keepListeningRef.current) {
            try {
              recognition.start();
            } catch {
              /* already restarted */
            }
          }
        };
        keepListeningRef.current = true;
        recognition.start();
        recognitionRef.current = recognition;
      }

      startedAtRef.current = Date.now();
      setElapsed(0);
      setPhase("recording");
      onRecordingChange(true);
    } catch {
      setError(
        mode === "video"
          ? "Camera/microphone access denied. Allow access and retry."
          : "Microphone access denied. Allow access and retry.",
      );
    }
  }

  function stop() {
    keepListeningRef.current = false;
    recognitionRef.current?.stop();

    const recorder = recorderRef.current;
    if (recorder && recorder.state !== "inactive") {
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType });
        setPlaybackUrl(URL.createObjectURL(blob));
      };
      recorder.stop();
    }
    streamRef.current?.getTracks().forEach((t) => t.stop());
    if (videoRef.current) videoRef.current.srcObject = null;

    const durationSeconds = Math.round((Date.now() - startedAtRef.current) / 1000);
    setPhase("done");
    onRecordingChange(false);
    onCaptured({ durationSeconds, transcript: transcriptRef.current.trim() });
  }

  return (
    <div className="border-2 border-line bg-panel">
      <div className="flex items-center justify-between border-b border-line px-3 py-1.5 font-mono text-[0.65rem] uppercase tracking-[0.2em]">
        <span className="text-dim">
          {mode === "video" ? "[ Camera feed ]" : "[ Audio feed ]"}
        </span>
        {phase === "recording" ? (
          <span className="flex items-center gap-2 text-hazard">
            <span className="terminal-blink">●</span> REC {elapsed}s
          </span>
        ) : (
          <span className="text-dim">{phase === "done" ? "CAPTURED" : "STANDBY"}</span>
        )}
      </div>

      {mode === "video" ? (
        phase === "done" && playbackUrl ? (
          <video src={playbackUrl} controls className="aspect-video w-full bg-black" />
        ) : (
          <video ref={videoRef} muted playsInline className="aspect-video w-full bg-black" />
        )
      ) : phase === "done" && playbackUrl ? (
        <div className="px-3 py-3">
          <audio src={playbackUrl} controls className="w-full" />
        </div>
      ) : null}

      <div className="border-t border-line px-3 py-2">
        {phase === "idle" ? (
          <button
            type="button"
            onClick={() => void start()}
            className="w-full border-2 border-foreground bg-background px-3 py-2 font-sans text-sm uppercase tracking-wide text-foreground transition-colors hover:border-hazard hover:bg-hazard hover:text-black"
          >
            [ START RECORDING ]
          </button>
        ) : phase === "recording" ? (
          <button
            type="button"
            onClick={stop}
            className="w-full border-2 border-hazard bg-hazard px-3 py-2 font-sans text-sm uppercase tracking-wide text-black transition-colors hover:bg-foreground"
          >
            [ STOP RECORDING ]
          </button>
        ) : (
          <button
            type="button"
            onClick={() => {
              setPlaybackUrl(null);
              setPhase("idle");
            }}
            className="w-full border border-line px-3 py-2 font-mono text-xs uppercase tracking-[0.15em] text-dim transition-colors hover:border-foreground hover:text-foreground"
          >
            [ Re-record ]
          </button>
        )}
        {error ? (
          <p className="mt-2 font-mono text-[0.65rem] uppercase tracking-[0.1em] text-hazard">
            &gt; {error}
          </p>
        ) : null}
        {!speechSupported && phase !== "done" ? (
          <p className="mt-2 font-mono text-[0.6rem] uppercase tracking-[0.1em] text-dim">
            &gt; Live transcription unsupported in this browser — type a transcript after recording.
          </p>
        ) : null}
        <p className="mt-2 font-mono text-[0.6rem] uppercase tracking-[0.1em] text-dim">
          &gt; Recording stays on your device. The transcript + duration are submitted for evaluation.
        </p>
      </div>
    </div>
  );
}
