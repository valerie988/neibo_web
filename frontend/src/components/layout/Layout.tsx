import { Outlet, NavLink, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  ShoppingBasket,
  MessageSquare,
  ClipboardList,
  Sparkles,
  LogOut,
  Sprout,
} from "lucide-react";
import { useAuthStore } from "../../store/authStore";
import clsx from "clsx";

const nav = [
  { to: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { to: "/products", icon: ShoppingBasket, label: "Products" },
  { to: "/chat", icon: MessageSquare, label: "Messages" },
  { to: "/orders", icon: ClipboardList, label: "Orders" },
  { to: "/recommend", icon: Sparkles, label: "For You" },
];

export default function Layout() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <div className="flex h-screen bg-green-50 overflow-hidden">
      {/* --- DESKTOP SIDEBAR --- */}
      <aside className="hidden lg:flex flex-col w-64 bg-green-700 text-white p-6 flex-shrink-0">
        <div className="flex items-center gap-3 mb-10">
          <div className="w-10 h-10 bg-green-400 rounded-xl flex items-center justify-center">
            <Sprout size={22} className="text-green-900" />
          </div>
          <div>
            <p className="font-bold text-lg leading-tight">NeBo</p>
            <p className="text-green-400 text-xs capitalize">{user?.role}</p>
          </div>
        </div>

        <nav className="flex-1 space-y-1">
          {nav.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                clsx(
                  "flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all",
                  isActive ? "bg-white/20 text-white" : "text-green-200 hover:bg-white/10 hover:text-white"
                )
              }
            >
              <Icon size={20} />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="border-t border-white/10 pt-4 mt-4">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm text-green-200 hover:bg-white/10 hover:text-white transition-all"
          >
            <LogOut size={18} /> Logout
          </button>
        </div>
      </aside>

      {/* --- MOBILE/DESKTOP CONTENT AREA --- */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        {/* Mobile Header (Hidden on Desktop) */}
        <header className="lg:hidden flex items-center justify-between px-4 py-3 bg-white border-b border-green-100 flex-shrink-0">
          <span className="font-bold text-green-700 text-lg">NeBo</span>
          <button onClick={handleLogout} className="text-green-700 p-2">
            <LogOut size={20} />
          </button>
        </header>

        {/* Main View */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          <Outlet />
        </main>

        {/* Mobile Bottom Navigation (Hidden on Desktop) */}
        <nav className="lg:hidden grid grid-cols-5 bg-white border-t border-green-100 pt-2 pb-6 px-1">
          {nav.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                clsx(
                  "flex flex-col items-center gap-1 text-[10px] font-medium py-1",
                  isActive ? "text-green-700" : "text-green-300"
                )
              }
            >
              <Icon size={22} />
              <span className="truncate w-full text-center">{label}</span>
            </NavLink>
          ))}
        </nav>
      </div>
    </div>
  );
}