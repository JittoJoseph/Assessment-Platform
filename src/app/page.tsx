"use client";

export const dynamic = "force-dynamic";

import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen bg-white flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-md sm:max-w-lg">
        <div className="text-center mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-3">
            Assessment Platform
          </h1>
          <p className="text-base sm:text-lg text-gray-600 px-4">
            Take assessments with ease.
          </p>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl shadow-lg p-6 sm:p-8">
          <div className="space-y-4">
            <Link
              href="/auth"
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-lg transition-colors block text-center"
            >
              Sign In / Sign Up
            </Link>

            <div className="text-center">
              <p className="text-sm text-gray-600">
                Admin access:{" "}
                <code className="bg-gray-100 px-2 py-1 rounded text-xs">
                  /admin
                </code>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
