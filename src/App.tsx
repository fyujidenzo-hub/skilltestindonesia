import { useEffect, useState } from "react";
import AdminLoginPage from "./pages/AdminLoginPage";
import AdminPage from "./pages/AdminPage";
import CustomerDashboardPage from "./pages/CustomerDashboardPage";
import CustomerPage from "./pages/CustomerPage";
import CustomerOrdersPage from "./pages/CustomerOrdersPage";
import CustomerServicePage from "./pages/CustomerServicePage";
import CustomerTransactionPage from "./pages/CustomerTransactionPage";
import LoginPage from "./pages/LoginPage";
import ProfilePage from "./pages/ProfilePage";
import RegisterPage from "./pages/RegisterPage";
import { getActiveCustomerId } from "./services/customerSession";
import { AppStoreProvider } from "./store/AppStore";

export type Navigate = (path: string) => void;

function App() {
  const [path, setPath] = useState(() => window.location.pathname);
  const [isLoggedIn, setIsLoggedIn] = useState(() => Boolean(getActiveCustomerId()));

  useEffect(() => {
    const onPopState = () => setPath(window.location.pathname);
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  useEffect(() => {
    document.title = path.startsWith("/admin") ? "Tokopedia Portal" : "Tokopedia";
  }, [path]);

  const navigate: Navigate = (nextPath) => {
    window.history.pushState(null, "", nextPath);
    setPath(window.location.pathname);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Check login status on navigation
  useEffect(() => {
    setIsLoggedIn(Boolean(getActiveCustomerId()));
  }, [path]);

  // Redirect to login if accessing protected routes without login
  useEffect(() => {
    if (!path.startsWith("/admin") && !path.startsWith("/login") && !path.startsWith("/register")) {
      if (!isLoggedIn) {
        window.history.replaceState(null, "", "/login");
        setPath("/login");
      }
    }
  }, [path, isLoggedIn]);

  return (
    <AppStoreProvider>
      {path.startsWith("/admin") ? (
        path.startsWith("/admin/login") ? <AdminLoginPage navigate={navigate} /> : <AdminPage navigate={navigate} />
      ) : path.startsWith("/register") ? (
        <RegisterPage navigate={navigate} />
      ) : path.startsWith("/service") ? (
        isLoggedIn ? <CustomerServicePage navigate={navigate} /> : <LoginPage navigate={navigate} />
      ) : path.startsWith("/orders") ? (
        isLoggedIn ? <CustomerOrdersPage navigate={navigate} /> : <LoginPage navigate={navigate} />
      ) : path.startsWith("/take-order") ? (
        isLoggedIn ? <CustomerDashboardPage navigate={navigate} /> : <LoginPage navigate={navigate} />
      ) : path.startsWith("/topup") ? (
        isLoggedIn ? <CustomerTransactionPage navigate={navigate} type="topup" /> : <LoginPage navigate={navigate} />
      ) : path.startsWith("/withdraw") ? (
        isLoggedIn ? <CustomerTransactionPage navigate={navigate} type="withdraw" /> : <LoginPage navigate={navigate} />
      ) : path.startsWith("/login") ? (
        <LoginPage navigate={navigate} />
      ) : path.startsWith("/profile") ? (
        isLoggedIn ? <ProfilePage navigate={navigate} /> : <LoginPage navigate={navigate} />
      ) : (
        // Default route - show CustomerPage if logged in, LoginPage if not
        isLoggedIn ? <CustomerPage navigate={navigate} /> : <LoginPage navigate={navigate} />
      )}
    </AppStoreProvider>
  );
}

export default App;
