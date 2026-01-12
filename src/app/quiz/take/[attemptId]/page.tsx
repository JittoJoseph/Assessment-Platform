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
  time_taken_seconds: number;
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
    if (quiz && !completed) {
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
  }, [quiz, completed]);

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

    const answer: Answer = {
      question_id: currentQuestion.id,
      selected_option: selectedOption,
      time_taken_seconds: 0, // Time limits removed
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
  const answeredCount = Object.keys(answers).length;

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10 shadow-sm">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
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
                <span className="ml-1 text-sm font-medium">Exit Quiz</span>
              </Link>
              <div className="h-6 w-px bg-gray-200 mx-4"></div>
              <div>
                <h1 className="text-lg font-semibold text-gray-900">
                  {quiz?.title}
                </h1>
                <p className="text-sm text-gray-600">
                  Question {currentQuestionIndex + 1} of {questions.length}
                </p>
              </div>
            </div>
            <div className="text-right">
              <div className="text-sm font-medium text-gray-900">
                {Math.round(progress)}% Complete
              </div>
              <div className="w-24 bg-gray-200 rounded-full h-1.5 mt-1">
                <div
                  className="bg-black h-1.5 rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                ></div>
              </div>
              <div
                className={`text-xs mt-2 font-mono ${
                  timeRemaining < 600000 ? "text-red-600" : "text-gray-600"
                }`}
              >
                {formatTimeRemaining(timeRemaining)}
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
                const isAnswered = answers[questions[index].id];
                const isCurrent = index === currentQuestionIndex;
                return (
                  <button
                    key={index}
                    onClick={() => goToQuestion(index)}
                    className={`flex-shrink-0 w-8 h-8 rounded-md font-medium text-xs transition-all duration-200 ${
                      isCurrent
                        ? "bg-black text-white shadow-sm"
                        : isAnswered
                        ? "bg-green-500 text-white hover:bg-green-600"
                        : "bg-gray-200 text-gray-700 hover:bg-gray-300"
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
            <h2 className="text-xl font-semibold text-slate-900 mb-6 leading-relaxed">
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
                      ? "border-black bg-black text-white shadow-sm"
                      : "border-gray-200 hover:border-gray-300 hover:bg-gray-50 text-gray-700 hover:text-gray-900"
                  } cursor-pointer`}
                >
                  <div className="flex items-center">
                    <div
                      className={`w-5 h-5 rounded-full border-2 flex items-center justify-center mr-3 ${
                        currentAnswer?.selected_option === index
                          ? "border-white bg-white"
                          : "border-gray-300"
                      }`}
                    >
                      {currentAnswer?.selected_option === index && (
                        <div className="w-2 h-2 rounded-full bg-black"></div>
                      )}
                    </div>
                    <span className="text-base font-medium">{option}</span>
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
                className="px-8 py-3 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
              >
                {submitting ? "Submitting..." : "Submit Quiz"}
              </button>
            ) : (
              <button
                onClick={handleNextOrSkip}
                className="px-6 py-3 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors font-medium shadow-sm"
              >
                {currentAnswer ? "Next" : "Skip"}
              </button>
            )}
          </div>

          {/* Status Message */}
          <div className="mt-8 text-center">
            {currentAnswer ? (
              <p className="text-green-600 font-medium flex items-center justify-center">
                <svg
                  className="w-5 h-5 mr-2"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                    clipRule="evenodd"
                  />
                </svg>
                Answer saved
              </p>
            ) : (
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
                className="flex-1 px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
