import React, { useState } from "react";
import { productsApi } from "../../services/api"; // Adjust path if needed

interface CreateProductModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const CreateProductModal: React.FC<CreateProductModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [loading, setLoading] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [productData, setProductData] = useState({
    name: "",
    price: "",
    category: "Vegetables",
    description: "",
    location: "Buea",
  });

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const imageUrls: string[] = [];

      // 1. Upload to Cloudinary
      for (const file of selectedFiles) {
        const formData = new FormData();
        formData.append("file", file);
        formData.append(
          "upload_preset",
          import.meta.env.VITE_CLOUDINARY_PRESET,
        );

        const res = await fetch(
          `https://api.cloudinary.com/v1_1/${import.meta.env.VITE_CLOUDINARY_NAME}/image/upload`,
          { method: "POST", body: formData },
        );

        const data = await res.json();
        if (data.secure_url) {
          imageUrls.push(data.secure_url);
        }
      }

      // 2. Send JSON to your Render Backend
      await productsApi.create({
        ...productData,
        price: parseFloat(productData.price),
        images: imageUrls,
      });

      onClose();
      window.location.reload(); // Refresh to see the new product
    } catch (error) {
      console.error("Submission failed:", error);
      alert("Failed to create product. Check your Cloudinary settings!");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <h2 className="text-xl font-bold mb-4">Add New Product</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="text"
            placeholder="Product Name"
            required
            className="w-full border p-2 rounded"
            onChange={(e) =>
              setProductData({ ...productData, name: e.target.value })
            }
          />
          <input
            type="number"
            placeholder="Price (FCFA)"
            required
            className="w-full border p-2 rounded"
            onChange={(e) =>
              setProductData({ ...productData, price: e.target.value })
            }
          />
          <textarea
            placeholder="Description"
            required
            className="w-full border p-2 rounded"
            onChange={(e) =>
              setProductData({ ...productData, description: e.target.value })
            }
          />
          <input
            type="file"
            multiple
            accept="image/*"
            required
            className="w-full"
            onChange={(e) => setSelectedFiles(Array.from(e.target.files || []))}
          />

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-600"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-green-600 text-white rounded disabled:bg-gray-400"
            >
              {loading ? "Uploading..." : "Create Product"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateProductModal;
