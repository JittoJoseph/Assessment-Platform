"use client";

import { useState, useEffect } from "react";
import { FaUsers } from "react-icons/fa";

interface Admin {
  id: string;
  full_name: string;
  email: string;
}

export default function AdminManagement() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const fetchAdmins = async () => {
    try {
      const response = await fetch("/api/admin/admins");
      const data = await response.json();
      if (response.ok) {
        setAdmins(data.admins);
      } else {
        setError(data.error);
      }
    } catch {
      setError("Failed to fetch admins");
    }
  };

  const handleAddAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");
    setError("");

    try {
      const response = await fetch("/api/admin/add-admin", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (response.ok) {
        setMessage(data.message);
        setEmail("");
        // Refresh admins list
        await fetchAdmins();
      } else {
        setError(data.error);
      }
    } catch {
      setError("Failed to add admin");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isModalOpen) {
      fetchAdmins();
    }
  }, [isModalOpen]);

  return (
    <>
      {/* Admin Management Section */}
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm mt-8">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">
            Admin Management
          </h3>
          <p className="text-sm text-gray-600 mt-1">
            Manage admin access for the platform
          </p>
        </div>

        <div className="p-6">
          <button
            onClick={() => setIsModalOpen(true)}
            className="bg-black hover:bg-gray-800 text-white px-6 py-3 rounded-lg font-semibold transition-colors flex items-center"
          >
            <FaUsers className="w-5 h-5 mr-2" />
            Manage Admins
          </button>
        </div>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-semibold text-gray-900">
                  Admin Management
                </h2>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg
                    className="w-6 h-6"
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

              {/* Current Admins */}
              <div className="mb-6">
                <h3 className="text-lg font-medium text-gray-900 mb-3">
                  Current Admins
                </h3>
                {admins.length === 0 ? (
                  <p className="text-gray-600">No admins found.</p>
                ) : (
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {admins.map((admin) => (
                      <div
                        key={admin.id}
                        className="flex justify-between items-center p-3 bg-gray-50 rounded-lg"
                      >
                        <div>
                          <p className="font-medium text-gray-900">
                            {admin.full_name}
                          </p>
                          <p className="text-sm text-gray-600">{admin.email}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Add Admin Form */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-3">
                  Add New Admin
                </h3>
                <form onSubmit={handleAddAdmin} className="space-y-4">
                  <div>
                    <label
                      htmlFor="email"
                      className="block text-sm font-medium text-gray-700 mb-1"
                    >
                      Email Address
                    </label>
                    <input
                      type="email"
                      id="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent text-black placeholder:text-black"
                      placeholder="Enter registered user's email"
                      required
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Only registered users can be made admins.
                    </p>
                  </div>

                  {message && (
                    <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                      <p className="text-sm text-green-800">{message}</p>
                    </div>
                  )}

                  {error && (
                    <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                      <p className="text-sm text-red-800">{error}</p>
                    </div>
                  )}

                  <div className="flex justify-end space-x-3">
                    <button
                      type="button"
                      onClick={() => setIsModalOpen(false)}
                      className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={loading}
                      className="px-4 py-2 bg-black hover:bg-gray-800 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {loading ? "Adding..." : "Add Admin"}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
