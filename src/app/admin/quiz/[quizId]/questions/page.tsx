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
  const [isEditing, setIsEditing] = useState(false);
  const [editingQuestionId, setEditingQuestionId] = useState<string | null>(
    null
  );
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [questionToDelete, setQuestionToDelete] = useState<string | null>(null);
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
      resetForm();
      setShowAddForm(false);

      // Reload questions
      await loadQuizData();
    } catch (error) {
      alert("Failed to add question");
    } finally {
      setSaving(false);
    }
  };

  const updateQuestion = async () => {
    if (
      !newQuestion.trim() ||
      newOptions.some((opt) => !opt.trim()) ||
      !editingQuestionId
    ) {
      alert("Please fill in all fields");
      return;
    }

    setSaving(true);
    try {
      const response = await fetch(`/api/question/${editingQuestionId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          question: newQuestion,
          options: newOptions,
          correct_answer: correctAnswer,
          time_limit_seconds: timeLimit,
        }),
      });

      if (!response.ok) throw new Error("Failed to update question");

      // Reset form and close modal
      resetForm();
      setShowAddForm(false);

      // Reload questions
      await loadQuizData();
    } catch (error) {
      alert("Failed to update question");
    } finally {
      setSaving(false);
    }
  };

  const handleEditQuestion = async (question: Question) => {
    // Question already has full data including options and correct answer
    setNewQuestion(question.question);
    setNewOptions(question.options);
    setCorrectAnswer(question.correct_answer);
    setTimeLimit(question.time_limit_seconds);
    setIsEditing(true);
    setEditingQuestionId(question.id);
    setShowAddForm(true);
  };

  const handleDeleteQuestion = (questionId: string) => {
    setQuestionToDelete(questionId);
    setShowDeleteConfirm(true);
  };

  const confirmDeleteQuestion = async () => {
    if (!questionToDelete) return;

    setSaving(true);
    try {
      const response = await fetch(`/api/question/${questionToDelete}`, {
        method: "DELETE",
      });

      if (!response.ok) throw new Error("Failed to delete question");

      // Reset state
      setShowDeleteConfirm(false);
      setQuestionToDelete(null);

      // Reload questions
      await loadQuizData();
    } catch (error) {
      alert("Failed to delete question");
    } finally {
      setSaving(false);
    }
  };

  const resetForm = () => {
    setNewQuestion("");
    setNewOptions(["", ""]);
    setCorrectAnswer(0);
    setTimeLimit(60);
    setIsEditing(false);
    setEditingQuestionId(null);
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
              <h1 className="text-xl font-semibold text-gray-900">Questions</h1>
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

      {/* Add Question Section */}
      <div className="bg-gradient-to-r from-black to-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-center sm:text-left">
              <h2 className="text-xl font-bold text-white mb-1">
                {questions.length === 0
                  ? "Create Your First Question"
                  : "Add New Question"}
              </h2>
              <p className="text-gray-300 text-sm">
                {questions.length === 0
                  ? "Start building your assessment by adding questions"
                  : `You have ${questions.length} question${
                      questions.length !== 1 ? "s" : ""
                    } in this quiz`}
              </p>
            </div>
            <button
              onClick={() => setShowAddForm(true)}
              className="cursor-pointer bg-white hover:bg-gray-50 text-black px-6 py-3 rounded-lg font-semibold transition-all duration-200 flex items-center shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
            >
              <svg
                className="w-5 h-5 mr-2"
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

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Questions Grid */}
        <div className="space-y-6">
          {questions.length === 0 ? (
            <div className="text-center py-20">
              <div className="w-20 h-20 bg-gradient-to-br from-gray-100 to-gray-200 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-sm">
                <svg
                  className="w-10 h-10 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">
                No questions added yet
              </h3>
              <p className="text-gray-600 mb-8 max-w-md mx-auto">
                Start building your assessment by adding the first question.
                Each question is worth 1 point.
              </p>
              <button
                onClick={() => setShowAddForm(true)}
                className="bg-black text-white px-8 py-3 rounded-xl font-semibold hover:bg-gray-800 transition-all duration-200 shadow-sm hover:shadow-md flex items-center mx-auto"
              >
                <svg
                  className="w-5 h-5 mr-2"
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
                Add Your First Question
              </button>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {questions.map((question, index) => (
                <div
                  key={question.id}
                  className="bg-white border border-gray-200 rounded-xl p-6 hover:shadow-lg hover:border-gray-300 transition-all duration-200"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center space-x-2">
                      <div className="w-8 h-8 bg-black text-white rounded-lg flex items-center justify-center text-sm font-semibold">
                        {index + 1}
                      </div>
                      <div className="flex items-center space-x-1 text-xs text-gray-500">
                        <svg
                          className="w-3 h-3"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                          />
                        </svg>
                        <span>{question.time_limit_seconds}s</span>
                      </div>
                    </div>
                    <div className="text-xs text-gray-400 font-medium">
                      1 point
                    </div>
                  </div>

                  <div className="mb-4">
                    <p className="text-gray-900 font-medium leading-relaxed line-clamp-3">
                      {question.question}
                    </p>
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                    <button
                      onClick={() => handleEditQuestion(question)}
                      className="text-sm text-gray-600 hover:text-gray-900 font-medium transition-colors cursor-pointer"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDeleteQuestion(question.id)}
                      className="text-sm text-red-600 hover:text-red-700 font-medium transition-colors cursor-pointer"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Add Question Modal */}
      {showAddForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden shadow-2xl flex flex-col">
            {/* Header */}
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between flex-shrink-0">
              <h2 className="text-xl font-bold text-gray-900">
                {isEditing ? "Edit Question" : "Add Question"}
              </h2>
              <button
                onClick={() => {
                  setShowAddForm(false);
                  resetForm();
                }}
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

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto">
              <div className="px-6 py-6 space-y-6">
                {/* Question Input */}
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">
                    Question
                  </label>
                  <textarea
                    value={newQuestion}
                    onChange={(e) => setNewQuestion(e.target.value)}
                    rows={3}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent text-black placeholder-gray-500 resize-none"
                    placeholder="Enter your question here..."
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

                  <div className="space-y-2">
                    {newOptions.map((option, index) => (
                      <div key={index} className="group">
                        <div className="flex items-center space-x-4">
                          {/* Radio Button */}
                          <div className="flex items-center">
                            <input
                              type="radio"
                              name="correctAnswer"
                              checked={correctAnswer === index}
                              onChange={() => setCorrectAnswer(index)}
                              className="w-4 h-4 text-black focus:ring-black border-gray-300"
                            />
                            <span className="ml-3 text-sm font-medium text-gray-700 min-w-[20px]">
                              {String.fromCharCode(65 + index)}
                            </span>
                          </div>

                          {/* Option Input */}
                          <div className="flex-1">
                            <input
                              type="text"
                              value={option}
                              onChange={(e) =>
                                updateOption(index, e.target.value)
                              }
                              placeholder={`Option ${String.fromCharCode(
                                65 + index
                              )}`}
                              className={`w-full p-3 border rounded-lg focus:ring-2 focus:ring-black focus:border-transparent text-black placeholder-gray-500 text-base transition-all duration-200 ${
                                correctAnswer === index
                                  ? "border-green-300 bg-green-50"
                                  : "border-gray-300"
                              }`}
                            />
                          </div>

                          {/* Correct Answer Indicator */}
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
                              <span className="text-sm font-medium hidden sm:inline">
                                Correct
                              </span>
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
                      </div>
                    ))}
                  </div>

                  <p className="text-sm text-gray-600 mt-4 flex items-center">
                    <svg
                      className="w-4 h-4 mr-2 text-blue-500"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                    Select the radio button next to the correct answer. You can
                    add up to 6 options.
                  </p>
                </div>

                {/* Time Limit Section */}
                <div className="mb-6">
                  <label className="block text-sm font-semibold text-gray-900 mb-3 flex items-center">
                    <svg
                      className="w-4 h-4 mr-2 text-gray-500"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                    Time Limit
                  </label>
                  <div className="bg-gray-50 rounded-xl p-4">
                    <div className="flex items-center space-x-4">
                      <div className="flex-1">
                        <input
                          type="range"
                          min="10"
                          max="300"
                          step="10"
                          value={timeLimit}
                          onChange={(e) =>
                            setTimeLimit(parseInt(e.target.value))
                          }
                          className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
                        />
                      </div>
                      <div className="flex items-center space-x-2 min-w-[100px]">
                        <input
                          type="number"
                          value={timeLimit}
                          onChange={(e) =>
                            setTimeLimit(parseInt(e.target.value) || 60)
                          }
                          min="10"
                          max="300"
                          className="w-16 p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent text-black text-center text-sm"
                        />
                        <span className="text-sm text-gray-600">sec</span>
                      </div>
                    </div>
                    <p className="text-xs text-gray-500 mt-2">
                      Students will have {timeLimit} seconds to answer this
                      question
                    </p>
                  </div>
                </div>
              </div>{" "}
            </div>
            {/* Footer */}
            <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 rounded-b-2xl">
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => {
                    setShowAddForm(false);
                    resetForm();
                  }}
                  className="px-4 py-2 text-gray-700 hover:text-gray-900 font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={isEditing ? updateQuestion : addQuestion}
                  disabled={
                    saving ||
                    !newQuestion.trim() ||
                    newOptions.some((opt) => !opt.trim())
                  }
                  className="bg-black text-white px-6 py-2 rounded-lg font-semibold hover:bg-gray-800 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center shadow-sm"
                >
                  {saving ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      {isEditing ? "Updating..." : "Adding..."}
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
                      {isEditing ? "Update Question" : "Add Question"}
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">
                Delete Question
              </h3>
            </div>
            <div className="px-6 py-6">
              <div className="flex items-center mb-4">
                <div className="flex-shrink-0 w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                  <svg
                    className="w-6 h-6 text-red-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z"
                    />
                  </svg>
                </div>
                <div className="ml-4">
                  <p className="text-sm text-gray-600">
                    Are you sure you want to delete this question? This action
                    cannot be undone.
                  </p>
                </div>
              </div>
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => {
                    setShowDeleteConfirm(false);
                    setQuestionToDelete(null);
                  }}
                  className="px-4 py-2 text-gray-700 hover:text-gray-900 font-medium transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDeleteQuestion}
                  disabled={saving}
                  className="bg-red-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-red-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                >
                  {saving ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Deleting...
                    </>
                  ) : (
                    "Delete Question"
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
