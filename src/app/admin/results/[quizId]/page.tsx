"use client";

export const dynamic = "force-dynamic";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";

type User = {
  full_name: string;
  role: string;
};

type Answer = {
  question_id: string;
  selected_option: number | null;
  is_correct: boolean;
  marks_obtained: number;
  question: string;
  correct_answer: number;
};

type AttemptSummary = {
  id: string;
  total_score: number;
  submitted_at: string;
  profiles: { full_name: string; email: string };
};

type AttemptDetails = AttemptSummary & {
  answers: Answer[];
};

type ResultsResponse = {
  attempts: AttemptSummary[];
  totalCount: number;
  limit: number;
  offset: number;
  hasMore: boolean;
};

export default function ResultsPage() {
  const { quizId } = useParams();
  const router = useRouter();
  const [attempts, setAttempts] = useState<AttemptSummary[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [selectedAttempt, setSelectedAttempt] = useState<AttemptDetails | null>(
    null
  );
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [authError, setAuthError] = useState<string>("");
  const [shortlistCount, setShortlistCount] = useState(20);

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString([], {
      year: "numeric",
      month: "numeric",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };

  const loadResults = useCallback(
    async (loadMore = false) => {
      try {
        if (loadMore) {
          setLoadingMore(true);
        } else {
          setLoading(true);
        }

        const offset = loadMore ? attempts.length : 0;
        const response = await fetch(
          `/api/results/${quizId}?limit=50&offset=${offset}`
        );

        if (!response.ok) {
          throw new Error(
            `Failed to fetch results: ${response.status} ${response.statusText}`
          );
        }

        const data: ResultsResponse = await response.json();

        if (loadMore) {
          setAttempts((prev) => [...prev, ...data.attempts]);
        } else {
          setAttempts(data.attempts);
        }

        setTotalCount(data.totalCount);
      } catch (err: unknown) {
        const error = err as Error;
        console.error("Error loading results:", error);
        alert(`Error loading results: ${error.message}`);
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [quizId, attempts.length]
  );

  useEffect(() => {
    // Check authentication on client side as backup
    const checkClientAuth = async () => {
      try {
        const response = await fetch("/api/auth/check");
        if (!response.ok) {
          setAuthError("Please sign in first");
          setLoading(false);
          return;
        }
        const data = await response.json();
        if (data.user?.role !== "admin") {
          setAuthError("Admin access required");
          setLoading(false);
          return;
        }
        setUser(data.user);
        loadResults();
      } catch {
        setAuthError("Authentication check failed");
        setLoading(false);
      }
    };

    checkClientAuth();
  }, [loadResults]);

  const loadAttemptDetails = async (attemptId: string) => {
    setLoadingDetails(true);
    try {
      const response = await fetch(`/api/attempt/${attemptId}`);
      if (!response.ok) {
        throw new Error("Failed to load attempt details");
      }
      const data: AttemptDetails = await response.json();
      setSelectedAttempt(data);
    } catch (err: unknown) {
      const error = err as Error;
      console.error("Error loading attempt details:", error);
      alert(`Error loading details: ${error.message}`);
    } finally {
      setLoadingDetails(false);
    }
  };

  const handleAttemptClick = (attempt: AttemptSummary) => {
    loadAttemptDetails(attempt.id);
  };

  // Memoize computed values
  const shortlisted = useMemo(
    () =>
      attempts
        .slice()
        .sort((a, b) => b.total_score - a.total_score)
        .slice(0, shortlistCount),
    [attempts, shortlistCount]
  );

  const highestScore = useMemo(
    () =>
      attempts.length > 0 ? Math.max(...attempts.map((a) => a.total_score)) : 0,
    [attempts]
  );

  if (authError) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-white border border-gray-200 rounded-xl shadow-lg p-8 text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            Access Denied
          </h1>
          <p className="text-gray-600 mb-6">{authError}</p>
          <button
            onClick={() => (window.location.href = "/")}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
          >
            Go Home
          </button>
        </div>
      </div>
    );
  }

  if (loading)
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-xl">Loading...</div>
      </div>
    );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <button
                onClick={() => router.push("/admin")}
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
              </button>
              <h1 className="text-xl font-semibold text-gray-900">
                Quiz Results
              </h1>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600 hidden sm:block">
                Welcome, {user?.full_name}
              </span>
              <form action="/api/auth/logout" method="POST" className="inline">
                <button
                  type="submit"
                  className="bg-black hover:bg-gray-800 text-white px-4 py-2 rounded-lg font-medium transition-colors text-sm"
                >
                  Logout
                </button>
              </form>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Overview */}
        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className="bg-white p-3 rounded-md shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-8 h-8 bg-blue-50 rounded-md mb-1">
                <svg
                  className="w-3.5 h-3.5 text-blue-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                  />
                </svg>
              </div>
              <p className="text-lg font-bold text-gray-900 leading-none">
                {totalCount}
              </p>
              <p className="text-xs text-gray-500 uppercase tracking-wide leading-tight">
                Total Attempts
              </p>
            </div>
          </div>

          <div className="bg-white p-3 rounded-md shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-8 h-8 bg-green-50 rounded-md mb-1">
                <svg
                  className="w-3.5 h-3.5 text-green-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <p className="text-lg font-bold text-gray-900 leading-none">
                {shortlisted.length}
              </p>
              <p className="text-xs text-gray-500 uppercase tracking-wide leading-tight">
                Shortlisted
              </p>
            </div>
          </div>

          <div className="bg-white p-3 rounded-md shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-8 h-8 bg-purple-50 rounded-md mb-1">
                <svg
                  className="w-3.5 h-3.5 text-purple-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
                  />
                </svg>
              </div>
              <p className="text-lg font-bold text-gray-900 leading-none">
                {highestScore}
              </p>
              <p className="text-xs text-gray-500 uppercase tracking-wide leading-tight">
                Highest Score
              </p>
            </div>
          </div>
        </div>

        {/* Shortlisting Controls */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 mb-8">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
            <div className="flex-1 max-w-md">
              <label className="block text-sm font-semibold text-gray-900 mb-2">
                Number of Students to Shortlist
              </label>
              <input
                type="number"
                min="1"
                max={totalCount}
                value={shortlistCount}
                onChange={(e) =>
                  setShortlistCount(
                    Math.max(
                      1,
                      Math.min(totalCount, parseInt(e.target.value) || 20)
                    )
                  )
                }
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent text-gray-900"
                placeholder="Enter number of students"
              />
              <p className="text-xs text-gray-500 mt-1">
                Shows top {shortlistCount} students by score (max: {totalCount})
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setShortlistCount(10)}
                className="px-4 py-2 text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors"
              >
                Top 10
              </button>
              <button
                onClick={() => setShortlistCount(20)}
                className="px-4 py-2 text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors"
              >
                Top 20
              </button>
              <button
                onClick={() => setShortlistCount(50)}
                className="px-4 py-2 text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors"
              >
                Top 50
              </button>
            </div>
          </div>
        </div>

        {/* Results List */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">
              Top {shortlistCount} Candidates
              <span className="ml-2 text-sm font-normal text-gray-600">
                ({shortlisted.length} loaded, {totalCount} total)
              </span>
            </h2>
          </div>

          <div className="divide-y divide-gray-200">
            {shortlisted.length === 0 ? (
              <div className="px-6 py-12 text-center">
                <p className="text-gray-500">
                  No candidates found matching the criteria.
                </p>
              </div>
            ) : (
              shortlisted.map((attempt, index) => (
                <div
                  key={attempt.id}
                  className="px-6 py-4 hover:bg-gray-50 cursor-pointer transition-colors"
                  onClick={() => handleAttemptClick(attempt)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="flex-shrink-0 w-8 h-8 bg-black text-white rounded-full flex items-center justify-center text-sm font-semibold">
                        {index + 1}
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900">
                          {attempt.profiles.full_name}
                        </p>
                        <p className="text-sm text-gray-600">
                          {attempt.profiles.email}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-green-600">
                        {attempt.total_score}
                      </div>
                      <div className="text-xs text-gray-500">
                        {formatDateTime(attempt.submitted_at)}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Load More Button */}
          {attempts.length < totalCount && (
            <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
              <button
                onClick={() => loadResults(true)}
                disabled={loadingMore}
                className="w-full py-3 px-4 bg-black hover:bg-gray-800 disabled:bg-gray-400 text-white rounded-lg font-medium transition-colors disabled:cursor-not-allowed"
              >
                {loadingMore ? (
                  <div className="flex items-center justify-center">
                    <svg
                      className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                    Loading more results...
                  </div>
                ) : (
                  `Load More Results (${attempts.length} of ${totalCount})`
                )}
              </button>
            </div>
          )}
        </div>

        {/* Candidate Details Modal */}
        {selectedAttempt && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden shadow-2xl flex flex-col">
              {/* Modal Header */}
              <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between flex-shrink-0">
                <div>
                  <h3 className="text-xl font-bold text-gray-900">
                    {selectedAttempt.profiles.full_name}
                  </h3>
                  <p className="text-sm text-gray-600">
                    Score: {selectedAttempt.total_score} • Submitted:{" "}
                    {formatDateTime(selectedAttempt.submitted_at)}
                  </p>
                </div>
                <button
                  onClick={() => setSelectedAttempt(null)}
                  className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <svg
                    className="w-5 h-5 text-gray-400 hover:text-gray-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>

              {/* Modal Content */}
              <div className="flex-1 overflow-y-auto">
                <div className="px-6 py-4">
                  {loadingDetails ? (
                    <div className="flex items-center justify-center py-12">
                      <div className="text-center">
                        <svg
                          className="animate-spin h-8 w-8 text-gray-400 mx-auto mb-4"
                          xmlns="http://www.w3.org/2000/svg"
                          fill="none"
                          viewBox="0 0 24 24"
                        >
                          <circle
                            className="opacity-25"
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            strokeWidth="4"
                          ></circle>
                          <path
                            className="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                          ></path>
                        </svg>
                        <p className="text-gray-500">
                          Loading attempt details...
                        </p>
                      </div>
                    </div>
                  ) : (
                    <>
                      <h4 className="text-lg font-semibold text-gray-900 mb-3">
                        Question Details
                      </h4>
                      <div className="space-y-3">
                        {selectedAttempt.answers.map((answer, index) => (
                          <div
                            key={index}
                            className="border border-gray-200 rounded-md p-3"
                          >
                            <div className="flex items-start justify-between mb-2">
                              <p className="font-medium text-gray-900 flex-1 text-sm leading-snug">
                                Q{index + 1}: {answer.question}
                              </p>
                              <span
                                className={`px-2 py-0.5 rounded-full text-xs font-medium ml-3 flex-shrink-0 ${
                                  answer.marks_obtained > 0
                                    ? "bg-green-100 text-green-800"
                                    : "bg-red-100 text-red-800"
                                }`}
                              >
                                {answer.marks_obtained > 0 ? "✓" : "✗"}
                              </span>
                            </div>

                            <div className="flex items-center justify-between text-xs">
                              <div className="flex items-center space-x-4">
                                <div>
                                  <span className="text-gray-500">
                                    Selected:
                                  </span>
                                  <span
                                    className={`ml-1 font-medium ${
                                      answer.selected_option !== null
                                        ? "text-blue-600"
                                        : "text-red-600"
                                    }`}
                                  >
                                    {answer.selected_option !== null
                                      ? `Option ${String.fromCharCode(
                                          65 + answer.selected_option
                                        )}`
                                      : "Not answered"}
                                  </span>
                                </div>
                                <div>
                                  <span className="text-gray-500">
                                    Correct:
                                  </span>
                                  <span className="ml-1 font-medium text-green-600">
                                    Option{" "}
                                    {String.fromCharCode(
                                      65 + answer.correct_answer
                                    )}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
