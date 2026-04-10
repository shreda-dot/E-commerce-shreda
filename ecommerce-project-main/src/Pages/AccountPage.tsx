import {
  Alert,
  Avatar,
  Box,
  Button,
  Chip,
  CircularProgress,
  Container,
  Divider,
  Grid,
  Paper,
  Skeleton,
  Snackbar,
  Stack,
  TextField,
  Typography,
  useTheme,
} from "@mui/material";
import {
  CancelOutlined as CancelledIcon,
  CheckCircleOutlined as DeliveredIcon,
  EditOutlined as EditIcon,
  HourglassTopOutlined as PendingIcon,
  InventoryOutlined as ProcessingIcon,
  LocalShippingOutlined as ShippedIcon,
  LogoutOutlined as LogoutIcon,
  ReceiptLongOutlined as OrdersIcon,
  SettingsOutlined as SettingsIcon,
  Storefront as StoreIcon,
  TrendingUp as TrendingIcon,
} from "@mui/icons-material";
import { useEffect, useMemo, useRef, useState } from "react";
import { Link as RouterLink, Navigate } from "react-router-dom";
import { api } from "../api";
import { useAuth } from "../contexts/AuthContext";

type OrderStatus = "pending" | "processing" | "shipped" | "delivered" | "cancelled";

type OrderProduct = {
  quantity: number;
  name?: string;
  image?: string;
  priceCents?: number;
};

type OrderItem = {
  id: string;
  orderTimeMs: number;
  totalCostCents: number;
  status?: OrderStatus;
  products: OrderProduct[];
};

type MessageState = {
  open: boolean;
  text: string;
  severity: "success" | "error" | "info";
};

const normalizeImage = (image: string | null | undefined): string | undefined => {
  if (!image) return undefined;
  if (image.startsWith("blob:") || image.startsWith("http://") || image.startsWith("https://")) return image;
  return image.startsWith("/") ? image : `/${image}`;
};

const fmt = (cents: number) => `$${(cents / 100).toFixed(2)}`;

const STATUS_CONFIG: Record<OrderStatus, { label: string; color: string; bg: string; icon: React.ReactNode }> = {
  pending: { label: "Pending", color: "#f59e0b", bg: "rgba(245,158,11,0.12)", icon: <PendingIcon sx={{ fontSize: 14 }} /> },
  processing: { label: "Processing", color: "#3b82f6", bg: "rgba(59,130,246,0.12)", icon: <ProcessingIcon sx={{ fontSize: 14 }} /> },
  shipped: { label: "Shipped", color: "#8b5cf6", bg: "rgba(139,92,246,0.12)", icon: <ShippedIcon sx={{ fontSize: 14 }} /> },
  delivered: { label: "Delivered", color: "#22c55e", bg: "rgba(34,197,94,0.12)", icon: <DeliveredIcon sx={{ fontSize: 14 }} /> },
  cancelled: { label: "Cancelled", color: "#ef4444", bg: "rgba(239,68,68,0.12)", icon: <CancelledIcon sx={{ fontSize: 14 }} /> },
};

const TIMELINE_STEPS: { key: OrderStatus; label: string }[] = [
  { key: "pending", label: "Placed" },
  { key: "processing", label: "Processing" },
  { key: "shipped", label: "Shipped" },
  { key: "delivered", label: "Delivered" },
];

function AccountCard({ children, sx = {} }: { children: React.ReactNode; sx?: object }) {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  return (
    <Paper
      elevation={0}
      sx={{
        borderRadius: { xs: 2, sm: 2.5 },
        p: { xs: 2, sm: 2.5, md: 3 },
        border: "1px solid",
        borderColor: "divider",
        bgcolor: isDark ? "rgba(255,255,255,0.03)" : "rgba(255,255,255,0.85)",
        ...sx,
      }}
    >
      {children}
    </Paper>
  );
}

function OrderTimeline({ status = "pending" }: { status?: OrderStatus }) {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";

  if (status === "cancelled") {
    return (
      <Stack direction="row" spacing={1} sx={{ alignItems: "center", mt: 1.5 }}>
        <CancelledIcon sx={{ fontSize: 16, color: "#ef4444" }} />
        <Typography sx={{ fontSize: "0.78rem", fontWeight: 700, color: "#ef4444" }}>Order cancelled</Typography>
      </Stack>
    );
  }

  const activeStep = Math.max(0, TIMELINE_STEPS.findIndex((s) => s.key === status));
  return (
    <Stack direction="row" spacing={0.5} sx={{ mt: 1.5, alignItems: "center" }}>
      {TIMELINE_STEPS.map((step, i) => {
        const done = i <= activeStep;
        return (
          <Box key={step.key} sx={{ display: "flex", alignItems: "center", flex: 1 }}>
            <Box
              sx={{
                width: 18,
                height: 18,
                borderRadius: "50%",
                border: "1px solid",
                borderColor: done ? "primary.main" : "divider",
                bgcolor: done ? "primary.main" : "transparent",
              }}
            />
            {i < TIMELINE_STEPS.length - 1 && (
              <Box
                sx={{
                  flex: 1,
                  height: 2,
                  mx: 0.75,
                  bgcolor: i < activeStep ? "primary.main" : (isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)"),
                }}
              />
            )}
          </Box>
        );
      })}
    </Stack>
  );
}

function OrderHistoryCard({ order }: { order: OrderItem }) {
  const status = order.status ?? "pending";
  const cfg = STATUS_CONFIG[status];
  const itemCount = order.products.reduce((sum, p) => sum + p.quantity, 0);
  const [expanded, setExpanded] = useState(false);

  return (
    <AccountCard sx={{ p: { xs: 2, sm: 2.25 } }}>
      <Stack spacing={{ xs: 2, sm: 1.5 }}>
        <Stack direction={{ xs: "column", sm: "row" }} spacing={{ xs: 1.25, sm: 1 }} sx={{ justifyContent: "space-between", alignItems: { xs: "flex-start", sm: "center" } }}>
          <Box>
            <Typography variant="caption" sx={{ letterSpacing: "0.1em", color: "text.secondary" }}>Order #{order.id.slice(0, 8).toUpperCase()}</Typography>
            <Typography sx={{ fontSize: { xs: "0.78rem", sm: "0.82rem" }, color: "text.secondary" }}>
              {new Date(order.orderTimeMs).toLocaleDateString()} · {itemCount} {itemCount > 1 ? "items" : "item"}
            </Typography>
          </Box>
          <Stack direction="row" spacing={1} sx={{ alignItems: "center", flexWrap: "wrap", rowGap: 0.75 }}>
            <Chip label={cfg.label} icon={<Box sx={{ color: `${cfg.color} !important`, display: "flex" }}>{cfg.icon}</Box>} sx={{ bgcolor: cfg.bg, color: cfg.color, fontWeight: 700 }} />
            <Typography sx={{ fontWeight: 900, color: "primary.main" }}>{fmt(order.totalCostCents)}</Typography>
          </Stack>
        </Stack>

        <OrderTimeline status={status} />

        <Button
          size="small"
          onClick={() => setExpanded((p) => !p)}
          sx={{ textTransform: "none", alignSelf: "flex-start", px: 0, minHeight: 36 }}
        >
          {expanded ? "Hide items" : "Show items"}
        </Button>

        {expanded && (
          <Stack spacing={1} sx={{ pt: 1, borderTop: "1px solid", borderColor: "divider" }}>
            {order.products.map((p, idx) => (
              <Stack key={idx} direction="row" spacing={1.25} sx={{ alignItems: "center" }}>
                {p.image ? (
                  <Box component="img" src={normalizeImage(p.image)} sx={{ width: 40, height: 40, borderRadius: 2, objectFit: "contain", border: "1px solid", borderColor: "divider", p: 0.5 }} />
                ) : (
                  <Box sx={{ width: 40, height: 40, borderRadius: 2, border: "1px solid", borderColor: "divider", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <StoreIcon sx={{ fontSize: 18, color: "text.secondary" }} />
                  </Box>
                )}
                <Box sx={{ minWidth: 0, flex: 1 }}>
                  <Typography sx={{ fontSize: "0.84rem", fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {p.name || "Product"}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Qty: {p.quantity}
                  </Typography>
                </Box>
              </Stack>
            ))}
          </Stack>
        )}
      </Stack>
    </AccountCard>
  );
}

export default function AccountPage() {
  const { user, refresh, logout } = useAuth();
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";

  const [name, setName] = useState(user?.name || "");
  const [profileImage, setProfileImage] = useState<string | undefined>(normalizeImage(user?.profileImage));
  const [savingProfile, setSavingProfile] = useState(false);
  const [ordersLoading, setOrdersLoading] = useState(true);
  const [orders, setOrders] = useState<OrderItem[]>([]);
  const [message, setMessage] = useState<MessageState>({ open: false, text: "", severity: "success" });
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => setName(user?.name || ""), [user?.name]);
  useEffect(() => setProfileImage(normalizeImage(user?.profileImage)), [user?.profileImage]);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    const loadOrders = async (withLoader = false) => {
      if (withLoader) setOrdersLoading(true);
      try {
        const r = await api.get<OrderItem[]>("/api/orders?mine=true");
        if (!cancelled) setOrders(r.data);
      } catch {
        if (!cancelled) setOrders([]);
      } finally {
        if (!cancelled && withLoader) setOrdersLoading(false);
      }
    };

    void loadOrders(true);
    const intervalId = window.setInterval(() => void loadOrders(false), 15000);
    const onFocus = () => void loadOrders(false);
    window.addEventListener("focus", onFocus);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
      window.removeEventListener("focus", onFocus);
    };
  }, [user?.id]);

  const stats = useMemo(() => ({
    total: orders.length,
    inProgress: orders.filter((o) => ["pending", "processing", "shipped"].includes(o.status ?? "pending")).length,
    delivered: orders.filter((o) => o.status === "delivered").length,
    cancelled: orders.filter((o) => o.status === "cancelled").length,
  }), [orders]);
  const sortedOrders = useMemo(() => orders.slice().sort((a, b) => b.orderTimeMs - a.orderTimeMs), [orders]);

  const uploadImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const preview = URL.createObjectURL(file);
    setProfileImage(preview);
    const formData = new FormData();
    formData.append("image", file);
    try {
      const res = await api.post<{ profileImage?: string }>("/api/auth/profile/image", formData);
      const img = normalizeImage(res.data?.profileImage);
      if (img) setProfileImage(img);
      await refresh();
      setMessage({ open: true, text: "Profile photo updated.", severity: "success" });
    } catch {
      setProfileImage(normalizeImage(user?.profileImage));
      setMessage({ open: true, text: "Unable to upload photo.", severity: "error" });
    } finally {
      URL.revokeObjectURL(preview);
    }
  };

  const saveProfile = async () => {
    setSavingProfile(true);
    try {
      await api.put("/api/auth/profile", { name });
      await refresh();
      setMessage({ open: true, text: "Profile saved.", severity: "success" });
    } catch {
      setMessage({ open: true, text: "Unable to update profile.", severity: "error" });
    } finally {
      setSavingProfile(false);
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      setMessage({ open: true, text: "Logged out successfully.", severity: "success" });
    } catch {
      setMessage({ open: true, text: "Unable to log out.", severity: "error" });
    }
  };

  if (!user) return <Navigate to="/auth" replace />;

  const pageBg = isDark
    ? "radial-gradient(ellipse at 15% 0%, rgba(30,58,138,0.18) 0%, transparent 55%), radial-gradient(ellipse at 85% 100%, rgba(30,58,138,0.12) 0%, transparent 55%)"
    : "radial-gradient(ellipse at 15% 0%, rgba(219,234,254,0.6) 0%, transparent 55%), radial-gradient(ellipse at 85% 100%, rgba(224,231,255,0.45) 0%, transparent 55%)";

  return (
    <Box sx={{ minHeight: "100vh", background: pageBg, py: { xs: 3, sm: 4, md: 5 } }}>
      <Container maxWidth="lg">
        <Grid container spacing={{ xs: 2.5, sm: 3, md: 3 }}>
          {/* Profile Header */}
          <Grid item xs={12}>
            <AccountCard>
              <Stack
                direction={{ xs: "column", sm: "row" }}
                spacing={{ xs: 1.75, sm: 2 }}
                sx={{ justifyContent: "space-between", alignItems: { xs: "center", sm: "center" }, textAlign: { xs: "center", sm: "left" } }}
              >
                <Stack direction="row" spacing={1.5} sx={{ alignItems: "center", minWidth: 0 }}>
                  <Box sx={{ position: "relative" }}>
                    <Avatar src={profileImage} sx={{ width: { xs: 64, sm: 74, md: 84 }, height: { xs: 64, sm: 74, md: 84 }, fontWeight: 900 }}>
                      {user.name?.slice(0, 1).toUpperCase()}
                    </Avatar>
                    <Button
                      onClick={() => fileInputRef.current?.click()}
                      sx={{ minWidth: 0, p: 0, position: "absolute", bottom: -6, right: -6, width: 28, height: 28, borderRadius: "50%", bgcolor: "primary.main", color: "#fff", "&:hover": { bgcolor: "primary.dark" } }}
                    >
                      <EditIcon sx={{ fontSize: 14 }} />
                    </Button>
                    <input ref={fileInputRef} hidden type="file" accept="image/*" onChange={uploadImage} />
                  </Box>
                  <Box sx={{ minWidth: 0 }}>
                    <Typography sx={{ fontWeight: 900, fontSize: { xs: "1.25rem", sm: "1.45rem", md: "1.8rem" }, lineHeight: 1.15 }}>
                      {user.name}
                    </Typography>
                    <Typography sx={{ color: "text.secondary", fontSize: { xs: "0.8rem", sm: "0.88rem" }, overflow: "hidden", textOverflow: "ellipsis" }}>
                      {user.email}
                    </Typography>
                  </Box>
                </Stack>
                <Chip label={user.role === "admin" ? "Admin Account" : "Customer Account"} color="primary" variant="outlined" sx={{ borderRadius: 1.5 }} />
              </Stack>
            </AccountCard>
          </Grid>

          {/* Orders Summary */}
          {[
            { label: "Total Orders", value: stats.total, icon: <OrdersIcon />, color: "#3b82f6" },
            { label: "In Progress", value: stats.inProgress, icon: <TrendingIcon />, color: "#f59e0b" },
            { label: "Delivered", value: stats.delivered, icon: <DeliveredIcon />, color: "#22c55e" },
            { label: "Cancelled", value: stats.cancelled, icon: <CancelledIcon />, color: "#ef4444" },
          ].map((item) => (
            <Grid key={item.label} item xs={12} sm={6} md={3}>
              <AccountCard sx={{ height: "100%" }}>
                <Stack direction="row" spacing={1.25} sx={{ alignItems: "center" }}>
                  <Box sx={{ width: 36, height: 36, borderRadius: 1.5, bgcolor: `${item.color}20`, color: item.color, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    {item.icon}
                  </Box>
                  <Box>
                    <Typography sx={{ fontWeight: 900, fontSize: { xs: "1.2rem", sm: "1.3rem" } }}>
                      {ordersLoading ? "..." : item.value}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">{item.label}</Typography>
                  </Box>
                </Stack>
              </AccountCard>
            </Grid>
          ))}

          {/* Order History */}
          <Grid item xs={12} md={8}>
            <Stack spacing={{ xs: 2, sm: 1.5 }}>
              <Typography sx={{ fontWeight: 800, fontSize: { xs: "1rem", sm: "1.1rem" } }}>Order History</Typography>
              {ordersLoading ? (
                [0, 1].map((i) => (
                  <AccountCard key={i}>
                    <Stack spacing={1}>
                      <Skeleton variant="text" width={180} />
                      <Skeleton variant="rounded" height={56} />
                    </Stack>
                  </AccountCard>
                ))
              ) : sortedOrders.length === 0 ? (
                <AccountCard sx={{ textAlign: "center", py: { xs: 4, sm: 5 } }}>
                  <Typography sx={{ fontWeight: 700, mb: 1 }}>No orders yet</Typography>
                  <Typography color="text.secondary" sx={{ mb: 2 }}>Your purchases will appear here.</Typography>
                  <Button component={RouterLink} to="/" variant="contained" sx={{ borderRadius: 1.5 }}>Start Shopping</Button>
                </AccountCard>
              ) : (
                sortedOrders.map((order) => <OrderHistoryCard key={order.id} order={order} />)
              )}
            </Stack>
          </Grid>

          {/* Account Actions */}
          <Grid item xs={12} md={4}>
            <Stack spacing={{ xs: 2, sm: 1.5 }}>
              <Typography sx={{ fontWeight: 800, fontSize: { xs: "1rem", sm: "1.1rem" } }}>Account Actions</Typography>
              <AccountCard>
                <Stack spacing={2}>
                  <TextField
                    label="Full Name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    fullWidth
                    size="small"
                  />
                  <TextField
                    label="Email Address"
                    value={user.email}
                    disabled
                    fullWidth
                    size="small"
                  />
                  <Divider />
                  <Stack spacing={1}>
                    <Button
                      variant="contained"
                      startIcon={savingProfile ? <CircularProgress size={16} sx={{ color: "inherit" }} /> : <SettingsIcon />}
                      onClick={saveProfile}
                      disabled={savingProfile || name === user.name}
                      fullWidth
                      sx={{ borderRadius: 1.5, minHeight: 42 }}
                    >
                      Save Changes
                    </Button>
                    <Button
                      variant="outlined"
                      color="error"
                      startIcon={<LogoutIcon />}
                      onClick={handleLogout}
                      fullWidth
                      sx={{ borderRadius: 1.5, minHeight: 42 }}
                    >
                      Logout
                    </Button>
                  </Stack>
                </Stack>
              </AccountCard>
            </Stack>
          </Grid>
        </Grid>
      </Container>

      <Snackbar
        open={message.open}
        autoHideDuration={5000}
        onClose={() => setMessage((p) => ({ ...p, open: false }))}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert severity={message.severity} variant="filled" onClose={() => setMessage((p) => ({ ...p, open: false }))}>
          {message.text}
        </Alert>
      </Snackbar>
    </Box>
  );
}
