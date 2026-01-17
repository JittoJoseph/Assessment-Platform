"use client";

export const dynamic = "force-dynamic";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import {
  Document,
  Packer,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
  AlignmentType,
  BorderStyle,
} from "docx";

type User = {
  full_name: string;
  role: string;
};

type AttemptSummary = {
  id: string;
  total_score: number;
  submitted_at: string;
  time_taken: number | null;
  profiles: { full_name: string; email: string; phone: string };
};

type AttemptDetails = AttemptSummary & {
  profiles: { full_name: string; email: string; phone: string };
};

type ResultsResponse = {
  attempts: AttemptSummary[];
  totalCount: number;
  limit: number;
  offset: number;
  hasMore: boolean;
};

type FilterOption = 10 | 20 | 50 | "all";

export default function ResultsPage() {
  const { quizId } = useParams();
  const router = useRouter();
  const [attempts, setAttempts] = useState<AttemptSummary[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [filterLoading, setFilterLoading] = useState(false);
  const [selectedAttempt, setSelectedAttempt] = useState<AttemptSummary | null>(
    null,
  );
  const [user, setUser] = useState<User | null>(null);
  const [authError, setAuthError] = useState<string>("");
  const [filterOption, setFilterOption] = useState<FilterOption>(20);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [initialLoadDone, setInitialLoadDone] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [quizName, setQuizName] = useState<string>("");

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString([], {
      year: "numeric",
      month: "numeric",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };

  const formatTimeTaken = (seconds: number | null): string => {
    if (seconds === null || seconds === undefined) return "-";
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
      return `${hours}h ${minutes}m ${secs}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${secs}s`;
    } else {
      return `${secs}s`;
    }
  };

  const loadResults = useCallback(
    async (page = 1, isFilterChange = false) => {
      try {
        if (isFilterChange) {
          setFilterLoading(true);
        } else {
          setLoading(true);
        }

        const limit = filterOption === "all" ? 1000 : (filterOption as number);
        const offset = filterOption === "all" ? (page - 1) * 1000 : 0;

        const response = await fetch(
          `/api/results/${quizId}?limit=${limit}&offset=${offset}`,
        );

        if (!response.ok) {
          throw new Error(
            `Failed to fetch results: ${response.status} ${response.statusText}`,
          );
        }

        const data: ResultsResponse = await response.json();

        setAttempts(data.attempts);
        setTotalCount(data.totalCount);
        setCurrentPage(page);
      } catch (err: unknown) {
        const error = err as Error;
        console.error("Error loading results:", error);
        alert(`Error loading results: ${error.message}`);
      } finally {
        setLoading(false);
        setFilterLoading(false);
      }
    },
    [quizId, filterOption],
  );

  useEffect(() => {
    const checkClientAuth = async () => {
      try {
        const response = await fetch("/api/auth/check");
        if (!response.ok) {
          setAuthError("Please sign in first");
          setLoading(false);
          return;
        }
        const data = await response.json();
        if (data.user?.role !== "admin") {
          setAuthError("Admin access required");
          setLoading(false);
          return;
        }
        setUser(data.user);
        loadResults();
        fetchQuizName();
        setInitialLoadDone(true);
      } catch {
        setAuthError("Authentication check failed");
        setLoading(false);
      }
    };

    checkClientAuth();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Reload results when filter option changes (after initial load)
  useEffect(() => {
    if (initialLoadDone) {
      loadResults(1, true);
    }
  }, [filterOption, initialLoadDone, loadResults]);

  const fetchQuizName = async () => {
    try {
      const response = await fetch(`/api/quizzes/${quizId}`);
      if (response.ok) {
        const data = await response.json();
        setQuizName(data.quiz.title);
      }
    } catch (error) {
      console.error("Failed to fetch quiz name:", error);
    }
  };

  const handleAttemptClick = (attempt: AttemptSummary) => {
    setSelectedAttempt(attempt);
  };

  // Results are already sorted by API (Score DESC, Time ASC)
  const filteredResults = useMemo(() => {
    return attempts;
  }, [attempts]);

  const highestScore = useMemo(
    () =>
      attempts.length > 0 ? Math.max(...attempts.map((a) => a.total_score)) : 0,
    [attempts],
  );

  // Export functions
  const getExportData = (shortlistedOnly: boolean) => {
    const data = shortlistedOnly ? filteredResults : attempts;
    return data.map((attempt, index) => ({
      rank: index + 1,
      name: attempt.profiles.full_name,
      email: attempt.profiles.email,
      phone: attempt.profiles.phone || "-",
      score: attempt.total_score,
      timeTaken: formatTimeTaken(attempt.time_taken),
    }));
  };

  const exportToCSV = (shortlistedOnly: boolean) => {
    const data = getExportData(shortlistedOnly);
    const headers = [
      "Rank",
      "Name",
      "Email",
      "Phone",
      "Score",
      "Time Taken",
      "Remarks",
    ];
    const csvContent = [
      `Quiz: ${quizName}`,
      `Generated: ${new Date().toLocaleString()}`,
      "",
      headers.join(","),
      ...data.map((row) =>
        [
          row.rank,
          `"${row.name}"`,
          `"${row.email}"`,
          `"${row.phone}"`,
          row.score,
          `"${row.timeTaken}"`,
          "", // Empty remarks column
        ].join(","),
      ),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `${quizName.replace(/[^a-zA-Z0-9]/g, "_")}-results-${
      shortlistedOnly ? "shortlisted" : "all"
    }.csv`;
    link.click();
    setShowExportMenu(false);
  };

  const exportToPDF = (shortlistedOnly: boolean) => {
    const data = getExportData(shortlistedOnly);
    const doc = new jsPDF();

    doc.setFontSize(18);
    doc.text(`${quizName} - Results`, 14, 22);
    doc.setFontSize(14);
    doc.text(
      `Quiz Results - ${shortlistedOnly ? "Shortlisted" : "All"} Students`,
      14,
      32,
    );
    doc.setFontSize(11);
    doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, 40);

    autoTable(doc, {
      startY: 50,
      head: [["Rank", "Name", "Email", "Phone", "Score", "Remarks"]],
      body: data.map((row) => [
        row.rank,
        row.name,
        row.email,
        row.phone,
        row.score,
        "", // Empty remarks column
      ]),
      styles: { fontSize: 9 },
      headStyles: { fillColor: [0, 0, 0] },
      columnStyles: {
        0: { cellWidth: 15 }, // Rank
        1: { cellWidth: 40 }, // Name - slightly wider
        2: { cellWidth: 50 }, // Email - slightly wider
        3: { cellWidth: 30 }, // Phone - slightly wider
        4: { cellWidth: 15 }, // Score
        5: { cellWidth: 35 }, // Remarks - much wider now that Time is removed
      },
    });

    doc.save(
      `${quizName.replace(/[^a-zA-Z0-9]/g, "_")}-results-${
        shortlistedOnly ? "shortlisted" : "all"
      }.pdf`,
    );
    setShowExportMenu(false);
  };

  const exportToDocx = async (shortlistedOnly: boolean) => {
    const data = getExportData(shortlistedOnly);

    const tableRows = [
      new TableRow({
        children: ["Rank", "Name", "Email", "Phone", "Score", "Remarks"].map(
          (header) =>
            new TableCell({
              children: [
                new Paragraph({
                  children: [new TextRun({ text: header, bold: true })],
                  alignment: AlignmentType.CENTER,
                }),
              ],
              shading: { fill: "EEEEEE" },
            }),
        ),
        tableHeader: true,
      }),
      ...data.map(
        (row) =>
          new TableRow({
            children: [
              row.rank.toString(),
              row.name,
              row.email,
              row.phone,
              row.score.toString(),
              "", // Empty remarks column
            ].map(
              (cell) =>
                new TableCell({
                  children: [new Paragraph({ children: [new TextRun(cell)] })],
                  borders: {
                    top: {
                      style: BorderStyle.SINGLE,
                      size: 1,
                      color: "CCCCCC",
                    },
                    bottom: {
                      style: BorderStyle.SINGLE,
                      size: 1,
                      color: "CCCCCC",
                    },
                    left: {
                      style: BorderStyle.SINGLE,
                      size: 1,
                      color: "CCCCCC",
                    },
                    right: {
                      style: BorderStyle.SINGLE,
                      size: 1,
                      color: "CCCCCC",
                    },
                  },
                }),
            ),
          }),
      ),
    ];

    const doc = new Document({
      sections: [
        {
          children: [
            new Paragraph({
              children: [
                new TextRun({
                  text: quizName,
                  bold: true,
                  size: 32,
                }),
              ],
            }),
            new Paragraph({
              children: [
                new TextRun({
                  text: `Quiz Results - ${
                    shortlistedOnly ? "Shortlisted" : "All"
                  } Students`,
                  bold: true,
                  size: 28,
                }),
              ],
            }),
            new Paragraph({
              children: [
                new TextRun({
                  text: `Generated on: ${new Date().toLocaleString()}`,
                  size: 20,
                }),
              ],
            }),
            new Paragraph({ text: "" }),
            new Table({
              rows: tableRows,
              width: { size: 100, type: WidthType.PERCENTAGE },
            }),
          ],
        },
      ],
    });

    const blob = await Packer.toBlob(doc);
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `${quizName.replace(/[^a-zA-Z0-9]/g, "_")}-results-${
      shortlistedOnly ? "shortlisted" : "all"
    }.docx`;
    link.click();
    setShowExportMenu(false);
  };

  if (authError) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-white border border-gray-200 rounded-xl shadow-lg p-8 text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            Access Denied
          </h1>
          <p className="text-gray-600 mb-6">{authError}</p>
          <button
            onClick={() => (window.location.href = "/")}
            className="bg-black hover:bg-gray-800 text-white px-6 py-3 rounded-lg font-medium transition-colors"
          >
            Go Home
          </button>
        </div>
      </div>
    );
  }

  if (loading)
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-xl">Loading...</div>
      </div>
    );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <button
                onClick={() => router.push("/admin")}
                className="flex items-center text-gray-600 hover:text-gray-900 transition-colors mr-4"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 19l-7-7 7-7"
                  />
                </svg>
                <span className="ml-1 text-sm font-medium">Back</span>
              </button>
              <h1 className="text-xl font-semibold text-gray-900">
                Quiz Results
              </h1>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600 hidden sm:block">
                Welcome, {user?.full_name}
              </span>
              <button
                onClick={async () => {
                  try {
                    const response = await fetch("/api/auth/logout", {
                      method: "POST",
                      headers: {
                        "Content-Type": "application/x-www-form-urlencoded",
                      },
                    });
                    if (response.ok) {
                      window.location.href = "/logout";
                    }
                  } catch (error) {
                    console.error("Logout failed:", error);
                  }
                }}
                className="bg-black hover:bg-gray-800 text-white px-4 py-2 rounded-lg font-medium transition-colors text-sm"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Overview */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
            <div className="text-center">
              <p className="text-2xl font-bold text-gray-900">{totalCount}</p>
              <p className="text-sm text-gray-500">Total Attempts</p>
            </div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
            <div className="text-center">
              <p className="text-2xl font-bold text-green-600">
                {attempts.length}
              </p>
              <p className="text-sm text-gray-500">Showing</p>
            </div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
            <div className="text-center">
              <p className="text-2xl font-bold text-purple-600">
                {highestScore}
              </p>
              <p className="text-sm text-gray-500">Highest Score</p>
            </div>
          </div>
        </div>

        {/* Controls Bar */}
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            {/* Filter Buttons */}
            <div className="flex flex-wrap gap-2">
              <span className="text-sm font-medium text-gray-700 self-center mr-2">
                Show:
              </span>
              {([10, 20, 50, "all"] as FilterOption[]).map((option) => (
                <button
                  key={option}
                  onClick={() => !filterLoading && setFilterOption(option)}
                  disabled={filterLoading}
                  className={`px-4 py-2 text-sm rounded-lg font-medium transition-colors ${
                    filterOption === option
                      ? "bg-black text-white"
                      : filterLoading
                        ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                        : "bg-gray-100 hover:bg-gray-200 text-gray-700"
                  }`}
                >
                  {option === "all" ? "All" : `Top ${option}`}
                </button>
              ))}
            </div>

            {/* Export Dropdown */}
            <div className="relative">
              <button
                onClick={() => setShowExportMenu(!showExportMenu)}
                className="flex items-center gap-2 px-4 py-2 bg-black hover:bg-gray-800 text-white rounded-lg font-medium transition-colors text-sm"
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                  />
                </svg>
                Export
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </button>

              {showExportMenu && (
                <div className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-xl border border-gray-200 z-50 overflow-hidden">
                  <div className="p-1">
                    {/* Shortlisted Section */}
                    <div className="px-3 py-2">
                      <p className="text-xs font-semibold text-gray-900 uppercase tracking-wide mb-2">
                        Shortlisted ({filteredResults.length})
                      </p>
                      <div className="space-y-1">
                        <button
                          onClick={() => exportToCSV(true)}
                          className="w-full flex items-center gap-3 px-3 py-2 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-700 rounded-md transition-colors"
                        >
                          <svg
                            className="w-4 h-4 text-blue-500"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                            />
                          </svg>
                          Export as CSV
                        </button>
                        <button
                          onClick={() => exportToPDF(true)}
                          className="w-full flex items-center gap-3 px-3 py-2 text-sm text-gray-700 hover:bg-red-50 hover:text-red-700 rounded-md transition-colors"
                        >
                          <svg
                            className="w-4 h-4 text-red-500"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                            />
                          </svg>
                          Export as PDF
                        </button>
                        <button
                          onClick={() => exportToDocx(true)}
                          className="w-full flex items-center gap-3 px-3 py-2 text-sm text-gray-700 hover:bg-green-50 hover:text-green-700 rounded-md transition-colors"
                        >
                          <svg
                            className="w-4 h-4 text-green-500"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                            />
                          </svg>
                          Export as DOCX
                        </button>
                      </div>
                    </div>

                    {/* Divider */}
                    <div className="border-t border-gray-200 my-1"></div>

                    {/* All Students Section */}
                    <div className="px-3 py-2">
                      <p className="text-xs font-semibold text-gray-900 uppercase tracking-wide mb-2">
                        All Students ({attempts.length})
                      </p>
                      <div className="space-y-1">
                        <button
                          onClick={() => exportToCSV(false)}
                          className="w-full flex items-center gap-3 px-3 py-2 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-700 rounded-md transition-colors"
                        >
                          <svg
                            className="w-4 h-4 text-blue-500"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                            />
                          </svg>
                          Export as CSV
                        </button>
                        <button
                          onClick={() => exportToPDF(false)}
                          className="w-full flex items-center gap-3 px-3 py-2 text-sm text-gray-700 hover:bg-red-50 hover:text-red-700 rounded-md transition-colors"
                        >
                          <svg
                            className="w-4 h-4 text-red-500"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                            />
                          </svg>
                          Export as PDF
                        </button>
                        <button
                          onClick={() => exportToDocx(false)}
                          className="w-full flex items-center gap-3 px-3 py-2 text-sm text-gray-700 hover:bg-green-50 hover:text-green-700 rounded-md transition-colors"
                        >
                          <svg
                            className="w-4 h-4 text-green-500"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                            />
                          </svg>
                          Export as DOCX
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Results Table */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden relative">
          {filterLoading && (
            <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center z-10">
              <div className="flex items-center space-x-2">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-900"></div>
                <span className="text-gray-600">Loading...</span>
              </div>
            </div>
          )}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider w-16">
                    Rank
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Name
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider hidden md:table-cell">
                    Email
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider w-24">
                    Score
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider w-32">
                    Time Taken
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredResults.length === 0 ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-4 py-12 text-center text-gray-500"
                    >
                      No results found.
                    </td>
                  </tr>
                ) : (
                  filteredResults.map((attempt, index) => (
                    <tr
                      key={attempt.id}
                      className="hover:bg-gray-50 cursor-pointer transition-colors"
                      onClick={() => handleAttemptClick(attempt)}
                    >
                      <td className="px-4 py-3 text-center text-sm text-gray-600">
                        {filterOption === "all"
                          ? (currentPage - 1) * 1000 + index + 1
                          : index + 1}
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-medium text-gray-900">
                          {attempt.profiles.full_name}
                        </p>
                        <p className="text-sm text-gray-500 md:hidden">
                          {attempt.profiles.email}
                        </p>
                      </td>
                      <td className="px-4 py-3 text-gray-600 hidden md:table-cell">
                        {attempt.profiles.email}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="inline-flex items-center justify-center px-3 py-1 rounded-full text-sm font-bold bg-green-100 text-green-800">
                          {attempt.total_score}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center text-gray-600 font-mono text-sm">
                        {formatTimeTaken(attempt.time_taken)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          {filterOption === "all" && totalCount > 1000 && (
            <div className="px-4 py-4 border-t border-gray-200 bg-gray-50">
              <div className="flex items-center justify-between">
                <div className="text-sm text-gray-700">
                  Showing {(currentPage - 1) * 1000 + 1} to{" "}
                  {Math.min(currentPage * 1000, totalCount)} of {totalCount}{" "}
                  results
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => loadResults(currentPage - 1)}
                    disabled={currentPage === 1 || filterLoading}
                    className="px-3 py-1 text-sm bg-white border border-gray-300 rounded hover:bg-gray-50 disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed"
                  >
                    Previous
                  </button>

                  {/* Page Numbers */}
                  {(() => {
                    const pageSize = 1000;
                    const totalPages = Math.ceil(totalCount / pageSize);
                    const pages = [];
                    const maxVisiblePages = 5;
                    let startPage = Math.max(
                      1,
                      currentPage - Math.floor(maxVisiblePages / 2),
                    );
                    let endPage = Math.min(
                      totalPages,
                      startPage + maxVisiblePages - 1,
                    );

                    if (endPage - startPage + 1 < maxVisiblePages) {
                      startPage = Math.max(1, endPage - maxVisiblePages + 1);
                    }

                    for (let i = startPage; i <= endPage; i++) {
                      pages.push(
                        <button
                          key={i}
                          onClick={() => loadResults(i)}
                          disabled={filterLoading}
                          className={`px-3 py-1 text-sm border rounded ${
                            currentPage === i
                              ? "bg-black text-white border-black"
                              : "bg-white border-gray-300 hover:bg-gray-50"
                          } disabled:cursor-not-allowed`}
                        >
                          {i}
                        </button>,
                      );
                    }
                    return pages;
                  })()}

                  <button
                    onClick={() => loadResults(currentPage + 1)}
                    disabled={
                      currentPage === Math.ceil(totalCount / 1000) ||
                      filterLoading
                    }
                    className="px-3 py-1 text-sm bg-white border border-gray-300 rounded hover:bg-gray-50 disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed"
                  >
                    Next
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Student Details Modal */}
        {selectedAttempt && (
          <div
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
            onClick={() => setSelectedAttempt(null)}
          >
            <div
              className="bg-white rounded-xl max-w-md w-full shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                <h3 className="text-lg font-bold text-gray-900">
                  Student Details
                </h3>
                <button
                  onClick={() => setSelectedAttempt(null)}
                  className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <svg
                    className="w-5 h-5 text-gray-400 hover:text-gray-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>

              {/* Modal Content */}
              <div className="px-6 py-4">
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">
                      Full Name
                    </label>
                    <p className="text-lg font-semibold text-gray-900">
                      {selectedAttempt.profiles.full_name}
                    </p>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">
                      Email
                    </label>
                    <p className="text-gray-900">
                      {selectedAttempt.profiles.email}
                    </p>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">
                      Phone
                    </label>
                    <p className="text-gray-900">
                      {selectedAttempt.profiles.phone || "-"}
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-200">
                    <div>
                      <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">
                        Score
                      </label>
                      <p className="text-2xl font-bold text-green-600">
                        {selectedAttempt.total_score}
                      </p>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">
                        Time Taken
                      </label>
                      <p className="text-2xl font-bold text-gray-900">
                        {formatTimeTaken(selectedAttempt.time_taken)}
                      </p>
                    </div>
                  </div>
                  <div className="pt-4 border-t border-gray-200">
                    <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">
                      Submitted At
                    </label>
                    <p className="text-gray-900">
                      {formatDateTime(selectedAttempt.submitted_at)}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Click outside to close export menu */}
      {showExportMenu && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setShowExportMenu(false)}
        ></div>
      )}
    </div>
  );
}
