import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-client";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ quizId: string }> }
) {
  try {
    const { quizId } = await params;
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

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

    // Get total count of completed attempts
    const { count: totalCount, error: countError } = await supabase
      .from("attempts")
      .select("*", { count: "exact", head: true })
      .eq("quiz_id", quizId)
      .eq("is_completed", true);

    if (countError) {
      console.error("Database error counting attempts:", countError);
      throw countError;
    }

    // Fetch paginated attempts with user profiles (only summary data)
    const { data: attemptsData, error: attemptsError } = await supabase
      .from("attempts")
      .select(`
        id,
        total_score,
        submitted_at,
        time_taken,
        profiles!inner (
          full_name,
          email,
          phone
        )
      `)
      .eq("quiz_id", quizId)
      .eq("is_completed", true)
      .order("total_score", { ascending: false })
      .order("time_taken", { ascending: true, nullsFirst: false })
      .range(offset, offset + limit - 1);

    if (attemptsError) {
      console.error("Database error fetching attempts:", attemptsError);
      throw attemptsError;
    }

    // Return summary data only - no detailed answers
    const results = {
      attempts: attemptsData || [],
      totalCount: totalCount || 0,
      limit,
      offset,
      hasMore: (offset + limit) < (totalCount || 0)
    };

    return NextResponse.json(results);
  } catch (error) {
    console.error("Error in results API:", error);
    return NextResponse.json(
      { error: "Failed to fetch results" },
      { status: 500 }
    );
  }
}