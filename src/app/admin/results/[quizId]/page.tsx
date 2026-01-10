"use client";

export const dynamic = "force-dynamic";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";

type Attempt = {
  id: string;
  total_score: number;
  submitted_at: string;
  profiles: { full_name: string; email: string };
  answers: any[];
};

export default function ResultsPage() {
  const { quizId } = useParams();
  const router = useRouter();
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [shortlistCount, setShortlistCount] = useState(20);
  const [loading, setLoading] = useState(true);
  const [selectedAttempt, setSelectedAttempt] = useState<Attempt | null>(null);
  const [user, setUser] = useState<any>(null);
  const [authError, setAuthError] = useState<string>("");

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
  }, []);

  const loadResults = async () => {
    try {
      console.log("Loading results for quizId:", quizId);

      // First check if quiz exists
      const quizResponse = await fetch(`/api/quizzes/${quizId}`);
      if (!quizResponse.ok) {
        console.error("Quiz not found:", quizResponse.status);
        throw new Error("Quiz not found");
      }

      const quizData = await quizResponse.json();
      console.log("Quiz data:", quizData);

      const response = await fetch(`/api/results/${quizId}`);
      console.log("Results API response status:", response.status);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error(
          "Results API Error:",
          response.status,
          response.statusText,
          errorData
        );
        throw new Error(
          `Failed to fetch results: ${response.status} ${response.statusText}`
        );
      }

      const data = await response.json();
      console.log("Results API response data:", data);
      setAttempts(data as Attempt[]);
    } catch (err: any) {
      console.error("Error loading results:", err);
      alert(`Error loading results: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("user");
    router.push("/");
  };

  const shortlisted = attempts
    .sort((a, b) => b.total_score - a.total_score)
    .slice(0, shortlistCount);

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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
            <div className="flex items-center">
              <div className="p-3 bg-blue-100 rounded-lg">
                <svg
                  className="w-6 h-6 text-blue-600"
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
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">
                  Total Attempts
                </p>
                <p className="text-2xl font-bold text-gray-900">
                  {attempts.length}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
            <div className="flex items-center">
              <div className="p-3 bg-green-100 rounded-lg">
                <svg
                  className="w-6 h-6 text-green-600"
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
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Shortlisted</p>
                <p className="text-2xl font-bold text-gray-900">
                  {shortlisted.length}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
            <div className="flex items-center">
              <div className="p-3 bg-purple-100 rounded-lg">
                <svg
                  className="w-6 h-6 text-purple-600"
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
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">
                  Highest Score
                </p>
                <p className="text-2xl font-bold text-gray-900">
                  {attempts.length > 0
                    ? Math.max(...attempts.map((a) => a.total_score))
                    : 0}
                </p>
              </div>
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
                max={attempts.length}
                value={shortlistCount}
                onChange={(e) =>
                  setShortlistCount(
                    Math.max(
                      1,
                      Math.min(attempts.length, parseInt(e.target.value) || 20)
                    )
                  )
                }
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent text-gray-900"
                placeholder="Enter number of students"
              />
              <p className="text-xs text-gray-500 mt-1">
                Shows top {shortlistCount} students by score (max:{" "}
                {attempts.length})
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
                ({shortlisted.length} found)
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
                  onClick={() => setSelectedAttempt(attempt)}
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
                        {new Date(attempt.submitted_at).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
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
                    {new Date(selectedAttempt.submitted_at).toLocaleString()}
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
                <div className="px-6 py-6">
                  <h4 className="text-lg font-semibold text-gray-900 mb-4">
                    Question Details
                  </h4>
                  <div className="space-y-4">
                    {selectedAttempt.answers.map((answer, index) => (
                      <div
                        key={index}
                        className="border border-gray-200 rounded-lg p-4"
                      >
                        <div className="flex items-start justify-between mb-3">
                          <p className="font-medium text-gray-900 flex-1">
                            Question {index + 1}: {answer.questions.question}
                          </p>
                          <div className="flex items-center space-x-2 ml-4">
                            <span
                              className={`px-2 py-1 rounded-full text-xs font-medium ${
                                answer.marks_obtained > 0
                                  ? "bg-green-100 text-green-800"
                                  : "bg-red-100 text-red-800"
                              }`}
                            >
                              {answer.marks_obtained > 0
                                ? "Correct"
                                : "Incorrect"}
                            </span>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                          <div className="flex justify-between">
                            <span className="font-medium text-gray-600">
                              Selected Answer:
                            </span>
                            <span
                              className={
                                answer.selected_option !== null
                                  ? "text-blue-600"
                                  : "text-red-600"
                              }
                            >
                              {answer.selected_option !== null
                                ? `Option ${String.fromCharCode(
                                    65 + answer.selected_option
                                  )}`
                                : "Not answered"}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="font-medium text-gray-600">
                              Correct Answer:
                            </span>
                            <span className="text-green-600">
                              Option{" "}
                              {String.fromCharCode(
                                65 + answer.questions.correct_answer
                              )}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="font-medium text-gray-600">
                              Time Taken:
                            </span>
                            <span>{answer.time_taken_seconds}s</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="font-medium text-gray-600">
                              Points:
                            </span>
                            <span
                              className={`font-semibold ${
                                answer.marks_obtained > 0
                                  ? "text-green-600"
                                  : "text-red-600"
                              }`}
                            >
                              {answer.marks_obtained}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
