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

    const currentUser = JSON.parse(userCookie);
    if (currentUser.role !== "admin") {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    const { email } = await request.json();

    if (!email || typeof email !== "string") {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    if (email.length > 254) {
      return NextResponse.json({ error: "Email is too long" }, { status: 400 });
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json({ error: "Invalid email format" }, { status: 400 });
    }

    const supabase = createClient();

    // Check if user exists
    const { data: user, error: userError } = await supabase
      .from("profiles")
      .select("id, full_name, email, role")
      .eq("email", email.toLowerCase().trim())
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
      .update({ role: "admin", updated_at: new Date().toISOString() })
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