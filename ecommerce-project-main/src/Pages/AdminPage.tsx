import {
  Alert,
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControl,
  Grid,
  IconButton,
  InputAdornment,
  InputLabel,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  MenuItem,
  Paper,
  Select,
  Stack,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tabs,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import {
  Add as AddIcon,
  Dashboard as DashboardIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  Inventory as InventoryIcon,
  People as PeopleIcon,
  ShoppingBasket as OrderIcon,
  Save as SaveIcon,
  Close as CancelIcon,
  TrendingUp as TrendingUpIcon,
  AttachMoney as RevenueIcon,
} from "@mui/icons-material";
import { useEffect, useState, useCallback, useMemo } from "react";
import { Navigate } from "react-router-dom";
import { api } from "../api";
import { useAuth } from "../contexts/AuthContext";
import type { Order, Product, User, UserRole, UserStatus } from "../types";
import RealisticLoader from "../components/RealisticLoader";

interface DashboardStats {
  totalProducts: number;
  totalOrders: number;
  totalUsers: number;
  totalRevenueCents: number;
}

type ApiError = { response?: { data?: { error?: string } }; message?: string };

const getErrorMessage = (error: unknown, fallback: string): string => {
  if (typeof error === "object" && error !== null) {
    const typed = error as ApiError;
    return typed.response?.data?.error || typed.message || fallback;
  }
  return fallback;
};

export default function AdminPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<
    "dashboard" | "users" | "products" | "orders"
  >("dashboard");
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<{
    text: string;
    severity: "success" | "error";
  } | null>(null);
  const [errorDetail, setErrorDetail] = useState<string>("");

  // Data states
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);

  // Form states
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Partial<Product> | null>(
    null,
  );
  const [isUserDialogOpen, setIsUserDialogOpen] = useState(false);
  const [newUser, setNewUser] = useState({
    name: "",
    email: "",
    password: "",
    role: "customer" as UserRole,
  });

  const fetchData = useCallback(async () => {
    setLoading(true);
    setErrorDetail("");
    try {
      const responses = await Promise.allSettled([
        api.get<{ stats: DashboardStats }>("/api/admin/dashboard"),
        api.get<{ users: User[] }>("/api/auth/admin/users"),
        api.get<Product[]>("/api/products"),
        api.get<Order[]>("/api/orders?expand=products"),
      ]);

      const [statsRes, usersRes, productsRes, ordersRes] = responses;

      if (statsRes.status === "fulfilled") setStats(statsRes.value.data.stats);
      if (usersRes.status === "fulfilled") setUsers(usersRes.value.data.users);
      if (productsRes.status === "fulfilled")
        setProducts(productsRes.value.data);
      if (ordersRes.status === "fulfilled") setOrders(ordersRes.value.data);

      const failures = responses.filter((r) => r.status === "rejected");
      if (failures.length > 0) {
        const errorMsg = failures
          .map((f) => getErrorMessage((f as PromiseRejectedResult).reason, "Unknown error"))
          .join(", ");
        setErrorDetail(errorMsg);
        setMessage({
          text: "Some admin data failed to load.",
          severity: "error",
        });
      }
    } catch {
      handleMessage("Unexpected error loading admin data.", "error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user?.role === "admin") {
      fetchData();
    }
  }, [user, fetchData]);

  if (!user) return <Navigate to="/auth" replace />;
  if (user.role !== "admin") return <Navigate to="/" replace />;

  const handleMessage = (
    text: string,
    severity: "success" | "error" = "success",
  ) => {
    setMessage({ text, severity });
    setTimeout(() => setMessage(null), 3000);
  };

  // --- Product Handlers ---
  const handleProductSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct) return;
    try {
      if (editingProduct.id) {
        await api.put(`/api/products/${editingProduct.id}`, editingProduct);
        handleMessage("Product updated successfully.");
      } else {
        await api.post("/api/products", {
          ...editingProduct,
          keywords: ["general"],
        });
        handleMessage("Product created successfully.");
      }
      setIsDialogOpen(false);
      fetchData();
    } catch (err) {
      handleMessage("Error saving product.", "error");
    }
  };

  const deleteProduct = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this product?"))
      return;
    try {
      await api.delete(`/api/products/${id}`);
      handleMessage("Product deleted.");
      fetchData();
    } catch (err) {
      handleMessage("Error deleting product.", "error");
    }
  };

  // --- Order Handlers ---
  const updateOrderStatus = async (
    orderId: string,
    status: Order["status"],
  ) => {
    try {
      await api.patch(`/api/orders/${orderId}/status`, { status });
      handleMessage("Order status updated.");
      fetchData();
    } catch (err) {
      handleMessage("Error updating order status.", "error");
    }
  };

  const deleteOrder = async (orderId: string) => {
    if (!window.confirm("Are you sure you want to delete this order?")) return;
    try {
      await api.delete(`/api/orders/${orderId}`);
      handleMessage("Order deleted.");
      fetchData();
    } catch (err) {
      handleMessage("Error deleting order.", "error");
    }
  };

  // --- User Handlers ---
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post("/api/auth/admin/users", newUser);
      handleMessage("User created successfully.");
      setIsUserDialogOpen(false);
      setNewUser({ name: "", email: "", password: "", role: "customer" });
      fetchData();
    } catch (error: unknown) {
      handleMessage(getErrorMessage(error, "Error creating user."), "error");
    }
  };

  const updateUserStatus = async (userId: string, status: UserStatus) => {
    try {
      await api.patch(`/api/auth/admin/users/${userId}/status`, { status });
      handleMessage("User status updated.");
      fetchData();
    } catch (err) {
      handleMessage("Error updating user status.", "error");
    }
  };

  const toggleUserRole = async (userId: string, currentRole: UserRole) => {
    const role = currentRole === "admin" ? "customer" : "admin";
    try {
      await api.patch(`/api/auth/admin/users/${userId}/role`, { role });
      handleMessage("User role updated.");
      fetchData();
    } catch (err) {
      handleMessage("Error updating user role.", "error");
    }
  };

  const repairDatabase = async () => {
    try {
      setLoading(true);
      await api.post("/api/admin/repair-db");
      handleMessage("Database schema repaired.");
      fetchData();
    } catch (err) {
      handleMessage("Repair failed.", "error");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <RealisticLoader message="Securing admin access..." />;
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Stack
        direction="row"
        sx={{ justifyContent: "space-between", alignItems: "center", mb: 4 }}
      >
        <Typography variant="h3" color="primary" sx={{ fontWeight: 900 }}>
          Admin Control
        </Typography>
        <Button
          variant="contained"
          color="primary"
          startIcon={<AddIcon />}
          onClick={() => {
            if (activeTab === "products") {
              setEditingProduct({ name: "", image: "", priceCents: 0 });
              setIsDialogOpen(true);
            } else if (activeTab === "users") {
              setIsUserDialogOpen(true);
            }
          }}
          disabled={activeTab === "dashboard" || activeTab === "orders"}
        >
          Add New{" "}
          {activeTab === "products"
            ? "Product"
            : activeTab === "users"
              ? "User"
              : ""}
        </Button>
      </Stack>

      {message && (
        <Alert
          severity={message.severity}
          sx={{ mb: 3, borderRadius: 2 }}
          action={
            message.severity === "error" && (
              <Button color="inherit" size="small" onClick={repairDatabase}>
                Repair DB
              </Button>
            )
          }
        >
          {message.text}
          {errorDetail && (
            <Typography
              variant="caption"
              sx={{ display: "block", mt: 1, opacity: 0.8 }}
            >
              Details: {errorDetail}
            </Typography>
          )}
        </Alert>
      )}

      <Paper sx={{ mb: 4, borderRadius: 4, overflow: "hidden", boxShadow: 6 }}>
        <Tabs
          value={activeTab}
          onChange={(_, val) => setActiveTab(val)}
          variant="fullWidth"
          indicatorColor="primary"
          textColor="primary"
        >
          <Tab icon={<DashboardIcon />} label="Dashboard" value="dashboard" />
          <Tab icon={<InventoryIcon />} label="Products" value="products" />
          <Tab icon={<OrderIcon />} label="Orders" value="orders" />
          <Tab icon={<PeopleIcon />} label="Users" value="users" />
        </Tabs>
      </Paper>

      {activeTab === "dashboard" && stats && (
        <Grid container spacing={3}>
          {[
            {
              label: "Total Revenue",
              value: `$${(stats.totalRevenueCents / 100).toLocaleString()}`,
              icon: <RevenueIcon fontSize="large" />,
              color: "#10b981",
            },
            {
              label: "Total Orders",
              value: stats.totalOrders,
              icon: <OrderIcon fontSize="large" />,
              color: "#f59e0b",
            },
            {
              label: "Active Products",
              value: stats.totalProducts,
              icon: <InventoryIcon fontSize="large" />,
              color: "#6366f1",
            },
            {
              label: "Total Users",
              value: stats.totalUsers,
              icon: <PeopleIcon fontSize="large" />,
              color: "#ec4899",
            },
          ].map((stat, i) => (
            <Grid size={{ xs: 12, sm: 6, md: 3 }} key={i}>
              <Card
                sx={{
                  height: "100%",
                  borderRadius: 4,
                  boxShadow: 3,
                  transition: "0.3s",
                  "&:hover": { transform: "translateY(-5px)", boxShadow: 10 },
                }}
              >
                <CardContent>
                  <Stack direction="row" spacing={2} sx={{ alignItems: "center" }}>
                    <Box
                      sx={{
                        p: 1.5,
                        borderRadius: 3,
                        bgcolor: `${stat.color}15`,
                        color: stat.color,
                      }}
                    >
                      {stat.icon}
                    </Box>
                    <Box>
                      <Typography
                        color="text.secondary"
                        variant="overline"
                        sx={{ fontWeight: 700 }}
                      >
                        {stat.label}
                      </Typography>
                      <Typography variant="h4" sx={{ fontWeight: 800 }}>
                        {stat.value}
                      </Typography>
                    </Box>
                  </Stack>
                </CardContent>
              </Card>
            </Grid>
          ))}

          <Grid size={12}>
            <Card sx={{ borderRadius: 4, boxShadow: 3 }}>
              <CardContent>
                <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
                  Recent Orders
                </Typography>
                <TableContainer>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>Order ID</TableCell>
                        <TableCell>Date</TableCell>
                        <TableCell>Status</TableCell>
                        <TableCell align="right">Amount</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {orders.slice(0, 5).map((order) => (
                        <TableRow key={order.id} hover>
                          <TableCell sx={{ fontWeight: 600 }}>
                            #{order.id.slice(0, 8)}
                          </TableCell>
                          <TableCell>
                            {new Date(
                              parseInt(order.orderTimeMs),
                            ).toLocaleDateString()}
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={order.status}
                              size="small"
                              color={
                                order.status === "delivered"
                                  ? "success"
                                  : order.status === "pending"
                                    ? "warning"
                                    : order.status === "cancelled"
                                      ? "error"
                                      : "primary"
                              }
                              sx={{
                                fontWeight: 700,
                                textTransform: "capitalize",
                              }}
                            />
                          </TableCell>
                          <TableCell align="right" sx={{ fontWeight: 700 }}>
                            ${(order.totalCostCents / 100).toFixed(2)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {activeTab === "products" && (
        <TableContainer
          component={Paper}
          sx={{ borderRadius: 4, boxShadow: 3 }}
        >
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Product</TableCell>
                <TableCell>Price</TableCell>
                <TableCell>Stock</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {products.map((p) => (
                <TableRow key={p.id} hover>
                  <TableCell>
                    <Stack direction="row" spacing={2} sx={{ alignItems: "center" }}>
                      <Avatar
                        src={p.image}
                        variant="rounded"
                        sx={{
                          width: 50,
                          height: 50,
                          border: "1px solid #eee",
                          p: 0.5,
                          bgcolor: "#fff",
                        }}
                      />
                      <Typography sx={{ fontWeight: 600 }}>{p.name}</Typography>
                    </Stack>
                  </TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>
                    ${(p.priceCents / 100).toFixed(2)}
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={p.stock || 0}
                      size="small"
                      color={
                        (p.stock || 0) > 10
                          ? "success"
                          : (p.stock || 0) > 0
                            ? "warning"
                            : "error"
                      }
                      sx={{ fontWeight: 800 }}
                    />
                  </TableCell>
                  <TableCell align="right">
                    <Tooltip title="Edit">
                      <IconButton
                        color="primary"
                        onClick={() => {
                          setEditingProduct(p);
                          setIsDialogOpen(true);
                        }}
                      >
                        <EditIcon />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Delete">
                      <IconButton
                        color="error"
                        onClick={() => deleteProduct(p.id)}
                      >
                        <DeleteIcon />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {activeTab === "orders" && (
        <TableContainer
          component={Paper}
          sx={{ borderRadius: 4, boxShadow: 3 }}
        >
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>ID</TableCell>
                <TableCell>Date</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Total</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {orders.map((order) => (
                <TableRow key={order.id} hover>
                  <TableCell sx={{ fontWeight: 600 }}>
                    #{order.id.slice(0, 8)}
                  </TableCell>
                  <TableCell>
                    {new Date(parseInt(order.orderTimeMs)).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    <FormControl size="small" sx={{ minWidth: 130 }}>
                      <Select
                        value={order.status}
                        onChange={(e) =>
                          updateOrderStatus(
                            order.id,
                            e.target.value as Order["status"],
                          )
                        }
                        sx={{
                          borderRadius: 2,
                          fontWeight: 700,
                          "& .MuiSelect-select": { py: 0.5 },
                        }}
                      >
                        {[
                          "pending",
                          "processing",
                          "shipped",
                          "delivered",
                          "cancelled",
                        ].map((s) => (
                          <MenuItem key={s} value={s}>
                            {s.charAt(0).toUpperCase() + s.slice(1)}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>
                    ${(order.totalCostCents / 100).toFixed(2)}
                  </TableCell>
                  <TableCell align="right">
                    <Tooltip title="Delete Order">
                      <IconButton
                        color="error"
                        onClick={() => deleteOrder(order.id)}
                      >
                        <DeleteIcon />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {activeTab === "users" && (
        <TableContainer
          component={Paper}
          sx={{ borderRadius: 4, boxShadow: 3 }}
        >
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>User</TableCell>
                <TableCell>Role</TableCell>
                <TableCell>Status</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {users.map((u) => (
                <TableRow key={u.id} hover>
                  <TableCell>
                    <Stack direction="row" spacing={2} sx={{ alignItems: "center" }}>
                      <Avatar
                        src={u.profileImage || ""}
                        sx={{ bgcolor: "primary.main" }}
                      >
                        {u.name?.[0] || u.email?.[0] || "U"}
                      </Avatar>
                      <Box>
                        <Typography sx={{ fontWeight: 600 }}>{u.name}</Typography>
                        <Typography variant="body2" color="text.secondary">
                          {u.email}
                        </Typography>
                      </Box>
                    </Stack>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={u.role}
                      size="small"
                      color={u.role === "admin" ? "secondary" : "default"}
                      sx={{ fontWeight: 700, textTransform: "capitalize" }}
                      onClick={() => toggleUserRole(u.id, u.role)}
                    />
                  </TableCell>
                  <TableCell>
                    <Select
                      size="small"
                      value={u.status || "active"}
                      onChange={(e) =>
                        updateUserStatus(u.id, e.target.value as UserStatus)
                      }
                      sx={{ borderRadius: 2, minWidth: 110 }}
                    >
                      <MenuItem value="active">Active</MenuItem>
                      <MenuItem value="suspended">Suspended</MenuItem>
                      <MenuItem value="frozen">Frozen</MenuItem>
                    </Select>
                  </TableCell>
                  <TableCell align="right">
                    {u.id !== user.id && (
                      <Tooltip title="Change Role">
                        <Button
                          variant="outlined"
                          size="small"
                          onClick={() => toggleUserRole(u.id, u.role)}
                          sx={{ borderRadius: 2 }}
                        >
                          To {u.role === "admin" ? "Customer" : "Admin"}
                        </Button>
                      </Tooltip>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Product Dialog */}
      <Dialog
        open={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle sx={{ fontWeight: 800 }}>
          {editingProduct?.id ? "Edit Product" : "Add New Product"}
        </DialogTitle>
        <form onSubmit={handleProductSave}>
          <DialogContent>
            <Stack spacing={2.5} sx={{ mt: 1 }}>
              <TextField
                label="Product Name"
                fullWidth
                required
                value={editingProduct?.name || ""}
                onChange={(e) =>
                  setEditingProduct({ ...editingProduct, name: e.target.value })
                }
              />
              <TextField
                label="Image URL"
                fullWidth
                required
                placeholder="/images/products/..."
                value={editingProduct?.image || ""}
                onChange={(e) =>
                  setEditingProduct({
                    ...editingProduct,
                    image: e.target.value,
                  })
                }
              />
              <TextField
                label="Price (Cents)"
                fullWidth
                required
                type="number"
                value={editingProduct?.priceCents || ""}
                onChange={(e) =>
                  setEditingProduct({
                    ...editingProduct,
                    priceCents: parseInt(e.target.value),
                  })
                }
                slotProps={{
                  input: {
                    startAdornment: (
                      <InputAdornment position="start">$</InputAdornment>
                    ),
                  },
                }}
              />
              <TextField
                label="Stock Level"
                fullWidth
                required
                type="number"
                value={editingProduct?.stock || 0}
                onChange={(e) =>
                  setEditingProduct({
                    ...editingProduct,
                    stock: parseInt(e.target.value),
                  })
                }
              />
            </Stack>
          </DialogContent>
          <DialogActions sx={{ p: 3 }}>
            <Button onClick={() => setIsDialogOpen(false)} color="inherit">
              Cancel
            </Button>
            <Button
              type="submit"
              variant="contained"
              color="primary"
              startIcon={<SaveIcon />}
            >
              Save Product
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* User Dialog */}
      <Dialog
        open={isUserDialogOpen}
        onClose={() => setIsUserDialogOpen(false)}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle sx={{ fontWeight: 800 }}>Create New User</DialogTitle>
        <form onSubmit={handleCreateUser}>
          <DialogContent>
            <Stack spacing={2.5} sx={{ mt: 1 }}>
              <TextField
                label="Full Name"
                fullWidth
                required
                value={newUser.name}
                onChange={(e) =>
                  setNewUser({ ...newUser, name: e.target.value })
                }
              />
              <TextField
                label="Email"
                type="email"
                fullWidth
                required
                value={newUser.email}
                onChange={(e) =>
                  setNewUser({ ...newUser, email: e.target.value })
                }
              />
              <TextField
                label="Password"
                type="password"
                fullWidth
                required
                value={newUser.password}
                onChange={(e) =>
                  setNewUser({ ...newUser, password: e.target.value })
                }
              />
              <FormControl fullWidth>
                <InputLabel>Role</InputLabel>
                <Select
                  label="Role"
                  value={newUser.role}
                  onChange={(e) =>
                    setNewUser({ ...newUser, role: e.target.value as UserRole })
                  }
                >
                  <MenuItem value="customer">Customer</MenuItem>
                  <MenuItem value="admin">Admin</MenuItem>
                </Select>
              </FormControl>
            </Stack>
          </DialogContent>
          <DialogActions sx={{ p: 3 }}>
            <Button onClick={() => setIsUserDialogOpen(false)} color="inherit">
              Cancel
            </Button>
            <Button
              type="submit"
              variant="contained"
              color="primary"
              startIcon={<AddIcon />}
            >
              Create User
            </Button>
          </DialogActions>
        </form>
      </Dialog>
    </Container>
  );
}
