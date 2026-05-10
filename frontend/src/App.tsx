import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { useEffect, useRef } from "react";
import { useAuthStore } from "./store/authStore";
import { useChatStore } from "./store/chatStore";
import Layout        from "./components/layout/Layout";
import LoginPage     from "./pages/LoginPage";
import SignupPage    from "./pages/SignupPage";
import DashboardPage from "./pages/DashboardPage";
import ProductsPage  from "./pages/ProductsPage";
import ProductDetail from "./pages/ProductDetailPage";
import ChatPage      from "./pages/ChatPage";
import OrdersPage    from "./pages/OrdersPage";
import RecommendPage from "./pages/RecommendPage";

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { accessToken } = useAuthStore();
  return accessToken ? <>{children}</> : <Navigate to="/login" replace />;
}

export default function App() {
  const { accessToken, loadMe } = useAuthStore();
  const { connect, disconnect } = useChatStore();

  const connectRef    = useRef(connect);
  const disconnectRef = useRef(disconnect);
  const loadMeRef     = useRef(loadMe);
  connectRef.current    = connect;
  disconnectRef.current = disconnect;
  loadMeRef.current     = loadMe;

  useEffect(() => {
    if (accessToken) {
      loadMeRef.current();
      connectRef.current(accessToken);
    }
    return () => disconnectRef.current();
  }, [accessToken]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <BrowserRouter>
      <Toaster position="top-right" />
      <Routes>
        <Route path="/login"  element={<LoginPage  />} />
        <Route path="/signup" element={<SignupPage  />} />
        <Route path="/" element={<PrivateRoute><Layout /></PrivateRoute>}>
          <Route index               element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard"    element={<DashboardPage />} />
          <Route path="products"     element={<ProductsPage  />} />
          <Route path="products/:id" element={<ProductDetail />} />
          <Route path="chat"         element={<ChatPage      />} />
          <Route path="chat/:id"     element={<ChatPage      />} />
          <Route path="orders"       element={<OrdersPage    />} />
          <Route path="recommend"    element={<RecommendPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
