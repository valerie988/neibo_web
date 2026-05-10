import { useEffect, useState } from "react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from "recharts";
import { ShoppingBasket, TrendingUp, PackageCheck, Leaf } from "lucide-react";
import { ordersApi, productsApi } from "../services/api";
import { useAuthStore } from "../store/authStore";
import { format, subDays } from "date-fns";

function StatCard({ icon: Icon, label, value, color }: any) {
  return (
    <div className="bg-white rounded-2xl p-6 flex items-center gap-4 shadow-sm border border-green-50">
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${color}`}>
        <Icon size={22} className="text-white" />
      </div>
      <div>
        <p className="text-sm text-gray-400 font-medium">{label}</p>
        <p className="text-2xl font-black text-green-900">{value}</p>
      </div>
    </div>
  );
}

function mockRevenue() {
  return Array.from({ length: 7 }, (_, i) => ({
    day: format(subDays(new Date(), 6 - i), "EEE"),
    revenue: Math.floor(Math.random() * 80000 + 20000),
    orders:  Math.floor(Math.random() * 20 + 5),
  }));
}

export default function DashboardPage() {
  const { user }   = useAuthStore();
  const [orders,   setOrders]   = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [chartData] = useState(mockRevenue());
  const [loading,  setLoading]  = useState(true);
  const isFarmer = user?.role === "farmer";

  useEffect(() => {
    Promise.all([
      ordersApi.list().then((r) => setOrders(r.data)).catch(() => {}),
      isFarmer ? productsApi.my().then((r) => setProducts(r.data)).catch(() => {}) : Promise.resolve(),
    ]).finally(() => setLoading(false));
  }, [isFarmer]);

  const totalRevenue  = orders.reduce((s, o) => s + (o.total_amount || 0), 0);
  const pendingOrders = orders.filter((o) => o.status === "processing").length;

  const categoryData = products.reduce((acc: any[], p: any) => {
    const ex = acc.find((a) => a.name === p.category);
    ex ? ex.count++ : acc.push({ name: p.category, count: 1 });
    return acc;
  }, []);

  const orderStatusData = [
    { name: "Processing", count: orders.filter(o => o.status === "processing").length },
    { name: "Confirmed",  count: orders.filter(o => o.status === "confirmed").length  },
    { name: "Delivered",  count: orders.filter(o => o.status === "delivered").length  },
    { name: "Cancelled",  count: orders.filter(o => o.status === "cancelled").length  },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-green-900">
          Good {new Date().getHours() < 12 ? "morning" : "afternoon"}, {user?.full_name?.split(" ")[0]} 👋
        </h1>
        <p className="text-gray-400 text-sm mt-1">Here's what's happening today</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard icon={TrendingUp}    label="Total Revenue"   value={`${totalRevenue.toLocaleString()} XAF`} color="bg-green-700" />
        <StatCard icon={PackageCheck}  label="Total Orders"    value={orders.length}                          color="bg-blue-500"  />
        <StatCard icon={ShoppingBasket} label="Pending Orders" value={pendingOrders}                          color="bg-amber-500" />
        {isFarmer && <StatCard icon={Leaf} label="My Products" value={products.length} color="bg-purple-500" />}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 bg-white rounded-2xl p-6 shadow-sm border border-green-50">
          <h3 className="text-base font-bold text-green-900 mb-1">Revenue (last 7 days)</h3>
          <p className="text-xs text-gray-400 mb-4">XAF</p>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#1B4332" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#1B4332" stopOpacity={0}    />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0faf4" />
              <XAxis dataKey="day" tick={{ fontSize: 12, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} tickLine={false} tickFormatter={(v) => `${(v/1000).toFixed(0)}k`} />
              <Tooltip formatter={(v: any) => [`${v.toLocaleString()} XAF`, "Revenue"]} />
              <Area type="monotone" dataKey="revenue" stroke="#1B4332" strokeWidth={2.5} fill="url(#grad)" dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-sm border border-green-50">
          <h3 className="text-base font-bold text-green-900 mb-4">{isFarmer ? "Products by Category" : "Orders by Status"}</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={isFarmer ? categoryData : orderStatusData} barSize={28}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0faf4" />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
              <Tooltip />
              <Bar dataKey="count" fill="#1B4332" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-green-50 overflow-hidden">
        <div className="px-6 py-4 border-b border-green-50">
          <h3 className="font-bold text-green-900">Recent Orders</h3>
        </div>
        {loading ? (
          <div className="p-8 text-center text-gray-400 text-sm">Loading…</div>
        ) : orders.length === 0 ? (
          <div className="p-8 text-center text-gray-400 text-sm">No orders yet</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-gray-400 uppercase tracking-wider border-b border-green-50">
                  {["Order ID", "Status", "Total", "Date"].map((h) => (
                    <th key={h} className="px-6 py-3 text-left font-semibold">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {orders.slice(0, 6).map((o) => (
                  <tr key={o.id} className="border-b border-green-50 hover:bg-green-50/40 transition-colors">
                    <td className="px-6 py-4 font-mono text-xs text-gray-500">{o.id.slice(0, 8)}…</td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-semibold capitalize ${
                        o.status === "delivered"  ? "bg-green-100 text-green-700" :
                        o.status === "processing" ? "bg-amber-100 text-amber-700" :
                        o.status === "cancelled"  ? "bg-red-100 text-red-600"     :
                        "bg-blue-100 text-blue-700"
                      }`}>{o.status}</span>
                    </td>
                    <td className="px-6 py-4 font-semibold text-green-900">{o.total_amount?.toLocaleString()} XAF</td>
                    <td className="px-6 py-4 text-gray-400">{format(new Date(o.created_at), "dd MMM yyyy")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
