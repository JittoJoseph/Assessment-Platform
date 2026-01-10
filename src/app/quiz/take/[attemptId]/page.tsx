"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";

interface Question {
  id: string;
  question: string;
  options: string[];
  time_limit_seconds: number;
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
  const [questionStartTime, setQuestionStartTime] = useState<number>(
    Date.now()
  );
  const [timeLeft, setTimeLeft] = useState(0);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [completed, setCompleted] = useState(false);

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

  // Initialize quiz
  useEffect(() => {
    initializeQuiz();
  }, [params.attemptId]);

  // Timer effect for current question
  useEffect(() => {
    if (
      questions.length > 0 &&
      currentQuestionIndex < questions.length &&
      !completed
    ) {
      const currentQuestion = questions[currentQuestionIndex];
      const savedAnswer = answers[currentQuestion.id];

      if (savedAnswer) {
        // Question already answered, skip timer
        setTimeLeft(0);
      } else {
        // Start timer for unanswered question
        setQuestionStartTime(Date.now());
        setTimeLeft(currentQuestion.time_limit_seconds);

        const timer = setInterval(() => {
          setTimeLeft((prev) => {
            if (prev <= 1) {
              // Time's up - auto-submit current question
              handleAnswer(null);
              return 0;
            }
            return prev - 1;
          });
        }, 1000);

        return () => clearInterval(timer);
      }
    }
  }, [currentQuestionIndex, questions, answers, completed]);

  // Check quiz end time
  useEffect(() => {
    if (quiz && !completed) {
      const checkEndTime = () => {
        const now = new Date();
        const end = new Date(quiz.end_time);
        if (now >= end) {
          handleQuizEnd();
        }
      };

      const interval = setInterval(checkEndTime, 1000);
      return () => clearInterval(interval);
    }
  }, [quiz, completed]);

  const initializeQuiz = async () => {
    try {
      // Check authentication
      const authResponse = await fetch("/api/auth/check");
      const authData = await authResponse.json();

      if (!authData.authenticated) {
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
    const timeSpent = Math.floor((Date.now() - questionStartTime) / 1000);

    const answer: Answer = {
      question_id: currentQuestion.id,
      selected_option: selectedOption,
      time_taken_seconds: Math.min(
        timeSpent,
        currentQuestion.time_limit_seconds
      ),
      timestamp: Date.now(),
    };

    const newAnswers = { ...answers, [currentQuestion.id]: answer };
    setAnswers(newAnswers);
    saveAnswers(newAnswers);

    // Move to next question or complete
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex((prev) => prev + 1);
    } else {
      // All questions answered
      submitAllAnswers();
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
    }
  };

  const handleQuizEnd = () => {
    // Auto-submit all answered questions
    submitAllAnswers();
  };

  const goToQuestion = (index: number) => {
    if (index >= 0 && index < questions.length && !completed) {
      setCurrentQuestionIndex(index);
    }
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
  const timeColor =
    timeLeft <= 10
      ? "text-red-600"
      : timeLeft <= 30
      ? "text-orange-600"
      : "text-gray-900";

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-lg font-semibold text-gray-900">
                {quiz.title}
              </h1>
              <p className="text-sm text-gray-600">
                Question {currentQuestionIndex + 1} of {questions.length} •{" "}
                {answeredCount} answered
              </p>
            </div>
            <div className="text-right">
              <div className={`text-2xl font-mono font-bold ${timeColor}`}>
                {timeLeft > 0 ? formatTime(timeLeft) : "--:--"}
              </div>
              <p className="text-xs text-gray-500">Time remaining</p>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="mt-4">
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-black h-2 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              ></div>
            </div>
          </div>

          {/* Question Navigation */}
          <div className="mt-4 flex flex-wrap gap-2">
            {questions.map((_, index) => {
              const isAnswered = answers[questions[index].id];
              const isCurrent = index === currentQuestionIndex;
              return (
                <button
                  key={index}
                  onClick={() => goToQuestion(index)}
                  className={`w-8 h-8 rounded-full text-xs font-medium transition-colors ${
                    isCurrent
                      ? "bg-black text-white"
                      : isAnswered
                      ? "bg-green-600 text-white"
                      : "bg-gray-200 text-gray-600 hover:bg-gray-300"
                  }`}
                >
                  {index + 1}
                </button>
              );
            })}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-2xl mx-auto px-4 py-8">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
          {/* Question */}
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-6 leading-relaxed">
              {currentQuestion.question}
            </h2>

            {/* Options */}
            <div className="space-y-3">
              {currentQuestion.options.map((option, index) => (
                <label
                  key={index}
                  className={`flex items-center p-4 border rounded-lg cursor-pointer transition-all ${
                    currentAnswer?.selected_option === index
                      ? "border-black bg-black bg-opacity-5"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <input
                    type="radio"
                    name="option"
                    value={index}
                    checked={currentAnswer?.selected_option === index}
                    onChange={() => handleAnswer(index)}
                    disabled={currentAnswer !== undefined || timeLeft === 0}
                    className="w-4 h-4 text-black border-gray-300 focus:ring-black"
                  />
                  <span className="ml-3 text-gray-900">{option}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Status */}
          {currentAnswer ? (
            <div className="text-center">
              <p className="text-green-600 font-medium mb-4">
                ✓ Answer recorded
              </p>
              {currentQuestionIndex < questions.length - 1 ? (
                <button
                  onClick={() => setCurrentQuestionIndex((prev) => prev + 1)}
                  className="bg-black text-white px-6 py-3 rounded-lg font-semibold hover:bg-gray-800 transition-colors"
                >
                  Next Question
                </button>
              ) : (
                <button
                  onClick={submitAllAnswers}
                  disabled={submitting}
                  className="bg-black text-white px-8 py-3 rounded-lg font-semibold hover:bg-gray-800 transition-colors disabled:opacity-50"
                >
                  {submitting ? "Submitting..." : "Submit Quiz"}
                </button>
              )}
            </div>
          ) : timeLeft === 0 ? (
            <div className="text-center">
              <p className="text-orange-600 font-medium mb-4">
                Time's up for this question
              </p>
              <button
                onClick={() => handleAnswer(null)}
                className="bg-orange-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-orange-700 transition-colors"
              >
                Continue
              </button>
            </div>
          ) : (
            <div className="text-center text-gray-500">
              <p>Select your answer above</p>
            </div>
          )}
        </div>

        {/* Instructions */}
        <div className="mt-6 text-center">
          <p className="text-sm text-gray-500">
            Your answers are automatically saved. You can navigate between
            questions.
          </p>
        </div>
      </main>
    </div>
  );
}

function formatTime(seconds: number) {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}
