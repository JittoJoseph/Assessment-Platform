"use client";

import { useState } from "react";
import Link from "next/link";
import { FaBars, FaTimes, FaUser } from "react-icons/fa";

interface User {
  full_name: string;
}

interface NavbarProps {
  user: User | null;
}

export default function Navbar({ user }: NavbarProps) {
  const [isOpen, setIsOpen] = useState(false);

  const toggleMenu = () => setIsOpen(!isOpen);

  const handleLogout = async () => {
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
  };

  const getUserDisplay = (fullName: string) => {
    const names = fullName.split(" ");
    return names[0]; // Just show first name
  };

  return (
    <header className="absolute top-0 left-0 right-0 z-10 pt-6">
      <div className="max-w-6xl mx-auto px-6">
        <div className="flex justify-between items-center">
          {/* Logo */}
          <div className="text-2xl font-bold text-black">
            <Link href="/" className="hover:text-gray-600 transition-colors">
              Assessment
            </Link>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-4">
            {user ? (
              <>
                <div className="flex items-center space-x-2 text-gray-600">
                  <FaUser size={14} />
                  <span className="text-sm font-medium">
                    {getUserDisplay(user.full_name)}
                  </span>
                </div>
                <button
                  onClick={handleLogout}
                  className="bg-black text-white px-3 py-1.5 rounded-md hover:bg-gray-800 transition-colors font-medium text-sm"
                >
                  Logout
                </button>
              </>
            ) : (
              <Link
                href="/auth"
                className="bg-black text-white px-3 py-1.5 rounded-md hover:bg-gray-800 transition-colors font-medium text-sm"
              >
                Sign in
              </Link>
            )}
          </nav>

          {/* Mobile Menu Button */}
          <button
            onClick={toggleMenu}
            className="md:hidden text-gray-600 hover:text-black transition-colors p-2"
            aria-label="Toggle menu"
          >
            {isOpen ? <FaTimes size={20} /> : <FaBars size={20} />}
          </button>
        </div>

        {/* Mobile Navigation */}
        {isOpen && (
          <div className="md:hidden mt-4 pb-4 border-t border-gray-200 pt-4">
            <nav className="flex flex-col space-y-4">
              {user ? (
                <>
                  <div className="flex items-center space-x-2 text-gray-600 px-2">
                    <FaUser size={14} />
                    <span className="text-sm font-medium">
                      {getUserDisplay(user.full_name)}
                    </span>
                  </div>
                  <button
                    onClick={() => {
                      handleLogout();
                      setIsOpen(false);
                    }}
                    className="bg-black text-white px-3 py-2 rounded-md hover:bg-gray-800 transition-colors font-medium text-sm mx-2"
                  >
                    Logout
                  </button>
                </>
              ) : (
                <Link
                  href="/auth"
                  className="bg-black text-white px-3 py-2 rounded-md hover:bg-gray-800 transition-colors font-medium text-sm mx-2 block text-center"
                  onClick={() => setIsOpen(false)}
                >
                  Sign in
                </Link>
              )}
            </nav>
          </div>
        )}
      </div>
    </header>
  );
}
