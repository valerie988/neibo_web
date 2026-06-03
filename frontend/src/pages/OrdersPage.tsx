import { useEffect, useState } from "react";
import { format } from "date-fns";
import { Package, ChevronDown, ChevronUp } from "lucide-react";
import { ordersApi } from "../services/api";
import { useAuthStore } from "../store/authStore";
import toast from "react-hot-toast";
import clsx from "clsx";

const STATUS_COLOR: Record<string, string> = {
  processing: "bg-amber-100 text-amber-700",
  confirmed:  "bg-blue-100 text-blue-700",
  in_transit: "bg-purple-100 text-purple-700",
  delivered:  "bg-green-100 text-green-700",
  cancelled:  "bg-red-100 text-red-600",
};
const STATUS_FLOW = ["processing", "confirmed", "in_transit", "delivered"];

function OrderRow({ order, isFarmer }: { order: any; isFarmer: boolean }) {
  const [open,     setOpen]     = useState(false);
  const [updating, setUpdating] = useState(false);
  const nextStatus = STATUS_FLOW[STATUS_FLOW.indexOf(order.status) + 1];

  const advance = async () => {
    if (!nextStatus) return;
    setUpdating(true);
    try {
      await ordersApi.updateStatus(order.id, nextStatus);
      toast.success(`Marked as ${nextStatus.replace("_", " ")}`);
      window.location.reload();
    } catch {
      toast.error("Failed to update status");
    } finally {
      setUpdating(false);
    }
  };

  return (
    <div className="border border-green-50 rounded-2xl overflow-hidden bg-white">
      <button onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-4 p-4 text-left hover:bg-green-50/40 transition-colors">
        <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center flex-shrink-0">
          <Package size={18} className="text-green-700" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-green-900 text-sm">Order #{order.id.slice(0, 8)}</p>
          <p className="text-xs text-gray-400 mt-0.5">{format(new Date(order.created_at), "dd MMM yyyy · HH:mm")}</p>
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          <span className={clsx("px-2.5 py-1 rounded-full text-xs font-semibold capitalize", STATUS_COLOR[order.status])}>
            {order.status.replace("_", " ")}
          </span>
          <span className="font-bold text-green-900 text-sm">{order.total_amount?.toLocaleString()} XAF</span>
          {open ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
        </div>
      </button>

      {open && (
        <div className="border-t border-green-50 px-4 pb-4 pt-3 space-y-3">
          <div className="space-y-2">
            {order.items?.map((item: any, i: number) => (
              <div key={i} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <span className="text-gray-500">{item.quantity}×</span>
                  <span className="font-medium text-green-900">{item.product?.name || `Product #${item.product_id.slice(0, 6)}`}</span>
                </div>
                <span className="text-gray-500">{(item.unit_price * item.quantity).toLocaleString()} XAF</span>
              </div>
            ))}
          </div>
          {order.delivery_address && <p className="text-xs text-gray-400">📍 {order.delivery_address}</p>}
          {order.notes && <p className="text-xs text-gray-400 italic">"{order.notes}"</p>}
          {isFarmer && nextStatus && order.status !== "cancelled" && (
            <button onClick={advance} disabled={updating}
              className="bg-green-700 text-white text-xs font-bold px-4 py-2 rounded-xl hover:bg-green-800 transition-colors disabled:opacity-60 capitalize">
              {updating ? "Updating…" : `Mark as ${nextStatus.replace("_", " ")}`}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export default function OrdersPage() {
  const { user }  = useAuthStore();
  const [orders,  setOrders]  = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter,  setFilter]  = useState("all");
  const isFarmer = user?.role === "farmer";

  useEffect(() => {
    ordersApi.list()
      .then((r) => setOrders(r.data))
      .catch(() => toast.error("Failed to load orders"))
      .finally(() => setLoading(false));
  }, []);

  const tabs = ["all", "processing", "confirmed", "in_transit", "delivered", "cancelled"];
  const filtered = filter === "all" ? orders : orders.filter((o) => o.status === filter);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-green-900">Orders</h1>
        <p className="text-gray-400 text-sm mt-0.5">{orders.length} total</p>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {tabs.map((t) => (
          <button key={t} onClick={() => setFilter(t)}
            className={clsx(
              "px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all capitalize",
              filter === t ? "bg-green-700 text-white" : "bg-white text-gray-500 border border-gray-200 hover:border-green-300"
            )}>
            {t.replace("_", " ")} ({t === "all" ? orders.length : orders.filter(o => o.status === t).length})
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => <div key={i} className="h-20 bg-white rounded-2xl animate-pulse border border-green-50" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20">
         
          <p className="font-semibold text-gray-500">No orders found</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((o) => <OrderRow key={o.id} order={o} isFarmer={isFarmer} />)}
        </div>
      )}
    </div>
  );
}
