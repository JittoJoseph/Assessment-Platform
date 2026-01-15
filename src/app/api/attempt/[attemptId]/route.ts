import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-client";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ attemptId: string }> }
) {
  try {
    const { attemptId } = await params;

    const supabase = createClient();

    // Fetch the attempt details
    const { data: attempt, error: attemptError } = await supabase
      .from("attempts")
      .select(`
        id,
        total_score,
        submitted_at,
        time_taken,
        quiz_id,
        profiles!inner (
          full_name,
          email,
          phone
        )
      `)
      .eq("id", attemptId)
      .eq("is_completed", true)
      .single();

    if (attemptError || !attempt) {
      return NextResponse.json(
        { error: "Attempt not found" },
        { status: 404 }
      );
    }

    // Fetch answers for this attempt
    const { data: answersData, error: answersError } = await supabase
      .from("answers")
      .select(`
        question_id,
        selected_option,
        is_correct,
        marks_obtained
      `)
      .eq("attempt_id", attemptId);

    if (answersError) {
      console.error("Database error fetching answers:", answersError);
      throw answersError;
    }

    // Get all question IDs that were answered
    const questionIds = [...new Set(answersData?.map(a => a.question_id) || [])];

    // Fetch question details
    const { data: questionsData, error: questionsError } = await supabase
      .from("questions")
      .select("id, question, correct_answer")
      .in("id", questionIds);

    if (questionsError) {
      console.error("Database error fetching questions:", questionsError);
      throw questionsError;
    }

    // Create question lookup map
    const questionMap = new Map();
    questionsData?.forEach(q => {
      questionMap.set(q.id, { question: q.question, correct_answer: q.correct_answer });
    });

    // Combine the data
    const result = {
      id: attempt.id,
      total_score: attempt.total_score,
      submitted_at: attempt.submitted_at,
      time_taken: attempt.time_taken,
      quiz_id: attempt.quiz_id,
      profiles: attempt.profiles,
      answers: answersData
        ?.map(answer => ({
          question_id: answer.question_id,
          selected_option: answer.selected_option,
          is_correct: answer.is_correct,
          marks_obtained: answer.marks_obtained,
          question: questionMap.get(answer.question_id)?.question || "",
          correct_answer: questionMap.get(answer.question_id)?.correct_answer || 0
        })) || []
    };

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error in attempt details API:", error);
    return NextResponse.json(
      { error: "Failed to fetch attempt details" },
      { status: 500 }
    );
  }
}