import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-client";

export async function POST(request: NextRequest) {
  try {
    const { quizId, question, options, correct_answer, time_limit_seconds } = await request.json();

    const supabase = createClient();

    // Verify quiz exists and user has access
    const { data: quiz, error: quizError } = await supabase
      .from("quizzes")
      .select("id")
      .eq("id", quizId)
      .single();

    if (quizError || !quiz) {
      return NextResponse.json(
        { error: "Quiz not found" },
        { status: 404 }
      );
    }

    // Add question
    const { data: newQuestion, error: qError } = await supabase
      .from("questions")
      .insert({
        quiz_id: quizId,
        question,
        options,
        correct_answer,
        time_limit_seconds,
      })
      .select()
      .single();

    if (qError) throw qError;

    return NextResponse.json({
      success: true,
      question: newQuestion
    });
  } catch (error) {
    console.error("Error adding question:", error);
    return NextResponse.json(
      { error: "Failed to add question" },
      { status: 500 }
    );
  }
}