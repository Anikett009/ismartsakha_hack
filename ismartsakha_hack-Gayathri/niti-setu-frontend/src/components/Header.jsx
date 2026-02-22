import React from "react";
import { Leaf } from "lucide-react";
import { useNavigate } from "react-router-dom";

const Header = () => {
  const navigate = useNavigate();   // ✅ important

  return (
    <header className="bg-green-700 text-white p-4 shadow-md flex items-center justify-between">
      <div className="flex items-center gap-2">
        <Leaf size={28} />
        <h1 className="text-xl font-bold">Niti-Setu</h1>
      </div>

      <div className="space-x-4">
        <button
          onClick={() => navigate("/login")}
          className="px-4 py-2 rounded-lg bg-white text-green-700 font-semibold hover:bg-gray-100 transition"
        >
          Log In
        </button>

        <button
          onClick={() => navigate("/signup")}   // ✅ THIS
          className="px-4 py-2 rounded-lg border border-white font-semibold hover:bg-green-600 transition"
        >
          Sign Up
        </button>
      </div>
    </header>
  );
};

export default Header;

