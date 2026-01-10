import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-client";

export async function GET() {
  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("profiles")
      .select("id, full_name, email")
      .eq("role", "admin")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching admins:", error);
      return NextResponse.json({ error: "Failed to fetch admins" }, { status: 500 });
    }

    return NextResponse.json({ admins: data });
  } catch (error) {
    console.error("Unexpected error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}