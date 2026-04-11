import { Alert, Box, CssBaseline, Snackbar, ThemeProvider } from "@mui/material";
import { GoogleOAuthProvider } from "@react-oauth/google";
import { useEffect, useMemo, useRef, useState } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { api } from "./api";
import AppShell from "./components/AppShell";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { DeliveryProvider } from "./contexts/DeliveryContext";
import AccountPage from "./Pages/AccountPage";
import AdminPage from "./Pages/AdminPage";
import AuthPage from "./Pages/AuthPage";
import CartPage from "./Pages/CartPage";
import MuiCheckoutPage from "./Pages/MuiCheckoutPage";
import PrivacyPage from "./Pages/PrivacyPage";
import ShopPage from "./Pages/ShopPage";
import TermsPage from "./Pages/TermsPage";
import RealisticLoader from "./components/RealisticLoader";
import { buildTheme } from "./theme";
import type { CartItem } from "./types";

/* ─── storage keys ──────────────────────────────────────────────── */
const GUEST_CART_KEY  = "shreda_guest_cart_v1";
const THEME_KEY       = "shreda_theme";
const SEEN_USERS_KEY  = "shreda_seen_users";

/* ─── guest cart helpers ─────────────────────────────────────────── */
const readGuestCart = (): CartItem[] => {
  try {
    const raw = localStorage.getItem(GUEST_CART_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as CartItem[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};
const writeGuestCart = (items: CartItem[]) =>
  localStorage.setItem(GUEST_CART_KEY, JSON.stringify(items));

/* ─── theme persistence ──────────────────────────────────────────── */
const readTheme = (): "light" | "dark" => {
  try {
    return localStorage.getItem(THEME_KEY) === "dark" ? "dark" : "light";
  } catch {
    return "light";
  }
};

/* ─── "seen users" tracker for new-vs-returning welcome ─────────── */
const getSeenUsers = (): Set<string> => {
  try {
    const raw = localStorage.getItem(SEEN_USERS_KEY);
    return new Set(raw ? (JSON.parse(raw) as string[]) : []);
  } catch {
    return new Set();
  }
};

/**
 * Marks a userId as seen. Returns true the FIRST time we see this userId
 * (meaning the user is new / first login on this browser).
 */
const markUserSeen = (userId: string): boolean => {
  const seen = getSeenUsers();
  const isFirstTime = !seen.has(userId);
  seen.add(userId);
  try {
    localStorage.setItem(SEEN_USERS_KEY, JSON.stringify([...seen]));
  } catch { /* localStorage full or blocked */ }
  return isFirstTime;
};

/* ─── AppContent ─────────────────────────────────────────────────── */
function AppContent() {
  const { user, logout, loading: authLoading } = useAuth();

  const [mode, setMode] = useState<"light" | "dark">(readTheme);
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [search, setSearch] = useState("");
  const [welcomeOpen, setWelcomeOpen] = useState(false);
  const [isNewUser, setIsNewUser] = useState(false);
  const previousUserIdRef = useRef<string | null>(null);

  const theme    = useMemo(() => buildTheme(mode), [mode]);
  const cartCount = useMemo(
    () => cartItems.reduce((sum, item) => sum + item.quantity, 0),
    [cartItems],
  );

  /* Toggle mode and persist to localStorage */
  const toggleMode = () => {
    setMode((v) => {
      const next = v === "light" ? "dark" : "light";
      try { localStorage.setItem(THEME_KEY, next); } catch { /* noop */ }
      return next;
    });
  };

  /* Cart loader */
  const loadCart = async () => {
    if (!user) { setCartItems(readGuestCart()); return; }
    try {
      const res = await api.get<CartItem[]>("/api/cart-items?expand=product");
      setCartItems(res.data);
    } catch {
      setCartItems([]);
    }
  };

  /**
   * Called by checkout on successful payment.
   * Explicitly clears BOTH React state and localStorage before re-fetching
   * so items never reappear on refresh, even if the auth cookie expires.
   */
  const handleOrderPlaced = async () => {
    setCartItems([]);
    writeGuestCart([]);
    await loadCart();
  };

  useEffect(() => {
    if (!authLoading) loadCart();
  }, [authLoading, user]);

  /* Sync guest cart to server on login */
  useEffect(() => {
    if (!user) return;
    const sync = async () => {
      const guestItems = readGuestCart();
      if (!guestItems.length) return;
      try {
        await api.post("/api/cart-items/merge", {
          items: guestItems.map((item) => ({
            productId: item.productId,
            quantity: item.quantity,
          })),
        });
        writeGuestCart([]);
        await loadCart();
      } catch { /* keep guest cart */ }
    };
    void sync();
  }, [user]);

  /*
   * Smart welcome snackbar:
   * - fires once per browser session (sessionStorage guard)
   * - distinguishes new users (first login on this browser) from returning ones
   */
  useEffect(() => {
    if (!user) { previousUserIdRef.current = null; return; }
    if (previousUserIdRef.current === user.id) return;
    previousUserIdRef.current = user.id;

    const sessionKey = `shreda_welcomed_${user.id}`;
    if (sessionStorage.getItem(sessionKey)) return; // already shown this session

    const isFirst = markUserSeen(user.id);
    setIsNewUser(isFirst);
    setWelcomeOpen(true);
    sessionStorage.setItem(sessionKey, "1");
  }, [user]);

  /* Loading splash */
  if (authLoading) {
    return (
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh", bgcolor: "background.default" }}>
          <RealisticLoader message="Starting Shreda Experience..." />
        </Box>
      </ThemeProvider>
    );
  }

  const welcomeMessage = (): string => {
    if (!user) return "Welcome back";
    if (user.role === "admin") return "Welcome back, Admin";
    if (isNewUser) return `Welcome to SHREDA, ${user.name}! 🎉`;
    return `Welcome back, ${user.name}`;
  };

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AppShell
        cartCount={cartCount}
        mode={mode}
        onToggleMode={toggleMode}
        user={user}
        onLogout={logout}
        search={search}
        onSearchChange={setSearch}
      >
        <Routes>
          <Route path="/" element={<ShopPage onCartChanged={loadCart} search={search} isAuthenticated={Boolean(user)} />} />
          <Route path="/cart" element={<CartPage cartItems={cartItems} onCartChanged={loadCart} isAuthenticated={Boolean(user)} />} />
          <Route path="/checkout" element={<MuiCheckoutPage onOrderPlaced={handleOrderPlaced} />} />
          <Route path="/account" element={<AccountPage />} />
          <Route path="/admin" element={<AdminPage />} />
          <Route path="/auth" element={<AuthPage />} />
          <Route path="/terms" element={<TermsPage />} />
          <Route path="/privacy" element={<PrivacyPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AppShell>

      <Snackbar
        open={welcomeOpen}
        autoHideDuration={5000}
        onClose={() => setWelcomeOpen(false)}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert
          severity={isNewUser ? "info" : "success"}
          variant="filled"
          onClose={() => setWelcomeOpen(false)}
          sx={{ borderRadius: 2, fontWeight: 700 }}
        >
          {welcomeMessage()}
        </Alert>
      </Snackbar>
    </ThemeProvider>
  );
}

/* ─── App root ───────────────────────────────────────────────────── */
export default function App() {
  const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
  const content = (
    <AuthProvider>
      <DeliveryProvider>
        <AppContent />
      </DeliveryProvider>
    </AuthProvider>
  );
  return googleClientId
    ? <GoogleOAuthProvider clientId={googleClientId}>{content}</GoogleOAuthProvider>
    : content;
}
