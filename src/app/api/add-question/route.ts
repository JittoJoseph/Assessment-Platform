import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-client";
import { cookies } from "next/headers";

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const cookieStore = await cookies();
    const userCookie = cookieStore.get("user")?.value;

    if (!userCookie) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = JSON.parse(userCookie);
    if (user.role !== "admin") {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    const { quizId, question, options, correct_answer, time_limit_seconds } = await request.json();

    // Validate input
    if (!quizId) {
      return NextResponse.json({ error: "Quiz ID is required" }, { status: 400 });
    }

    if (!question?.trim()) {
      return NextResponse.json({ error: "Question text is required" }, { status: 400 });
    }

    if (question.length > 1000) {
      return NextResponse.json({ error: "Question must be less than 1000 characters" }, { status: 400 });
    }

    if (!Array.isArray(options) || options.length < 2 || options.length > 6) {
      return NextResponse.json({ error: "Must have 2-6 options" }, { status: 400 });
    }

    for (let i = 0; i < options.length; i++) {
      if (!options[i]?.trim()) {
        return NextResponse.json({ error: `Option ${i + 1}: Option text is required` }, { status: 400 });
      }
      if (options[i].length > 500) {
        return NextResponse.json({ error: `Option ${i + 1}: Option must be less than 500 characters` }, { status: 400 });
      }
    }

    if (typeof correct_answer !== 'number' || correct_answer < 0 || correct_answer >= options.length) {
      return NextResponse.json({ error: "Invalid correct answer index" }, { status: 400 });
    }

    if (typeof time_limit_seconds !== 'number' || time_limit_seconds < 10 || time_limit_seconds > 300) {
      return NextResponse.json({ error: "Time limit must be between 10-300 seconds" }, { status: 400 });
    }

    const supabase = createClient();

    // Verify quiz exists (admins can add questions to any quiz)
    const { data: quiz, error: quizError } = await supabase
      .from("quizzes")
      .select("id")
      .eq("id", quizId)
      .single();

    if (quizError || !quiz) {
      return NextResponse.json({ error: "Quiz not found" }, { status: 404 });
    }

    // Add question
    const { data: newQuestion, error: qError } = await supabase
      .from("questions")
      .insert({
        quiz_id: quizId,
        question: question.trim(),
        options: options.map((opt: string) => opt.trim()),
        correct_answer,
        time_limit_seconds,
      })
      .select()
      .single();

    if (qError) {
      console.error("Question creation error:", qError);
      return NextResponse.json({ error: "Failed to add question" }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      question: newQuestion
    });
  } catch (error) {
    console.error("Error adding question:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}