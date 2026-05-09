import { useEffect, useMemo, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { Loader } from "@react-three/drei";
import { Leva } from "leva";
import { useChat } from "../hooks/useChat";
import SideNavbar from "./SideNavbar";
import { Experience } from "./Experience";

const backendUrl = import.meta.env.VITE_API_URL || "http://localhost:3000";
const TOTAL_QUESTIONS = 5;

const QuizGamePage = () => {
  const { chat, tts } = useChat();
  const [sessionId, setSessionId] = useState(null);
  const [questionNumber, setQuestionNumber] = useState(1);
  const [question, setQuestion] = useState(null);
  const [askedScenarios, setAskedScenarios] = useState([]);
  const [correctCount, setCorrectCount] = useState(0);
  const [feedback, setFeedback] = useState(null);
  const [selectedOption, setSelectedOption] = useState(null);
  const [isLoadingQuestion, setIsLoadingQuestion] = useState(true);
  const [isSubmittingAnswer, setIsSubmittingAnswer] = useState(false);
  const [error, setError] = useState("");
  const [quizEnded, setQuizEnded] = useState(false);

  const progressPercent = useMemo(() => {
    return Math.round((questionNumber / TOTAL_QUESTIONS) * 100);
  }, [questionNumber]);

  const fetchQuestion = async (payload) => {
    setIsLoadingQuestion(true);
    setError("");
    setFeedback(null);
    setSelectedOption(null);

    try {
      const response = await fetch(`${backendUrl}/startQuiz`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error("Failed to load quiz question.");
      }

      const data = await response.json();
      setSessionId(data.sessionId);
      setQuestion(data.question);
      setAskedScenarios((prev) => [...prev, data.question.scenario]);
    } catch (err) {
      setError(err.message || "Could not start the quiz.");
    } finally {
      setIsLoadingQuestion(false);
    }
  };

  useEffect(() => {
    fetchQuestion({
      sessionId: null,
      questionNumber: 1,
      totalQuestions: TOTAL_QUESTIONS,
      askedScenarios: [],
    });
  }, []);

  const handleOptionClick = async (optionKey) => {
    if (!question || isSubmittingAnswer || feedback) {
      return;
    }

    setSelectedOption(optionKey);
    setIsSubmittingAnswer(true);
    setError("");

    try {
      const response = await fetch(`${backendUrl}/submitAnswer`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          questionNumber,
          totalQuestions: TOTAL_QUESTIONS,
          scenario: question.scenario,
          options: question.options,
          correctAnswer: question.correctAnswer,
          userChoice: optionKey,
          currentPoints: 0,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to submit answer.");
      }

      const result = await response.json();
      if (result?.evaluation === "Correct") {
        setCorrectCount((prev) => prev + 1);
      }
      setFeedback(result);

      const correctAnswerLabel = question.correctAnswer;
      const correctAnswerText = question.options[correctAnswerLabel];
      const avatarMessage = result?.evaluation === "Correct"
        ? `Correct! The correct answer is ${correctAnswerLabel}: ${correctAnswerText}.`
        : `Wrong! The correct answer is ${correctAnswerLabel}: ${correctAnswerText}.`;

      await tts(avatarMessage);
    } catch (err) {
      setError(err.message || "Could not submit answer.");
    } finally {
      setIsSubmittingAnswer(false);
    }
  };

  const handleNextQuestion = () => {
    const isLastQuestion = questionNumber >= TOTAL_QUESTIONS;
    if (isLastQuestion) {
      // Save quiz results to localStorage
      const score = Math.round((correctCount / TOTAL_QUESTIONS) * 100);
      const quizResults = {
        score: score,
        correct: correctCount,
        total: TOTAL_QUESTIONS,
        date: new Date().toISOString()
      };
      localStorage.setItem('quizResults', JSON.stringify(quizResults));
      setQuizEnded(true);
      return;
    }

    const nextQuestionNumber = questionNumber + 1;
    setQuestionNumber(nextQuestionNumber);
    setFeedback(null);
    setSelectedOption(null);
    fetchQuestion({
      sessionId,
      questionNumber: nextQuestionNumber,
      totalQuestions: TOTAL_QUESTIONS,
      askedScenarios,
    });
  };

  const restartQuiz = () => {
    setSessionId(null);
    setQuestionNumber(1);
    setQuestion(null);
    setAskedScenarios([]);
    setCorrectCount(0);
    setFeedback(null);
    setSelectedOption(null);
    setError("");
    setQuizEnded(false);
    fetchQuestion({
      sessionId: null,
      questionNumber: 1,
      totalQuestions: TOTAL_QUESTIONS,
      askedScenarios: [],
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <Leva hidden />
      <Loader />
      <SideNavbar />
      <div className="max-w-6xl mx-auto px-4 pt-8 pb-16 lg:pl-72">
        <div className="grid gap-8 lg:grid-cols-[2fr_1fr]">
          <div className="bg-white rounded-2xl shadow-xl p-6 md:p-8">
            <div className="flex items-center justify-between mb-6">
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
                Human Rights Quiz Game
              </h1>
              <div className="text-right">
              <p className="text-sm text-gray-500">Correct Answers</p>
              <p className="text-2xl font-extrabold text-blue-700">{correctCount}</p>
            </div>
          </div>

          {!quizEnded && (
            <div className="mb-6">
              <div className="flex justify-between text-sm text-gray-600 mb-2">
                <span>
                  Question {questionNumber} of {TOTAL_QUESTIONS}
                </span>
                <span>{progressPercent}%</span>
              </div>
              <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-blue-600 to-purple-600 transition-all"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>
          )}

          {error && (
            <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          {quizEnded ? (
            <div className="text-center py-10">
              <h2 className="text-3xl font-bold text-gray-900 mb-2">Quiz Complete!</h2>
              <p className="text-gray-600 mb-6">Great effort. Keep learning your rights.</p>
              <div className="inline-flex items-center justify-center w-28 h-28 rounded-full bg-gradient-to-r from-blue-600 to-purple-600 text-white mb-6">
                <span className="text-3xl font-extrabold">
                  {correctCount}/{TOTAL_QUESTIONS}
                </span>
              </div>
              <p className="text-lg font-semibold text-gray-900 mb-6">
                You got {correctCount} out of {TOTAL_QUESTIONS} correct.
              </p>
              <p className="text-gray-600 mb-8">
                Every question you answer builds stronger awareness and confidence in defending
                human rights.
              </p>
              <button
                type="button"
                onClick={restartQuiz}
                className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-8 py-3 rounded-lg font-semibold hover:shadow-lg transition-all"
              >
                Restart Quiz
              </button>
            </div>
          ) : isLoadingQuestion || !question ? (
            <div className="py-16 text-center">
              <p className="text-gray-600 font-medium">Loading next scenario...</p>
            </div>
          ) : (
            <>
              <div className="mb-6">
                <p className="text-xs uppercase tracking-wide text-gray-500 mb-2">Scenario</p>
                <p className="text-lg text-gray-900 leading-relaxed">{question.scenario}</p>
              </div>

              <div className="grid gap-3">
                {["A", "B", "C", "D"].map((key) => {
                  const isChosen = selectedOption === key;
                  return (
                    <button
                      key={key}
                      type="button"
                      disabled={isSubmittingAnswer || !!feedback}
                      onClick={() => handleOptionClick(key)}
                      className={`text-left p-4 rounded-xl border transition-all ${
                        isChosen
                          ? "border-blue-500 bg-blue-50"
                          : "border-gray-200 hover:border-blue-300 hover:bg-gray-50"
                      } disabled:opacity-70`}
                    >
                      <span className="font-semibold text-blue-700 mr-2">{key}.</span>
                      <span className="text-gray-800">{question.options[key]}</span>
                    </button>
                  );
                })}
              </div>

              {feedback && (
                <div className="mt-6 rounded-xl border border-purple-200 bg-purple-50 p-4">
                  <p className="font-semibold text-purple-900">{feedback.evaluation}</p>
                  <p className="text-sm text-gray-700 mt-2">{feedback.feedback}</p>
                  <p className="text-sm text-purple-700 mt-2 font-medium">{feedback.encouragement}</p>
                  <p className="text-sm text-blue-700 mt-2 font-semibold">
                    {feedback.evaluation === "Correct" ? "Correct answer!" : "Not correct this time."}
                  </p>
                  <div className="mt-4 flex justify-end">
                    <button
                      type="button"
                      onClick={handleNextQuestion}
                      disabled={isLoadingQuestion}
                      className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-5 py-2 rounded-lg font-semibold hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {questionNumber >= TOTAL_QUESTIONS ? 'Finish Quiz' : 'Next Question'}
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        <div className="space-y-6">
          <div className="bg-white rounded-2xl shadow-xl p-6 md:p-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Avatar Assistant</h2>
            <div className="h-[460px] overflow-hidden rounded-3xl border border-indigo-100 bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 shadow-inner">
              <Canvas shadows camera={{ position: [0, 1.84, 3.7], fov: 25 }}>
                <Experience
                  avatarPosition={[0, -0.12, -1.62]}
                  avatarScale={1.15}
                  lookAtDefault={[0, 1.86, 3.7, 0, 1.05, -1.58]}
                  lookAtZoomed={[0, 1.52, 2.05, 0, 1.12, -1.58]}
                  lookAtUnzoomed={[0, 1.86, 3.7, 0, 1.05, -1.58]}
                />
              </Canvas>
            </div>
            <p className="mt-4 text-sm text-gray-600">
              The avatar reads the quiz result aloud. It confirms correct answers and explains the right answer when a choice is wrong.
            </p>
          </div>
        </div>
      </div>
    </div>
  </div>
  );
};

export default QuizGamePage;

