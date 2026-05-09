import { useRef, useState, useEffect } from "react";
import { useChat } from "../hooks/useChat";
import { Subtitle } from "./Subtitle";

export const UI = ({ hidden, ...props }) => {
  const input = useRef();
  const { chat, loading, cameraZoomed, setCameraZoomed, message, chatHistory, setMessages, setChatHistory, setLoading, addToHistory, rotateAvatarByDelta } = useChat();
  const [isRecording, setIsRecording] = useState(false);
  const [draggingAvatar, setDraggingAvatar] = useState(false);
  const lastPointerPos = useRef({ x: 0, y: 0 });
  const isDraggingEye = useRef(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [mediaRecorder, setMediaRecorder] = useState(null);
  const [speechSupported, setSpeechSupported] = useState(false);
  const [listening, setListening] = useState(false);
  const listeningRef = useRef(false);
  const [speechTranscript, setSpeechTranscript] = useState("");
  const recognitionRef = useRef(null);
  const transcriptRef = useRef("");
  const [recordedChunks, setRecordedChunks] = useState([]);
  const [currentQuestion, setCurrentQuestion] = useState('');
  const [currentResponse, setCurrentResponse] = useState('');
  const [language, setLanguage] = useState('en'); // 'en' for English, 'ur' for Urdu
  const [ragMode, setRagMode] = useState(false); // false = chat mode, true = RAG mode
  const backendUrl = import.meta.env.VITE_API_URL || "http://localhost:3000";

  // Language translations
  const translations = {
    en: {
      title: "Human Rights Educator",
      subtitle: "Ask me anything about your rights and laws 📚",
      placeholder: "Ask a question about human rights...",
      send: "Send",
      zoomIn: "Zoom In",
      zoomOut: "Zoom Out",
      startRecording: "Start Recording",
      stopRecording: "Stop Recording",
      recording: "REC",
      chatMode: "Chat Mode",
      ragMode: "Document Mode",
      chatDescription: "AI conversation",
      ragDescription: "Document search"
    },
    ur: {
      title: "انسانی حقوق کے ماہر",
      subtitle: "اپنے حقوق اور قوانین کے بارے میں مجھ سے کچھ بھی پوچھیں 📚",
      placeholder: "انسانی حقوق کے بارے میں سوال پوچھیں...",
      send: "بھیجیں",
      zoomIn: "زوم ان",
      zoomOut: "زوم آؤٹ",
      startRecording: "ریکارڈنگ شروع کریں",
      stopRecording: "ریکارڈنگ روکیں",
      recording: "ریکارڈ",
      chatMode: "بات چت موڈ",
      ragMode: "دستاویز موڈ",
      chatDescription: "ایک بات",
      ragDescription: "دستاویز تلاش"
    }
  };

  const t = translations[language];

  // Recording timer
  useEffect(() => {
    let interval;
    if (isRecording) {
      interval = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    } else {
      setRecordingTime(0);
    }
    return () => clearInterval(interval);
  }, [isRecording]);

  // Format recording time
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Start recording
  const startRecording = async () => {
    try {
      // Get the canvas element (avatar screen) without permission
      const canvas = document.querySelector('canvas');
      if (!canvas) {
        alert('Avatar canvas not found. Please make sure the avatar is loaded.');
        return;
      }

      // Capture canvas stream at 30fps (no permission needed)
      const canvasStream = canvas.captureStream(30);
      
      // Try to get audio without showing permission dialog
      let audioStream;
      try {
        // Try to capture system audio silently
        audioStream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true
          }
        });
      } catch (audioError) {
        console.warn('Audio not available, recording video only:', audioError);
        // Continue without audio - don't show error to user
      }

      // Combine streams
      const tracks = [...canvasStream.getVideoTracks()];
      if (audioStream) {
        tracks.push(...audioStream.getAudioTracks());
      }
      const combinedStream = new MediaStream(tracks);

      // Create media recorder
      const recorder = new MediaRecorder(combinedStream, {
        mimeType: 'video/webm;codecs=vp9,opus'
      });

      const chunks = [];
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunks.push(event.data);
        }
      };

      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'video/webm' });
        const url = URL.createObjectURL(blob);
        
        // Create filename with question if available
        const questionText = currentQuestion.trim() ? `-${currentQuestion.trim().slice(0, 30).replace(/[^a-zA-Z0-9]/g, '_')}` : '';
        const filename = `avatar-screen${questionText}-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.webm`;
        
        // Create download link
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        // Clean up streams
        canvasStream.getTracks().forEach(track => track.stop());
        if (audioStream) {
          audioStream.getTracks().forEach(track => track.stop());
        }

        // Show completion message
        alert(`Screen recording saved as: ${filename}\n\nQuestion: "${currentQuestion || 'No question'}"\nResponse: "${currentResponse || 'No response'}"`);
      };

      recorder.start();
      setMediaRecorder(recorder);
      setRecordedChunks(chunks);
      setIsRecording(true);

      // Auto-stop after 3 minutes (max recording time)
      setTimeout(() => {
        if (isRecording) {
          stopRecording();
        }
      }, 180000);

    } catch (error) {
      console.error('Error starting recording:', error);
      alert('Failed to start screen recording. Please refresh the page and try again.');
    }
  };

  // Stop recording
  const stopRecording = () => {
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
      mediaRecorder.stop();
      setIsRecording(false);
      setMediaRecorder(null);
    }
  };

  // Toggle recording
  const toggleRecording = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  useEffect(() => {
    const SpeechRecognition = window?.SpeechRecognition || window?.webkitSpeechRecognition;
    setSpeechSupported(!!SpeechRecognition);
  }, []);

  const stopSpeechRecognition = () => {
    listeningRef.current = false;
    const recognition = recognitionRef.current;
    if (recognition) {
      recognition.onresult = null;
      recognition.onend = null;
      recognition.onerror = null;
      recognition.stop();
      recognitionRef.current = null;
    }
    setListening(false);
  };

  const startSpeechRecognition = () => {
    const SpeechRecognition = window?.SpeechRecognition || window?.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Speech recognition is not supported in this browser.");
      return;
    }

    transcriptRef.current = input.current?.value ?? "";

    const recognition = new SpeechRecognition();
    recognition.lang = language === 'ur' ? 'ur-PK' : 'en-US';
    recognition.interimResults = true;
    recognition.continuous = true;
    recognition.maxAlternatives = 1;

    recognition.onresult = (event) => {
      let interimTranscript = "";

      for (let i = 0; i < event.results.length; i += 1) {
        const transcriptText = event.results[i][0].transcript;
        if (!event.results[i].isFinal) {
          interimTranscript += transcriptText;
        } else if (event.results[i].isFinal) {
          transcriptRef.current += transcriptText;
        }
      }

      const currentText = `${transcriptRef.current}${interimTranscript}`;
      setSpeechTranscript(currentText);
      if (input.current) {
        input.current.value = currentText;
      }
    };

    recognition.onerror = (event) => {
      console.error("Speech recognition error", event);
      stopSpeechRecognition();
    };

    recognition.onend = () => {
      if (listeningRef.current) {
        setTimeout(() => {
          if (listeningRef.current) {
            try {
              recognition.start();
            } catch (error) {
              console.warn("Speech recognition restart failed", error);
              stopSpeechRecognition();
            }
          }
        }, 300);
      } else {
        setListening(false);
      }
    };

    recognitionRef.current = recognition;
    recognition.start();
    listeningRef.current = true;
    setListening(true);
    setSpeechTranscript(transcriptRef.current);
  };

  const toggleSpeechRecognition = () => {
    if (listeningRef.current) {
      stopSpeechRecognition();
      return;
    }
    startSpeechRecognition();
  };

  const handleAvatarDragStart = (event) => {
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    isDraggingEye.current = true;
    lastPointerPos.current = { x: event.clientX, y: event.clientY };
    setDraggingAvatar(true);
  };

  const handleAvatarDragMove = (event) => {
    if (!isDraggingEye.current) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    const deltaX = event.clientX - lastPointerPos.current.x;
    lastPointerPos.current = { x: event.clientX, y: event.clientY };

    if (deltaX !== 0) {
      rotateAvatarByDelta(deltaX * 0.006);
    }
  };

  const handleAvatarDragEnd = (event) => {
    event.preventDefault();
    event.stopPropagation();
    isDraggingEye.current = false;
    setDraggingAvatar(false);
    try {
      event.currentTarget.releasePointerCapture(event.pointerId);
    } catch (error) {
      // ignore if pointer capture already released
    }
  };

  const sendMessage = () => {
    const text = input.current.value;
    if (!loading && !message) {
      setCurrentQuestion(text); // Store current question for display
      setCurrentResponse(''); // Clear previous response
      
      if (ragMode) {
        // Use RAG API
        fetch(`${backendUrl}/ragAsk`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ 
            question: text,
            sessionId: 'avatar-session'
          })
        })
        .then(res => res.json())
        .then(data => {
          if (data.success) {
            // Format RAG response to match chat API response format
            const ragResponse = {
              messages: [{
                text: data.answer,
                audio: null, // Will be generated by avatar system
                lipsync: null,
                facialExpression: "smile",
                animation: "Talking_1",
                source: data.source,
                confidence: data.confidence,
                sources: data.sources
              }]
            };
            
            // Process RAG response through the same flow as regular chat
            processRagResponse(text, ragResponse, language);
          }
        })
        .catch(error => {
          console.error('RAG API error:', error);
          // Fallback to regular chat
          chat(text, language);
        });
      } else {
        // Use regular chat
        chat(text, language);
      }
      
      input.current.value = "";
    }
  };

  // Process RAG response to integrate with avatar system
  const processRagResponse = (query, ragResponse, language) => {
    // Format response to match chat API structure
    const resp = ragResponse?.messages || [];
    
    // Add each message to trigger avatar response
    resp.forEach(msg => {
      if (msg.text) {
        // Use the chat hook's addToHistory method
        addToHistory({
          text: msg.text,
          audio: msg.audio,
          lipsync: msg.lipsync,
          facialExpression: msg.facialExpression,
          animation: msg.animation,
          source: msg.source
        });
      }
    });
    
    // Add to chat history
    setChatHistory((prev) => {
      const next = [
        ...prev,
        {
          id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
          query: query,
          answers: resp.map((m) => ({ text: m?.text ?? "", source: m?.source })).filter((a) => a.text),
          createdAt: Date.now(),
        },
      ];

      const storageKey = 'libraLearn.chatHistory.anon';
      localStorage.setItem(storageKey, JSON.stringify(next.slice(-50)));
      return next.slice(-50);
    });
  };

  // Track avatar response
  useEffect(() => {
    if (message && message.text) {
      setCurrentResponse(message.text);
    }
  }, [message]);
  if (hidden) {
    return null;
  }

  return (
    <>
      <Subtitle />
      <div className="fixed top-0 left-0 right-0 bottom-0 z-10 flex justify-between p-2 sm:p-4 flex-col pointer-events-none">
        <div className="self-start lg:ml-72 backdrop-blur-md bg-white bg-opacity-50 p-2 sm:p-3 rounded-lg animate-fade-in max-w-xs sm:max-w-md">
        {/* Language Toggle */}
        <div className="flex gap-1 mb-2 pointer-events-auto">
          <button
            onClick={() => setLanguage('en')}
            className={`px-2 py-1 rounded text-xs font-medium transition-all ${
              language === 'en' 
                ? 'bg-blue-500 text-white' 
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            English
          </button>
          <button
            onClick={() => setLanguage('ur')}
            className={`px-2 py-1 rounded text-xs font-medium transition-all ${
              language === 'ur' 
                ? 'bg-blue-500 text-white' 
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            } ${language === 'ur' ? 'urdu-text' : ''}`}
          >
            اردو
          </button>
        </div>

        {/* RAG Mode Toggle */}
        <div className="flex gap-1 mb-2 pointer-events-auto">
          <button
            onClick={() => setRagMode(false)}
            className={`px-2 py-1 rounded text-xs font-medium transition-all flex items-center gap-1 ${
              !ragMode 
                ? 'bg-green-500 text-white' 
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            <div className={`w-1.5 h-1.5 rounded-full ${!ragMode ? 'bg-white' : 'bg-gray-400'}`}></div>
            {t.chatMode}
          </button>
          <button
            onClick={() => setRagMode(true)}
            className={`px-2 py-1 rounded text-xs font-medium transition-all flex items-center gap-1 ${
              ragMode 
                ? 'bg-purple-500 text-white' 
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            <div className={`w-1.5 h-1.5 rounded-full ${ragMode ? 'bg-white' : 'bg-gray-400'}`}></div>
            {t.ragMode}
          </button>
        </div>

        {/* Mode Description */}
        <div className={`text-xs text-gray-600 mb-2 ${language === 'ur' ? 'urdu-text' : ''}`}>
          {ragMode ? t.ragDescription : t.chatDescription}
        </div>
        
        <h1 className="font-black text-sm">{t.title}</h1>
        <p className="text-xs">{t.subtitle}</p>
        </div>
        <div className="w-full flex flex-col items-end justify-center gap-2 sm:gap-4">
          {/* Recording Status Display */}
          {isRecording && (
            <div className="pointer-events-auto bg-red-600 text-white px-3 py-2 sm:px-4 sm:py-2 rounded-md flex items-center gap-2 animate-pulse">
              <div className="w-2 h-2 sm:w-3 sm:h-3 bg-white rounded-full animate-pulse"></div>
              <span className="font-semibold text-sm sm:text-base">{t.recording} {formatTime(recordingTime)}</span>
            </div>
          )}
          
          <div className="flex flex-col gap-2 sm:gap-3 items-center">
            <div className="pointer-events-auto bg-white/90 backdrop-blur-md border border-blue-200 rounded-3xl shadow-xl p-2 flex flex-col items-center gap-2">
              <div
                role="button"
                tabIndex={0}
                onPointerDown={handleAvatarDragStart}
                onPointerMove={handleAvatarDragMove}
                onPointerUp={handleAvatarDragEnd}
                onPointerCancel={handleAvatarDragEnd}
                onWheel={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                }}
                className={`bg-gradient-to-br from-blue-500 via-cyan-500 to-sky-500 text-white w-12 h-12 rounded-full flex items-center justify-center shadow-xl ring-1 ring-white/20 transition duration-200 ease-out touch-none select-none ${draggingAvatar ? 'scale-105 shadow-[0_20px_40px_-20px_rgba(56,189,248,0.75)]' : 'hover:-translate-y-0.5'} active:scale-95 cursor-grab active:cursor-grabbing`}
                aria-label="Drag to rotate avatar"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                  className="w-5 h-5"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 4.5c4.142 0 7.5 3.358 7.5 7.5s-3.358 7.5-7.5 7.5S4.5 16.142 4.5 12 7.858 4.5 12 4.5zm0 0v1.5m0 12V19.5m7.5-7.5H19.5M4.5 12H6m9.75-4.5-1.061 1.061m-7.438 7.439L6.75 15.75m7.439 0L15.75 16.811m-7.439-7.439L6.75 8.25"
                  />
                </svg>
              </div>
            </div>
            <button
              onClick={() => setCameraZoomed(!cameraZoomed)}
              className="pointer-events-auto bg-blue-500 hover:bg-blue-600 text-white p-3 sm:p-4 rounded-md transition-all transform active:scale-95 shadow-lg"
              aria-label="Toggle camera zoom"
            >
              {cameraZoomed ? (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                  className="w-5 h-5 sm:w-6 sm:h-6"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607zM13.5 10.5h-6"
                  />
                </svg>
              ) : (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                  className="w-5 h-5 sm:w-6 sm:h-6"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607zM10.5 7.5v6m3-3h-6"
                  />
                </svg>
              )}
            </button>
            <button
              onClick={toggleRecording}
              className={`pointer-events-auto text-white p-3 sm:p-4 rounded-md transition-all transform active:scale-95 shadow-lg ${
                isRecording
                  ? 'bg-red-600 hover:bg-red-700 animate-pulse'
                  : 'bg-green-500 hover:bg-green-600'
              }`}
              aria-label={isRecording ? "Stop recording" : "Start recording"}
            >
              {isRecording ? (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                  className="w-5 h-5 sm:w-6 sm:h-6"
                >
                  <rect x="6" y="6" width="12" height="12" strokeWidth={2} />
                </svg>
              ) : (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                  className="w-5 h-5 sm:w-6 sm:h-6"
                >
                  <path
                    strokeLinecap="round"
                    d="M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25h-9A2.25 2.25 0 002.25 7.5v9a2.25 2.25 0 002.25 2.25z"
                  />
                </svg>
              )}
            </button>
          </div>
        <div className="flex items-center gap-2 pointer-events-auto max-w-screen-sm w-full mx-auto px-2 sm:px-0">
          <input
            className="w-full placeholder:text-xs placeholder:text-gray-600 placeholder:italic p-3 sm:p-4 rounded-md bg-opacity-50 bg-white backdrop-blur-md text-sm sm:text-base"
            placeholder={t.placeholder}
            ref={input}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                sendMessage();
              }
            }}
          />
          <button
            type="button"
            onClick={toggleSpeechRecognition}
            className={`bg-blue-500 hover:bg-blue-600 text-white p-3 rounded-md transition-all transform active:scale-95 text-sm sm:text-base shadow-lg ${listening ? 'bg-green-500 hover:bg-green-600' : ''}`}
            aria-label={listening ? "Stop voice input" : "Start voice input"}
          >
            {listening ? (
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 1.5v7.5m0 0a3 3 0 100 6 3 3 0 000-6zm0 0V21m-4.5-4.5h9" />
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5.25a3 3 0 016 0v3.75a3 3 0 01-6 0V5.25z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 12.75a6.75 6.75 0 0013.5 0" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75v2.25" />
              </svg>
            )}
          </button>
          <button
            disabled={loading || message}
            onClick={sendMessage}
            className={`bg-purple-500 hover:bg-purple-600 text-white p-3 sm:p-4 px-4 sm:px-10 font-semibold uppercase rounded-md transition-all transform active:scale-95 text-sm sm:text-base shadow-lg ${
              loading || message ? "cursor-not-allowed opacity-30" : ""
            }`}
          >
            {t.send}
          </button>
        </div>
        {speechSupported && speechTranscript && (
          <div className="mt-2 text-xs text-gray-600 italic pointer-events-none">
            Listening: {speechTranscript}
          </div>
        )}
        </div>
      </div>
    </>
  );
};
