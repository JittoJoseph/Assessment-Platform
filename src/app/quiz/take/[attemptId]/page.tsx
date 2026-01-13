"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";

interface Question {
  id: string;
  question: string;
  options: string[];
}

interface Quiz {
  id: string;
  title: string;
  end_time: string;
}

interface Answer {
  question_id: string;
  selected_option: number | null;
  timestamp: number;
}

interface User {
  id: string;
  full_name: string;
  email: string;
}

export default function TakeQuizPage() {
  const params = useParams();
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, Answer>>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [completed, setCompleted] = useState(false);
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);
  const [autoSubmitted, setAutoSubmitted] = useState(false);

  // Load saved answers from localStorage
  const loadSavedAnswers = useCallback(() => {
    try {
      const saved = localStorage.getItem(`quiz_answers_${params.attemptId}`);
      if (saved) {
        const parsedAnswers = JSON.parse(saved);
        setAnswers(parsedAnswers);
      }
    } catch (err) {
      console.error("Failed to load saved answers:", err);
    }
  }, [params.attemptId]);

  // Save answers to localStorage
  const saveAnswers = useCallback(
    (newAnswers: Record<string, Answer>) => {
      try {
        localStorage.setItem(
          `quiz_answers_${params.attemptId}`,
          JSON.stringify(newAnswers)
        );
      } catch (err) {
        console.error("Failed to save answers:", err);
      }
    },
    [params.attemptId]
  );

  const [timeRemaining, setTimeRemaining] = useState<number>(0);

  // Initialize quiz
  useEffect(() => {
    initializeQuiz();
  }, [params.attemptId]);

  // Check quiz end time and update timer
  useEffect(() => {
    if (quiz && !completed && !autoSubmitted) {
      const checkEndTime = () => {
        const now = new Date();
        const end = new Date(quiz.end_time);
        const remaining = Math.max(0, end.getTime() - now.getTime());
        setTimeRemaining(remaining);

        if (now >= end) {
          handleQuizEnd();
        }
      };

      checkEndTime();
      const interval = setInterval(checkEndTime, 1000);
      return () => clearInterval(interval);
    }
  }, [quiz, completed, autoSubmitted]);

  // Format time remaining
  const formatTimeRemaining = (ms: number) => {
    if (ms <= 0) return "00:00:00";

    const hours = Math.floor(ms / (1000 * 60 * 60));
    const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((ms % (1000 * 60)) / 1000);

    const pad = (n: number) => n.toString().padStart(2, "0");
    return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
  };

  const initializeQuiz = async () => {
    try {
      // Check authentication
      const authResponse = await fetch("/api/auth/check");
      const authData = await authResponse.json();

      if (!authData.authenticated) {
        // Store the current URL for redirect after login
        localStorage.setItem("redirectAfterLogin", window.location.href);
        router.push("/auth");
        return;
      }

      setUser(authData.user);

      // Load saved answers first
      loadSavedAnswers();

      // Load attempt data
      const response = await fetch("/api/quiz/start-attempt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          attempt_id: params.attemptId,
          user_id: authData.user.id,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error);
        return;
      }

      setQuiz(data.quiz);
      setQuestions(data.questions);

      // If no questions, complete immediately
      if (!data.questions || data.questions.length === 0) {
        await submitAllAnswers();
      }
    } catch (err: any) {
      setError("Failed to initialize quiz");
    } finally {
      setLoading(false);
    }
  };

  const handleAnswer = (selectedOption: number | null) => {
    if (questions.length === 0 || completed) return;

    const currentQuestion = questions[currentQuestionIndex];

    // Allow unselecting by clicking the same option
    const isCurrentlySelected =
      currentAnswer?.selected_option === selectedOption;
    const finalSelectedOption = isCurrentlySelected ? null : selectedOption;

    const answer: Answer = {
      question_id: currentQuestion.id,
      selected_option: finalSelectedOption,
      timestamp: Date.now(),
    };

    const newAnswers = { ...answers, [currentQuestion.id]: answer };
    setAnswers(newAnswers);
    saveAnswers(newAnswers);

    // Don't auto-advance - let user navigate manually
  };

  const goToQuestion = (index: number) => {
    if (index >= 0 && index < questions.length) {
      setCurrentQuestionIndex(index);
    }
  };

  const handleNextOrSkip = () => {
    if (!currentAnswer) {
      // Skip current question
      handleAnswer(null);
    }
    // Move to next question if not at the end
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex((prev) => prev + 1);
    }
  };

  const submitAllAnswers = async () => {
    if (submitting || completed) return;

    setSubmitting(true);
    try {
      const answersArray = Object.values(answers);
      const response = await fetch("/api/quiz/submit-all-answers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          attempt_id: params.attemptId,
          answers: answersArray,
          user_id: user?.id,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error);
      }

      setCompleted(true);
      // Clear saved answers
      localStorage.removeItem(`quiz_answers_${params.attemptId}`);
      router.push(`/quiz/complete/${params.attemptId}`);
    } catch (err: any) {
      setError("Failed to submit quiz");
    } finally {
      setSubmitting(false);
      setShowSubmitConfirm(false);
    }
  };

  const handleSubmitClick = () => {
    setShowSubmitConfirm(true);
  };

  const handleQuizEnd = () => {
    if (autoSubmitted) return; // Prevent multiple auto-submissions
    setAutoSubmitted(true);
    // Auto-submit all answered questions
    submitAllAnswers();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black mx-auto mb-4"></div>
          <p className="text-gray-600">Loading quiz...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center px-4">
        <div className="w-full max-w-md text-center">
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Error</h1>
            <p className="text-gray-600">{error}</p>
          </div>
          <button
            onClick={() => router.push("/")}
            className="bg-black text-white px-6 py-3 rounded-lg font-medium hover:bg-gray-800 transition-colors"
          >
            Back to Home
          </button>
        </div>
      </div>
    );
  }

  if (completed || !quiz || questions.length === 0) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black mx-auto mb-4"></div>
          <p className="text-gray-600">Completing quiz...</p>
        </div>
      </div>
    );
  }

  const currentQuestion = questions[currentQuestionIndex];
  const currentAnswer = answers[currentQuestion.id];
  const progress = ((currentQuestionIndex + 1) / questions.length) * 100;
  const answeredCount = Object.values(answers).filter(
    (answer) => answer.selected_option !== null
  ).length;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10 shadow-sm">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-3">
            {/* Mobile Layout */}
            <div className="flex flex-col gap-2 sm:hidden">
              {/* Top Row: Exit, Time Left, Progress */}
              <div className="flex items-center justify-between">
                <Link
                  href="/"
                  className="flex items-center text-gray-600 hover:text-gray-900 transition-colors p-2"
                >
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 19l-7-7 7-7"
                    />
                  </svg>
                </Link>

                {/* Prominent Time Left */}
                <div className="flex-1 text-center px-4">
                  <div className="text-lg font-mono font-bold text-red-600">
                    {(() => {
                      const totalSeconds = Math.floor(timeRemaining / 1000);
                      const hours = Math.floor(totalSeconds / 3600);
                      const minutes = Math.floor((totalSeconds % 3600) / 60);
                      const seconds = totalSeconds % 60;

                      if (hours > 0) {
                        return `${hours}h ${minutes}m ${seconds}s`;
                      } else if (minutes > 0) {
                        return `${minutes}m ${seconds}s`;
                      } else {
                        return `${seconds}s`;
                      }
                    })()}
                  </div>
                  <div className="text-xs text-gray-500 font-medium">
                    TIME LEFT
                  </div>
                </div>

                <div className="text-right p-2">
                  <div className="text-sm font-medium text-gray-900">
                    {currentQuestionIndex + 1}/{questions.length}
                  </div>
                </div>
              </div>
            </div>

            {/* Desktop Layout */}
            <div className="hidden sm:flex sm:justify-between sm:items-center">
              <div className="flex items-center">
                <Link
                  href="/"
                  className="flex items-center text-gray-600 hover:text-gray-900 transition-colors mr-4"
                >
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 19l-7-7 7-7"
                    />
                  </svg>
                  <span className="ml-1 text-sm font-medium">Exit</span>
                </Link>
                <div>
                  <h1 className="text-lg font-semibold text-gray-900 truncate max-w-xs">
                    {quiz?.title}
                  </h1>
                  <p className="text-sm text-gray-600">
                    Question {currentQuestionIndex + 1} of {questions.length}
                  </p>
                </div>
              </div>

              {/* Prominent Time Left in Center */}
              <div className="flex-1 text-center px-8">
                <div className="text-xl font-mono font-bold text-red-600">
                  {(() => {
                    const totalSeconds = Math.floor(timeRemaining / 1000);
                    const hours = Math.floor(totalSeconds / 3600);
                    const minutes = Math.floor((totalSeconds % 3600) / 60);
                    const seconds = totalSeconds % 60;

                    if (hours > 0) {
                      return `${hours}h ${minutes}m ${seconds}s`;
                    } else if (minutes > 0) {
                      return `${minutes}m ${seconds}s`;
                    } else {
                      return `${seconds}s`;
                    }
                  })()}
                </div>
                <div className="text-xs text-gray-500 font-medium">
                  TIME LEFT
                </div>
              </div>

              <div className="text-right">
                <div className="text-sm font-medium text-gray-900">
                  {answeredCount}/{questions.length} answered
                </div>
                <div className="w-24 bg-gray-200 rounded-full h-2 mt-1">
                  <div
                    className="bg-gray-600 h-2 rounded-full transition-all duration-300"
                    style={{
                      width: `${(answeredCount / questions.length) * 100}%`,
                    }}
                  ></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
          {/* Question Navigation */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium text-gray-600">Questions</h3>
              <span className="text-sm text-gray-500">
                {answeredCount} of {questions.length} answered
              </span>
            </div>
            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
              {questions.map((_, index) => {
                const answer = answers[questions[index].id];
                const isAnswered = answer && answer.selected_option !== null;
                const isSkipped = answer && answer.selected_option === null;
                const isCurrent = index === currentQuestionIndex;
                return (
                  <button
                    key={index}
                    onClick={() => goToQuestion(index)}
                    className={`flex-shrink-0 w-8 h-8 rounded-md font-medium text-xs transition-all duration-200 ${
                      isCurrent
                        ? "bg-gray-800 text-white shadow-md ring-2 ring-gray-300"
                        : isAnswered
                        ? "bg-gray-600 text-white hover:bg-gray-700"
                        : isSkipped
                        ? "bg-gray-300 text-gray-700 border border-gray-400 hover:bg-gray-400"
                        : "bg-gray-200 text-gray-600 hover:bg-gray-300"
                    }`}
                  >
                    {index + 1}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Question */}
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-6 leading-relaxed">
              {currentQuestion.question}
            </h2>

            {/* Options */}
            <div className="space-y-3">
              {currentQuestion.options.map((option, index) => (
                <button
                  key={index}
                  onClick={() => handleAnswer(index)}
                  className={`w-full text-left p-4 border-2 rounded-lg transition-all duration-200 ${
                    currentAnswer?.selected_option === index
                      ? "border-gray-400 bg-gray-100 text-gray-900 shadow-sm"
                      : "border-gray-200 hover:border-gray-300 hover:bg-gray-50 text-gray-700 hover:text-gray-900"
                  } cursor-pointer`}
                >
                  <div className="flex items-start">
                    <div
                      className={`w-5 h-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center mr-3 mt-0.5 ${
                        currentAnswer?.selected_option === index
                          ? "border-gray-600 bg-gray-600"
                          : "border-gray-300"
                      }`}
                    >
                      {currentAnswer?.selected_option === index && (
                        <div className="w-2 h-2 rounded-full bg-white"></div>
                      )}
                    </div>
                    <span className="text-base leading-relaxed">{option}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Navigation */}
          <div className="flex justify-between items-center pt-8 border-t border-gray-100">
            <button
              onClick={() => goToQuestion(currentQuestionIndex - 1)}
              disabled={currentQuestionIndex === 0}
              className="flex items-center px-6 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 hover:border-gray-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-white shadow-sm"
            >
              <svg
                className="w-4 h-4 mr-2"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 19l-7-7 7-7"
                />
              </svg>
              Previous
            </button>

            {currentQuestionIndex === questions.length - 1 ? (
              <button
                onClick={handleSubmitClick}
                disabled={submitting}
                className="px-8 py-3 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
              >
                {submitting ? "Submitting..." : "Submit Quiz"}
              </button>
            ) : (
              <button
                onClick={handleNextOrSkip}
                className="px-6 py-3 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors font-medium shadow-sm"
              >
                {currentAnswer ? "Next" : "Skip"}
              </button>
            )}
          </div>

          {/* Status Message */}
          <div className="mt-8 text-center">
            {currentAnswer ? null : (
              <p className="text-gray-500 text-sm">
                Select an answer to continue
              </p>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center">
          <p className="text-sm text-gray-500">
            Your progress is automatically saved
          </p>
        </div>
      </main>

      {/* Submit Confirmation Modal */}
      {showSubmitConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6">
            <h3 className="text-xl font-semibold text-gray-900 mb-4">
              Submit Quiz?
            </h3>
            <p className="text-gray-600 mb-6">
              Are you sure you want to submit your quiz? You won't be able to
              change your answers after submission.
            </p>
            <div className="flex space-x-3">
              <button
                onClick={() => setShowSubmitConfirm(false)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={submitAllAnswers}
                disabled={submitting}
                className="flex-1 px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? "Submitting..." : "Submit Quiz"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
