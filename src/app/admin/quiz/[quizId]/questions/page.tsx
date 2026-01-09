"use client";

export const dynamic = "force-dynamic";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";

type Question = {
  id: string;
  question: string;
  options: string[];
  correct_answer: number;
  time_limit_seconds: number;
  marks: number;
};

export default function ManageQuestions() {
  const { quizId } = useParams();
  const router = useRouter();
  const [quiz, setQuiz] = useState<any>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState("");
  const [user, setUser] = useState<any>(null);

  // Form state for new question
  const [showAddForm, setShowAddForm] = useState(false);
  const [newQuestion, setNewQuestion] = useState("");
  const [newOptions, setNewOptions] = useState(["", "", "", ""]);
  const [correctAnswer, setCorrectAnswer] = useState(0);
  const [timeLimit, setTimeLimit] = useState(60);
  const [marks, setMarks] = useState(1);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    checkAuthAndLoadData();
  }, [quizId]);

  const checkAuthAndLoadData = async () => {
    try {
      // Check authentication
      const authResponse = await fetch("/api/auth/check");
      if (!authResponse.ok) {
        setAuthError("Please sign in first");
        setLoading(false);
        return;
      }
      const authData = await authResponse.json();
      if (authData.user?.role !== "admin") {
        setAuthError("Admin access required");
        setLoading(false);
        return;
      }
      setUser(authData.user);

      // Load quiz and questions
      await loadQuizData();
    } catch (error) {
      setAuthError("Authentication check failed");
      setLoading(false);
    }
  };

  const loadQuizData = async () => {
    try {
      // Load quiz details
      const quizResponse = await fetch(`/api/quizzes/${quizId}`);
      if (!quizResponse.ok) throw new Error("Failed to load quiz");
      const quizData = await quizResponse.json();
      setQuiz(quizData.quiz);

      // Load questions
      const questionsResponse = await fetch(`/api/questions/${quizId}`);
      if (questionsResponse.ok) {
        const questionsData = await questionsResponse.json();
        setQuestions(questionsData.questions || []);
      }
    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setLoading(false);
    }
  };

  const addQuestion = async () => {
    if (!newQuestion.trim() || newOptions.some((opt) => !opt.trim())) {
      alert("Please fill in all fields");
      return;
    }

    setSaving(true);
    try {
      const response = await fetch("/api/add-question", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          quizId,
          question: newQuestion,
          options: newOptions,
          correct_answer: correctAnswer,
          time_limit_seconds: timeLimit,
          marks,
        }),
      });

      if (!response.ok) throw new Error("Failed to add question");

      // Reset form
      setNewQuestion("");
      setNewOptions(["", "", "", ""]);
      setCorrectAnswer(0);
      setTimeLimit(60);
      setMarks(1);
      setShowAddForm(false);

      // Reload questions
      await loadQuizData();
    } catch (error) {
      alert("Failed to add question");
    } finally {
      setSaving(false);
    }
  };

  const addOption = () => {
    setNewOptions([...newOptions, ""]);
  };

  const updateOption = (index: number, value: string) => {
    const updated = [...newOptions];
    updated[index] = value;
    setNewOptions(updated);
  };

  const removeOption = (index: number) => {
    if (newOptions.length > 2) {
      const updated = newOptions.filter((_, i) => i !== index);
      setNewOptions(updated);
      if (correctAnswer >= updated.length) {
        setCorrectAnswer(updated.length - 1);
      }
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (authError) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            Access Denied
          </h1>
          <p className="text-gray-600 mb-6">{authError}</p>
          <button
            onClick={() => router.push("/")}
            className="bg-black text-white px-6 py-3 rounded-lg font-semibold hover:bg-gray-800 transition-colors"
          >
            Go Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="border-b border-gray-200 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <button
                onClick={() => router.push("/admin")}
                className="mr-4 p-2 rounded-lg hover:bg-gray-100 transition-colors"
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
              </button>
              <div className="w-8 h-8 bg-black rounded-lg flex items-center justify-center mr-3">
                <span className="text-white font-bold text-sm">A</span>
              </div>
              <div>
                <h1 className="text-xl font-semibold text-gray-900">
                  Manage Questions
                </h1>
                {quiz && <p className="text-sm text-gray-600">{quiz.title}</p>}
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <span className="text-sm text-gray-600">
                {questions.length} questions
              </span>
              <button
                onClick={() => setShowAddForm(true)}
                className="bg-black text-white px-4 py-2 rounded-lg font-medium hover:bg-gray-800 transition-colors text-sm"
              >
                Add Question
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Questions List */}
        <div className="space-y-6">
          {questions.length === 0 ? (
            <div className="text-center py-16">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg
                  className="w-8 h-8 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No questions yet
              </h3>
              <p className="text-gray-600 mb-6">
                Add your first question to get started
              </p>
              <button
                onClick={() => setShowAddForm(true)}
                className="bg-black text-white px-6 py-3 rounded-lg font-semibold hover:bg-gray-800 transition-colors"
              >
                Add First Question
              </button>
            </div>
          ) : (
            questions.map((question, index) => (
              <div
                key={question.id}
                className="bg-white border border-gray-200 rounded-xl p-6 hover:shadow-md transition-all duration-200"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center mb-3">
                      <span className="bg-black text-white text-sm font-medium px-3 py-1 rounded-full">
                        Question {index + 1}
                      </span>
                      <span className="ml-3 text-sm text-gray-600">
                        {question.marks} mark{question.marks !== 1 ? "s" : ""} •{" "}
                        {question.time_limit_seconds}s
                      </span>
                    </div>
                    <h4 className="text-lg font-medium text-gray-900 mb-4">
                      {question.question}
                    </h4>
                    <div className="space-y-2">
                      {question.options.map((option, optIndex) => (
                        <div
                          key={optIndex}
                          className={`p-3 rounded-lg border ${
                            optIndex === question.correct_answer
                              ? "border-green-200 bg-green-50"
                              : "border-gray-200 bg-gray-50"
                          }`}
                        >
                          <div className="flex items-center">
                            <span
                              className={`w-6 h-6 rounded-full flex items-center justify-center text-sm font-medium mr-3 ${
                                optIndex === question.correct_answer
                                  ? "bg-green-500 text-white"
                                  : "bg-gray-300 text-gray-700"
                              }`}
                            >
                              {String.fromCharCode(65 + optIndex)}
                            </span>
                            <span
                              className={
                                optIndex === question.correct_answer
                                  ? "font-medium text-green-800"
                                  : "text-gray-700"
                              }
                            >
                              {option}
                            </span>
                            {optIndex === question.correct_answer && (
                              <span className="ml-auto text-green-600 text-sm font-medium">
                                Correct Answer
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </main>

      {/* Add Question Modal */}
      {showAddForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-gray-900">
                  Add New Question
                </h2>
                <button
                  onClick={() => setShowAddForm(false)}
                  className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
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
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {/* Question */}
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">
                  Question
                </label>
                <textarea
                  value={newQuestion}
                  onChange={(e) => setNewQuestion(e.target.value)}
                  rows={3}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent text-black placeholder-gray-900"
                  placeholder="Enter your question"
                />
              </div>

              {/* Options */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-gray-900">
                    Options
                  </label>
                  <button
                    onClick={addOption}
                    className="text-sm text-black hover:text-gray-600 font-medium"
                  >
                    + Add Option
                  </button>
                </div>
                <div className="space-y-3">
                  {newOptions.map((option, index) => (
                    <div key={index} className="flex items-center space-x-3">
                      <input
                        type="radio"
                        name="correctAnswer"
                        checked={correctAnswer === index}
                        onChange={() => setCorrectAnswer(index)}
                        className="w-4 h-4 text-black focus:ring-black"
                      />
                      <input
                        type="text"
                        value={option}
                        onChange={(e) => updateOption(index, e.target.value)}
                        placeholder={`Option ${String.fromCharCode(
                          65 + index
                        )}`}
                        className="flex-1 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent text-black placeholder-gray-900"
                      />
                      {newOptions.length > 2 && (
                        <button
                          onClick={() => removeOption(index)}
                          className="p-2 text-red-500 hover:text-red-700"
                        >
                          <svg
                            className="w-4 h-4"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                            />
                          </svg>
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Settings */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-2">
                    Time Limit (seconds)
                  </label>
                  <input
                    type="number"
                    value={timeLimit}
                    onChange={(e) =>
                      setTimeLimit(parseInt(e.target.value) || 60)
                    }
                    min="10"
                    max="300"
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent text-black"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-2">
                    Marks
                  </label>
                  <input
                    type="number"
                    value={marks}
                    onChange={(e) => setMarks(parseInt(e.target.value) || 1)}
                    min="1"
                    max="10"
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent text-black"
                  />
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-gray-200 flex justify-end space-x-3">
              <button
                onClick={() => setShowAddForm(false)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 font-medium"
              >
                Cancel
              </button>
              <button
                onClick={addQuestion}
                disabled={saving}
                className="bg-black text-white px-6 py-2 rounded-lg font-semibold hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? "Saving..." : "Add Question"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
