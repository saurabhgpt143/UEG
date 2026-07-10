import { useState, useEffect, useRef } from "react";
import { Mic, MicOff, Volume2, VolumeX, Sparkles, AlertCircle, HelpCircle } from "lucide-react";
import { QuoteState } from "../types";
import { motion, AnimatePresence } from "motion/react";

interface VoiceAssistantProps {
  currentState: QuoteState;
  onStateUpdate: (newState: QuoteState, feedback: string) => void;
}

export default function VoiceAssistant({ currentState, onStateUpdate }: VoiceAssistantProps) {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [statusText, setStatusText] = useState("Tap mic and speak a command...");
  const [isProcessing, setIsProcessing] = useState(false);
  const [speechEnabled, setSpeechEnabled] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showHelp, setShowHelp] = useState(false);

  const recognitionRef = useRef<any>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Initialize Speech Recognition
  useEffect(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setError("Speech recognition is not supported in this browser. Please use Chrome or Safari.");
      return;
    }

    const rec = new SpeechRecognition();
    rec.continuous = false;
    rec.interimResults = false;
    rec.lang = "en-US";

    rec.onstart = () => {
      setIsListening(true);
      setError(null);
      setTranscript("");
      setStatusText("Listening...");
      startWaveform();
    };

    rec.onresult = async (event: any) => {
      const resultText = event.results[0][0].transcript;
      setTranscript(resultText);
      setStatusText(`Processing: "${resultText}"`);
      await sendCommandToGemini(resultText);
    };

    rec.onerror = (event: any) => {
      console.error("Speech recognition error", event.error);
      if (event.error === "not-allowed") {
        setError("Microphone permission denied. Please allow microphone access.");
      } else {
        setError(`Speech error: ${event.error}`);
      }
      setIsListening(false);
      stopWaveform();
    };

    rec.onend = () => {
      setIsListening(false);
      stopWaveform();
    };

    recognitionRef.current = rec;

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
      stopWaveform();
    };
  }, [currentState]);

  // Handle Speech Feedback
  const speak = (text: string) => {
    if (!speechEnabled || !("speechSynthesis" in window)) return;
    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.0;
      utterance.pitch = 1.0;
      window.speechSynthesis.speak(utterance);
    } catch (e) {
      console.error("Speech synthesis failed", e);
    }
  };

  const toggleListening = () => {
    if (isListening) {
      recognitionRef.current?.stop();
    } else {
      setError(null);
      try {
        recognitionRef.current?.start();
      } catch (err: any) {
        console.error("Failed to start speech recognition:", err);
        setError("Speech recognition failed to start. Try again.");
      }
    }
  };

  // Canvas-based voice visualizer
  const startWaveform = () => {
    if (!canvasRef.current) return;

    // Standard simulated waveform for safety, works 100% of the time without requesting direct PCM if mic is locked
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let x = 0;
    const draw = () => {
      if (!isListening && !isProcessing) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.lineWidth = 2;
      ctx.strokeStyle = isProcessing ? "#10B981" : "#3B82F6";
      ctx.beginPath();

      const sliceWidth = canvas.width / 40;
      for (let i = 0; i < 40; i++) {
        const heightMultiplier = isListening
          ? Math.sin(i * 0.4 + x) * 15 * (0.3 + Math.random() * 0.7)
          : Math.sin(i * 0.8 + x) * 4; // Flat vibration when processing

        const posX = i * sliceWidth;
        const posY = canvas.height / 2 + heightMultiplier;
        if (i === 0) {
          ctx.moveTo(posX, posY);
        } else {
          ctx.lineTo(posX, posY);
        }
      }
      ctx.stroke();
      x += 0.15;
      animationFrameRef.current = requestAnimationFrame(draw);
    };

    draw();
  };

  const stopWaveform = () => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext("2d");
      ctx?.clearRect(0, 0, canvas.width, canvas.height);
    }
  };

  // Send speech text to server
  const sendCommandToGemini = async (commandString: string) => {
    setIsProcessing(true);
    setStatusText("Analyzing voice command with AI...");

    try {
      const response = await fetch("/api/voice-command", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          command: commandString,
          currentState: currentState,
        }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || `Server returned ${response.status}`);
      }

      const data = await response.json();
      if (data.updatedState) {
        // Enforce IDs on items if missing
        const cleanItems = data.updatedState.items.map((it: any, index: number) => ({
          ...it,
          id: it.id || `voice-item-${Date.now()}-${index}`,
        }));
        const cleanState = {
          ...data.updatedState,
          items: cleanItems,
        };

        onStateUpdate(cleanState, data.feedback);
        setStatusText(data.feedback);
        speak(data.feedback);
      } else {
        setStatusText("No state updates returned.");
      }
    } catch (err: any) {
      console.error("Gemini API Error:", err);
      setError(`Failed to execute voice command: ${err.message}`);
      setStatusText("Voice command failed.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 text-white rounded-2xl p-5 shadow-2xl relative overflow-hidden" id="voice-assistant-panel">
      {/* Visual background gradient */}
      <div className="absolute top-0 right-0 w-48 h-48 bg-blue-500/10 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-0 left-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none"></div>

      <div className="flex flex-col md:flex-row items-center justify-between gap-4 relative z-10">
        {/* Left side: Assistant details */}
        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="p-2.5 bg-gradient-to-tr from-blue-600 to-indigo-600 rounded-xl shadow-lg shadow-indigo-500/20 flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="font-semibold text-sm tracking-tight text-slate-100 flex items-center gap-2">
              Gemini Hands-Free Assistant
              <button
                onClick={() => setShowHelp(!showHelp)}
                className="text-slate-400 hover:text-white transition-colors"
                title="How to use voice commands"
              >
                <HelpCircle className="w-4 h-4" />
              </button>
            </h3>
            <p className="text-xs text-slate-400 font-mono mt-0.5 max-w-sm line-clamp-1">
              {statusText}
            </p>
          </div>
        </div>

        {/* Center: Live Waveform Visualizer */}
        <div className="flex-1 max-w-xs h-10 flex items-center justify-center">
          <canvas
            ref={canvasRef}
            width={240}
            height={40}
            className="w-full h-full opacity-80"
          />
        </div>

        {/* Right side: Control buttons */}
        <div className="flex items-center gap-3">
          {/* TTS toggler */}
          <button
            onClick={() => {
              const nextVal = !speechEnabled;
              setSpeechEnabled(nextVal);
              if (nextVal) speak("Voice replies enabled.");
            }}
            className={`p-2 rounded-xl border transition-all duration-200 ${
              speechEnabled
                ? "bg-slate-800 border-slate-700 text-emerald-400"
                : "bg-slate-800/40 border-slate-800/80 text-slate-500"
            }`}
            title={speechEnabled ? "Mute voice feedback" : "Enable voice feedback"}
            id="voice-speech-toggle"
          >
            {speechEnabled ? <Volume2 className="w-4.5 h-4.5" /> : <VolumeX className="w-4.5 h-4.5" />}
          </button>

          {/* Main microphone trigger */}
          <button
            onClick={toggleListening}
            disabled={isProcessing}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-medium text-xs transition-all duration-300 shadow-md ${
              isListening
                ? "bg-red-500 hover:bg-red-600 text-white animate-pulse shadow-red-500/20"
                : isProcessing
                ? "bg-slate-800 text-slate-400 border border-slate-700 cursor-not-allowed"
                : "bg-blue-600 hover:bg-blue-500 text-white shadow-blue-500/20 hover:scale-[1.02]"
            }`}
            id="voice-mic-trigger"
          >
            {isListening ? (
              <>
                <MicOff className="w-4 h-4" /> Stop Listening
              </>
            ) : isProcessing ? (
              <>
                <span className="w-4 h-4 border-2 border-slate-400 border-t-transparent rounded-full animate-spin"></span>
                AI Processing...
              </>
            ) : (
              <>
                <Mic className="w-4 h-4" /> Tap to Speak
              </>
            )}
          </button>
        </div>
      </div>

      {/* Error display */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="mt-3 bg-red-950/40 border border-red-800/60 rounded-xl p-3 flex items-start gap-2.5 text-xs text-red-300"
          >
            <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <div>{error}</div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Interactive help block */}
      <AnimatePresence>
        {showHelp && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-4 pt-4 border-t border-slate-800/80 text-xs text-slate-300 grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2"
          >
            <div>
              <p className="font-semibold text-slate-200 mb-1">Add Line Items:</p>
              <ul className="list-disc pl-4 space-y-1 text-slate-400 font-mono">
                <li>"Add custom software design for five hundred dollars"</li>
                <li>"Add five mechanical keyboards at ninety-five each"</li>
              </ul>
            </div>
            <div>
              <p className="font-semibold text-slate-200 mb-1">Update Clients & Rates:</p>
              <ul className="list-disc pl-4 space-y-1 text-slate-400 font-mono">
                <li>"Set client to Martha Smith from Helix Tech"</li>
                <li>"Change tax rate to seven point five percent"</li>
                <li>"Apply twelve percent discount"</li>
              </ul>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
