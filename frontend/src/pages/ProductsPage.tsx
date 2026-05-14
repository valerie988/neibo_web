import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Plus, X, MapPin } from "lucide-react";
import { productsApi, recommendApi } from "../services/api";
import { useAuthStore } from "../store/authStore";
import toast from "react-hot-toast";

const CATEGORIES = [
  "All",
  "Vegetables",
  "Fruits",
  "Grains",
  "Dairy",
  "Meat",
  "Beverages",
  "Other",
];
const UNITS = ["kg", "bunch", "piece", "litre", "bag"];

// --- PRODUCT CARD (UNTOUCHED UI) ---
function ProductCard({
  product,
  onClick,
}: {
  product: any;
  onClick: () => void;
}) {
  // Cloudinary Optimization: we inject transformation parameters into the URL
  const getOptimizedUrl = (url: string) => {
    if (!url || !url.includes("cloudinary")) return url;
    return url.replace("/upload/", "/upload/f_auto,q_auto,w_600/");
  };

  return (
    <div
      onClick={onClick}
      className="bg-white rounded-2xl overflow-hidden shadow-sm border border-green-50 hover:shadow-md hover:-translate-y-0.5 transition-all cursor-pointer"
    >
      <div className="h-44 bg-green-50 relative overflow-hidden">
        {product.photos?.[0] ? (
          <img
            src={getOptimizedUrl(product.photos[0])}
            alt={product.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="flex items-center justify-center h-full text-6xl">
            🌿
          </div>
        )}
        {!product.in_stock && (
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
            <span className="bg-white text-red-600 text-xs font-bold px-3 py-1 rounded-full">
              Out of Stock
            </span>
          </div>
        )}
        <span className="absolute top-3 left-3 bg-white/90 text-green-700 text-xs font-bold px-2.5 py-1 rounded-full capitalize">
          {product.category}
        </span>
      </div>
      <div className="p-4">
        <p className="font-bold text-green-900 truncate">{product.name}</p>
        <p className="text-xs text-gray-400 flex items-center gap-1 mt-1 truncate">
          <MapPin size={11} />
          {product.location}
        </p>
        <div className="flex items-center justify-between mt-3">
          <div>
            <span className="text-lg font-black text-green-700">
              {product.price?.toLocaleString()}
            </span>
            <span className="text-xs text-gray-400 ml-1">
              XAF/{product.unit}
            </span>
          </div>
          <span className="text-xs text-gray-400">
            {product.quantity} {product.unit}
          </span>
        </div>
      </div>
    </div>
  );
}

// --- CREATE MODAL (UPDATED LOGIC, SAME UI) ---
function CreateModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: () => void;
}) {
  const [form, setForm] = useState({
    name: "",
    category: "Vegetables",
    price: "",
    unit: "kg",
    quantity: "",
    description: "",
    location: "",
  });
  const [photos, setPhotos] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  // CLOUDINARY UPLOAD HANDLER
  const uploadToCloudinary = async (file: File) => {
    const cloudName = "your_cloud_name"; // REPLACE WITH YOUR ACTUAL CLOUD NAME
    const uploadPreset = "your_preset_name"; // REPLACE WITH YOUR ACTUAL PRESET NAME

    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", uploadPreset);

    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
      {
        method: "POST",
        body: formData,
      },
    );

    if (!response.ok) throw new Error("Image upload failed");
    const data = await response.json();
    return data.secure_url;
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      // 1. Upload images to Cloudinary first
      const uploadedPhotoUrls = await Promise.all(
        photos.map((file) => uploadToCloudinary(file)),
      );

      // 2. Prepare JSON payload instead of FormData
      const payload = {
        ...form,
        price: parseFloat(form.price),
        quantity: parseFloat(form.quantity),
        photos: uploadedPhotoUrls, // Pass the array of strings
      };

      // 3. Submit to FastAPI
      await productsApi.create(payload);

      toast.success("Product created!");
      onCreated();
      onClose();
    } catch (err: any) {
      toast.error(
        err?.response?.data?.detail ||
          err.message ||
          "Failed to create product",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-green-50">
          <h2 className="text-lg font-black text-green-900">Add New Product</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X size={22} />
          </button>
        </div>
        <form onSubmit={submit} className="p-6 space-y-4">
          {[
            {
              label: "Product Name",
              key: "name",
              type: "text",
              placeholder: "Roma Tomatoes",
              required: true,
            },
            {
              label: "Location",
              key: "location",
              type: "text",
              placeholder: "Bafoussam, West Region",
              required: true,
            },
            {
              label: "Price (XAF)",
              key: "price",
              type: "number",
              placeholder: "500",
              required: true,
            },
            {
              label: "Quantity",
              key: "quantity",
              type: "number",
              placeholder: "100",
              required: true,
            },
            {
              label: "Description",
              key: "description",
              type: "text",
              placeholder: "Fresh and organic…",
              required: false,
            },
          ].map(({ label, key, type, placeholder, required }) => (
            <div key={key}>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                {label}
              </label>
              {key === "description" ? (
                <textarea
                  value={(form as any)[key]}
                  onChange={(e) => set(key, e.target.value)}
                  placeholder={placeholder}
                  rows={3}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-500 resize-none"
                />
              ) : (
                <input
                  type={type}
                  required={required}
                  value={(form as any)[key]}
                  onChange={(e) => set(key, e.target.value)}
                  placeholder={placeholder}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              )}
            </div>
          ))}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                Category
              </label>
              <select
                value={form.category}
                onChange={(e) => set("category", e.target.value)}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                {CATEGORIES.filter((c) => c !== "All").map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                Unit
              </label>
              <select
                value={form.unit}
                onChange={(e) => set("unit", e.target.value)}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                {UNITS.map((u) => (
                  <option key={u}>{u}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
              Photos (max 4)
            </label>
            <input
              ref={fileRef}
              type="file"
              multiple
              accept="image/*"
              className="hidden"
              onChange={(e) =>
                setPhotos(Array.from(e.target.files || []).slice(0, 4))
              }
            />
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="w-full border-2 border-dashed border-green-200 rounded-xl py-4 text-sm text-green-600 hover:bg-green-50 transition-colors"
            >
              {photos.length > 0
                ? `${photos.length} photo(s) selected`
                : "Click to upload photos"}
            </button>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-green-700 text-white py-3.5 rounded-xl font-bold text-sm hover:bg-green-800 transition-colors disabled:opacity-60"
          >
            {loading ? "Uploading Media..." : "Create Product"}
          </button>
        </form>
      </div>
    </div>
  );
}

// --- MAIN PAGE (UNTOUCHED UI) ---
export default function ProductsPage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [products, setProducts] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const params: any = {};
      if (search) params.search = search;
      if (category !== "All") params.category = category;
      const { data } = await productsApi.list(params);
      setProducts(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [search, category]);

  const handleView = (id: string) => {
    recommendApi.trackView(id).catch(() => {});
    navigate(`/products/${id}`);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-green-900">Products</h1>
          <p className="text-gray-400 text-sm mt-0.5">
            {products.length} items found
          </p>
        </div>
        {user?.role === "farmer" && (
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 bg-green-700 text-white px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-green-800 transition-colors"
          >
            <Plus size={18} />
            Add Product
          </button>
        )}
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search
            size={16}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"
          />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search products…"
            className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
          />
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1">
          {CATEGORIES.map((c) => (
            <button
              key={c}
              onClick={() => setCategory(c)}
              className={`px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                category === c
                  ? "bg-green-700 text-white"
                  : "bg-white text-gray-500 border border-gray-200 hover:border-green-300"
              }`}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="bg-white rounded-2xl h-64 animate-pulse border border-green-50"
            />
          ))}
        </div>
      ) : products.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <p className="text-4xl mb-3">🌿</p>
          <p className="font-semibold">No products found</p>
          <p className="text-sm mt-1">Try a different search or category</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {products.map((p) => (
            <ProductCard
              key={p.id}
              product={p}
              onClick={() => handleView(p.id)}
            />
          ))}
        </div>
      )}

      {showCreate && (
        <CreateModal onClose={() => setShowCreate(false)} onCreated={load} />
      )}
    </div>
  );
}
