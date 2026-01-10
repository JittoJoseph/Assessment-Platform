"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { FaCheckCircle, FaHome } from "react-icons/fa";

interface QuizResult {
  total_score: number;
  submitted_at: string;
  quiz_title: string;
}

export default function QuizCompletePage() {
  const params = useParams();
  const router = useRouter();
  const [result, setResult] = useState<QuizResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    loadResult();
  }, [params.attemptId]);

  const loadResult = async () => {
    try {
      // For now, we'll just show a completion message
      // In a real implementation, you might want to fetch the result from an API
      // But according to the PRD, detailed results are only for admins

      // Simulate loading
      await new Promise((resolve) => setTimeout(resolve, 1000));

      setResult({
        total_score: 0, // This would come from the API
        submitted_at: new Date().toISOString(),
        quiz_title: "Assessment",
      });
    } catch (err) {
      setError("Failed to load results");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black mx-auto mb-4"></div>
          <p className="text-gray-600">Loading results...</p>
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
          <Link
            href="/"
            className="bg-black text-white px-6 py-3 rounded-lg font-medium hover:bg-gray-800 transition-colors"
          >
            Back to Home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white flex items-center justify-center px-4">
      <div className="w-full max-w-md text-center">
        <div className="mb-8">
          <FaCheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Assessment Completed
          </h1>
          <p className="text-gray-600">
            Thank you for completing the assessment. Your responses have been
            submitted successfully.
          </p>
        </div>

        <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-2">
            What happens next?
          </h2>
          <p className="text-sm text-gray-600">
            Your results will be reviewed by the assessment administrators. You
            will be notified of the outcome through the appropriate channels.
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
