"use client";

export const dynamic = "force-dynamic";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { createClient } from "@/lib/supabase-client";

type Question = {
  id: string;
  question_en: string;
  question_ml: string;
  options_en: string[];
  options_ml: string[];
  time_limit_seconds: number;
  marks: number;
};

export default function QuizPage() {
  const { link } = useParams();
  const [quiz, setQuiz] = useState<any>(null);
  const [attemptId, setAttemptId] = useState<string | null>(null);
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [timeLeft, setTimeLeft] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [completed, setCompleted] = useState(false);
  const [language, setLanguage] = useState<"en" | "ml">("en");
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (!storedUser) {
      window.location.href = "/auth";
      return;
    }
    setUser(JSON.parse(storedUser));
    loadQuiz();
  }, []);

  useEffect(() => {
    loadQuiz();
  }, []);

  useEffect(() => {
    if (currentQuestion) {
      setTimeLeft(currentQuestion.time_limit_seconds);
      const timer = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            submitAnswer(null); // Auto submit if time up
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [currentQuestion]);

  const loadQuiz = async () => {
    try {
      const res = await fetch(`/api/quiz/${link}`);
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setQuiz(data.quiz);

      // Start attempt
      const startRes = await fetch("/api/quiz/start-attempt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quiz_id: data.quiz.id, user_id: user.id }),
      });
      if (!startRes.ok) throw new Error(await startRes.text());
      const startData = await startRes.json();
      setAttemptId(startData.attempt_id);

      // Load first question
      await loadQuestion(0);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadQuestion = async (index: number) => {
    if (!attemptId) return;
    try {
      const res = await fetch("/api/quiz/get-question", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          attempt_id: attemptId,
          question_index: index,
          user_id: user.id,
        }),
      });
      if (!res.ok) {
        const err = await res.text();
        if (err.includes("Quiz ended")) {
          setCompleted(true);
        }
        throw new Error(err);
      }
      const data = await res.json();
      if (data.completed) {
        setCompleted(true);
      } else {
        setCurrentQuestion(data.question);
        setQuestionIndex(index);
        setSelectedOption(null);
      }
    } catch (err: any) {
      setError(err.message);
    }
  };

  const submitAnswer = async (option: number | null) => {
    if (!attemptId || !currentQuestion) return;
    try {
      const timeTaken = currentQuestion.time_limit_seconds - timeLeft;
      await fetch("/api/quiz/submit-answer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          attempt_id: attemptId,
          question_id: currentQuestion.id,
          selected_option: option,
          time_taken_seconds: timeTaken,
          user_id: user.id,
        }),
      });
      // Load next
      await loadQuestion(questionIndex + 1);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleSubmit = () => {
    submitAnswer(selectedOption);
  };

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;
  if (completed) return <div>Quiz completed!</div>;
  if (!currentQuestion) return <div>No question</div>;

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-2xl mx-auto bg-white p-6 rounded-lg shadow-md">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-xl font-bold">{quiz.title}</h1>
          <div className="flex gap-2">
            <button
              onClick={() => setLanguage("en")}
              className={`px-3 py-1 rounded ${
                language === "en" ? "bg-blue-500 text-white" : "bg-gray-200"
              }`}
            >
              English
            </button>
            <button
              onClick={() => setLanguage("ml")}
              className={`px-3 py-1 rounded ${
                language === "ml" ? "bg-blue-500 text-white" : "bg-gray-200"
              }`}
            >
              Malayalam
            </button>
          </div>
        </div>
        <div className="mb-4">
          <div className="text-sm text-gray-600">Time left: {timeLeft}s</div>
          <div className="text-sm text-gray-600">
            Marks: {currentQuestion.marks}
          </div>
        </div>
        <div className="mb-6">
          <p className="text-lg mb-4">
            {language === "en"
              ? currentQuestion.question_en
              : currentQuestion.question_ml}
          </p>
          <div className="space-y-2">
            {(language === "en"
              ? currentQuestion.options_en
              : currentQuestion.options_ml
            ).map((option, index) => (
              <label key={index} className="flex items-center">
                <input
                  type="radio"
                  name="option"
                  value={index}
                  checked={selectedOption === index}
                  onChange={() => setSelectedOption(index)}
                  className="mr-2"
                />
                {option}
              </label>
            ))}
          </div>
        </div>
        <button
          onClick={handleSubmit}
          className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
        >
          Submit
        </button>
      </div>
    </div>
  );
}
