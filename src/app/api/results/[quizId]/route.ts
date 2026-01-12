import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-client";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ quizId: string }> }
) {
  try {
    const { quizId } = await params;

    const supabase = createClient();

    // First check if quiz exists
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

    // Fetch attempts with user profiles
    const { data: attemptsData, error: attemptsError } = await supabase
      .from("attempts")
      .select(`
        id,
        total_score,
        submitted_at,
        profiles!inner (
          full_name,
          email
        )
      `)
      .eq("quiz_id", quizId)
      .order("total_score", { ascending: false });

    if (attemptsError) {
      console.error("Database error fetching attempts:", attemptsError);
      throw attemptsError;
    }

    if (!attemptsData || attemptsData.length === 0) {
      return NextResponse.json([]);
    }

    // Get all attempt IDs
    const attemptIds = attemptsData.map(attempt => attempt.id);

    // Fetch answers with question details
    const { data: answersData, error: answersError } = await supabase
      .from("answers")
      .select(`
        attempt_id,
        question_id,
        selected_option,
        is_correct,
        marks_obtained,
        questions!inner (
          question,
          correct_answer
        )
      `)
      .in("attempt_id", attemptIds);

    if (answersError) {
      console.error("Database error fetching answers:", answersError);
      throw answersError;
    }

    // Combine the data
    const results = attemptsData.map(attempt => ({
      id: attempt.id,
      total_score: attempt.total_score,
      submitted_at: attempt.submitted_at,
      profiles: attempt.profiles,
      answers: answersData
        ?.filter(answer => answer.attempt_id === attempt.id)
        .map(answer => ({
          question_id: answer.question_id,
          selected_option: answer.selected_option,
          is_correct: answer.is_correct,
          marks_obtained: answer.marks_obtained,
          questions: answer.questions
        })) || []
    }));

    return NextResponse.json(results);
  } catch (error) {
    console.error("Error in results API:", error);
    return NextResponse.json(
      { error: "Failed to fetch results" },
      { status: 500 }
    );
  }
}