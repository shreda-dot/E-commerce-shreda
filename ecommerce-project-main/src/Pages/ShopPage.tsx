import {
  Box,
  Button,
  Alert,
  Rating,
  Stack,
  Typography,
  MenuItem,
  TextField,
  Snackbar,
  Chip,
  Paper,
  useTheme,
} from "@mui/material";
import {
  AddShoppingCart as AddCartIcon,
  LocalFireDepartment as FireIcon,
  Star as StarIcon,
  Inventory as StockIcon,
  Category as CategoryIcon,
} from "@mui/icons-material";
import React, { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { api } from "../api";
import type { CartItem, Product } from "../types";
import RealisticLoader from "../components/RealisticLoader";

type Props = {
  onCartChanged: () => Promise<void>;
  search: string;
  isAuthenticated: boolean;
};

const GUEST_CART_KEY = "shreda_guest_cart_v1";

const normalizeImage = (image: string) => {
  if (image.startsWith("http://") || image.startsWith("https://")) return image;
  return image.startsWith("/") ? image : `/${image}`;
};

const readGuestCart = (): CartItem[] => {
  try {
    const raw = localStorage.getItem(GUEST_CART_KEY);
    return raw ? (JSON.parse(raw) as CartItem[]) : [];
  } catch {
    return [];
  }
};

const writeGuestCart = (items: CartItem[]) => {
  localStorage.setItem(GUEST_CART_KEY, JSON.stringify(items));
};

// ─── Scroll-reveal hook ───────────────────────────────────────────────────────
function useScrollReveal(threshold = 0.12, enabled = true) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [visible, setVisible] = useState(!enabled);

  useEffect(() => {
    if (!enabled) {
      setVisible(true);
      return;
    }
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [threshold, enabled]);

  return { ref, visible };
}

// ─── Category pills logic ─────────────────────────────────────────────────────
const deriveCategory = (name: string): string => {
  const n = name.toLowerCase();
  if (/phone|iphone|samsung|pixel/.test(n)) return 'Phones';
  if (/laptop|macbook|computer|pc/.test(n)) return 'Computers';
  if (/shoe|sneaker|boot|air max/.test(n)) return 'Footwear';
  if (/shirt|jean|hoodie|dress|cloth/.test(n)) return 'Clothing';
  if (/watch|bag|wallet|sunglasses/.test(n)) return 'Accessories';
  if (/tv|monitor|speaker|headphone|earbud/.test(n)) return 'Electronics';
  if (/chair|desk|sofa|furniture/.test(n)) return 'Furniture';
  return 'Other';
};

// ─── Individual Product Card (Memoized) ──────────────────────────────────────
interface ProductCardProps {
  product: Product;
  qty: number;
  onQtyChange: (id: string, val: number) => void;
  onAddToCart: (id: string, name: string) => void;
  usdToNgnRate: number | null;
  featured?: boolean;
  index: number;
  playEntryAnimation?: boolean;
}

const ProductCard = React.memo(({ product, qty, onQtyChange, onAddToCart, usdToNgnRate, featured = false, index, playEntryAnimation = true }: ProductCardProps) => {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const { ref, visible } = useScrollReveal(0.12, playEntryAnimation);
  
  const isSoldOut = !product.stock || product.stock === 0;
  const isLowStock = product.stock < 5 && product.stock > 0;
  const usdPrice = product.priceCents / 100;
  const ngnPrice = usdToNgnRate ? usdPrice * usdToNgnRate : null;

  const isWide = featured || index % 7 === 0;
  const isTall = !isWide && index % 5 === 0;

  return (
    <Box
      ref={ref}
      sx={{
        gridColumn: isWide ? { xs: 'span 1', md: 'span 2' } : 'span 1',
        gridRow: isTall ? { xs: 'span 1', md: 'span 2' } : 'span 1',
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0) scale(1)' : 'translateY(32px) scale(0.97)',
        transition: `opacity 0.55s ease ${index * 0.04}s, transform 0.55s ease ${index * 0.04}s`,
      }}
    >
      <Box
        sx={{
          height: '100%',
          minHeight: isTall ? { md: 480 } : 340,
          display: 'flex',
          flexDirection: 'column',
          borderRadius: '20px',
          overflow: 'hidden',
          position: 'relative',
          background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.72)',
          backdropFilter: 'blur(16px)',
          border: isDark ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(255,255,255,0.9)',
          boxShadow: isDark ? '0 8px 32px rgba(0,0,0,0.4)' : '0 4px 24px rgba(0,0,0,0.06)',
          transition: 'transform 0.3s cubic-bezier(0.34,1.56,0.64,1), box-shadow 0.3s ease',
          '&:hover': {
            transform: 'translateY(-6px) scale(1.01)',
            boxShadow: isDark ? '0 20px 60px rgba(0,0,0,0.6)' : '0 16px 48px rgba(0,0,0,0.12)',
          },
        }}
      >
        <Box
          sx={{
            flex: isTall ? '1 1 60%' : '0 0 auto',
            height: isWide ? 240 : isTall ? '55%' : 200,
            position: 'relative',
            background: isDark 
              ? 'linear-gradient(135deg, rgba(30,40,60,0.8) 0%, rgba(15,25,45,0.9) 100%)' 
              : 'linear-gradient(135deg, #f8faff 0%, #eef3ff 100%)',
          }}
        >
          <Box
            component="img"
            src={normalizeImage(product.image)}
            alt={product.name}
            loading="lazy"
            sx={{
              position: 'absolute',
              inset: 0,
              width: '100%',
              height: '100%',
              objectFit: 'contain',
              padding: '16px',
              transition: 'transform 0.4s ease',
              '&:hover': { transform: 'scale(1.08)' },
            }}
          />
          <Stack direction="row" spacing={0.75} sx={{ position: 'absolute', top: 12, left: 12 }}>
            {isLowStock && (
              <Chip
                icon={<FireIcon sx={{ fontSize: '0.75rem !important', color: '#ff4d4d !important' }} />}
                label="Low Stock"
                size="small"
                sx={{ height: 22, fontSize: '0.65rem', fontWeight: 800, bgcolor: 'rgba(255,77,77,0.15)', color: '#ff4d4d' }}
              />
            )}
            {isSoldOut && (
              <Chip
                label="Sold Out"
                size="small"
                sx={{ height: 22, fontSize: '0.65rem', fontWeight: 800, bgcolor: 'rgba(100,100,100,0.2)', color: isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.35)' }}
              />
            )}
          </Stack>
        </Box>

        <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', p: 2 }}>
          <Typography
            sx={{
              fontWeight: 700,
              fontSize: isWide ? '1rem' : '0.88rem',
              lineHeight: 1.3,
              mb: 0.75,
              color: isDark ? 'rgba(255,255,255,0.9)' : '#0f172a',
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
            }}
          >
            {product.name}
          </Typography>

          <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center', mb: 'auto' }}>
            <Rating readOnly precision={0.5} value={product.rating.stars} size="small"
              sx={{ fontSize: '0.8rem', '& .MuiRating-iconFilled': { color: '#f59e0b' } }}
            />
            <Typography variant="caption" sx={{ color: isDark ? 'rgba(255,255,255,0.35)' : 'rgba(0,0,0,0.4)', fontSize: '0.68rem' }}>
              ({product.rating.count})
            </Typography>
          </Stack>

          <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'flex-end', mt: 1.25, mb: 1.25 }}>
            <Box>
              <Typography sx={{ fontWeight: 900, fontSize: isWide ? '1.38rem' : '1.1rem', color: isDark ? '#60a5fa' : '#1d4ed8', lineHeight: 1.1 }}>
                {ngnPrice
                  ? `₦${ngnPrice.toLocaleString("en-NG", { maximumFractionDigits: 0 })}`
                  : `$${usdPrice.toFixed(2)}`}
              </Typography>
              {ngnPrice && (
                <Typography sx={{ fontSize: '0.68rem', color: isDark ? 'rgba(255,255,255,0.35)' : 'rgba(0,0,0,0.4)' }}>
                  ${usdPrice.toFixed(2)}
                </Typography>
              )}
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.4 }}>
              <StockIcon sx={{ fontSize: '0.7rem', color: product.stock > 10 ? '#22c55e' : product.stock > 0 ? '#f59e0b' : '#ef4444' }} />
              <Typography sx={{ fontSize: '0.68rem', fontWeight: 700, color: product.stock > 10 ? '#22c55e' : product.stock > 0 ? '#f59e0b' : '#ef4444' }}>
                {product.stock > 0 ? `${product.stock} left` : 'Sold out'}
              </Typography>
            </Box>
          </Stack>

          <Stack direction="row" spacing={0.75}>
            <TextField
              select
              size="small"
              disabled={isSoldOut}
              value={qty}
              onChange={(e) => onQtyChange(product.id, Number(e.target.value))}
              sx={{
                width: 60,
                '& .MuiOutlinedInput-root': { borderRadius: '10px', fontSize: '0.82rem' },
              }}
            >
              {[...Array(Math.max(0, Math.min(product.stock || 0, 10))).keys()].map((i) => (
                <MenuItem key={i + 1} value={i + 1}>{i + 1}</MenuItem>
              ))}
            </TextField>

            <Button
              fullWidth
              variant="contained"
              disabled={isSoldOut}
              startIcon={<AddCartIcon />}
              onClick={() => onAddToCart(product.id, product.name)}
              sx={{
                borderRadius: '10px',
                fontWeight: 700,
                textTransform: 'none',
                background: isSoldOut ? undefined : 'linear-gradient(135deg, #1d4ed8 0%, #3b82f6 100%)',
                transition: "transform 0.2s ease, box-shadow 0.25s ease",
                "&:hover": {
                  transform: isSoldOut ? "none" : "translateY(-1px)",
                  boxShadow: isSoldOut ? "none" : "0 8px 20px rgba(37,99,235,0.35)",
                },
              }}
            >
              {isSoldOut ? "Unavailable" : "Add to Cart"}
            </Button>
          </Stack>
        </Box>
      </Box>
    </Box>
  );
});

// ─── Main ShopPage ────────────────────────────────────────────────────────────
export default function ShopPage({ onCartChanged, search, isAuthenticated }: Props) {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [quantities, setQuantities] = useState<{ [key: string]: number }>({});
  const [activeCategory, setActiveCategory] = useState<string>('All');
  const [usdToNgnRate, setUsdToNgnRate] = useState<number | null>(null);
  const [pillStuck, setPillStuck] = useState(false);
  const [playEntryAnimation, setPlayEntryAnimation] = useState(false);
  const [notification, setNotification] = useState<{
    open: boolean; message: string; severity: 'success' | 'error' | 'info';
  }>({ open: false, message: "", severity: "info" });

  useEffect(() => {
    const key = "shreda_shop_entry_animation_seen";
    const seen = sessionStorage.getItem(key) === "1";
    if (seen) {
      setPlayEntryAnimation(false);
      return;
    }
    setPlayEntryAnimation(true);
    sessionStorage.setItem(key, "1");
  }, []);

  useEffect(() => {
    const onScroll = () => {
      const isSticky = window.scrollY > 140;
      if (isSticky !== pillStuck) setPillStuck(isSticky);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [pillStuck]);

  const fetchProducts = useCallback(async () => {
    try {
      setLoading(true);
      const query = search.trim();
      const url = query ? `/api/products?search=${encodeURIComponent(query)}` : "/api/products";
      const response = await api.get<Product[]>(url);
      setProducts(response.data);
    } catch {
      setNotification({ open: true, message: "Unable to load products.", severity: "error" });
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => { fetchProducts(); }, [fetchProducts]);
  useEffect(() => {
    let mounted = true;
    api.get<{ rate: number }>("/api/exchange-rate/usd-ngn")
      .then((res) => {
        if (!mounted) return;
        const rate = Number(res.data?.rate);
        setUsdToNgnRate(Number.isFinite(rate) && rate > 0 ? rate : null);
      })
      .catch(() => {
        if (mounted) setUsdToNgnRate(null);
      });
    return () => { mounted = false; };
  }, []);

  const categories = useMemo(() => 
    ['All', ...Array.from(new Set(products.map(p => deriveCategory(p.name))))]
  , [products]);

  const filteredProducts = useMemo(() => 
    activeCategory === 'All' ? products : products.filter(p => deriveCategory(p.name) === activeCategory)
  , [products, activeCategory]);
  const averagePrice = useMemo(() => {
    if (!filteredProducts.length) return 0;
    const total = filteredProducts.reduce((sum, p) => sum + p.priceCents, 0);
    return total / filteredProducts.length;
  }, [filteredProducts]);
  const inStockCount = useMemo(
    () => filteredProducts.filter((p) => (p.stock || 0) > 0).length,
    [filteredProducts]
  );
  const topRatedCount = useMemo(
    () => filteredProducts.filter((p) => p.rating.stars >= 4.5).length,
    [filteredProducts]
  );

  const addToCart = async (productId: string, name: string) => {
    const qty = quantities[productId] || 1;
    const product = products.find((item) => item.id === productId);
    
    try {
      if (!isAuthenticated) {
        const guestCart = readGuestCart();
        const existingIndex = guestCart.findIndex((item) => item.productId === productId);
        if (existingIndex >= 0) {
          const next = guestCart[existingIndex].quantity + qty;
          guestCart[existingIndex].quantity = product ? Math.min(next, product.stock || next) : next;
        } else {
          guestCart.push({ id: Date.now(), productId, quantity: qty, deliveryOptionId: "1", product: product || null });
        }
        writeGuestCart(guestCart);
      } else {
        await api.post("/api/cart-items", { productId, quantity: qty });
      }
      await onCartChanged();
      setNotification({ open: true, message: `${qty} × ${name} added!`, severity: "success" });
    } catch {
      setNotification({ open: true, message: "Failed to add item.", severity: "error" });
    }
  };

  return (
    <Box sx={{ 
      minHeight: '100vh', 
      pb: 6,
      background: isDark 
        ? 'radial-gradient(ellipse at 20% 0%, rgba(30,58,138,0.1) 0%, transparent 50%)' 
        : 'radial-gradient(ellipse at 20% 0%, rgba(219,234,254,0.3) 0%, transparent 50%)',
    }}>
      <Box sx={{ pt: { xs: 3, md: 5 }, pb: 2, px: { xs: 2, md: 4 } }}>
        <Typography variant="overline" sx={{ fontWeight: 800, color: 'primary.main', letterSpacing: 2 }}>
          {search ? 'Search Results' : 'Shreda Curated'}
        </Typography>
        <Typography variant="h2" sx={{ fontWeight: 900, mb: 1, fontSize: { xs: '2.2rem', md: '3.5rem' } }}>
          {search ? `"${search}"` : 'The Collection'}
        </Typography>
        <Typography sx={{ maxWidth: 780, color: "text.secondary", fontSize: { xs: "0.9rem", md: "1rem" } }}>
          Discover premium picks with fast delivery, trusted ratings, and curated essentials designed for a modern shopping experience.
        </Typography>
      </Box>

      {!loading && (
        <Box sx={{ px: { xs: 2, md: 4 }, mb: 3 }}>
          <Box sx={{ display: "grid", gridTemplateColumns: { xs: "repeat(2,1fr)", md: "repeat(4,1fr)" }, gap: 1.25 }}>
            {[
              { label: "Products", value: filteredProducts.length },
              { label: "In Stock", value: inStockCount },
              { label: "Top Rated", value: topRatedCount },
              { label: "Avg. Price", value: `$${(averagePrice / 100).toFixed(2)}` },
            ].map((item) => (
              <Paper
                key={item.label}
                elevation={0}
                sx={{
                  p: { xs: 1.4, md: 1.8 },
                  borderRadius: 3,
                  border: "1px solid",
                  borderColor: "divider",
                  bgcolor: isDark ? "rgba(255,255,255,0.03)" : "rgba(255,255,255,0.7)",
                  backdropFilter: "blur(8px)",
                }}
              >
                <Typography sx={{ fontSize: "0.7rem", color: "text.secondary", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase" }}>
                  {item.label}
                </Typography>
                <Typography sx={{ fontSize: { xs: "1rem", md: "1.3rem" }, fontWeight: 900, mt: 0.2 }}>
                  {item.value}
                </Typography>
              </Paper>
            ))}
          </Box>
        </Box>
      )}

      {!loading && products.length > 0 && (
        <Box sx={{ 
          position: pillStuck ? 'fixed' : 'relative', 
          top: pillStuck ? 20 : 0, 
          zIndex: 1100, 
          width: '100%', 
          display: 'flex', 
          justifyContent: 'center',
          transition: 'all 0.3s ease'
        }}>
          <Stack 
            direction="row" 
            spacing={1} 
            sx={{ 
              p: 1, 
              borderRadius: '40px', 
              bgcolor: isDark ? 'rgba(15,23,42,0.8)' : 'rgba(255,255,255,0.8)',
              backdropFilter: 'blur(12px)',
              boxShadow: 3,
              maxWidth: '90vw',
              overflowX: 'auto',
              scrollbarWidth: 'none'
            }}
          >
            {categories.map((cat) => (
              <Button
                key={cat}
                size="small"
                variant={activeCategory === cat ? "contained" : "text"}
                onClick={() => setActiveCategory(cat)}
                sx={{ borderRadius: '20px', px: 2, whiteSpace: 'nowrap' }}
              >
                {cat}
              </Button>
            ))}
          </Stack>
        </Box>
      )}

      <Box sx={{ px: { xs: 2, md: 4 }, mt: 4 }}>
        {loading ? (
          <RealisticLoader message="Syncing catalog..." />
        ) : filteredProducts.length === 0 ? (
          <Alert severity="info" sx={{ borderRadius: 4 }}>No items found in this category.</Alert>
        ) : (
          <Box sx={{ 
            display: 'grid', 
            gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)', lg: 'repeat(4, 1fr)' },
            gap: 2 
          }}>
            {filteredProducts.map((product, idx) => (
              <ProductCard
                key={product.id}
                product={product}
                index={idx}
                qty={quantities[product.id] || 1}
                usdToNgnRate={usdToNgnRate}
                playEntryAnimation={playEntryAnimation}
                onQtyChange={(id, val) => setQuantities(q => ({ ...q, [id]: val }))}
                onAddToCart={addToCart}
              />
            ))}
          </Box>
        )}
      </Box>

      <Snackbar
        open={notification.open}
        autoHideDuration={4000}
        onClose={() => setNotification(n => ({ ...n, open: false }))}
      >
        <Alert severity={notification.severity} variant="filled" sx={{ borderRadius: 3 }}>
          {notification.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}