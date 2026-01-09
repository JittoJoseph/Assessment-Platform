import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase-client";

async function getUser() {
  const cookieStore = await cookies();
  const userCookie = cookieStore.get("user")?.value;

  if (!userCookie) return null;

  try {
    return JSON.parse(userCookie);
  } catch {
    return null;
  }
}

async function getQuizzes() {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("quizzes")
    .select("id, title, shareable_link")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data;
}

export default async function AdminDashboard() {
  const user = await getUser();

  if (!user) {
    redirect("/");
  }

  if (user.role !== "admin") {
    redirect("/");
  }

  const quizzes = await getQuizzes();

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-6 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
          <form action="/api/auth/logout" method="POST" className="inline">
            <button
              type="submit"
              className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
            >
              Logout
            </button>
          </form>
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-6">
        <div className="bg-white p-6 rounded-lg shadow-md">
          <div className="mb-6">
            <Link
              href="/admin/create-quiz"
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors inline-block"
            >
              Create New Quiz
            </Link>
          </div>

          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              Your Quizzes
            </h2>
            {quizzes.length === 0 ? (
              <p className="text-gray-600">
                No quizzes created yet. Create your first quiz to get started.
              </p>
            ) : (
              <div className="space-y-4">
                {quizzes.map((quiz) => (
                  <div
                    key={quiz.id}
                    className="border border-gray-200 p-4 rounded-lg flex justify-between items-center hover:shadow-md transition-shadow"
                  >
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">{quiz.title}</p>
                      <p className="text-sm text-gray-600 mt-1">
                        Share Link:{" "}
                        <span className="font-mono bg-gray-100 px-2 py-1 rounded">
                          {quiz.shareable_link}
                        </span>
                      </p>
                    </div>
                    <Link
                      href={`/admin/results/${quiz.id}`}
                      className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                    >
                      View Results
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
