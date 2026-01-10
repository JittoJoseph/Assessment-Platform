import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-client";

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    if (!email || typeof email !== "string") {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    const supabase = createClient();

    // Check if user exists
    const { data: user, error: userError } = await supabase
      .from("profiles")
      .select("id, full_name, email, role")
      .eq("email", email.toLowerCase())
      .single();

    if (userError || !user) {
      return NextResponse.json({ error: "User not found. Only registered users can be made admins." }, { status: 404 });
    }

    if (user.role === "admin") {
      return NextResponse.json({ error: "User is already an admin." }, { status: 400 });
    }

    // Update role to admin
    const { error: updateError } = await supabase
      .from("profiles")
      .update({ role: "admin" })
      .eq("id", user.id);

    if (updateError) {
      console.error("Error updating user role:", updateError);
      return NextResponse.json({ error: "Failed to add admin" }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: `${user.full_name} has been added as an admin.`,
      admin: { id: user.id, full_name: user.full_name, email: user.email }
    });
  } catch (error) {
    console.error("Unexpected error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}