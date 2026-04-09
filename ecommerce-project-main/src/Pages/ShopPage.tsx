import {
  Box,
  Button,
  Alert,
  Card,
  CardActions,
  CardContent,
  CardMedia,
  Grid,
  Rating,
  Stack,
  Typography,
  MenuItem,
  TextField,
  Snackbar,
  IconButton,
  Chip,
} from "@mui/material";
import {
  AddShoppingCart as AddCartIcon,
  Close as CloseIcon,
} from "@mui/icons-material";
import { useEffect, useState, useCallback } from "react";
import { api } from "../api";
import type { CartItem, Product } from "../types";
import RealisticLoader from "../components/RealisticLoader";

type Props = {
  onCartChanged: () => Promise<void>;
  search: string;
  isAuthenticated: boolean;
};

const normalizeImage = (image: string) => {
  if (image.startsWith("http://") || image.startsWith("https://")) return image;
  return image.startsWith("/") ? image : `/${image}`;
};

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

export default function ShopPage({ onCartChanged, search, isAuthenticated }: Props) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [quantities, setQuantities] = useState<{ [key: string]: number }>({});
  const [notification, setNotification] = useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'error' | 'info';
  }>({
    open: false,
    message: "",
    severity: "info",
  });

  const fetchProducts = useCallback(async () => {
    try {
      setLoading(true);
      setNotification((prev) => ({ ...prev, open: false, message: "" }));
      const query = search.trim();
      const url = query
        ? `/api/products?search=${encodeURIComponent(query)}`
        : "/api/products";
      const response = await api.get<Product[]>(url);
      setProducts(response.data);
    } catch {
      setNotification({
        open: true,
        message: "Unable to load products. Ensure backend is running.",
        severity: "error",
      });
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  useEffect(() => {
    if (!notification.open) return;
    const timeout = window.setTimeout(
      () => setNotification((prev) => ({ ...prev, open: false, message: "" })),
      5000
    );
    return () => window.clearTimeout(timeout);
  }, [notification.open]);

  const addToCart = async (productId: string, name: string) => {
    const qty = quantities[productId] || 1;
    const product = products.find((item) => item.id === productId);
    try {
      if (!isAuthenticated) {
        const guestCart = readGuestCart();
        const existingIndex = guestCart.findIndex((item) => item.productId === productId);
        if (existingIndex >= 0) {
          const nextQuantity = guestCart[existingIndex].quantity + qty;
          guestCart[existingIndex] = {
            ...guestCart[existingIndex],
            quantity: product ? Math.min(nextQuantity, product.stock || nextQuantity) : nextQuantity,
          };
        } else {
          guestCart.push({
            id: Date.now(),
            productId,
            quantity: qty,
            deliveryOptionId: "1",
            product: product || null,
          });
        }
        writeGuestCart(guestCart);
      } else {
        await api.post("/api/cart-items", { productId, quantity: qty });
      }
      await onCartChanged();
      setNotification({ open: true, message: `${qty} x ${name} added to cart!`, severity: "success" });
    } catch {
      setNotification({ open: true, message: "Failed to add item to cart.", severity: "error" });
    }
  };

  const handleQuantityChange = (productId: string, value: number) => {
    setQuantities((prev) => ({ ...prev, [productId]: value }));
  };

  return (
    <Box sx={{ px: { xs: 1.5, sm: 3, md: 0 }, py: 2 }}>
      <Stack
        direction={{ xs: "column", sm: "row" }}
        spacing={{ xs: 1, sm: 2 }}
        sx={{ 
          justifyContent: "space-between", 
          alignItems: { xs: "flex-start", sm: "center" }, 
          mb: 4 
        }}
      >
        <Typography
          variant="h3"
          sx={{
            fontWeight: 900,
            letterSpacing: "-1px",
            fontSize: { xs: "1.75rem", sm: "2.5rem", md: "3rem" },
          }}
        >
          {search ? `Results for "${search}"` : "Curated for You"}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 700 }}>
          {products.length} products found
        </Typography>
      </Stack>

      {loading ? (
        <RealisticLoader message="Fetching the best products..." />
      ) : (
        <Grid container spacing={{ xs: 1.5, md: 2.5 }}>
          {products.length === 0 ? (
            <Grid sx={{ width: '100%' }}>
              <Box sx={{ textAlign: "center", py: 10 }}>
                <Typography variant="h5" color="text.secondary" sx={{ fontWeight: 700 }}>
                  No products match your search yet.
                </Typography>
                <Button
                  variant="outlined"
                  sx={{ mt: 2, borderRadius: 2 }}
                  onClick={() => (window.location.href = "/")}
                >
                  Clear search
                </Button>
              </Box>
            </Grid>
          ) : (
            products.map((product) => (
              <Grid key={product.id} size={{ xs: 12, sm: 6, md: 4 }}>
                <Card
                  sx={{
                    height: "100%",
                    display: "flex",
                    flexDirection: "column",
                    borderRadius: 3,
                    overflow: "hidden",
                    transition: "all 0.2s ease-in-out",
                    border: "1px solid",
                    borderColor: "divider",
                    bgcolor: "background.paper",
                    "&:hover": {
                      transform: { md: "translateY(-4px)" },
                      boxShadow: "0 8px 20px rgba(0,0,0,0.08)",
                      borderColor: "primary.main",
                    },
                  }}
                >
                  <Box
                    sx={{
                      p: 1.5,
                      bgcolor: "#fff",
                      position: "relative",
                      display: "flex",
                      justifyContent: "center",
                      height: { xs: 180, sm: 200 },
                    }}
                  >
                    <CardMedia
                      component="img"
                      image={normalizeImage(product.image)}
                      alt={product.name}
                      sx={{
                        height: "100%",
                        width: "auto",
                        objectFit: "contain",
                      }}
                    />
                    {product.stock < 5 && product.stock > 0 && (
                      <Chip
                        label="Low Stock"
                        color="error"
                        size="small"
                        sx={{ position: "absolute", top: 8, right: 8, fontWeight: 800, fontSize: "0.6rem" }}
                      />
                    )}
                  </Box>

                  <CardContent sx={{ flexGrow: 1, pt: 1.5, px: 2, pb: 1 }}>
                    <Typography
                      variant="body2"
                      sx={{
                        fontWeight: 700,
                        height: 40,
                        overflow: "hidden",
                        display: "-webkit-box",
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: "vertical",
                        lineHeight: 1.2,
                        mb: 0.5,
                        color: "text.primary"
                      }}
                    >
                      {product.name}
                    </Typography>
                    
                    <Stack direction="row" spacing={0.5} sx={{ alignItems: "center", mb: 1 }}>
                      <Rating readOnly precision={0.5} value={product.rating.stars} size="small" sx={{ fontSize: "0.9rem" }} />
                      <Typography variant="caption" color="text.secondary" sx={{ fontSize: "0.7rem" }}>
                        ({product.rating.count})
                      </Typography>
                    </Stack>

                    <Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "center" }}>
                      <Typography variant="subtitle1" color="primary.main" sx={{ fontWeight: 800 }}>
                        ${(product.priceCents / 100).toFixed(2)}
                      </Typography>
                      <Typography
                        variant="caption"
                        sx={{
                          fontWeight: 700,
                          fontSize: "0.7rem",
                          color: product.stock > 10 ? "success.main" : "error.main",
                        }}
                      >
                        {product.stock > 0 ? `${product.stock} left` : "Sold out"}
                      </Typography>
                    </Stack>
                  </CardContent>

                  <CardActions sx={{ px: 2, pb: 2, pt: 0, gap: 0.75 }}>
                    <TextField
                      select
                      size="small"
                      disabled={!product.stock || product.stock === 0}
                      value={quantities[product.id] || 1}
                      onChange={(e) => handleQuantityChange(product.id, Number(e.target.value))}
                      sx={{ 
                        width: 62,
                        "& .MuiOutlinedInput-root": { 
                          borderRadius: 2,
                          fontSize: "0.85rem",
                          "& fieldset": { borderColor: "divider" }
                        },
                        "& .MuiSelect-select": { py: 1, px: 1 }
                      }}
                    >
                      {[...Array(Math.max(0, Math.min(product.stock || 0, 10))).keys()].map((i) => (
                        <MenuItem key={i + 1} value={i + 1} sx={{ fontSize: "0.85rem" }}>{i + 1}</MenuItem>
                      ))}
                    </TextField>
                    <Button
                      fullWidth
                      variant="contained"
                      disabled={!product.stock || product.stock === 0}
                      startIcon={<AddCartIcon sx={{ fontSize: "1rem !important" }} />}
                      onClick={() => addToCart(product.id, product.name)}
                      sx={{ 
                        borderRadius: 2, 
                        fontWeight: 700, 
                        fontSize: "0.85rem",
                        textTransform: "none",
                        boxShadow: "none",
                        py: 0.8
                      }}
                    >
                      Add
                    </Button>
                  </CardActions>
                </Card>
              </Grid>
            ))
          )}
        </Grid>
      )}

      <Snackbar
        open={notification.open}
        autoHideDuration={5000}
        onClose={() => setNotification((prev) => ({ ...prev, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          severity={notification.severity}
          variant="filled"
          sx={{ width: '100%', borderRadius: 2 }}
        >
          {notification.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}