import {
  Alert,
  Box,
  CircularProgress,
  Button,
  Card,
  CardActions,
  CardContent,
  CardMedia,
  Grid,
  Rating,
  Stack,
  Typography,
  Skeleton,
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
import type { Product } from "../types";
import RealisticLoader from "../components/RealisticLoader";

type Props = {
  onCartChanged: () => Promise<void>;
  search: string;
};

const normalizeImage = (image: string) => {
  if (image.startsWith("http://") || image.startsWith("https://")) return image;
  return image.startsWith("/") ? image : `/${image}`;
};

export default function ShopPage({ onCartChanged, search }: Props) {
  const [products, setProducts] = useState<Product[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [quantities, setQuantities] = useState<{ [key: string]: number }>({});
  const [toast, setToast] = useState<{ open: boolean; message: string }>({
    open: false,
    message: "",
  });

  const fetchProducts = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const query = search.trim();
      const url = query
        ? `/api/products?search=${encodeURIComponent(query)}`
        : "/api/products";
      const response = await api.get<Product[]>(url);
      setProducts(response.data);
    } catch {
      setError("Unable to load products. Ensure backend is running.");
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const addToCart = async (productId: string, name: string) => {
    const qty = quantities[productId] || 1;
    try {
      await api.post("/api/cart-items", { productId, quantity: qty });
      await onCartChanged();
      setToast({ open: true, message: `${qty} x ${name} added to cart!` });
    } catch (err) {
      setError("Failed to add item to cart.");
    }
  };

  const handleQuantityChange = (productId: string, value: number) => {
    setQuantities((prev) => ({ ...prev, [productId]: value }));
  };

  return (
    <Box sx={{ px: { xs: 2, sm: 3, md: 0 } }}> {/* Responsive padding for the container */}
      <Stack
        direction={{ xs: "column", sm: "row" }}
        spacing={{ xs: 1, sm: 2 }}
        sx={{ justifyContent: "space-between", alignItems: { xs: "flex-start", sm: "center" }, mb: 4 }}
      >
        <Typography
          variant="h3"
          sx={{
            fontWeight: 900,
            letterSpacing: "-1px",
            fontSize: { xs: "1.75rem", sm: "2.5rem", md: "3rem" },
          }} // Responsive Header
        >
          {search ? `Results for "${search}"` : "Curated for You"}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 700 }}>
          {products.length} products found
        </Typography>
      </Stack>

      {error && (
        <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }}>
          {error}
        </Alert>
      )}

      {loading ? (
        <RealisticLoader message="Fetching the best products..." />
      ) : (
        <Grid container spacing={{ xs: 2, md: 3 }}>
          {products.length === 0 ? (
            <Grid size={12}>
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
              <Grid key={product.id} size={{ xs: 12, sm: 12, md: 6, lg: 4 }}>
                <Card
                  sx={{
                    height: "100%",
                    display: "flex",
                    flexDirection: "column",
                    borderRadius: 4,
                    overflow: "hidden",
                    transition: "all 0.3s ease",
                    border: "1px solid",
                    borderColor: "divider",
                    "&:hover": {
                      transform: { md: "translateY(-8px)" }, // Disable hover lift on mobile for better UX
                      boxShadow: "0 12px 24px rgba(0,0,0,0.1)",
                      borderColor: "primary.main",
                    },
                  }}
                >
                  <Box
                    sx={{
                      p: 2,
                      bgcolor: "#fff",
                      position: "relative",
                      display: "flex",
                      justifyContent: "center",
                      height: { xs: 200, sm: 220 }, // Fixed height for image area to keep grid aligned
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

                  <CardContent sx={{ flexGrow: 1, pt: 2, px: 2 }}>
                    <Typography
                      variant="body1"
                      sx={{
                        fontWeight: 800,
                        height: 44,
                        overflow: "hidden",
                        display: "-webkit-box",
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: "vertical",
                        lineHeight: 1.2,
                        mb: 1,
                      }}
                    >
                      {product.name}
                    </Typography>
                    
                    <Stack direction="row" spacing={1} sx={{ alignItems: "center", mb: 1 }}>
                      <Rating readOnly precision={0.5} value={product.rating.stars} size="small" />
                      <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                        ({product.rating.count})
                      </Typography>
                    </Stack>

                    <Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "center" }}>
                      <Typography variant="h6" color="primary.main" sx={{ fontWeight: 900 }}>
                        ${(product.priceCents / 100).toFixed(2)}
                      </Typography>
                      <Typography
                        variant="caption"
                        sx={{
                          fontWeight: 700,
                          color: product.stock > 10 ? "success.main" : "error.main",
                        }}
                      >
                        {product.stock > 0 ? `${product.stock} in stock` : "Out of stock"}
                      </Typography>
                    </Stack>
                  </CardContent>

                  <CardActions sx={{ p: 2, pt: 0, gap: 1 }}>
                    <TextField
                      select
                      size="small"
                      disabled={!product.stock}
                      value={quantities[product.id] || 1}
                      onChange={(e) => handleQuantityChange(product.id, Number(e.target.value))}
                      sx={{ width: 65 }}
                    >
                      {[...Array(Math.max(0, Math.min(product.stock || 0, 10))).keys()].map((i) => (
                        <MenuItem key={i + 1} value={i + 1}>{i + 1}</MenuItem>
                      ))}
                    </TextField>
                    <Button
                      fullWidth
                      variant="contained"
                      disabled={!product.stock}
                      startIcon={<AddCartIcon />}
                      onClick={() => addToCart(product.id, product.name)}
                      sx={{ borderRadius: 2, fontWeight: 700, textTransform: "none" }}
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
        open={toast.open}
        autoHideDuration={3000}
        onClose={() => setToast({ ...toast, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }} // Better for mobile
      >
        <Alert severity="success" variant="filled" sx={{ width: '100%', borderRadius: 2 }}>
          {toast.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}