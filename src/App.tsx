import React, { useEffect } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { Header } from "./components/Header";
import { Sidebar } from "./components/Sidebar";
import { Dashboard } from "./components/Dashboard";
import { UserManagement } from "./components/UserManagement";
import { RoleBasedRedirect } from "./components/RoleBasedRedirect";
import { Unauthorized } from "./components/Unauthorized";
import { UserProfile } from "./components/UserProfile";
import { Settings } from "./components/Settings";
import { Login } from "./components/Login";
import { useAuthStore } from "./store/authStore";
import { MyOrderList } from "./components/MyOrderList";
import { InventoryScanner } from "./components/InventoryScanner";
import { CloseOrders } from "./components/CloseOrders";
import { useTranslation } from "react-i18next";

function PrivateRoute({
  children,
  roles,
}: {
  children: React.ReactNode;
  roles?: string[];
}) {
  const user = useAuthStore((state) => state.user);

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (roles && !roles.includes(user.role)) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}

function App() {
  const user = useAuthStore((state) => state.user);
  const authLoading = useAuthStore((state) => state.authLoading);

  const { i18n } = useTranslation();

  useEffect(() => {
    i18n.changeLanguage(
      user?.WAREHOUSE_COUNTRY?.toUpperCase() === "IT" ? "it" : "en"
    );
  }, [user, i18n]); // Aggiungi le dipendenze per far scattare l'effetto

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <span>Loading...</span>
      </div>
    );
  }

  return (
    <Router>
      <div className="min-h-screen bg-gray-100 touch-friendly">
        <Routes>
          {/* Route di login - visibile a tutti */}
          <Route path="/login" element={!user ? <Login /> : <Navigate to="/" />} />
          
          {/* Route protette - visibili solo se autenticati */}
          {user ? (
            <>
              <Route path="/" element={<RoleBasedRedirect />} />
              <Route path="/unauthorized" element={<Unauthorized />} />
              <Route
                path="/dashboard"
                element={
                  <PrivateRoute>
                    <Header />
                    <div className="flex">
                      <Sidebar />
                      <main className="flex-1 p-6 w-full pt-16">
                        <Dashboard />
                      </main>
                    </div>
                  </PrivateRoute>
                }
              />
              {/* Orders route removed for mobile app */}
              <Route
                path="/my-orders"
                element={
                  <PrivateRoute roles={["admin", "warehouse", "orders"]}>
                    <Header />
                    <div className="flex">
                      <Sidebar />
                      <main className="flex-1 p-6 w-full pt-16">
                        <MyOrderList />
                      </main>
                    </div>
                  </PrivateRoute>
                }
              />
              <Route
                path="/close-orders"
                element={
                  <PrivateRoute roles={["admin", "orders_closer"]}>
                    <Header />
                    <div className="flex">
                      <Sidebar />
                      <main className="flex-1 p-6 w-full pt-16">
                        <CloseOrders />
                      </main>
                    </div>
                  </PrivateRoute>
                }
              />
              <Route
                path="/inventario"
                element={
                  <PrivateRoute roles={["admin", "warehouse"]}>
                    <Header />
                    <div className="flex">
                      <Sidebar />
                      <main className="flex-1 p-6 w-full pt-16">
                        <InventoryScanner />
                      </main>
                    </div>
                  </PrivateRoute>
                }
              />
              <Route
                path="/users"
                element={
                  <PrivateRoute roles={["admin"]}>
                    <Header />
                    <div className="flex">
                      <Sidebar />
                      <main className="flex-1 p-6 w-full pt-16">
                        <UserManagement />
                      </main>
                    </div>
                  </PrivateRoute>
                }
              />
              <Route
                path="/users/:userId"
                element={
                  <PrivateRoute>
                    <Header />
                    <div className="flex">
                      <Sidebar />
                      <main className="flex-1 p-6 w-full pt-16">
                        <UserProfile />
                      </main>
                    </div>
                  </PrivateRoute>
                }
              />
              <Route
                path="/settings"
                element={
                  <PrivateRoute roles={["admin"]}>
                    <Header />
                    <div className="flex">
                      <Sidebar />
                      <main className="flex-1 p-6 w-full pt-16">
                        <Settings />
                      </main>
                    </div>
                  </PrivateRoute>
                }
              />
            </>
          ) : null}
          
          {/* Fallback per rotte non trovate */}
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
