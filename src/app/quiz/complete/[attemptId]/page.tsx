"use client";

import Link from "next/link";
import { FaCheckCircle, FaHome } from "react-icons/fa";

export default function QuizCompletePage() {
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
