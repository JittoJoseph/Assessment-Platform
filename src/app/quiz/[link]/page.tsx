"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  FaPlay,
  FaLock,
  FaQuestionCircle,
  FaCheckCircle,
  FaHome,
} from "react-icons/fa";

interface Quiz {
  id: string;
  title: string;
  end_time: string;
  question_count?: number;
}

interface User {
  id: string;
  full_name: string;
  email: string;
  role: string;
}

type AttemptStatus = "none" | "in_progress" | "completed";

export default function QuizPage() {
  const params = useParams();
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState("");
  const [attemptStatus, setAttemptStatus] = useState<AttemptStatus>("none");

  useEffect(() => {
    loadQuizInfo();
  }, [params.link]);

  const loadQuizInfo = async () => {
    try {
      // Check authentication first
      const authResponse = await fetch("/api/auth/check");
      const authData = await authResponse.json();

      if (!authData.authenticated) {
        // Store the current URL for redirect after login
        localStorage.setItem("redirectAfterLogin", window.location.href);
        router.push("/auth");
        return;
      }

      setUser(authData.user);

      // Load quiz info
      const quizResponse = await fetch(`/api/quiz/${params.link}`);
      const quizData = await quizResponse.json();

      if (!quizResponse.ok) {
        setError(quizData.error);
        return;
      }

      setQuiz(quizData.quiz);
      setAttemptStatus(quizData.attemptStatus || "none");
    } catch (err) {
      setError("Failed to load quiz information");
    } finally {
      setLoading(false);
    }
  };

  const startQuizAttempt = async () => {
    if (!user || !quiz) return;

    setStarting(true);
    try {
      const response = await fetch("/api/quiz/start-attempt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          quiz_id: params.link,
          user_id: user.id,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error);
        return;
      }

      // Redirect to quiz taking page
      router.push(`/quiz/take/${data.attempt_id}`);
    } catch (err) {
      setError("Failed to start quiz");
    } finally {
      setStarting(false);
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

  // Show completed screen if already attempted
  if (attemptStatus === "completed" && quiz) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center px-4">
        <div className="w-full max-w-md text-center">
          <div className="mb-8">
            <FaCheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Assessment Completed
            </h1>
            <p className="text-gray-600">
              You have already completed this assessment. Your responses have
              been submitted successfully.
            </p>
          </div>

          <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 mb-8">
            <h2 className="text-lg font-semibold text-gray-900 mb-2">
              {quiz.title}
            </h2>
            <p className="text-sm text-gray-600">
              Your results will be reviewed by the assessment administrators.
              You will be notified of the outcome through the appropriate
              channels.
            </p>
          </div>

          <div className="space-y-4">
            <Link
              href="/"
              className="inline-flex items-center justify-center w-full bg-black text-white px-6 py-3 rounded-lg font-medium hover:bg-gray-800 transition-colors"
            >
              <FaHome className="w-4 h-4 mr-2" />
              Back to Home
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (error || !quiz) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center px-4">
        <div className="w-full max-w-md text-center">
          <div className="mb-8">
            <FaLock className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              Quiz Unavailable
            </h1>
            <p className="text-gray-600">{error || "Quiz not found"}</p>
          </div>

          <div className="space-y-4">
            <Link
              href="/"
              className="inline-flex items-center justify-center w-full bg-black text-white px-6 py-3 rounded-lg font-medium hover:bg-gray-800 transition-colors"
            >
              Back to Home
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const endTime = new Date(quiz.end_time);
  const timeRemaining = Math.max(0, endTime.getTime() - Date.now());

  const plural = (n: number, unit: string) =>
    `${n} ${unit}${n !== 1 ? "s" : ""}`;

  const formatTimeRemaining = () => {
    if (timeRemaining <= 0) return "Time's up";

    const totalMinutes = Math.floor(timeRemaining / (1000 * 60));
    const totalHours = Math.floor(timeRemaining / (1000 * 60 * 60));
    const totalDays = Math.floor(timeRemaining / (1000 * 60 * 60 * 24));
    const totalMonths = Math.floor(totalDays / 30);

    if (totalMonths > 0) {
      const remainingDays = totalDays % 30;
      return remainingDays > 0
        ? `${plural(totalMonths, "month")}, ${plural(
            remainingDays,
            "day"
          )} remaining`
        : `${plural(totalMonths, "month")} remaining`;
    }

    if (totalDays > 0) {
      const remainingHours = totalHours % 24;
      return remainingHours > 0
        ? `${plural(totalDays, "day")}, ${remainingHours}h remaining`
        : `${plural(totalDays, "day")} remaining`;
    }

    if (totalHours > 0) {
      const remainingMinutes = totalMinutes % 60;
      return remainingMinutes > 0
        ? `${totalHours}h ${remainingMinutes}m remaining`
        : `${totalHours}h remaining`;
    }

    return `${totalMinutes}m remaining`;
  };

  const formatEndTime = () => {
    return endTime.toLocaleString([], {
      year: "numeric",
      month: "numeric",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
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
                <span className="ml-1 text-sm font-medium">Back</span>
              </Link>
              <h1 className="text-lg font-semibold text-gray-900">
                Assessment
              </h1>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600 hidden sm:block">
                Welcome, {user?.full_name}
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="w-full max-w-md mx-auto">
          {/* Quiz Preview Card */}
          <div className="bg-white border border-gray-200 rounded-xl p-8 shadow-sm">
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <FaQuestionCircle className="w-8 h-8 text-gray-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                {quiz.title}
              </h2>
              <p className="text-gray-600 mb-4">
                {quiz.question_count} questions • {formatTimeRemaining()}
              </p>
              <p className="text-sm text-gray-500 mb-4">
                Assessment for {user?.full_name}
              </p>
              <p className="text-xs text-gray-400">Ends: {formatEndTime()}</p>
            </div>

            {/* Instructions */}
            <div className="mb-8">
              <h3 className="text-sm font-semibold text-gray-900 mb-4">
                Before you start:
              </h3>
              <div className="space-y-3 text-sm text-gray-600">
                <div className="flex items-start">
                  <div className="w-1.5 h-1.5 bg-gray-400 rounded-full mt-2 mr-3 flex-shrink-0"></div>
                  <span>Answer all questions to the best of your ability</span>
                </div>
                <div className="flex items-start">
                  <div className="w-1.5 h-1.5 bg-gray-400 rounded-full mt-2 mr-3 flex-shrink-0"></div>
                  <span>You can navigate between questions freely</span>
                </div>
                <div className="flex items-start">
                  <div className="w-1.5 h-1.5 bg-gray-400 rounded-full mt-2 mr-3 flex-shrink-0"></div>
                  <span>Your answers are saved automatically</span>
                </div>
                <div className="flex items-start">
                  <div className="w-1.5 h-1.5 bg-gray-400 rounded-full mt-2 mr-3 flex-shrink-0"></div>
                  <span>Once submitted, you cannot change your answers</span>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-3">
              <button
                onClick={startQuizAttempt}
                disabled={starting}
                className="cursor-pointer w-full bg-black text-white px-6 py-3 rounded-lg font-medium hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
              >
                {starting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Starting...
                  </>
                ) : (
                  <>
                    <FaPlay className="w-4 h-4 mr-2" />
                    Start Assessment
                  </>
                )}
              </button>

              <Link
                href="/"
                className="w-full bg-gray-50 text-gray-600 hover:text-gray-900 hover:bg-gray-100 px-6 py-3 rounded-lg font-medium transition-colors flex items-center justify-center text-sm"
              >
                Back to Home
              </Link>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
