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

    const { title, startTime, endTime, questions } = await request.json();

    // Validate input
    if (!title?.trim()) {
      return NextResponse.json({ error: "Quiz title is required" }, { status: 400 });
    }

    if (title.length > 200) {
      return NextResponse.json({ error: "Quiz title must be less than 200 characters" }, { status: 400 });
    }

    if (!startTime || !endTime) {
      return NextResponse.json({ error: "Start and end times are required" }, { status: 400 });
    }

    const start = new Date(startTime);
    const end = new Date(endTime);
    const now = new Date();

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return NextResponse.json({ error: "Invalid date format" }, { status: 400 });
    }

    if (start <= now) {
      return NextResponse.json({ error: "Start time must be in the future" }, { status: 400 });
    }

    if (end <= start) {
      return NextResponse.json({ error: "End time must be after start time" }, { status: 400 });
    }

    // Validate questions
    if (!Array.isArray(questions) || questions.length === 0) {
      return NextResponse.json({ error: "At least one question is required" }, { status: 400 });
    }

    if (questions.length > 50) {
      return NextResponse.json({ error: "Maximum 50 questions allowed" }, { status: 400 });
    }

    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      if (!q.question?.trim()) {
        return NextResponse.json({ error: `Question ${i + 1}: Question text is required` }, { status: 400 });
      }

      if (q.question.length > 1000) {
        return NextResponse.json({ error: `Question ${i + 1}: Question must be less than 1000 characters` }, { status: 400 });
      }

      if (!Array.isArray(q.options) || q.options.length < 2 || q.options.length > 6) {
        return NextResponse.json({ error: `Question ${i + 1}: Must have 2-6 options` }, { status: 400 });
      }

      for (let j = 0; j < q.options.length; j++) {
        if (!q.options[j]?.trim()) {
          return NextResponse.json({ error: `Question ${i + 1}, Option ${j + 1}: Option text is required` }, { status: 400 });
        }
        if (q.options[j].length > 500) {
          return NextResponse.json({ error: `Question ${i + 1}, Option ${j + 1}: Option must be less than 500 characters` }, { status: 400 });
        }
      }

      if (typeof q.correct_answer !== 'number' || q.correct_answer < 0 || q.correct_answer >= q.options.length) {
        return NextResponse.json({ error: `Question ${i + 1}: Invalid correct answer index` }, { status: 400 });
      }

      if (typeof q.time_limit_seconds !== 'number' || q.time_limit_seconds < 10 || q.time_limit_seconds > 300) {
        return NextResponse.json({ error: `Question ${i + 1}: Time limit must be between 10-300 seconds` }, { status: 400 });
      }
    }

    const supabase = createClient();

    // Create quiz with transaction-like behavior
    const { data: quiz, error: quizError } = await supabase
      .from("quizzes")
      .insert({
        title: title.trim(),
        start_time: startTime,
        end_time: endTime,
        created_by: user.id,
        shareable_link: crypto.randomUUID(),
      })
      .select()
      .single();

    if (quizError) {
      console.error("Quiz creation error:", quizError);
      return NextResponse.json({ error: "Failed to create quiz" }, { status: 500 });
    }

    // Add questions
    const questionInserts = questions.map(q => ({
      quiz_id: quiz.id,
      question: q.question.trim(),
      options: q.options.map((opt: string) => opt.trim()),
      correct_answer: q.correct_answer,
      time_limit_seconds: q.time_limit_seconds
    }));

    const { error: questionsError } = await supabase
      .from("questions")
      .insert(questionInserts);

    if (questionsError) {
      console.error("Questions creation error:", questionsError);
      // Attempt to clean up the quiz if questions failed
      await supabase.from("quizzes").delete().eq("id", quiz.id);
      return NextResponse.json({ error: "Failed to create questions" }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      shareableLink: quiz.shareable_link,
      quizId: quiz.id
    });
  } catch (error) {
    console.error("Quiz creation error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}