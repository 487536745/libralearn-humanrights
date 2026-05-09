import { useState, useEffect, useRef } from 'react';
import { useChat } from '../hooks/useChat';

export const Subtitle = () => {
  const { message, currentAudio } = useChat();
  const [displayedText, setDisplayedText] = useState('');
  const [currentWordIndex, setCurrentWordIndex] = useState(0);
  const audioRef = useRef(null);
  const intervalRef = useRef(null);
  const updateHandlerRef = useRef(null);

  useEffect(() => {
    if (!message || !message.text) {
      setDisplayedText('');
      setCurrentWordIndex(0);
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      if (audioRef.current && updateHandlerRef.current) {
        audioRef.current.removeEventListener('timeupdate', updateHandlerRef.current);
        audioRef.current.removeEventListener('ended', updateHandlerRef.current);
      }
      audioRef.current = null;
      return;
    }

    // Split text into words
    const words = message.text.split(' ');
    setCurrentWordIndex(0);
    setDisplayedText('');

    // Update subtitles based on audio playback
    const updateSubtitles = () => {
      if (!currentAudio) {
        audioRef.current = null;
        return;
      }

      audioRef.current = currentAudio;
      const audio = currentAudio;
      
      if (audio.ended) {
        // Show full text when audio ends
        setDisplayedText(message.text);
        setCurrentWordIndex(words.length);
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
        return;
      }

      if (audio.paused && !audio.ended) return;

      const currentTime = audio.currentTime;
      
      // Calculate which words should be shown
      // Estimate ~2.5 words per second (150 words per minute)
      const wordsPerSecond = 2.5;
      const elapsedWords = Math.floor(currentTime * wordsPerSecond);
      const wordsToShow = Math.min(elapsedWords, words.length);
      
      if (wordsToShow > currentWordIndex) {
        const textToShow = words.slice(0, wordsToShow).join(' ');
        setDisplayedText(textToShow);
        setCurrentWordIndex(wordsToShow);
      }
    };

    updateHandlerRef.current = updateSubtitles;

    // Start tracking audio
    const handleEnded = () => {
      setDisplayedText(message.text);
      setCurrentWordIndex(words.length);
    };

    if (currentAudio) {
      audioRef.current = currentAudio;
      currentAudio.addEventListener('timeupdate', updateSubtitles);
      currentAudio.addEventListener('ended', handleEnded);
      updateHandlerRef.current.handleEnded = handleEnded;
    }

    // Update subtitles every 50ms for smooth progression
    intervalRef.current = setInterval(updateSubtitles, 50);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      if (audioRef.current && updateHandlerRef.current) {
        audioRef.current.removeEventListener('timeupdate', updateHandlerRef.current);
        if (updateHandlerRef.current.handleEnded) {
          audioRef.current.removeEventListener('ended', updateHandlerRef.current.handleEnded);
        }
        audioRef.current = null;
      }
    };
  }, [message, currentAudio]);

  if (!message || !message.text) {
    return null;
  }

  // Show text even if not fully loaded yet
  const textToDisplay = displayedText || '';

  return (
    <div className="fixed bottom-32 left-1/2 transform -translate-x-1/2 z-20 pointer-events-none max-w-4xl w-full px-4">
      <div className="bg-black/80 backdrop-blur-md text-white px-6 py-4 rounded-lg shadow-2xl border border-white/20">
        <p className="text-lg font-medium text-center leading-relaxed min-h-[1.5rem]">
          {textToDisplay}
          {textToDisplay && currentWordIndex < (message.text.split(' ').length) && (
            <span className="inline-block w-0.5 h-5 bg-white ml-1 animate-pulse" />
          )}
        </p>
      </div>
    </div>
  );
};

