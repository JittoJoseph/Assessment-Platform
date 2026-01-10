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
  const [newOptions, setNewOptions] = useState(["", ""]);
  const [correctAnswer, setCorrectAnswer] = useState(0);
  const [timeLimit, setTimeLimit] = useState(60);
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
        }),
      });

      if (!response.ok) throw new Error("Failed to add question");

      // Reset form
      setNewQuestion("");
      setNewOptions(["", ""]);
      setCorrectAnswer(0);
      setTimeLimit(60);
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
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
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
              <div>
                <h1 className="text-xl font-semibold text-gray-900">
                  Questions
                </h1>
                {quiz && <p className="text-sm text-gray-600">{quiz.title}</p>}
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <span className="text-sm text-gray-600 bg-gray-100 px-3 py-1 rounded-full">
                {questions.length} questions
              </span>
              <button
                onClick={() => setShowAddForm(true)}
                className="bg-black text-white px-4 py-2 rounded-lg font-medium hover:bg-gray-800 transition-colors text-sm flex items-center"
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
                    d="M12 4v16m8-8H4"
                  />
                </svg>
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
          <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
            {/* Header */}
            <div className="px-8 py-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">
                    Add New Question
                  </h2>
                  <p className="text-gray-600 mt-1">
                    Create a question with multiple choice options
                  </p>
                </div>
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

            {/* Content */}
            <div className="px-8 py-8">
              {/* Question Section */}
              <div className="mb-8">
                <label className="block text-sm font-semibold text-gray-900 mb-3">
                  Question
                </label>
                <textarea
                  value={newQuestion}
                  onChange={(e) => setNewQuestion(e.target.value)}
                  rows={4}
                  className="w-full p-4 border border-gray-300 rounded-xl focus:ring-2 focus:ring-black focus:border-transparent text-black placeholder-gray-500 resize-none text-base"
                  placeholder="Enter your question here... (Supports English and Malayalam)"
                />
              </div>

              {/* Options Section */}
              <div className="mb-8">
                <div className="flex items-center justify-between mb-4">
                  <label className="block text-sm font-semibold text-gray-900">
                    Answer Options
                  </label>
                  <button
                    onClick={addOption}
                    disabled={newOptions.length >= 6}
                    className="text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-1.5 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                  >
                    <svg
                      className="w-4 h-4 mr-1"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 4v16m8-8H4"
                      />
                    </svg>
                    Add Option
                  </button>
                </div>

                <div className="space-y-3">
                  {newOptions.map((option, index) => (
                    <div key={index} className="flex items-center space-x-4">
                      {/* Radio Button */}
                      <div className="flex items-center">
                        <input
                          type="radio"
                          name="correctAnswer"
                          checked={correctAnswer === index}
                          onChange={() => setCorrectAnswer(index)}
                          className="w-5 h-5 text-black focus:ring-black border-gray-300"
                        />
                        <span className="ml-3 text-sm font-medium text-gray-700 min-w-[24px]">
                          {String.fromCharCode(65 + index)}
                        </span>
                      </div>

                      {/* Option Input */}
                      <div className="flex-1">
                        <input
                          type="text"
                          value={option}
                          onChange={(e) => updateOption(index, e.target.value)}
                          placeholder={`Option ${String.fromCharCode(
                            65 + index
                          )}`}
                          className={`w-full p-3 border rounded-lg focus:ring-2 focus:ring-black focus:border-transparent text-black placeholder-gray-500 text-base ${
                            correctAnswer === index
                              ? "border-green-300 bg-green-50"
                              : "border-gray-300"
                          }`}
                        />
                      </div>

                      {/* Correct Answer Badge */}
                      {correctAnswer === index && (
                        <div className="flex items-center text-green-600">
                          <svg
                            className="w-5 h-5 mr-1"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M5 13l4 4L19 7"
                            />
                          </svg>
                          <span className="text-sm font-medium">Correct</span>
                        </div>
                      )}

                      {/* Remove Button */}
                      {newOptions.length > 2 && (
                        <button
                          onClick={() => removeOption(index)}
                          className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
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

                {/* Helper Text */}
                <p className="text-sm text-gray-600 mt-3">
                  Select the radio button next to the correct answer. You can
                  add up to 6 options.
                </p>
              </div>

              {/* Time Limit Section */}
              <div className="mb-8">
                <label className="block text-sm font-semibold text-gray-900 mb-3">
                  Time Limit
                </label>
                <div className="flex items-center space-x-4">
                  <input
                    type="range"
                    min="10"
                    max="300"
                    step="10"
                    value={timeLimit}
                    onChange={(e) => setTimeLimit(parseInt(e.target.value))}
                    className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
                  />
                  <div className="flex items-center space-x-2 min-w-[120px]">
                    <input
                      type="number"
                      value={timeLimit}
                      onChange={(e) =>
                        setTimeLimit(parseInt(e.target.value) || 60)
                      }
                      min="10"
                      max="300"
                      className="w-20 p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent text-black text-center"
                    />
                    <span className="text-sm text-gray-600">seconds</span>
                  </div>
                </div>
                <p className="text-sm text-gray-600 mt-2">
                  Students will have {timeLimit} seconds to answer this
                  question.
                </p>
              </div>
            </div>

            {/* Footer */}
            <div className="px-8 py-6 border-t border-gray-200 bg-gray-50 rounded-b-2xl flex justify-end space-x-3">
              <button
                onClick={() => setShowAddForm(false)}
                className="px-6 py-2.5 text-gray-700 hover:text-gray-900 font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={addQuestion}
                disabled={
                  saving ||
                  !newQuestion.trim() ||
                  newOptions.some((opt) => !opt.trim())
                }
                className="bg-black text-white px-6 py-2.5 rounded-lg font-semibold hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
              >
                {saving ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Adding...
                  </>
                ) : (
                  <>
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
                        d="M12 4v16m8-8H4"
                      />
                    </svg>
                    Add Question
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
