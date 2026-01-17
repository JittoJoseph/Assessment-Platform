import { cookies } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";
import { FaLock, FaLink, FaChartBar } from "react-icons/fa";
import Navbar from "./Navbar";
import Footer from "../components/Footer";
import { createClient } from "@/lib/supabase-client";

async function getUser() {
  const cookieStore = await cookies();
  const userCookie = cookieStore.get("user")?.value;

  if (!userCookie) return null;

  try {
    const cookieUser = JSON.parse(userCookie);
    const supabase = createClient();
    const { data: profile, error } = await supabase
      .from("profiles")
      .select("role, full_name, email, id")
      .eq("id", cookieUser.id)
      .single();

    if (error || !profile) return null;

    return {
      ...cookieUser,
      role: profile.role,
    };
  } catch {
    return null;
  }
}

export default async function Home() {
  const user = await getUser();

  return (
    <div className="min-h-screen bg-white">
      <Navbar user={user} />

      {/* Hero Section */}
      <main className="flex items-center justify-center py-20 px-6 pt-32">
        <div className="text-center max-w-4xl mx-auto">
          <h1 className="text-5xl md:text-6xl font-bold text-black mb-6 leading-tight">
            Take assessments
            <br />
            <span className="text-gray-600">with confidence</span>
          </h1>

          <p className="text-lg text-gray-600 mb-8 max-w-2xl mx-auto leading-relaxed">
            Private assessments accessible only through secure links. No public
            listings, complete control.
          </p>

          <div className="flex justify-center mb-12">
            {!user ? (
              <Link
                href="/auth"
                className="bg-black text-white px-8 py-3 rounded-full font-semibold text-base hover:bg-gray-800 transition-colors"
              >
                Get started
              </Link>
            ) : user.role === "admin" ? (
              <Link
                href="/admin"
                className="bg-black text-white px-8 py-3 rounded-full font-semibold text-base hover:bg-gray-800 transition-colors"
              >
                Admin Panel
              </Link>
            ) : null}
          </div>
        </div>
      </main>

      {/* Features Section */}
      <section className="pb-20 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="grid md:grid-cols-3 gap-6">
            <div className="p-4 flex flex-col items-center text-center">
              <FaLock className="w-6 h-6 text-black mb-3" />
              <h3 className="text-base font-semibold text-black mb-2">
                Private Exams
              </h3>
              <p className="text-gray-600 text-sm">
                Unlisted assessments, accessible only through secure links
              </p>
            </div>
            <div className="p-4 flex flex-col items-center text-center">
              <FaLink className="w-6 h-6 text-black mb-3" />
              <h3 className="text-base font-semibold text-black mb-2">
                Link-Based Access
              </h3>
              <p className="text-gray-600 text-sm">
                Share unique links with authorized participants only
              </p>
            </div>
            <div className="p-4 flex flex-col items-center text-center">
              <FaChartBar className="w-6 h-6 text-black mb-3" />
              <h3 className="text-base font-semibold text-black mb-2">
                Detailed Results
              </h3>
              <p className="text-gray-600 text-sm">
                Comprehensive analytics and performance insights
              </p>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
