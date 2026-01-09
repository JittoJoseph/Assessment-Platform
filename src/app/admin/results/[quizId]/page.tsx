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
  const [cutoff, setCutoff] = useState(0);
  const [loading, setLoading] = useState(true);
  const [selectedAttempt, setSelectedAttempt] = useState<Attempt | null>(null);
  const [user, setUser] = useState<any>(null);
  const [authError, setAuthError] = useState<string>("");

  useEffect(() => {
    const userData = localStorage.getItem("user");
    if (!userData) {
      setAuthError("Please sign in first");
      setLoading(false);
      return;
    }

    const parsedUser = JSON.parse(userData);
    if (parsedUser.role !== "admin") {
      setAuthError("Admin access required");
      setLoading(false);
      return;
    }

    setUser(parsedUser);
    loadResults();
  }, []);

  const loadResults = async () => {
    try {
      const response = await fetch(`/api/results/${quizId}`);
      if (!response.ok) throw new Error("Failed to fetch results");

      const data = await response.json();
      setAttempts(data as Attempt[]);
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("user");
    router.push("/");
  };

  const shortlisted = attempts.filter((a) => a.total_score >= cutoff);

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
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-6xl mx-auto px-6 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900">Quiz Results</h1>
          <button
            onClick={handleLogout}
            className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
          >
            Logout
          </button>
        </div>
      </div>

      <div className="max-w-6xl mx-auto p-6">
        <div className="bg-white p-6 rounded-lg shadow-md">
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Cutoff Score
            </label>
            <input
              type="number"
              value={cutoff}
              onChange={(e) => setCutoff(parseInt(e.target.value))}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div className="mb-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              Shortlisted Candidates ({shortlisted.length})
            </h2>
            <div className="space-y-3">
              {shortlisted.map((attempt) => (
                <div
                  key={attempt.id}
                  className="border border-gray-200 p-4 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors"
                  onClick={() => setSelectedAttempt(attempt)}
                >
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="font-medium text-gray-900">
                        {attempt.profiles.full_name}
                      </p>
                      <p className="text-sm text-gray-600">
                        {attempt.profiles.email}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-semibold text-green-600">
                        Score: {attempt.total_score}
                      </p>
                      <p className="text-sm text-gray-500">
                        Submitted:{" "}
                        {new Date(attempt.submitted_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {selectedAttempt && (
            <div className="border-t border-gray-200 pt-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Details for {selectedAttempt.profiles.full_name}
              </h3>
              <div className="space-y-4">
                {selectedAttempt.answers.map((answer, index) => (
                  <div
                    key={index}
                    className="border border-gray-200 p-4 rounded-lg"
                  >
                    <p className="font-medium text-gray-900 mb-2">
                      {answer.questions.question_en}
                    </p>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="font-medium">Selected:</span>{" "}
                        <span
                          className={
                            answer.selected_option !== null
                              ? "text-blue-600"
                              : "text-red-600"
                          }
                        >
                          {answer.selected_option !== null
                            ? answer.selected_option
                            : "Skipped"}
                        </span>
                      </div>
                      <div>
                        <span className="font-medium">Correct:</span>{" "}
                        <span className="text-green-600">
                          {answer.questions.correct_answer}
                        </span>
                      </div>
                      <div>
                        <span className="font-medium">Time:</span>{" "}
                        <span>{answer.time_taken_seconds}s</span>
                      </div>
                      <div>
                        <span className="font-medium">Marks:</span>{" "}
                        <span
                          className={
                            answer.marks_obtained > 0
                              ? "text-green-600"
                              : "text-red-600"
                          }
                        >
                          {answer.marks_obtained}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
