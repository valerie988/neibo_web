import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Sprout, Eye, EyeOff } from "lucide-react";
import { useAuthStore } from "../store/authStore";
import toast from "react-hot-toast";

export default function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuthStore();
  const [form, setForm] = useState({
    email: "",
    password: "",
    role: "customer",
  });
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);

  const handle = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(form.email, form.password, form.role);
      navigate("/dashboard");
    } catch {
      toast.error("Invalid credentials. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-700 to-green-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="flex items-center justify-center gap-3 mb-8">
          <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center">
            <Sprout size={26} className="text-green-700" />
          </div>
          <div className="text-white">
            <p className="text-2xl font-black">NeBo</p>
            <p className="text-green-300 text-sm">Farm fresh, delivered</p>
          </div>
        </div>

        <div className="bg-white rounded-3xl p-8 shadow-2xl">
          <h2 className="text-2xl font-black text-green-900 mb-1">
            Welcome back
          </h2>
          <p className="text-gray-400 text-sm mb-8">Sign in to your account</p>

          <div className="flex bg-green-50 rounded-2xl p-1 mb-6">
            {["customer", "farmer"].map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setForm((f) => ({ ...f, role: r }))}
                className={`flex-1 py-2.5 rounded-xl text-sm font-semibold capitalize transition-all ${
                  form.role === r
                    ? "bg-green-700 text-white shadow"
                    : "text-gray-400 hover:text-green-700"
                }`}
              >
                {r === "farmer" ? "Farmer" : "Customer"}
              </button>
            ))}
          </div>

          <form onSubmit={handle} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                Email
              </label>
              <input
                type="email"
                required
                value={form.email}
                onChange={(e) =>
                  setForm((f) => ({ ...f, email: e.target.value }))
                }
                className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                placeholder="you@example.com"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPw ? "text" : "password"}
                  required
                  value={form.password}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, password: e.target.value }))
                  }
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-500 pr-11"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPw(!showPw)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
                >
                  {showPw ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-green-700 text-white py-3.5 rounded-xl font-bold text-sm hover:bg-green-800 transition-colors disabled:opacity-60 mt-2"
            >
              {loading ? "Signing in…" : "Sign In"}
            </button>
          </form>

          <p className="text-center text-sm text-gray-400 mt-6">
            No account?{" "}
            <Link
              to="/signup"
              className="text-green-700 font-semibold hover:underline"
            >
              Create one
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
