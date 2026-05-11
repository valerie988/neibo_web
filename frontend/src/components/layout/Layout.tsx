import { Outlet, NavLink, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  ShoppingBasket,
  MessageSquare,
  ClipboardList,
  Sparkles,
  LogOut,
  Sprout,
  Menu,
  X,
} from "lucide-react";
import { useState } from "react";
import { useAuthStore } from "../../store/authStore";
import clsx from "clsx";

const nav = [
  { to: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { to: "/products", icon: ShoppingBasket, label: "Products" },
  { to: "/chat", icon: MessageSquare, label: "Messages" },
  { to: "/orders", icon: ClipboardList, label: "Orders" },
  { to: "/recommend", icon: Sparkles, label: "For You" },
];

function SidebarContent({ onNav }: { onNav?: () => void }) {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <div className="flex flex-col h-full">
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
            onClick={onNav}
            className={({ isActive }) =>
              clsx(
                "flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all",
                isActive
                  ? "bg-white/20 text-white"
                  : "text-green-200 hover:bg-white/10 hover:text-white",
              )
            }
          >
            <Icon size={20} />
            {label}
          </NavLink>
        ))}
      </nav>

      <div className="border-t border-white/10 pt-4 mt-4">
        <div className="flex items-center gap-3 px-2 mb-4">
          <div className="w-9 h-9 bg-green-400 rounded-full flex items-center justify-center text-green-900 font-bold text-sm">
            {user?.full_name?.slice(0, 2).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold truncate">{user?.full_name}</p>
            <p className="text-green-400 text-xs truncate">{user?.email}</p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm text-green-200 hover:bg-white/10 hover:text-white transition-all"
        >
          <LogOut size={18} /> Logout
        </button>
      </div>
    </div>
  );
}

export default function Layout() {
  const [open, setOpen] = useState(false);

  return (
    <div className="flex h-screen bg-green-50 overflow-hidden">
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex flex-col w-64 bg-green-700 text-white p-6 flex-shrink-0">
        <SidebarContent />
      </aside>

      {/* Mobile drawer */}
      {open && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div
            className="fixed inset-0 bg-black/50"
            onClick={() => setOpen(false)}
          />
          <aside className="relative z-10 w-64 bg-green-700 text-white p-6 h-full">
            <button
              onClick={() => setOpen(false)}
              className="absolute top-4 right-4 text-white/60 hover:text-white"
            >
              <X size={22} />
            </button>
            <SidebarContent onNav={() => setOpen(false)} />
          </aside>
        </div>
      )}

      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Mobile topbar */}
        <div className="lg:hidden flex items-center gap-3 px-4 py-3 bg-white border-b border-green-100 flex-shrink-0">
          <button onClick={() => setOpen(true)} className="text-green-700">
            <Menu size={24} />
          </button>
          <span className="font-bold text-green-700">NeBo</span>
        </div>
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
