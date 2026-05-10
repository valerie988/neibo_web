import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Sparkles, MapPin, RefreshCw } from "lucide-react";
import { recommendApi } from "../services/api";
import { useAuthStore } from "../store/authStore";

function RecommendCard({ item, onClick }: { item: any; onClick: () => void }) {
  const { product, score, reason } = item;
  return (
    <div onClick={onClick}
      className="bg-white rounded-2xl overflow-hidden shadow-sm border border-green-50 hover:shadow-md hover:-translate-y-0.5 transition-all cursor-pointer group">
      <div className="h-40 bg-green-50 relative overflow-hidden">
        {product.photos?.[0]
          ? <img src={product.photos[0]} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
          : <div className="flex items-center justify-center h-full text-5xl">🌿</div>
        }
        <div className="absolute top-3 right-3 bg-white/90 backdrop-blur-sm text-green-700 text-xs font-bold px-2.5 py-1 rounded-full flex items-center gap-1">
          <Sparkles size={10} />{Math.round(score * 100)}% match
        </div>
      </div>
      <div className="p-4">
        <p className="font-bold text-green-900 truncate">{product.name}</p>
        <p className="text-xs text-gray-400 flex items-center gap-1 mt-1 truncate"><MapPin size={10} />{product.location}</p>
        <div className="mt-2 flex items-center justify-between">
          <span className="text-base font-black text-green-700">
            {product.price?.toLocaleString()} XAF
            <span className="text-xs text-gray-400 font-normal ml-1">/{product.unit}</span>
          </span>
        </div>
        <div className="mt-3 bg-green-50 rounded-xl px-3 py-1.5">
          <p className="text-xs text-green-600 font-medium">✨ {reason}</p>
        </div>
      </div>
    </div>
  );
}

export default function RecommendPage() {
  const navigate  = useNavigate();
  const { user }  = useAuthStore();
  const [items,   setItems]   = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    recommendApi.feed({ limit: 12 })
      .then((r) => setItems(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const handleClick = (item: any) => {
    recommendApi.trackView(item.product.id).catch(() => {});
    navigate(`/products/${item.product.id}`);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Sparkles size={22} className="text-green-700" />
            <h1 className="text-2xl font-black text-green-900">For You</h1>
          </div>
          <p className="text-gray-400 text-sm mt-1">
            Personalised picks based on your location{user?.location ? ` in ${user.location}` : ""} and browsing history
          </p>
        </div>
        <button onClick={load}
          className="flex items-center gap-2 text-green-700 border border-green-200 px-4 py-2 rounded-xl text-sm font-semibold hover:bg-green-50 transition-colors">
          <RefreshCw size={15} className={loading ? "animate-spin" : ""} />Refresh
        </button>
      </div>

      <div className="bg-gradient-to-r from-green-700 to-green-600 rounded-2xl p-5 text-white">
        <p className="font-bold text-sm mb-1">How recommendations work</p>
        <p className="text-green-200 text-xs leading-relaxed">
          We combine what you browse, your location, and similar customers' preferences to surface the freshest produce for you.
          The more you explore, the smarter it gets.
        </p>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="bg-white rounded-2xl h-64 animate-pulse border border-green-50" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-4xl mb-3">🌱</p>
          <p className="font-bold text-green-900">Building your feed…</p>
          <p className="text-sm text-gray-400 mt-2 max-w-sm mx-auto">
            Browse a few products to help us learn your preferences.
          </p>
          <button onClick={() => navigate("/products")}
            className="mt-4 bg-green-700 text-white px-6 py-2.5 rounded-xl text-sm font-bold hover:bg-green-800 transition-colors">
            Explore Products
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {items.map((item, i) => (
            <RecommendCard key={i} item={item} onClick={() => handleClick(item)} />
          ))}
        </div>
      )}
    </div>
  );
}
