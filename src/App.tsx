import { lazy, Suspense, useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "./firebase";
import { getAuthContext } from "./services/authService";
import { clearActiveCustomerId, getActiveCustomerId, setActiveCustomerId } from "./services/customerSession";
import { AppStoreProvider } from "./store/AppStore";

export type Navigate = (path: string) => void;

const AdminLoginPage = lazy(() => import("./pages/AdminLoginPage"));
const AdminPage = lazy(() => import("./pages/AdminPage"));
const CustomerDashboardPage = lazy(() => import("./pages/CustomerDashboardPage"));
const CustomerPage = lazy(() => import("./pages/CustomerPage"));
const CustomerOrdersPage = lazy(() => import("./pages/CustomerOrdersPage"));
const CustomerServicePage = lazy(() => import("./pages/CustomerServicePage"));
const CustomerTransactionPage = lazy(() => import("./pages/CustomerTransactionPage"));
const LoginPage = lazy(() => import("./pages/LoginPage"));
const ProfilePage = lazy(() => import("./pages/ProfilePage"));
const RegisterPage = lazy(() => import("./pages/RegisterPage"));

function App() {
  const [path, setPath] = useState(() => window.location.pathname);
  const [customerAuthState, setCustomerAuthState] = useState<"restoring" | "authenticated" | "anonymous">(
    window.location.pathname.startsWith("/admin") ? "anonymous" : "restoring",
  );
  const isLoggedIn = customerAuthState === "authenticated" && Boolean(getActiveCustomerId());

  useEffect(() => {
    const onPopState = () => setPath(window.location.pathname);
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  useEffect(() => {
    document.title = path.startsWith("/admin") ? "Tokopedia Portal" : "Tokopedia";
  }, [path]);

  useEffect(() => {
    if (window.location.pathname.startsWith("/admin")) return;
    if (!auth) {
      clearActiveCustomerId();
      setCustomerAuthState("anonymous");
      return;
    }

    let sequence = 0;
    return onAuthStateChanged(auth, async (user) => {
      const currentSequence = ++sequence;
      if (!user) {
        clearActiveCustomerId();
        setCustomerAuthState("anonymous");
        return;
      }

      const context = await getAuthContext().catch(() => null);
      if (currentSequence !== sequence) return;
      if (context?.role !== "member") {
        clearActiveCustomerId();
        setCustomerAuthState("anonymous");
        return;
      }

      setActiveCustomerId(context.subjectId);
      setCustomerAuthState("authenticated");
    });
  }, []);

  const navigate: Navigate = (nextPath) => {
    const changingAccountScope =
      path.startsWith("/admin") !== nextPath.startsWith("/admin");
    if (changingAccountScope) {
      window.location.assign(nextPath);
      return;
    }

    const enteringProtectedCustomerPage =
      !nextPath.startsWith("/login") &&
      !nextPath.startsWith("/register") &&
      !nextPath.startsWith("/admin");
    if (enteringProtectedCustomerPage && auth?.currentUser && getActiveCustomerId()) {
      setCustomerAuthState("authenticated");
    }

    window.history.pushState(null, "", nextPath);
    setPath(window.location.pathname);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Redirect to login if accessing protected routes without login
  useEffect(() => {
    if (!path.startsWith("/admin") && !path.startsWith("/login") && !path.startsWith("/register")) {
      if (customerAuthState === "anonymous") {
        window.history.replaceState(null, "", "/login");
        setPath("/login");
      }
    }
  }, [path, customerAuthState]);

  const isProtectedCustomerPath =
    !path.startsWith("/admin") &&
    !path.startsWith("/login") &&
    !path.startsWith("/register");

  return (
    <AppStoreProvider>
      <Suspense fallback={<PageFallback />}>
        {isProtectedCustomerPath && customerAuthState === "restoring" ? (
          <PageFallback />
        ) : path.startsWith("/admin") ? (
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
      </Suspense>
    </AppStoreProvider>
  );
}

function PageFallback() {
  return (
    <main className="grid min-h-screen place-items-center bg-slate-50 px-4 text-ink">
      <div className="rounded-2xl bg-white px-6 py-5 text-sm font-bold text-slate-600 shadow-panel">
        Loading...
      </div>
    </main>
  );
}

export default App;
