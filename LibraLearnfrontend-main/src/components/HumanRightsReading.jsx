import React, { useState, useEffect, useRef } from 'react';
import SideNavbar from './SideNavbar';
import { useChat } from '../hooks/useChat';

const HumanRightsReading = () => {
  const { chat, loading: chatLoading, message } = useChat();
  const [contentType, setContentType] = useState('text'); // 'text' or 'pdf'
  const [selectedPdf, setSelectedPdf] = useState(null); // Currently selected PDF path
  const [answerMode, setAnswerMode] = useState('default'); // 'default' | 'rag'
  const [question, setQuestion] = useState('');
  const [selectedContext, setSelectedContext] = useState('');
  const [sourceFilter, setSourceFilter] = useState('');
  const [isAsking, setIsAsking] = useState(false);
  const [askError, setAskError] = useState('');
  const [lastRagAnswer, setLastRagAnswer] = useState('');
  const [ragSources, setRagSources] = useState([]);
  const [speechSupported, setSpeechSupported] = useState(false);
  const [listening, setListening] = useState(false);
  const [speechTranscript, setSpeechTranscript] = useState('');
  const recognitionRef = useRef(null);
  const transcriptRef = useRef('');

  // Pre-defined list of available PDFs
  // PDFs should be stored in the public/pdfs folder
  const availablePdfs = [
    {
      id: 1,
      name: 'Human Rights UN Data',
      path: '/pdfs/humanrights_un_data.pdf',
      description: 'United Nations data and information on human rights'
    },
    {
      id: 2,
      name: 'Pakistan Fundamental Rights',
      path: '/pdfs/pakistan Fundamental Rights.pdf',
      description: 'Fundamental rights as defined in the Constitution of Pakistan'
    },
    {
      id: 3,
      name: 'UN Child Rights',
      path: '/pdfs/UNchildrights_data.pdf',
      description: 'United Nations Convention on the Rights of the Child'
    }
  ];

  // Debug: Log when PDF is selected
  useEffect(() => {
    if (selectedPdf) {
      console.log('Selected PDF path:', selectedPdf);
      console.log('Full URL would be:', window.location.origin + selectedPdf);
    }
  }, [selectedPdf]);

  // Sample structured text content about human rights
  const structuredTextContent = {
    title: "Universal Declaration of Human Rights",
    sections: [
      {
        sourceId: "udhr-article-1",
        heading: "Article 1",
        content: "All human beings are born free and equal in dignity and rights. They are endowed with reason and conscience and should act towards one another in a spirit of brotherhood."
      },
      {
        sourceId: "udhr-article-2",
        heading: "Article 2",
        content: "Everyone is entitled to all the rights and freedoms set forth in this Declaration, without distinction of any kind, such as race, colour, sex, language, religion, political or other opinion, national or social origin, property, birth or other status."
      },
      {
        sourceId: "udhr-article-3",
        heading: "Article 3",
        content: "Everyone has the right to life, liberty and security of person."
      },
      {
        sourceId: "udhr-article-4",
        heading: "Article 4",
        content: "No one shall be held in slavery or servitude; slavery and the slave trade shall be prohibited in all their forms."
      },
      {
        sourceId: "udhr-article-5",
        heading: "Article 5",
        content: "No one shall be subjected to torture or to cruel, inhuman or degrading treatment or punishment."
      },
      {
        sourceId: "udhr-article-6",
        heading: "Article 6",
        content: "Everyone has the right to recognition everywhere as a person before the law."
      },
      {
        sourceId: "udhr-article-7",
        heading: "Article 7",
        content: "All are equal before the law and are entitled without any discrimination to equal protection of the law."
      },
      {
        sourceId: "udhr-article-8",
        heading: "Article 8",
        content: "Everyone has the right to an effective remedy by the competent national tribunals for acts violating the fundamental rights granted him by the constitution or by law."
      },
      {
        sourceId: "udhr-article-9",
        heading: "Article 9",
        content: "No one shall be subjected to arbitrary arrest, detention or exile."
      },
      {
        sourceId: "udhr-article-10",
        heading: "Article 10",
        content: "Everyone is entitled in full equality to a fair and public hearing by an independent and impartial tribunal, in the determination of his rights and obligations and of any criminal charge against him."
      }
    ]
  };

  const backendUrl = import.meta.env.VITE_API_URL || "http://localhost:3000";

  const getPdfSourceId = (pdfPath) => {
    const fileName = pdfPath.split('/').pop() || '';
    return `pdf:${fileName}`;
  };

  const handleAsk = async () => {
    if (!question.trim()) {
      setAskError('Please type a question first.');
      return;
    }

    if (!chatLoading && !message) {
      setIsAsking(true);
      setAskError('');
      setLastRagAnswer('');
      setRagSources([]);

      try {
        if (answerMode === 'default') {
          await chat(question.trim());
        } else {
          const response = await fetch(`${backendUrl}/ragAsk`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              question: question.trim(),
              sourceFilter: sourceFilter || undefined,
              contextText: selectedContext || undefined,
            }),
          });

          const raw = await response.text();
          let data = {};
          try {
            data = raw ? JSON.parse(raw) : {};
          } catch {
            throw new Error(
              'RAG service returned non-JSON. Please ensure backend is running and VITE_API_URL points to it.'
            );
          }

          if (!response.ok) {
            throw new Error(data?.message || 'RAG request failed.');
          }

          const ragAnswer = data?.answer || 'I could not produce a grounded answer.';
          setLastRagAnswer(ragAnswer);
          setRagSources(data?.sources || []);

          // Reuse existing avatar voice/lipsync pipeline.
          await chat(ragAnswer);
        }

        setQuestion('');
      } catch (err) {
        setAskError(err.message || 'Failed to ask question.');
      } finally {
        setIsAsking(false);
      }
    } else {
      setAskError('Please wait until the avatar finishes the current response.');
    }
  };

  useEffect(() => {
    const SpeechRecognition = window?.SpeechRecognition || window?.webkitSpeechRecognition;
    setSpeechSupported(!!SpeechRecognition);

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.onresult = null;
        recognitionRef.current.onend = null;
        recognitionRef.current.onerror = null;
        recognitionRef.current.stop();
        recognitionRef.current = null;
      }
    };
  }, []);

  const stopSpeechRecognition = () => {
    const recognition = recognitionRef.current;
    if (recognition) {
      recognition.onresult = null;
      recognition.onend = null;
      recognition.onerror = null;
      recognition.stop();
      recognitionRef.current = null;
    }
    transcriptRef.current = question;
    setListening(false);
  };

  const startSpeechRecognition = () => {
    const SpeechRecognition = window?.SpeechRecognition || window?.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert('Speech recognition is not supported in this browser.');
      return;
    }

    transcriptRef.current = question;
    const recognition = new SpeechRecognition();
    recognition.lang = window.navigator.language || 'en-US';
    recognition.interimResults = true;
    recognition.continuous = true;
    recognition.maxAlternatives = 1;

    recognition.onresult = (event) => {
      let interimTranscript = '';
      for (let i = 0; i < event.results.length; i += 1) {
        const transcriptText = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          transcriptRef.current += transcriptText;
        } else {
          interimTranscript += transcriptText;
        }
      }
      const currentText = `${transcriptRef.current}${interimTranscript}`;
      setSpeechTranscript(currentText);
      setQuestion(currentText);
    };

    recognition.onerror = (event) => {
      console.error('Speech recognition error', event);
      stopSpeechRecognition();
    };

    recognition.onend = () => {
      if (listening) {
        setTimeout(() => {
          try {
            recognition.start();
          } catch (err) {
            stopSpeechRecognition();
          }
        }, 250);
      }
    };

    recognitionRef.current = recognition;
    recognition.start();
    setListening(true);
    setSpeechTranscript(transcriptRef.current);
  };

  const toggleSpeechRecognition = () => {
    if (listening) {
      stopSpeechRecognition();
    } else {
      startSpeechRecognition();
    }
  };

  return (
    <>
      <SideNavbar />
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 pt-20 pb-10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-4">
              Human Rights Reading
            </h1>
            <p className="text-gray-600 text-lg">
              Explore human rights content through structured text or PDF documents
            </p>
          </div>

          {/* Content Type Selector */}
          <div className="mb-6 bg-white rounded-lg shadow-md p-4">
            <div className="flex flex-wrap gap-4">
              <button
                onClick={() => setContentType('text')}
                className={`px-6 py-3 rounded-lg font-semibold transition-all ${
                  contentType === 'text'
                    ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                📄 Structured Text
              </button>
              <button
                onClick={() => setContentType('pdf')}
                className={`px-6 py-3 rounded-lg font-semibold transition-all ${
                  contentType === 'pdf'
                    ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                📑 PDF Document
              </button>
            </div>
          </div>

          {/* Ask Assistant Panel */}
          <div className="mb-6 bg-white rounded-lg shadow-md p-4 space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">Ask Assistant</h3>
            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={() => setAnswerMode('default')}
                className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                  answerMode === 'default'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Default AI
              </button>
              <button
                onClick={() => setAnswerMode('rag')}
                className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                  answerMode === 'rag'
                    ? 'bg-purple-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                RAG Answer
              </button>
              <p className="text-xs text-gray-500">
                Mode: {answerMode === 'default' ? 'General AI' : 'Grounded in reading documents'}
              </p>
            </div>

            <div className="flex flex-col md:flex-row gap-3 items-stretch">
              <input
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder="Ask a human rights question..."
                className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <button
                type="button"
                onClick={toggleSpeechRecognition}
                className={`flex items-center justify-center w-12 h-12 rounded-lg text-white transition-all ${listening ? 'bg-green-600 hover:bg-green-700' : 'bg-blue-500 hover:bg-blue-600'}`}
                aria-label={listening ? 'Stop microphone' : 'Start microphone'}
              >
                {listening ? (
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-6 h-6">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5.25a3 3 0 016 0v3.75a3 3 0 01-6 0V5.25z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 12.75a6.75 6.75 0 0013.5 0" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75v2.25" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 15.75h7.5" />
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-6 h-6">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5.25a3 3 0 016 0v3.75a3 3 0 01-6 0V5.25z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 12.75a6.75 6.75 0 0013.5 0" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75v2.25" />
                  </svg>
                )}
              </button>
              <button
                onClick={handleAsk}
                disabled={isAsking || chatLoading}
                className="px-6 py-3 rounded-lg bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isAsking ? 'Asking...' : 'Ask & Speak'}
              </button>
            </div>
            {speechSupported && speechTranscript && (
              <p className="text-sm text-gray-600 italic mt-2">Listening: {speechTranscript}</p>
            )}

            {askError && (
              <p className="text-sm text-red-600">{askError}</p>
            )}

            {answerMode === 'rag' && (
              <div className="text-xs text-gray-500 bg-purple-50 border border-purple-200 rounded-lg p-3">
                Tip: select an article or PDF first to focus retrieval context.
              </div>
            )}

            {lastRagAnswer && (
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 space-y-2">
                <p className="text-sm font-semibold text-gray-900">Last RAG Answer</p>
                <p className="text-sm text-gray-700">{lastRagAnswer}</p>
                {ragSources.length > 0 && (
                  <p className="text-xs text-gray-500">
                    Sources: {ragSources.map((s) => s.sourceLabel).join(', ')}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Content Display Area */}
          <div className="bg-white rounded-lg shadow-xl p-6 md:p-8 min-h-[600px]">
            {contentType === 'text' ? (
              <div className="space-y-6">
                <h2 className="text-3xl font-bold text-gray-900 mb-6">
                  {structuredTextContent.title}
                </h2>
                {structuredTextContent.sections.map((section, index) => (
                  <div
                    key={index}
                    onClick={() => {
                      setSelectedContext(`${section.heading}: ${section.content}`);
                      setSourceFilter(section.sourceId);
                    }}
                    className="border-l-4 border-blue-600 pl-6 py-4 bg-blue-50/50 rounded-r-lg hover:bg-blue-50 transition-colors"
                  >
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">
                      {section.heading}
                    </h3>
                    <p className="text-gray-700 leading-relaxed">
                      {section.content}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-4">
                {/* Available PDFs List */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    Available PDF Documents ({availablePdfs.length})
                  </label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-60 overflow-y-auto">
                    {availablePdfs.map((pdf) => (
                      <div
                        key={pdf.id}
                        onClick={() => {
                          setSelectedPdf(pdf.path);
                          setSelectedContext(`${pdf.name} - ${pdf.description}`);
                          setSourceFilter(getPdfSourceId(pdf.path));
                        }}
                        className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                          selectedPdf === pdf.path
                            ? 'border-blue-600 bg-blue-50 shadow-md'
                            : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50'
                        }`}
                      >
                        <div className="flex items-start space-x-3">
                          <span className="text-3xl">📄</span>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-gray-900 mb-1">
                              {pdf.name}
                            </p>
                            <p className="text-xs text-gray-600">
                              {pdf.description}
                            </p>
                          </div>
                          {selectedPdf === pdf.path && (
                            <span className="text-blue-600 text-xl">✓</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* PDF Viewer */}
                <div className="border-2 border-gray-200 rounded-lg overflow-hidden" style={{ minHeight: '600px' }}>
                  {selectedPdf ? (
                    <div className="relative w-full" style={{ minHeight: '600px' }}>
                      <iframe
                        id="pdf-viewer"
                        src={`${selectedPdf}#toolbar=1&navpanes=1&scrollbar=1`}
                        className="w-full h-full"
                        style={{ minHeight: '600px', width: '100%', border: 'none' }}
                        title="PDF Viewer"
                      />
                      <div className="absolute top-2 right-2 z-10">
                        <a
                          href={selectedPdf}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-3 py-1 bg-white/90 backdrop-blur-sm rounded-lg shadow-md text-sm text-gray-700 hover:bg-white transition-all"
                          title="Open in new tab"
                        >
                          🔗 Open in New Tab
                        </a>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center h-full min-h-[600px] bg-gray-50">
                      <div className="text-center">
                        <div className="text-6xl mb-4">📄</div>
                        <p className="text-gray-600 text-lg font-semibold">
                          Select a PDF document to read
                        </p>
                        <p className="text-gray-500 text-sm mt-2">
                          Choose from the available PDFs above to start reading
                        </p>
                        <p className="text-gray-400 text-xs mt-4">
                          Note: PDFs should be placed in <code className="bg-gray-200 px-2 py-1 rounded">public/pdfs/</code> folder
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Additional Info */}
          <div className="mt-6 bg-blue-50 rounded-lg p-4 border-l-4 border-blue-600">
            <p className="text-sm text-gray-700">
              <strong>Note:</strong> This reading section supports both structured text notes and PDF documents. 
              Switch between the two modes using the buttons above. Select from the available PDF documents 
              to read human rights content. PDFs are stored in the public/pdfs folder.
            </p>
          </div>
        </div>
      </div>
    </>
  );
};

export default HumanRightsReading;

