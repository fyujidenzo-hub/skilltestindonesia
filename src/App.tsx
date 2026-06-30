import { useEffect, useState } from "react";
import AdminLoginPage from "./pages/AdminLoginPage";
import AdminPage from "./pages/AdminPage";
import CustomerPage from "./pages/CustomerPage";
import CustomerOrdersPage from "./pages/CustomerOrdersPage";
import CustomerServicePage from "./pages/CustomerServicePage";
import CustomerTransactionPage from "./pages/CustomerTransactionPage";
import LoginPage from "./pages/LoginPage";
import ProfilePage from "./pages/ProfilePage";
import RegisterPage from "./pages/RegisterPage";
import { AppStoreProvider } from "./store/AppStore";

export type Navigate = (path: string) => void;

function App() {
  const [path, setPath] = useState(() => window.location.pathname);

  useEffect(() => {
    const onPopState = () => setPath(window.location.pathname);
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  const navigate: Navigate = (nextPath) => {
    window.history.pushState(null, "", nextPath);
    setPath(window.location.pathname);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <AppStoreProvider>
      {path.startsWith("/admin") ? (
        path.startsWith("/admin/login") ? <AdminLoginPage navigate={navigate} /> : <AdminPage navigate={navigate} />
      ) : path.startsWith("/register") ? (
        <RegisterPage navigate={navigate} />
      ) : path.startsWith("/service") ? (
        <CustomerServicePage navigate={navigate} />
      ) : path.startsWith("/orders") ? (
        <CustomerOrdersPage navigate={navigate} />
      ) : path.startsWith("/topup") ? (
        <CustomerTransactionPage navigate={navigate} type="topup" />
      ) : path.startsWith("/withdraw") ? (
        <CustomerTransactionPage navigate={navigate} type="withdraw" />
      ) : path.startsWith("/login") ? (
        <LoginPage navigate={navigate} />
      ) : path.startsWith("/profile") ? (
        <ProfilePage navigate={navigate} />
      ) : (
        <CustomerPage navigate={navigate} />
      )}
    </AppStoreProvider>
  );
}

export default App;
