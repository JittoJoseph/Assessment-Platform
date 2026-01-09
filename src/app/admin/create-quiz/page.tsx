"use client";

export const dynamic = "force-dynamic";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

type QuestionForm = {
  question: string;
  options: string[];
  correct_answer: number;
  time_limit_seconds: number;
  marks: number;
};

export default function CreateQuiz() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [questions, setQuestions] = useState<QuestionForm[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [authError, setAuthError] = useState("");
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    // Check authentication on client side as backup
    const checkClientAuth = async () => {
      try {
        const response = await fetch("/api/auth/check");
        if (!response.ok) {
          setAuthError("Please sign in first");
          return;
        }
        const data = await response.json();
        if (data.user?.role !== "admin") {
          setAuthError("Admin access required");
          return;
        }
        setUser(data.user);
      } catch {
        setAuthError("Authentication check failed");
      }
    };

    checkClientAuth();
  }, []);

  const addQuestion = () => {
    setQuestions([
      ...questions,
      {
        question: "",
        options: ["", "", "", ""],
        correct_answer: 0,
        time_limit_seconds: 60,
        marks: 1,
      },
    ]);
  };

  const updateQuestion = (index: number, field: string, value: any) => {
    const newQuestions = [...questions];
    if (field.startsWith("options")) {
      const optIndex = parseInt(field.split(".")[1]);
      newQuestions[index].options[optIndex] = value;
    } else {
      (newQuestions[index] as any)[field] = value;
    }
    setQuestions(newQuestions);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/create-quiz", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title,
          startTime,
          endTime,
          questions,
          userId: user.id,
        }),
      });

      if (!response.ok) throw new Error("Failed to create quiz");

      const data = await response.json();
      alert("Quiz created! Share Link: " + data.shareableLink);
      router.push("/admin");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("user");
    router.push("/");
  };

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

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-6 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900">Create New Quiz</h1>
          <button
            onClick={handleLogout}
            className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
          >
            Logout
          </button>
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-6">
        <div className="bg-white p-6 rounded-lg shadow-md">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Quiz Title
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter quiz title"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Start Time
                </label>
                <input
                  type="datetime-local"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  required
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  End Time
                </label>
                <input
                  type="datetime-local"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  required
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold text-gray-900">
                  Questions
                </h2>
                <button
                  type="button"
                  onClick={addQuestion}
                  className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                >
                  Add Question
                </button>
              </div>

              {questions.length === 0 ? (
                <p className="text-gray-600 text-center py-8">
                  No questions added yet. Click "Add Question" to get started.
                </p>
              ) : (
                <div className="space-y-6">
                  {questions.map((q, index) => (
                    <div
                      key={index}
                      className="border border-gray-200 p-6 rounded-lg bg-gray-50"
                    >
                      <h3 className="text-lg font-medium text-gray-900 mb-4">
                        Question {index + 1}
                      </h3>

                      <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Question
                        </label>
                        <textarea
                          value={q.question}
                          onChange={(e) =>
                            updateQuestion(index, "question", e.target.value)
                          }
                          required
                          rows={3}
                          className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="Enter your question"
                        />
                      </div>

                      <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Options
                        </label>
                        {q.options.map((opt, optIndex) => (
                          <input
                            key={optIndex}
                            type="text"
                            value={opt}
                            onChange={(e) =>
                              updateQuestion(
                                index,
                                `options.${optIndex}`,
                                e.target.value
                              )
                            }
                            placeholder={`Option ${optIndex + 1}`}
                            required
                            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent mb-2"
                          />
                        ))}
                      </div>

                      <div className="grid grid-cols-4 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Correct Answer (0-3)
                          </label>
                          <input
                            type="number"
                            min="0"
                            max="3"
                            value={q.correct_answer}
                            onChange={(e) =>
                              updateQuestion(
                                index,
                                "correct_answer",
                                parseInt(e.target.value)
                              )
                            }
                            required
                            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Time Limit (seconds)
                          </label>
                          <input
                            type="number"
                            value={q.time_limit_seconds}
                            onChange={(e) =>
                              updateQuestion(
                                index,
                                "time_limit_seconds",
                                parseInt(e.target.value)
                              )
                            }
                            required
                            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Marks
                          </label>
                          <input
                            type="number"
                            value={q.marks}
                            onChange={(e) =>
                              updateQuestion(
                                index,
                                "marks",
                                parseInt(e.target.value)
                              )
                            }
                            required
                            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex justify-end space-x-4">
              <button
                type="button"
                onClick={() => router.push("/admin")}
                className="bg-gray-600 hover:bg-gray-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? "Creating Quiz..." : "Create Quiz"}
              </button>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                {error}
              </div>
            )}
          </form>
        </div>
      </div>
    </div>
  );
}
