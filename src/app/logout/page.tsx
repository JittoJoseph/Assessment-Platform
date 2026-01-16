"use client";

import Link from "next/link";

export default function LogoutPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full bg-white rounded-lg shadow-md p-8 text-center">
        <div className="mb-6">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg
              className="w-8 h-8 text-green-600"
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
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Logged Out Successfully
          </h1>
          <p className="text-gray-600">
            You have been logged out of your account.
          </p>
        </div>

        <div className="space-y-3">
          <Link
            href="/"
            className="block w-full bg-black text-white py-2 px-4 rounded-md hover:bg-gray-800 transition-colors font-medium"
          >
            Go to Home
          </Link>
          <Link
            href="/auth"
            className="block w-full bg-gray-100 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-200 transition-colors font-medium"
          >
            Sign In Again
          </Link>
        </div>
      </div>
    </div>
  );
}
