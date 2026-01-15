export default function Footer() {
  return (
    <footer className="py-8 px-6 bg-gray-50 border-t border-gray-200">
      <div className="max-w-4xl mx-auto flex flex-col md:flex-row justify-between items-center">
        <p className="text-gray-600 text-sm mb-4 md:mb-0">
          Powered by{" "}
          <a
            href="https://early.bloombloom.co"
            target="_blank"
            rel="noopener noreferrer"
            className="text-black font-semibold hover:text-gray-800 transition-colors"
          >
            Bloombloom
          </a>
        </p>
        <p className="text-gray-500 text-xs">
          © {new Date().getFullYear()} Bloombloom. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
