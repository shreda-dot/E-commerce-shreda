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
  useTheme,
} from "@mui/material";
import {
  AddShoppingCart as AddCartIcon,
  LocalFireDepartment as FireIcon,
  Star as StarIcon,
  Inventory as StockIcon,
  Category as CategoryIcon,
} from "@mui/icons-material";
import { useEffect, useState, useCallback, useRef } from "react";
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

// ─── Scroll-reveal hook ───────────────────────────────────────────────────────
function useScrollReveal(threshold = 0.12) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setVisible(true); observer.disconnect(); } },
      { threshold }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [threshold]);

  return { ref, visible };
}

// ─── Category pills derived from product names ────────────────────────────────
const deriveCategory = (name: string): string => {
  const n = name.toLowerCase();
  if (n.includes('phone') || n.includes('iphone') || n.includes('samsung') || n.includes('pixel')) return 'Phones';
  if (n.includes('laptop') || n.includes('macbook') || n.includes('computer') || n.includes('pc')) return 'Computers';
  if (n.includes('shoe') || n.includes('sneaker') || n.includes('boot') || n.includes('air max')) return 'Footwear';
  if (n.includes('shirt') || n.includes('jean') || n.includes('hoodie') || n.includes('dress') || n.includes('cloth')) return 'Clothing';
  if (n.includes('watch') || n.includes('bag') || n.includes('wallet') || n.includes('sunglasses')) return 'Accessories';
  if (n.includes('tv') || n.includes('monitor') || n.includes('speaker') || n.includes('headphone') || n.includes('earbud')) return 'Electronics';
  if (n.includes('chair') || n.includes('desk') || n.includes('sofa') || n.includes('furniture')) return 'Furniture';
  return 'Other';
};

// ─── Individual Product Card ─────────────────────────────────────────────────
interface ProductCardProps {
  product: Product;
  qty: number;
  onQtyChange: (id: string, val: number) => void;
  onAddToCart: (id: string, name: string) => void;
  featured?: boolean;
  index: number;
}

function ProductCard({ product, qty, onQtyChange, onAddToCart, featured = false, index }: ProductCardProps) {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const { ref, visible } = useScrollReveal();
  const isSoldOut = !product.stock || product.stock === 0;
  const isLowStock = product.stock < 5 && product.stock > 0;

  // Bento sizing: every 7th card is featured (wide), every 5th is tall
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
        transition: `opacity 0.55s ease ${index * 0.06}s, transform 0.55s ease ${index * 0.06}s`,
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
          cursor: 'pointer',
          background: isDark
            ? 'rgba(255,255,255,0.04)'
            : 'rgba(255,255,255,0.72)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          border: isDark
            ? '1px solid rgba(255,255,255,0.08)'
            : '1px solid rgba(255,255,255,0.9)',
          boxShadow: isDark
            ? '0 8px 32px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.06)'
            : '0 4px 24px rgba(0,0,0,0.06), 0 1px 0 rgba(255,255,255,1) inset',
          transition: 'transform 0.3s cubic-bezier(0.34,1.56,0.64,1), box-shadow 0.3s ease',
          '&:hover': {
            transform: 'translateY(-6px) scale(1.015)',
            boxShadow: isDark
              ? '0 20px 60px rgba(0,0,0,0.6), 0 0 0 1px rgba(99,179,237,0.3), inset 0 1px 0 rgba(255,255,255,0.1)'
              : '0 16px 48px rgba(0,0,0,0.12), 0 0 0 1px rgba(59,130,246,0.2)',
          },
        }}
      >
        {/* Image area */}
        <Box
          sx={{
            flex: isTall ? '1 1 60%' : '0 0 auto',
            height: isWide ? 240 : isTall ? '55%' : 200,
            position: 'relative',
            overflow: 'hidden',
            background: isDark
              ? 'linear-gradient(135deg, rgba(30,40,60,0.8) 0%, rgba(15,25,45,0.9) 100%)'
              : 'linear-gradient(135deg, #f8faff 0%, #eef3ff 100%)',
          }}
        >
          <Box
            component="img"
            src={normalizeImage(product.image)}
            alt={product.name}
            sx={{
              position: 'absolute',
              inset: 0,
              width: '100%',
              height: '100%',
              objectFit: 'contain',
              padding: '16px',
              transition: 'transform 0.4s ease',
              '.MuiBox-root:hover &': { transform: 'scale(1.08)' },
            }}
          />

          {/* Badges */}
          <Stack direction="row" spacing={0.75} sx={{ position: 'absolute', top: 12, left: 12 }}>
            {isLowStock && (
              <Chip
                icon={<FireIcon sx={{ fontSize: '0.75rem !important', color: '#ff4d4d !important' }} />}
                label="Low Stock"
                size="small"
                sx={{ height: 22, fontSize: '0.65rem', fontWeight: 800, bgcolor: 'rgba(255,77,77,0.15)', color: '#ff4d4d', border: '1px solid rgba(255,77,77,0.3)', backdropFilter: 'blur(8px)', '& .MuiChip-icon': { ml: '6px' } }}
              />
            )}
            {isSoldOut && (
              <Chip
                label="Sold Out"
                size="small"
                sx={{ height: 22, fontSize: '0.65rem', fontWeight: 800, bgcolor: 'rgba(100,100,100,0.2)', color: isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.35)', border: '1px solid rgba(128,128,128,0.2)', backdropFilter: 'blur(8px)' }}
              />
            )}
          </Stack>

          {/* Rating badge top-right */}
          <Box
            sx={{
              position: 'absolute',
              top: 12,
              right: 12,
              display: 'flex',
              alignItems: 'center',
              gap: 0.3,
              px: 1,
              py: 0.4,
              borderRadius: '20px',
              bgcolor: 'rgba(255,196,0,0.15)',
              border: '1px solid rgba(255,196,0,0.3)',
              backdropFilter: 'blur(8px)',
            }}
          >
            <StarIcon sx={{ fontSize: '0.75rem', color: '#f59e0b' }} />
            <Typography sx={{ fontSize: '0.7rem', fontWeight: 800, color: '#f59e0b' }}>
              {product.rating.stars.toFixed(1)}
            </Typography>
          </Box>
        </Box>

        {/* Content area */}
        <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', p: { xs: 1.75, md: 2 } }}>
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

          {/* Price row + stock */}
          <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'flex-end', mt: 1.25, mb: 1.25 }}>
            <Typography sx={{
              fontWeight: 900,
              fontSize: isWide ? '1.4rem' : '1.1rem',
              color: isDark ? '#60a5fa' : '#1d4ed8',
              letterSpacing: '-0.02em',
              lineHeight: 1,
            }}>
              ${(product.priceCents / 100).toFixed(2)}
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.4 }}>
              <StockIcon sx={{ fontSize: '0.7rem', color: product.stock > 10 ? '#22c55e' : product.stock > 0 ? '#f59e0b' : '#ef4444' }} />
              <Typography sx={{ fontSize: '0.68rem', fontWeight: 700, color: product.stock > 10 ? '#22c55e' : product.stock > 0 ? '#f59e0b' : '#ef4444' }}>
                {product.stock > 0 ? `${product.stock} left` : 'Sold out'}
              </Typography>
            </Box>
          </Stack>

          {/* Actions */}
          <Stack direction="row" spacing={0.75}>
            <TextField
              select
              size="small"
              disabled={isSoldOut}
              value={qty}
              onChange={(e) => onQtyChange(product.id, Number(e.target.value))}
              sx={{
                width: 56,
                '& .MuiOutlinedInput-root': {
                  borderRadius: '10px',
                  fontSize: '0.82rem',
                  bgcolor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
                  '& fieldset': { borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' },
                  '&:hover fieldset': { borderColor: isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.2)' },
                },
                '& .MuiSelect-select': { py: '7px', px: '8px' },
              }}
            >
              {[...Array(Math.max(0, Math.min(product.stock || 0, 10))).keys()].map((i) => (
                <MenuItem key={i + 1} value={i + 1} sx={{ fontSize: '0.82rem' }}>{i + 1}</MenuItem>
              ))}
            </TextField>

            <Button
              fullWidth
              variant="contained"
              disabled={isSoldOut}
              startIcon={<AddCartIcon sx={{ fontSize: '0.95rem !important' }} />}
              onClick={() => onAddToCart(product.id, product.name)}
              sx={{
                borderRadius: '10px',
                fontWeight: 700,
                fontSize: '0.8rem',
                textTransform: 'none',
                py: '7px',
                background: isSoldOut
                  ? undefined
                  : 'linear-gradient(135deg, #1d4ed8 0%, #3b82f6 100%)',
                boxShadow: isSoldOut ? 'none' : '0 2px 12px rgba(59,130,246,0.35)',
                transition: 'transform 0.15s ease, box-shadow 0.15s ease',
                '&:hover:not(:disabled)': {
                  transform: 'scale(1.03)',
                  boxShadow: '0 4px 20px rgba(59,130,246,0.5)',
                  background: 'linear-gradient(135deg, #1e40af 0%, #2563eb 100%)',
                },
                '&:active:not(:disabled)': { transform: 'scale(0.98)' },
              }}
            >
              Add to Cart
            </Button>
          </Stack>
        </Box>
      </Box>
    </Box>
  );
}

// ─── Main ShopPage ────────────────────────────────────────────────────────────
export default function ShopPage({ onCartChanged, search, isAuthenticated }: Props) {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [quantities, setQuantities] = useState<{ [key: string]: number }>({});
  const [activeCategory, setActiveCategory] = useState<string>('All');
  const [pillStuck, setPillStuck] = useState(false);
  const [notification, setNotification] = useState<{
    open: boolean; message: string; severity: 'success' | 'error' | 'info';
  }>({ open: false, message: "", severity: "info" });

  // Track scroll to show floating pill bar
  useEffect(() => {
    const onScroll = () => setPillStuck(window.scrollY > 140);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

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
    if (!notification.open) return;
    const t = window.setTimeout(() => setNotification((p) => ({ ...p, open: false })), 5000);
    return () => window.clearTimeout(t);
  }, [notification.open]);

  // Derive categories from products
  const categories = ['All', ...Array.from(new Set(products.map(p => deriveCategory(p.name))))];

  const filteredProducts = activeCategory === 'All'
    ? products
    : products.filter(p => deriveCategory(p.name) === activeCategory);

  const addToCart = async (productId: string, name: string) => {
    const qty = quantities[productId] || 1;
    const product = products.find((item) => item.id === productId);
    try {
      if (!isAuthenticated) {
        const guestCart = readGuestCart();
        const existingIndex = guestCart.findIndex((item) => item.productId === productId);
        if (existingIndex >= 0) {
          const next = guestCart[existingIndex].quantity + qty;
          guestCart[existingIndex] = {
            ...guestCart[existingIndex],
            quantity: product ? Math.min(next, product.stock || next) : next,
          };
        } else {
          guestCart.push({ id: Date.now(), productId, quantity: qty, deliveryOptionId: "1", product: product || null });
        }
        writeGuestCart(guestCart);
      } else {
        await api.post("/api/cart-items", { productId, quantity: qty });
      }
      await onCartChanged();
      setNotification({ open: true, message: `${qty} × ${name} added to cart!`, severity: "success" });
    } catch {
      setNotification({ open: true, message: "Failed to add item to cart.", severity: "error" });
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        position: 'relative',
        pb: 6,
        // Subtle noise-like background texture
        background: isDark
          ? 'radial-gradient(ellipse at 20% 0%, rgba(30,58,138,0.15) 0%, transparent 50%), radial-gradient(ellipse at 80% 100%, rgba(30,58,138,0.1) 0%, transparent 50%)'
          : 'radial-gradient(ellipse at 20% 0%, rgba(219,234,254,0.5) 0%, transparent 50%), radial-gradient(ellipse at 80% 100%, rgba(224,231,255,0.4) 0%, transparent 50%)',
      }}
    >
      {/* ── Page Header ── */}
      <Box sx={{ pt: { xs: 3, md: 5 }, pb: { xs: 2, md: 3 }, px: { xs: 1.5, sm: 3, md: 0 } }}>
        <Stack direction={{ xs: 'column', sm: 'row' }} sx={{ justifyContent: 'space-between', alignItems: { xs: 'flex-start', sm: 'flex-end' }, mb: 1 }}>
          <Box>
            <Typography
              sx={{
                fontSize: { xs: '0.65rem', md: '0.7rem' },
                fontWeight: 800,
                letterSpacing: '0.35em',
                color: isDark ? 'rgba(99,179,237,0.7)' : 'rgba(29,78,216,0.6)',
                textTransform: 'uppercase',
                mb: 0.5,
              }}
            >
              {search ? `Search Results` : `Beat the Odds — Shreda Store`}
            </Typography>
            <Typography
              sx={{
                fontWeight: 900,
                fontSize: { xs: '2rem', sm: '2.6rem', md: '3.2rem' },
                letterSpacing: '-0.035em',
                lineHeight: 0.95,
                color: isDark ? '#f1f5f9' : '#0f172a',
              }}
            >
              {search ? `"${search}"` : 'Curated\nfor You'}
            </Typography>
          </Box>

          <Box sx={{ mt: { xs: 1.5, sm: 0 }, display: 'flex', alignItems: 'center', gap: 1 }}>
            <Box sx={{
              px: 2, py: 0.75, borderRadius: '20px',
              border: isDark ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(0,0,0,0.08)',
              bgcolor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.7)',
              backdropFilter: 'blur(8px)',
            }}>
              <Typography sx={{ fontSize: '0.78rem', fontWeight: 700, color: isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.45)' }}>
                {filteredProducts.length} products
              </Typography>
            </Box>
          </Box>
        </Stack>
      </Box>

      {/* ── Floating Pill Category Filter ── */}
      {!loading && products.length > 0 && (
        <Box
          sx={{
            position: pillStuck ? 'fixed' : 'sticky',
            top: pillStuck ? 16 : 0,
            left: 0,
            right: 0,
            zIndex: 100,
            display: 'flex',
            justifyContent: 'center',
            pointerEvents: 'none',
            mb: pillStuck ? 0 : 3,
            transition: 'top 0.3s ease',
          }}
        >
          <Box
            sx={{
              pointerEvents: 'auto',
              display: 'flex',
              gap: 0.75,
              flexWrap: 'nowrap',
              overflowX: 'auto',
              px: 2,
              py: 1,
              borderRadius: '40px',
              background: isDark
                ? 'rgba(10,20,40,0.85)'
                : 'rgba(255,255,255,0.88)',
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
              border: isDark
                ? '1px solid rgba(255,255,255,0.1)'
                : '1px solid rgba(0,0,0,0.08)',
              boxShadow: isDark
                ? '0 8px 32px rgba(0,0,0,0.5), 0 0 0 1px rgba(99,179,237,0.1)'
                : '0 8px 32px rgba(0,0,0,0.1), 0 0 0 1px rgba(255,255,255,0.9)',
              scrollbarWidth: 'none',
              '&::-webkit-scrollbar': { display: 'none' },
            }}
          >
            {categories.map((cat) => {
              const isActive = cat === activeCategory;
              return (
                <Box
                  key={cat}
                  component="button"
                  onClick={() => setActiveCategory(cat)}
                  sx={{
                    border: 'none',
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                    borderRadius: '20px',
                    px: 1.75,
                    py: 0.6,
                    fontSize: '0.78rem',
                    fontWeight: isActive ? 800 : 600,
                    fontFamily: 'inherit',
                    transition: 'all 0.2s ease',
                    background: isActive
                      ? 'linear-gradient(135deg, #1d4ed8, #3b82f6)'
                      : 'transparent',
                    color: isActive
                      ? '#ffffff'
                      : isDark ? 'rgba(255,255,255,0.55)' : 'rgba(0,0,0,0.5)',
                    boxShadow: isActive ? '0 2px 10px rgba(59,130,246,0.4)' : 'none',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 0.4,
                    '&:hover': {
                      color: isActive ? '#fff' : isDark ? 'rgba(255,255,255,0.85)' : '#0f172a',
                      background: isActive
                        ? 'linear-gradient(135deg, #1e40af, #2563eb)'
                        : isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
                    },
                  }}
                >
                  {cat === 'All' && <CategoryIcon sx={{ fontSize: '0.8rem' }} />}
                  {cat}
                </Box>
              );
            })}
          </Box>
        </Box>
      )}

      {/* ── Main Content ── */}
      <Box sx={{ px: { xs: 1.5, sm: 3, md: 0 }, mt: pillStuck ? 3 : 0 }}>
        {loading ? (
          <Box sx={{ pt: 6 }}>
            <RealisticLoader message="Fetching the best products..." />
          </Box>
        ) : filteredProducts.length === 0 ? (
          <Box
            sx={{
              textAlign: 'center',
              py: 12,
              borderRadius: '24px',
              border: isDark ? '1px dashed rgba(255,255,255,0.1)' : '1px dashed rgba(0,0,0,0.1)',
              bgcolor: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.01)',
            }}
          >
            <Typography sx={{ fontSize: '2.5rem', mb: 1 }}>🔍</Typography>
            <Typography variant="h5" sx={{ fontWeight: 800, color: isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.35)', mb: 1 }}>
              No products found
            </Typography>
            <Typography variant="body2" sx={{ color: isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.3)', mb: 3 }}>
              {activeCategory !== 'All' ? `Try a different category or ` : ''}clear your search
            </Typography>
            <Stack direction="row" spacing={1.5} sx={{ justifyContent: 'center' }}>
              {activeCategory !== 'All' && (
                <Button variant="outlined" sx={{ borderRadius: 20, textTransform: 'none', fontWeight: 700 }} onClick={() => setActiveCategory('All')}>
                  All Categories
                </Button>
              )}
              <Button variant="contained" sx={{ borderRadius: 20, textTransform: 'none', fontWeight: 700 }} onClick={() => (window.location.href = '/')}>
                Clear Search
              </Button>
            </Stack>
          </Box>
        ) : (
          // ── Bento Grid ──────────────────────────────────────────────────
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: {
                xs: 'repeat(1, 1fr)',
                sm: 'repeat(2, 1fr)',
                md: 'repeat(3, 1fr)',
                lg: 'repeat(4, 1fr)',
              },
              gap: { xs: 1.5, md: 2 },
              alignItems: 'start',
            }}
          >
            {filteredProducts.map((product, index) => (
              <ProductCard
                key={product.id}
                product={product}
                qty={quantities[product.id] || 1}
                onQtyChange={(id, val) => setQuantities((p) => ({ ...p, [id]: val }))}
                onAddToCart={addToCart}
                index={index}
              />
            ))}
          </Box>
        )}
      </Box>

      {/* ── Snackbar ── */}
      <Snackbar
        open={notification.open}
        autoHideDuration={5000}
        onClose={() => setNotification((p) => ({ ...p, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          severity={notification.severity}
          variant="filled"
          sx={{
            borderRadius: '12px',
            fontWeight: 700,
            boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
          }}
        >
          {notification.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
