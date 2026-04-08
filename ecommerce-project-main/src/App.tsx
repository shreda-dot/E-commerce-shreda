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
    try {
      const response = await api.get<CartItem[]>(
        "/api/cart-items?expand=product",
      );
      setCartItems(response.data);
    } catch {
      setCartItems([]);
    }
  };

  useEffect(() => {
    if (!authLoading) {
      loadCart();
    }
  }, [authLoading]);

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
            element={<ShopPage onCartChanged={loadCart} search={search} />}
          />
          <Route
            path="/cart"
            element={
              <CartPage cartItems={cartItems} onCartChanged={loadCart} />
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
        autoHideDuration={3000}
        onClose={() => setWelcomeOpen(false)}
        anchorOrigin={{ vertical: "top", horizontal: "right" }}
      >
        <Alert
          severity="success"
          variant="filled"
          onClose={() => setWelcomeOpen(false)}
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
  const content = (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );

  if (!googleClientId) {
    return content;
  }

  return (
    <GoogleOAuthProvider clientId={googleClientId}>
      {content}
    </GoogleOAuthProvider>
  );
}
