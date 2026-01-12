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

    const { title, startTime, endTime } = await request.json();

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

    if (end <= start) {
      return NextResponse.json({ error: "End time must be after start time" }, { status: 400 });
    }

    const supabase = createClient();

    // Create quiz
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

    return NextResponse.json({
      success: true,
      quiz: quiz
    });
  } catch (error) {
    console.error("Quiz creation error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}