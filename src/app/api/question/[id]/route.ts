import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-client";
import { cookies } from "next/headers";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = createClient();

    const { data: question, error } = await supabase
      .from("questions")
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      return NextResponse.json(
        { error: "Question not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ question });
  } catch (error) {
    console.error("Error fetching question:", error);
    return NextResponse.json(
      { error: "Failed to fetch question" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id } = await params;
    const { question, options, correct_answer, time_limit_seconds } = await request.json();

    // Validate input
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

    // Verify question exists (admins can edit questions for any quiz)
    const { data: existingQuestion, error: fetchError } = await supabase
      .from("questions")
      .select("id")
      .eq("id", id)
      .single();

    if (fetchError || !existingQuestion) {
      return NextResponse.json({ error: "Question not found" }, { status: 404 });
    }

    // Update question
    const { data: updatedQuestion, error } = await supabase
      .from("questions")
      .update({
        question: question.trim(),
        options: options.map((opt: string) => opt.trim()),
        correct_answer,
        time_limit_seconds,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("Question update error:", error);
      return NextResponse.json({ error: "Failed to update question" }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      question: updatedQuestion
    });
  } catch (error) {
    console.error("Error updating question:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id } = await params;
    const supabase = createClient();

    // Verify question exists and user owns the quiz
    const { data: existingQuestion, error: fetchError } = await supabase
      .from("questions")
      .select("quiz_id")
      .eq("id", id)
      .single();

    if (fetchError || !existingQuestion) {
      return NextResponse.json({ error: "Question not found" }, { status: 404 });
    }

    // Check quiz ownership
    const { data: quiz, error: quizError } = await supabase
      .from("quizzes")
      .select("created_by")
      .eq("id", existingQuestion.quiz_id)
      .single();

    if (quizError || !quiz || quiz.created_by !== user.id) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    // Delete question
    const { error } = await supabase
      .from("questions")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("Question deletion error:", error);
      return NextResponse.json({ error: "Failed to delete question" }, { status: 500 });
    }

    return NextResponse.json({
      success: true
    });
  } catch (error) {
    console.error("Error deleting question:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}