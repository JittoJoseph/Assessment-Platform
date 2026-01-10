import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-client";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ quizId: string }> }
) {
  try {
    const { quizId } = await params;
    console.log("Results API called with quizId:", quizId);

    const supabase = createClient();

    const { data, error } = await supabase
      .from("attempts")
      .select(
        `
        id,
        total_score,
        submitted_at,
        profiles (full_name, email),
        answers (
          question_id,
          selected_option,
          time_taken_seconds,
          is_correct,
          marks_obtained,
          questions (question, correct_answer)
        )
      `
      )
      .eq("quiz_id", quizId)
      .order("total_score", { ascending: false });

    console.log("Supabase query result:", { data: data?.length || 0, error });

    if (error) {
      console.error("Supabase error:", error);
      throw error;
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("Error fetching results:", error);
    return NextResponse.json(
      { error: "Failed to fetch results" },
      { status: 500 }
    );
  }
}