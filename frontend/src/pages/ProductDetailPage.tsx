import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, MapPin, Phone, MessageSquare, ShoppingCart } from "lucide-react";
import { productsApi, ordersApi } from "../services/api";
import { useAuthStore } from "../store/authStore";
import toast from "react-hot-toast";

export default function ProductDetailPage() {
  const { id }   = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [product,  setProduct]  = useState<any>(null);
  const [loading,  setLoading]  = useState(true);
  const [photoIdx, setPhotoIdx] = useState(0);
  const [qty,      setQty]      = useState(1);
  const [ordering, setOrdering] = useState(false);

  useEffect(() => {
    if (!id) return;
    productsApi.get(id)
      .then((r) => setProduct(r.data))
      .catch(() => toast.error("Product not found"))
      .finally(() => setLoading(false));
  }, [id]);

  const handleOrder = async () => {
    if (!product) return;
    setOrdering(true);
    try {
      await ordersApi.create({ items: [{ product_id: product.id, quantity: qty }] });
      toast.success("Order placed! 🎉");
      navigate("/orders");
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || "Order failed");
    } finally {
      setOrdering(false);
    }
  };

  const handleChat = () => {
    if (!product?.farmer) return;
    navigate(`/chat?with=${product.farmer.id}&name=${encodeURIComponent(product.farmer.full_name)}`);
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-4 border-green-700 border-t-transparent rounded-full animate-spin" />
    </div>
  );
  if (!product) return null;

  const farmer = product.farmer;
  const initials = farmer?.full_name?.split(" ").map((n: string) => n[0]).slice(0, 2).join("").toUpperCase() || "??";

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <button onClick={() => navigate(-1)}
        className="flex items-center gap-2 text-green-700 font-semibold text-sm hover:gap-3 transition-all">
        <ArrowLeft size={18} />Back
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Photos */}
        <div className="space-y-3">
          <div className="aspect-square bg-green-50 rounded-3xl overflow-hidden">
            {product.photos?.length > 0
              ? <img src={product.photos[photoIdx]} alt={product.name} className="w-full h-full object-cover" />
              : <div className="flex items-center justify-center h-full text-8xl">🌿</div>
            }
          </div>
          {product.photos?.length > 1 && (
            <div className="flex gap-2 flex-wrap">
              {product.photos.map((url: string, i: number) => (
                <button key={i} onClick={() => setPhotoIdx(i)}
                  className={`w-16 h-16 rounded-xl overflow-hidden border-2 transition-all ${i === photoIdx ? "border-green-700" : "border-transparent"}`}>
                  <img src={url} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Info */}
        <div className="space-y-5">
          <div>
            <span className="bg-green-100 text-green-700 text-xs font-bold px-3 py-1 rounded-full capitalize">{product.category}</span>
            <h1 className="text-3xl font-black text-green-900 mt-3">{product.name}</h1>
            <p className="flex items-center gap-1.5 text-gray-400 text-sm mt-2"><MapPin size={14} />{product.location}</p>
          </div>

          <div className="flex items-baseline gap-2">
            <span className="text-4xl font-black text-green-700">{product.price?.toLocaleString()}</span>
            <span className="text-gray-400">XAF / {product.unit}</span>
          </div>

          <div className="flex items-center gap-2 text-sm text-gray-500">
            <span className={`w-2 h-2 rounded-full ${product.in_stock ? "bg-green-500" : "bg-red-400"}`} />
            {product.in_stock ? `${product.quantity} ${product.unit} available` : "Out of stock"}
          </div>

          {product.description && (
            <p className="text-gray-500 text-sm leading-relaxed">{product.description}</p>
          )}

          {user?.role === "customer" && product.in_stock && (
            <div className="flex items-center gap-4">
              <span className="text-sm font-semibold text-gray-600">Quantity</span>
              <div className="flex items-center gap-3 bg-green-50 rounded-xl p-1">
                <button onClick={() => setQty(Math.max(1, qty - 1))}
                  className="w-8 h-8 rounded-lg bg-white font-bold text-green-700 shadow-sm hover:bg-green-100 transition-colors">−</button>
                <span className="w-8 text-center font-bold text-green-900">{qty}</span>
                <button onClick={() => setQty(Math.min(product.quantity, qty + 1))}
                  className="w-8 h-8 rounded-lg bg-white font-bold text-green-700 shadow-sm hover:bg-green-100 transition-colors">+</button>
              </div>
              <span className="text-sm text-gray-400 font-semibold">= {(product.price * qty).toLocaleString()} XAF</span>
            </div>
          )}

          {user?.role === "customer" && (
            <div className="flex gap-3 pt-2">
              <button onClick={handleOrder} disabled={ordering || !product.in_stock}
                className="flex-1 flex items-center justify-center gap-2 bg-green-700 text-white py-3.5 rounded-2xl font-bold text-sm hover:bg-green-800 transition-colors disabled:opacity-60">
                <ShoppingCart size={18} />
                {ordering ? "Placing order…" : "Order Now"}
              </button>
              <button onClick={handleChat}
                className="flex items-center justify-center gap-2 border-2 border-green-200 text-green-700 px-5 py-3.5 rounded-2xl font-bold text-sm hover:bg-green-50 transition-colors">
                <MessageSquare size={18} />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Farmer card */}
      {farmer && (
        <div className="bg-white rounded-2xl p-6 border border-green-50 shadow-sm">
          <h3 className="font-bold text-green-900 mb-4">About the Farmer</h3>
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-green-100 rounded-2xl flex items-center justify-center text-green-700 font-black text-lg">
              {initials}
            </div>
            <div className="flex-1">
              <p className="font-bold text-green-900 flex items-center gap-2">
                {farmer.full_name}
                {farmer.is_verified && <span className="text-sm">✅</span>}
              </p>
              {farmer.location && (
                <p className="text-sm text-gray-400 flex items-center gap-1 mt-0.5"><MapPin size={12} />{farmer.location}</p>
              )}
            </div>
            {farmer.phone && (
              <a href={`tel:${farmer.phone}`}
                className="flex items-center gap-2 text-green-700 border border-green-200 px-4 py-2 rounded-xl text-sm font-semibold hover:bg-green-50 transition-colors">
                <Phone size={15} />{farmer.phone}
              </a>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
