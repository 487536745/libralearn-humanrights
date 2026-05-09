import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "../firebase/firebase";
import { db } from "../firebase/firebase";
import {
  collection,
  doc,
  getDocs,
  limit,
  orderBy,
  query,
  setDoc,
} from "firebase/firestore";

const backendUrl = import.meta.env.VITE_API_URL || "http://localhost:3000";

const ChatContext = createContext();

export const ChatProvider = ({ children }) => {
  const [userUid, setUserUid] = useState(null);
  const storageKey = useMemo(() => {
    return userUid
      ? `libraLearn.chatHistory.${userUid}`
      : "libraLearn.chatHistory.anon";
  }, [userUid]);

  const [chatHistory, setChatHistory] = useState([]);

  const loadLocalHistory = () => {
    const raw = localStorage.getItem(storageKey);
    if (!raw) {
      return [];
    }
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  };

  const saveLocalHistory = (entries) => {
    localStorage.setItem(storageKey, JSON.stringify(entries.slice(-50)));
  };

  const deleteChatEntry = (entryId) => {
    setChatHistory((prev) => {
      const updated = prev.filter((entry) => entry.id !== entryId);
      saveLocalHistory(updated);
      return updated;
    });
  };

  useEffect(() => {
    let cancelled = false;

    const loadHistory = async () => {
      // Anonymous users keep local history only.
      if (!userUid) {
        if (!cancelled) {
          setChatHistory(loadLocalHistory());
        }
        return;
      }

      try {
        const historyRef = collection(db, "users", userUid, "chatHistory");
        const historyQuery = query(historyRef, orderBy("createdAt", "asc"), limit(50));
        const snapshot = await getDocs(historyQuery);

        const firestoreEntries = snapshot.docs.map((entryDoc) => {
          const data = entryDoc.data();
          return {
            id: data.id || entryDoc.id,
            query: data.query || "",
            answers: Array.isArray(data.answers) ? data.answers : [],
            createdAt: data.createdAt || Date.now(),
          };
        });

        if (!cancelled) {
          setChatHistory(firestoreEntries);
          saveLocalHistory(firestoreEntries);
        }
      } catch (error) {
        console.warn("Failed to load chat history from Firestore, using local cache.", error);
        if (!cancelled) {
          setChatHistory(loadLocalHistory());
        }
      }
    };

    loadHistory();
    return () => {
      cancelled = true;
    };
  }, [storageKey, userUid]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUserUid(firebaseUser?.uid ?? null);
    });

    return () => unsubscribe();
  }, []);

  const tts = async (text, animation = "Talking_1", facialExpression = "smile") => {
    setLoading(true);
    try {
      const data = await fetch(`${backendUrl}/tts`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ message: text, animation, facialExpression }),
      });

      const raw = await data.text();
      let parsed;
      try {
        parsed = raw ? JSON.parse(raw) : {};
      } catch {
        throw new Error("TTS service returned non-JSON. Check backend server.");
      }

      if (!data.ok) {
        throw new Error(parsed?.message || "TTS request failed.");
      }

      setMessages((messages) => [...messages, ...(parsed?.messages || [])]);
    } finally {
      setLoading(false);
    }
  };

  const chat = async (message, language = 'en', customMessage = null) => {
    setLoading(true);
    
    // If custom message is provided (from RAG), use it directly
    if (customMessage) {
      setMessage(customMessage);
      setLoading(false);
      return;
    }
    
    // Otherwise, use regular chat API
    try {
      const data = await fetch(`${backendUrl}/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ message, language }),
      });

      const raw = await data.text();
      let parsed;
      try {
        parsed = raw ? JSON.parse(raw) : {};
      } catch {
        throw new Error(
          "Chat service returned non-JSON. Check backend server and VITE_API_URL."
        );
      }

      if (!data.ok) {
        throw new Error(parsed?.message || "Chat request failed.");
      }

      const resp = parsed?.messages || [];

      // Persist a simple Q/A history for later viewing.
      // Backend returns only avatar messages (not the user query), so we attach the query here.
      const answers = Array.isArray(resp)
        ? resp.map((m) => ({ text: m?.text ?? "" })).filter((a) => a.text)
        : [];

      const newEntry = {
        id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
        query: message,
        answers,
        createdAt: Date.now(),
      };

      setChatHistory((prev) => {
        const next = [...prev, newEntry].slice(-50);
        saveLocalHistory(next);
        return next;
      });

      if (userUid) {
        try {
          const entryRef = doc(db, "users", userUid, "chatHistory", newEntry.id);
          await setDoc(entryRef, newEntry, { merge: true });
        } catch (error) {
          console.warn("Failed to save chat history to Firestore.", error);
        }
      }

      setMessages((messages) => [...messages, ...resp]);
    } finally {
      setLoading(false);
    }
  };
  const [messages, setMessages] = useState([]);
  const [message, setMessage] = useState();
  const [loading, setLoading] = useState(false);
  const [cameraZoomed, setCameraZoomed] = useState(true);
  const [avatarRotationY, setAvatarRotationY] = useState(0);
  const [currentAudio, setCurrentAudio] = useState(null);
  const onMessagePlayed = () => {
    setMessages((messages) => messages.slice(1));
  };

  const moveAvatarLeft = () => {
    setAvatarRotationY((value) => (value - Math.PI / 8 + Math.PI * 2) % (Math.PI * 2));
  };

  const moveAvatarRight = () => {
    setAvatarRotationY((value) => (value + Math.PI / 8) % (Math.PI * 2));
  };

  const rotateAvatarByDelta = (deltaRadians) => {
    setAvatarRotationY((value) => (value + deltaRadians + Math.PI * 2) % (Math.PI * 2));
  };

  useEffect(() => {
    if (messages.length > 0) {
      setMessage(messages[0]);
    } else {
      setMessage(null);
    }
  }, [messages]);

  return (
    <ChatContext.Provider
      value={{
        chat,
        tts,
        message,
        onMessagePlayed,
        loading,
        cameraZoomed,
        setCameraZoomed,
        avatarRotationY,
        moveAvatarLeft,
        moveAvatarRight,
        rotateAvatarByDelta,
        currentAudio,
        setCurrentAudio,
        chatHistory,
        deleteChatEntry,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
};

export const useChat = () => {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error("useChat must be used within a ChatProvider");
  }
  return context;
};
