import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-client";
import { cookies } from "next/headers";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ quizId: string }> }
) {
  try {
    const { quizId } = await params;
    const supabase = createClient();

    const { data: quiz, error } = await supabase
      .from("quizzes")
      .select("*")
      .eq("id", quizId)
      .single();

    if (error || !quiz) {
      return NextResponse.json(
        { error: "Quiz not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ quiz });
  } catch (error) {
    console.error("Error fetching quiz:", error);
    return NextResponse.json(
      { error: "Failed to fetch quiz" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ quizId: string }> }
) {
  try {
    const { quizId } = await params;

    // Check authentication
    const cookieStore = await cookies();
    const userCookie = cookieStore.get("user")?.value;

    if (!userCookie) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const user = JSON.parse(userCookie);
    if (user.role !== "admin") {
      return NextResponse.json(
        { error: "Admin access required" },
        { status: 403 }
      );
    }

    const { title, startTime, endTime } = await request.json();

    if (!title || !startTime || !endTime) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const supabase = createClient();

    // Verify the quiz belongs to the user
    const { data: existingQuiz, error: fetchError } = await supabase
      .from("quizzes")
      .select("user_id")
      .eq("id", quizId)
      .single();

    if (fetchError || !existingQuiz) {
      return NextResponse.json(
        { error: "Quiz not found" },
        { status: 404 }
      );
    }

    if (existingQuiz.user_id !== user.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 403 }
      );
    }

    // Update the quiz
    const { data: updatedQuiz, error: updateError } = await supabase
      .from("quizzes")
      .update({
        title,
        start_time: startTime,
        end_time: endTime,
        updated_at: new Date().toISOString(),
      })
      .eq("id", quizId)
      .select()
      .single();

    if (updateError) {
      console.error("Error updating quiz:", updateError);
      return NextResponse.json(
        { error: "Failed to update quiz" },
        { status: 500 }
      );
    }

    return NextResponse.json({ quiz: updatedQuiz });
  } catch (error) {
    console.error("Error updating quiz:", error);
    return NextResponse.json(
      { error: "Failed to update quiz" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ quizId: string }> }
) {
  try {
    const { quizId } = await params;

    // Check authentication
    const cookieStore = await cookies();
    const userCookie = cookieStore.get("user")?.value;

    if (!userCookie) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const user = JSON.parse(userCookie);
    if (user.role !== "admin") {
      return NextResponse.json(
        { error: "Admin access required" },
        { status: 403 }
      );
    }

    const supabase = createClient();

    // Verify the quiz belongs to the user
    const { data: existingQuiz, error: fetchError } = await supabase
      .from("quizzes")
      .select("user_id")
      .eq("id", quizId)
      .single();

    if (fetchError || !existingQuiz) {
      return NextResponse.json(
        { error: "Quiz not found" },
        { status: 404 }
      );
    }

    if (existingQuiz.user_id !== user.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 403 }
      );
    }

    // Delete all questions first
    const { error: questionsError } = await supabase
      .from("questions")
      .delete()
      .eq("quiz_id", quizId);

    if (questionsError) {
      console.error("Error deleting questions:", questionsError);
      return NextResponse.json(
        { error: "Failed to delete quiz questions" },
        { status: 500 }
      );
    }

    // Delete the quiz
    const { error: deleteError } = await supabase
      .from("quizzes")
      .delete()
      .eq("id", quizId);

    if (deleteError) {
      console.error("Error deleting quiz:", deleteError);
      return NextResponse.json(
        { error: "Failed to delete quiz" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting quiz:", error);
    return NextResponse.json(
      { error: "Failed to delete quiz" },
      { status: 500 }
    );
  }
}