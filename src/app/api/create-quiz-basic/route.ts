import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-client";

export async function POST(request: NextRequest) {
  try {
    const { title, startTime, endTime, userId } = await request.json();

    const supabase = createClient();

    // Create quiz
    const { data: quiz, error: quizError } = await supabase
      .from("quizzes")
      .insert({
        title,
        start_time: startTime,
        end_time: endTime,
        created_by: userId,
        shareable_link: crypto.randomUUID(),
      })
      .select()
      .single();

    if (quizError) throw quizError;

    return NextResponse.json({
      success: true,
      quiz: quiz
    });
  } catch (error) {
    console.error("Error creating quiz:", error);
    return NextResponse.json(
      { error: "Failed to create quiz" },
      { status: 500 }
    );
  }
}