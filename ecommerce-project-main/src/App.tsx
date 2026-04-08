import {
  Alert,
  CssBaseline,
  Snackbar,
  ThemeProvider,
  Box,
} from "@mui/material";
import { GoogleOAuthProvider } from "@react-oauth/google";
import { useMemo, useRef, useState } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import AppShell from "./components/AppShell";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { api } from "./api";
import type { CartItem } from "./types";
import { useEffect } from "react";
import ShopPage from "./Pages/ShopPage";
import CartPage from "./Pages/CartPage";
import AuthPage from "./Pages/AuthPage";
import { buildTheme } from "./theme";
import MuiCheckoutPage from "./Pages/MuiCheckoutPage";
import AdminPage from "./Pages/AdminPage";
import AccountPage from "./Pages/AccountPage";
import RealisticLoader from "./components/RealisticLoader";

const GUEST_CART_KEY = "shreda_guest_cart_v1";

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

const writeGuestCart = (items: CartItem[]) => {
  localStorage.setItem(GUEST_CART_KEY, JSON.stringify(items));
};

function AppContent() {
  const { user, logout, loading: authLoading } = useAuth();
  const [mode, setMode] = useState<"light" | "dark">("light");
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [search, setSearch] = useState("");
  const [welcomeOpen, setWelcomeOpen] = useState(false);
  const previousUserIdRef = useRef<string | null>(null);

  const theme = useMemo(() => buildTheme(mode), [mode]);
  const cartCount = useMemo(
    () => cartItems.reduce((sum, item) => sum + item.quantity, 0),
    [cartItems],
  );

  const loadCart = async () => {
    if (!user) {
      setCartItems(readGuestCart());
      return;
    }
    try {
      const response = await api.get<CartItem[]>("/api/cart-items?expand=product");
      setCartItems(response.data);
    } catch {
      setCartItems([]);
    }
  };

  useEffect(() => {
    if (!authLoading) {
      loadCart();
    }
  }, [authLoading, user]);

  useEffect(() => {
    if (!user) return;
    const syncGuestCartToServer = async () => {
      const guestItems = readGuestCart();
      if (guestItems.length === 0) return;
      try {
        for (const item of guestItems) {
          await api.post("/api/cart-items", {
            productId: item.productId,
            quantity: item.quantity,
          });
        }
        writeGuestCart([]);
        await loadCart();
      } catch {
        // keep guest cart if sync fails
      }
    };
    void syncGuestCartToServer();
  }, [user]);

  useEffect(() => {
    if (user && previousUserIdRef.current !== user.id) {
      setWelcomeOpen(true);
      previousUserIdRef.current = user.id;
    }
    if (!user) {
      previousUserIdRef.current = null;
    }
  }, [user]);

  if (authLoading) {
    return (
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            minHeight: "100vh",
            bgcolor: "background.default",
          }}
        >
          <RealisticLoader message="Starting Shreda Experience..." />
        </Box>
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AppShell
        cartCount={cartCount}
        mode={mode}
        onToggleMode={() => setMode((v) => (v === "light" ? "dark" : "light"))}
        user={user}
        onLogout={logout}
        search={search}
        onSearchChange={setSearch}
      >
        <Routes>
          <Route
            path="/"
            element={
              <ShopPage
                onCartChanged={loadCart}
                search={search}
                isAuthenticated={Boolean(user)}
              />
            }
          />
          <Route
            path="/cart"
            element={
              <CartPage
                cartItems={cartItems}
                onCartChanged={loadCart}
                isAuthenticated={Boolean(user)}
              />
            }
          />
          <Route
            path="/checkout"
            element={<MuiCheckoutPage onOrderPlaced={loadCart} />}
          />
          <Route path="/account" element={<AccountPage />} />
          <Route path="/admin" element={<AdminPage />} />
          <Route path="/auth" element={<AuthPage />} />
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
          severity="success"
          variant="filled"
          onClose={() => setWelcomeOpen(false)}
          sx={{ borderRadius: 2, fontFamily: '"Inter", "Roboto", sans-serif' }}
        >
          {user
            ? user.role === "admin"
              ? "Welcome back, Admin"
              : `Welcome back, ${user.name}`
            : "Welcome back"}
        </Alert>
      </Snackbar>
    </ThemeProvider>
  );
}

export default function App() {
  const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
  const rawPaypalId = import.meta.env.VITE_PAYPAL_CLIENT_ID;
  const isPlaceholder = !rawPaypalId || rawPaypalId.startsWith('YOUR_');
  const paypalClientId = isPlaceholder ? 'test' : rawPaypalId;
  if (isPlaceholder) {
    console.warn('[PayPal] VITE_PAYPAL_CLIENT_ID is not set — using "test" (sandbox only). Replace it in ecommerce-project-main/.env with your real Sandbox Client ID from developer.paypal.com.');
  }

  const content = (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );

  const withGoogle = googleClientId ? (
    <GoogleOAuthProvider clientId={googleClientId}>{content}</GoogleOAuthProvider>
  ) : (
    content
  );

  return (
    <PayPalScriptProvider options={{ clientId: paypalClientId, currency: "USD" }}>
      {withGoogle}
    </PayPalScriptProvider>
  );
}
