import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-client";

export async function POST(request: NextRequest) {
  try {
    const { title, startTime, endTime, questions, userId } = await request.json();

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

    // Add questions
    for (const q of questions) {
      const { error: qError } = await supabase.from("questions").insert({
        quiz_id: quiz.id,
        ...q,
      });
      if (qError) throw qError;
    }

    return NextResponse.json({
      success: true,
      shareableLink: quiz.shareable_link
    });
  } catch (error) {
    console.error("Error creating quiz:", error);
    return NextResponse.json(
      { error: "Failed to create quiz" },
      { status: 500 }
    );
  }
}