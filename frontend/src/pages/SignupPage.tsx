import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Sprout } from "lucide-react";
import { authApi } from "../services/api";
import { useAuthStore } from "../store/authStore";
import toast from "react-hot-toast";

export default function SignupPage() {
  const navigate = useNavigate();
  const { login } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    full_name: "",
    email: "",
    password: "",
    phone: "",
    role: "customer",
    location: "",
  });
  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const handle = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await authApi.signup(form);
      await login(form.email, form.password, form.role);
      toast.success("Welcome to NeBo! ");
      navigate("/dashboard");
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || "Signup failed.");
    } finally {
      setLoading(false);
    }
  };

  const fields = [
    {
      label: "Full Name",
      key: "full_name",
      type: "text",
      placeholder: "Nkomo Martin",
      required: true,
    },
    {
      label: "Email",
      key: "email",
      type: "email",
      placeholder: "you@example.com",
      required: true,
    },
    {
      label: "Phone",
      key: "phone",
      type: "tel",
      placeholder: "+237 6XX XXX XXX",
      required: false,
    },
    {
      label: "Password",
      key: "password",
      type: "password",
      placeholder: "Min 8 characters",
      required: true,
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-700 to-green-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="flex items-center justify-center gap-3 mb-8">
          <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center">
            <Sprout size={26} className="text-green-700" />
          </div>
          <div className="text-white">
            <p className="text-2xl font-black">NeBo</p>
            <p className="text-green-300 text-sm">Join the marketplace</p>
          </div>
        </div>

        <div className="bg-white rounded-3xl p-8 shadow-2xl">
          <h2 className="text-2xl font-black text-green-900 mb-6">
            Create account
          </h2>

          <div className="flex bg-green-50 rounded-2xl p-1 mb-6">
            {["customer", "farmer"].map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => set("role", r)}
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
            {fields.map(({ label, key, type, placeholder, required }) => (
              <div key={key}>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                  {label}
                </label>
                <input
                  type={type}
                  required={required}
                  value={(form as any)[key]}
                  onChange={(e) => set(key, e.target.value)}
                  placeholder={placeholder}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>
            ))}

            {form.role === "farmer" && (
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                  Farm Location *
                </label>
                <input
                  type="text"
                  required
                  value={form.location}
                  onChange={(e) => set("location", e.target.value)}
                  placeholder="e.g. Bafoussam, West Region"
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-green-700 text-white py-3.5 rounded-xl font-bold text-sm hover:bg-green-800 transition-colors disabled:opacity-60"
            >
              {loading ? "Creating account…" : "Create Account"}
            </button>
          </form>

          <p className="text-center text-sm text-gray-400 mt-6">
            Already have an account?{" "}
            <Link
              to="/login"
              className="text-green-700 font-semibold hover:underline"
            >
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
