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
  const [autoSubmitted, setAutoSubmitted] = useState(false);
  const [answersReady, setAnswersReady] = useState(false);
  const [isTranslated, setIsTranslated] = useState(false);
  const [translateLoading, setTranslateLoading] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0); // Time elapsed in seconds

  // Clear any existing translation cookies on mount to prevent auto-translation
  useEffect(() => {
    if (typeof window !== "undefined") {
      // Clear translation cookies
      document.cookie =
        "googtrans=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
      document.cookie =
        "googtrans=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=" +
        window.location.hostname;
      document.cookie =
        "googtrans=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=." +
        window.location.hostname;
    }
  }, []);

  // Function to load Google Translate script (only when needed)
  const loadGoogleTranslate = (): Promise<void> => {
    return new Promise((resolve) => {
      if ((window as any).google?.translate?.TranslateElement) {
        resolve();
        return;
      }

      (window as any).googleTranslateElementInit = () => {
        new (window as any).google.translate.TranslateElement(
          {
            pageLanguage: "ml",
            includedLanguages: "en",
            autoDisplay: false,
          },
          "google_translate_element"
        );
        // Small delay to ensure element is ready
        setTimeout(resolve, 500);
      };

      const script = document.createElement("script");
      script.src =
        "//translate.google.com/translate_a/element.js?cb=googleTranslateElementInit";
      script.async = true;
      document.body.appendChild(script);
    });
  };

  // Function to toggle translation
  const toggleTranslation = async () => {
    if (typeof window === "undefined") return;

    setTranslateLoading(true);

    try {
      if (!isTranslated) {
        // Load Google Translate if not already loaded
        await loadGoogleTranslate();

        // Wait a bit for the select to be available
        await new Promise((resolve) => setTimeout(resolve, 300));

        // Use the select dropdown
        const select = document.querySelector(
          ".goog-te-combo"
        ) as HTMLSelectElement;
        if (select) {
          select.value = "en";
          const event = new Event("change", {
            bubbles: true,
            cancelable: true,
          });
          select.dispatchEvent(event);
          setIsTranslated(true);
        }
      } else {
        // Restore original by removing Google Translate iframe and cookies
        // This is the most reliable way to restore original text
        const frame = document.querySelector(
          ".goog-te-banner-frame"
        ) as HTMLIFrameElement;
        if (frame) {
          // Try to click the "Show original" button inside the iframe
          try {
            const innerDoc =
              frame.contentDocument || frame.contentWindow?.document;
            const showOriginalBtn = innerDoc?.querySelector(
              '[id=":1.restore"]'
            ) as HTMLElement;
            if (showOriginalBtn) {
              showOriginalBtn.click();
            }
          } catch (e) {
            // Cross-origin restriction, use alternative method
          }
        }

        // Alternative: Clear cookies and reload translate element
        document.cookie =
          "googtrans=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
        document.cookie =
          "googtrans=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=" +
          window.location.hostname;
        document.cookie =
          "googtrans=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=." +
          window.location.hostname;

        // Remove translated class and font elements that Google adds
        document.body.classList.remove("translated-ltr", "translated-rtl");
        const htmlEl = document.documentElement;
        htmlEl.classList.remove("translated-ltr", "translated-rtl");

        // Remove Google's font elements
        const fontEls = document.querySelectorAll(
          'font[style*="vertical-align: inherit"]'
        );
        fontEls.forEach((font) => {
          const parent = font.parentNode;
          if (parent) {
            parent.replaceChild(
              document.createTextNode(font.textContent || ""),
              font
            );
          }
        });

        // Reload page to fully restore (most reliable method)
        window.location.reload();
        return;
      }
    } finally {
      setTranslateLoading(false);
    }
  };

  // Load saved answers from localStorage - returns the answers directly
  const loadSavedAnswers = useCallback((): Record<string, Answer> => {
    try {
      const saved = localStorage.getItem(`quiz_answers_${params.attemptId}`);
      if (saved) {
        const parsedAnswers = JSON.parse(saved);
        setAnswers(parsedAnswers);
        return parsedAnswers;
      }
    } catch (err) {
      console.error("Failed to load saved answers:", err);
    }
    return {};
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

  // Get or set persistent start time in localStorage (never resets on reload)
  const getStartTime = useCallback((): number => {
    const key = `quiz_start_time_${params.attemptId}`;
    const stored = localStorage.getItem(key);
    if (stored) {
      return parseInt(stored, 10);
    }
    const now = Date.now();
    localStorage.setItem(key, now.toString());
    return now;
  }, [params.attemptId]);

  // Calculate time taken in seconds from start time
  const calculateTimeTaken = useCallback((): number => {
    const startTime = getStartTime();
    return Math.floor((Date.now() - startTime) / 1000);
  }, [getStartTime]);

  // Initialize quiz
  useEffect(() => {
    initializeQuiz();
  }, [params.attemptId]);

  // Update elapsed time every second (for display purposes)
  useEffect(() => {
    if (!loading && quiz && !completed) {
      // Initialize start time on first load
      getStartTime();

      const updateElapsed = () => {
        setElapsedTime(calculateTimeTaken());
      };

      updateElapsed();
      const interval = setInterval(updateElapsed, 1000);
      return () => clearInterval(interval);
    }
  }, [loading, quiz, completed, getStartTime, calculateTimeTaken]);

  // Check quiz end time and update timer
  useEffect(() => {
    // Only start timer after quiz is loaded and answers are ready
    if (quiz && !completed && !autoSubmitted && answersReady) {
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
  }, [quiz, completed, autoSubmitted, answersReady]);

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
      const savedAnswers = loadSavedAnswers();
      setAnswersReady(true);

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

    // Allow unselecting by clicking the same option
    const isCurrentlySelected =
      currentAnswer?.selected_option === selectedOption;
    const finalSelectedOption = isCurrentlySelected ? null : selectedOption;

    const answer: Answer = {
      question_id: currentQuestion.id,
      selected_option: finalSelectedOption,
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
      // Always read from localStorage as it's the most up-to-date source
      // (state updates are async, but localStorage writes are sync)
      let answersToSubmit: Answer[] = [];
      const saved = localStorage.getItem(`quiz_answers_${params.attemptId}`);
      if (saved) {
        const parsedAnswers = JSON.parse(saved);
        answersToSubmit = Object.values(parsedAnswers);
      }
      // Fallback to state if localStorage is empty
      if (answersToSubmit.length === 0) {
        answersToSubmit = Object.values(answers);
      }
      const answersArray = answersToSubmit;

      // Calculate time taken from persistent start time
      const timeTaken = calculateTimeTaken();

      const response = await fetch("/api/quiz/submit-all-answers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          attempt_id: params.attemptId,
          answers: answersArray,
          user_id: user?.id,
          time_taken: timeTaken,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error);
      }

      setCompleted(true);
      // Clear saved answers and start time
      localStorage.removeItem(`quiz_answers_${params.attemptId}`);
      localStorage.removeItem(`quiz_start_time_${params.attemptId}`);
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
    if (autoSubmitted) return; // Prevent multiple auto-submissions
    setAutoSubmitted(true);
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
  const answeredCount = Object.values(answers).filter(
    (answer) => answer.selected_option !== null
  ).length;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header - marked notranslate to prevent continuous re-translation from timer updates */}
      <header className="notranslate bg-white border-b border-gray-200 sticky top-0 z-10 shadow-sm">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-3">
            {/* Mobile Layout */}
            <div className="flex flex-col gap-2 sm:hidden">
              {/* Top Row: Exit, Time Left, Progress */}
              <div className="flex items-center justify-between">
                <Link
                  href="/"
                  className="flex items-center text-gray-600 hover:text-gray-900 transition-colors p-2"
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
                </Link>

                {/* Prominent Time Left and Elapsed */}
                <div className="flex-1 flex justify-center gap-4 px-2">
                  <div className="text-center">
                    <div className="text-base font-mono font-bold text-red-600">
                      {(() => {
                        const totalSeconds = Math.floor(timeRemaining / 1000);
                        const hours = Math.floor(totalSeconds / 3600);
                        const minutes = Math.floor((totalSeconds % 3600) / 60);
                        const seconds = totalSeconds % 60;

                        if (hours > 0) {
                          return `${hours}h ${minutes}m ${seconds}s`;
                        } else if (minutes > 0) {
                          return `${minutes}m ${seconds}s`;
                        } else {
                          return `${seconds}s`;
                        }
                      })()}
                    </div>
                    <div className="text-xs text-gray-500 font-medium">
                      LEFT
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-base font-mono font-bold text-gray-700">
                      {(() => {
                        const hours = Math.floor(elapsedTime / 3600);
                        const minutes = Math.floor((elapsedTime % 3600) / 60);
                        const seconds = elapsedTime % 60;

                        if (hours > 0) {
                          return `${hours}h ${minutes}m ${seconds}s`;
                        } else if (minutes > 0) {
                          return `${minutes}m ${seconds}s`;
                        } else {
                          return `${seconds}s`;
                        }
                      })()}
                    </div>
                    <div className="text-xs text-gray-500 font-medium">
                      ELAPSED
                    </div>
                  </div>
                </div>

                <div className="text-right p-2">
                  <div className="text-sm font-medium text-gray-900">
                    {currentQuestionIndex + 1}/{questions.length}
                  </div>
                </div>
              </div>
            </div>

            {/* Desktop Layout */}
            <div className="hidden sm:flex sm:justify-between sm:items-center">
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
                  <span className="ml-1 text-sm font-medium">Exit</span>
                </Link>
                <div>
                  <h1 className="text-lg font-semibold text-gray-900 truncate max-w-xs">
                    {quiz?.title}
                  </h1>
                  <p className="text-sm text-gray-600">
                    Question {currentQuestionIndex + 1} of {questions.length}
                  </p>
                </div>
              </div>

              {/* Prominent Time Left in Center */}
              <div className="flex-1 flex justify-center gap-8 px-8">
                <div className="text-center">
                  <div className="text-xl font-mono font-bold text-red-600">
                    {(() => {
                      const totalSeconds = Math.floor(timeRemaining / 1000);
                      const hours = Math.floor(totalSeconds / 3600);
                      const minutes = Math.floor((totalSeconds % 3600) / 60);
                      const seconds = totalSeconds % 60;

                      if (hours > 0) {
                        return `${hours}h ${minutes}m ${seconds}s`;
                      } else if (minutes > 0) {
                        return `${minutes}m ${seconds}s`;
                      } else {
                        return `${seconds}s`;
                      }
                    })()}
                  </div>
                  <div className="text-xs text-gray-500 font-medium">
                    TIME LEFT
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-xl font-mono font-bold text-gray-700">
                    {(() => {
                      const hours = Math.floor(elapsedTime / 3600);
                      const minutes = Math.floor((elapsedTime % 3600) / 60);
                      const seconds = elapsedTime % 60;

                      if (hours > 0) {
                        return `${hours}h ${minutes}m ${seconds}s`;
                      } else if (minutes > 0) {
                        return `${minutes}m ${seconds}s`;
                      } else {
                        return `${seconds}s`;
                      }
                    })()}
                  </div>
                  <div className="text-xs text-gray-500 font-medium">
                    ELAPSED
                  </div>
                </div>
              </div>

              <div className="text-right">
                <div className="text-sm font-medium text-gray-900">
                  {answeredCount}/{questions.length} answered
                </div>
                <div className="w-24 bg-gray-200 rounded-full h-2 mt-1">
                  <div
                    className="bg-gray-600 h-2 rounded-full transition-all duration-300"
                    style={{
                      width: `${(answeredCount / questions.length) * 100}%`,
                    }}
                  ></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
          {/* Question Navigation - notranslate to prevent re-translation */}
          <div className="notranslate mb-6">
            {/* Mobile-friendly compact navigation */}
            <div className="flex items-center justify-between gap-4">
              {/* Previous Button */}
              <button
                onClick={() =>
                  goToQuestion(Math.max(0, currentQuestionIndex - 1))
                }
                disabled={currentQuestionIndex === 0}
                className="flex-shrink-0 w-10 h-10 rounded-full border border-gray-200 bg-white hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center transition-colors shadow-sm"
                aria-label="Previous question"
              >
                <svg
                  className="w-5 h-5 text-gray-600"
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

              {/* Center: Question indicator */}
              <div className="flex-1 flex flex-col items-center">
                {/* Current question display */}
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-2xl font-bold text-gray-900">
                    {currentQuestionIndex + 1}
                  </span>
                  <span className="text-gray-400">/</span>
                  <span className="text-lg text-gray-500">
                    {questions.length}
                  </span>
                </div>

                {/* Progress bar */}
                <div className="w-full max-w-xs">
                  <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gray-800 rounded-full transition-all duration-300"
                      style={{
                        width: `${
                          ((currentQuestionIndex + 1) / questions.length) * 100
                        }%`,
                      }}
                    />
                  </div>
                  <div className="flex justify-between mt-1.5 text-xs text-gray-400">
                    <span>{answeredCount} answered</span>
                    <span>{questions.length - answeredCount} remaining</span>
                  </div>
                </div>
              </div>

              {/* Next Button */}
              <button
                onClick={() =>
                  goToQuestion(
                    Math.min(questions.length - 1, currentQuestionIndex + 1)
                  )
                }
                disabled={currentQuestionIndex === questions.length - 1}
                className="flex-shrink-0 w-10 h-10 rounded-full border border-gray-200 bg-white hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center transition-colors shadow-sm"
                aria-label="Next question"
              >
                <svg
                  className="w-5 h-5 text-gray-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </button>
            </div>
          </div>

          {/* Hidden Google Translate Element - use absolute positioning instead of display:none */}
          <div
            id="google_translate_element"
            className="absolute -top-[9999px] -left-[9999px]"
          ></div>

          {/* Clean Translate Toggle Button */}
          <div className="flex justify-end mb-4">
            <button
              onClick={toggleTranslation}
              disabled={translateLoading}
              className={`notranslate flex items-center gap-2 text-sm transition-colors px-3 py-1.5 rounded-lg ${
                isTranslated
                  ? "bg-blue-100 text-blue-700 hover:bg-blue-200"
                  : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
              } ${translateLoading ? "opacity-50 cursor-not-allowed" : ""}`}
            >
              {translateLoading ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></div>
              ) : (
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
                    d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129"
                  />
                </svg>
              )}
              {translateLoading
                ? "Translating..."
                : isTranslated
                ? "Show Original"
                : "Translate to English"}
            </button>
          </div>

          {/* Question */}
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-6 leading-relaxed">
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
                      ? "border-gray-400 bg-gray-100 text-gray-900 shadow-sm"
                      : "border-gray-200 hover:border-gray-300 hover:bg-gray-50 text-gray-700 hover:text-gray-900"
                  } cursor-pointer`}
                >
                  <div className="flex items-start">
                    <div
                      className={`w-5 h-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center mr-3 mt-0.5 ${
                        currentAnswer?.selected_option === index
                          ? "border-gray-600 bg-gray-600"
                          : "border-gray-300"
                      }`}
                    >
                      {currentAnswer?.selected_option === index && (
                        <div className="w-2 h-2 rounded-full bg-white"></div>
                      )}
                    </div>
                    <span className="text-base leading-relaxed">{option}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Navigation - notranslate to prevent re-translation */}
          <div className="notranslate flex justify-between items-center pt-8 border-t border-gray-100">
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
                className="px-8 py-3 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
              >
                {submitting ? "Submitting..." : "Submit Quiz"}
              </button>
            ) : (
              <button
                onClick={handleNextOrSkip}
                className="px-6 py-3 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors font-medium shadow-sm"
              >
                {currentAnswer ? "Next" : "Skip"}
              </button>
            )}
          </div>

          {/* Status Message */}
          <div className="notranslate mt-8 text-center">
            {currentAnswer ? null : (
              <p className="text-gray-500 text-sm">
                Select an answer to continue
              </p>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="notranslate mt-8 text-center">
          <p className="text-sm text-gray-500">
            Your progress is automatically saved
          </p>
        </div>
      </main>

      {/* Submit Confirmation Modal */}
      {showSubmitConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="notranslate bg-white rounded-xl max-w-md w-full p-6">
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
                className="flex-1 px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
