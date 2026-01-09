"use client";

export const dynamic = "force-dynamic";

import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="absolute top-0 left-0 right-0 z-10">
        <div className="max-w-6xl mx-auto px-6 py-6 flex justify-between items-center">
          <div className="text-2xl font-bold text-black">Assessment</div>
          <Link
            href="/auth"
            className="text-gray-600 hover:text-black transition-colors font-medium"
          >
            Sign in
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex items-center justify-center min-h-screen px-6">
        <div className="text-center max-w-4xl mx-auto">
          <h1 className="text-6xl md:text-7xl font-bold text-black mb-8 leading-tight">
            Take assessments
            <br />
            <span className="text-gray-600">with confidence</span>
          </h1>

          <p className="text-xl text-gray-600 mb-12 max-w-2xl mx-auto leading-relaxed">
            A modern assessment platform designed for educational institutions.
          </p>

          <div className="flex justify-center">
            <Link
              href="/auth"
              className="bg-black text-white px-12 py-4 rounded-full font-semibold text-lg hover:bg-gray-800 transition-colors"
            >
              Get started
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
