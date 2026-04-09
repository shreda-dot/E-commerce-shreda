import {
  Alert,
  Avatar,
  Box,
  Button,
  Chip,
  CircularProgress,
  Divider,
  Skeleton,
  Snackbar,
  Stack,
  Tab,
  Tabs,
  TextField,
  Tooltip,
  Typography,
  useTheme,
} from '@mui/material';
import {
  AccountCircleOutlined as ProfileIcon,
  CancelOutlined as CancelledIcon,
  CheckCircleOutlined as DeliveredIcon,
  EditOutlined as EditIcon,
  LocalShippingOutlined as ShippedIcon,
  ReceiptLongOutlined as OrdersIcon,
  Storefront as StoreIcon,
  TrendingUp as TrendingIcon,
  HourglassTopOutlined as PendingIcon,
  InventoryOutlined as ProcessingIcon,
} from '@mui/icons-material';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../contexts/AuthContext';

// ─── Types ────────────────────────────────────────────────────────────────────
type OrderStatus = 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';

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
  severity: 'success' | 'error' | 'info';
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
const normalizeImage = (image: string | null | undefined): string | undefined => {
  if (!image) return undefined;
  if (image.startsWith('blob:') || image.startsWith('http://') || image.startsWith('https://')) return image;
  return image.startsWith('/') ? image : `/${image}`;
};

const fmt = (cents: number) => `$${(cents / 100).toFixed(2)}`;

const STATUS_CONFIG: Record<OrderStatus, { label: string; color: string; bg: string; icon: React.ReactNode }> = {
  pending:    { label: 'Pending',    color: '#f59e0b', bg: 'rgba(245,158,11,0.12)',  icon: <PendingIcon    sx={{ fontSize: 14 }} /> },
  processing: { label: 'Processing', color: '#3b82f6', bg: 'rgba(59,130,246,0.12)',  icon: <ProcessingIcon sx={{ fontSize: 14 }} /> },
  shipped:    { label: 'Shipped',    color: '#8b5cf6', bg: 'rgba(139,92,246,0.12)',  icon: <ShippedIcon    sx={{ fontSize: 14 }} /> },
  delivered:  { label: 'Delivered',  color: '#22c55e', bg: 'rgba(34,197,94,0.12)',   icon: <DeliveredIcon  sx={{ fontSize: 14 }} /> },
  cancelled:  { label: 'Cancelled',  color: '#ef4444', bg: 'rgba(239,68,68,0.12)',   icon: <CancelledIcon  sx={{ fontSize: 14 }} /> },
};

const TIMELINE_STEPS: { key: OrderStatus; label: string }[] = [
  { key: 'pending',    label: 'Placed'     },
  { key: 'processing', label: 'Processing' },
  { key: 'shipped',    label: 'Shipped'    },
  { key: 'delivered',  label: 'Delivered'  },
];

const getStepIndex = (status?: OrderStatus): number => {
  if (status === 'cancelled') return -1;
  const idx = TIMELINE_STEPS.findIndex(s => s.key === status);
  return idx === -1 ? 0 : idx;
};

// ─── Sub-components ───────────────────────────────────────────────────────────

/** Glass card wrapper */
function GlassCard({ children, sx = {} }: { children: React.ReactNode; sx?: object }) {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  return (
    <Box
      sx={{
        borderRadius: '20px',
        background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.82)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        border: isDark ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(255,255,255,0.95)',
        boxShadow: isDark
          ? '0 8px 32px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.06)'
          : '0 4px 24px rgba(0,0,0,0.06), inset 0 1px 0 rgba(255,255,255,1)',
        ...sx,
      }}
    >
      {children}
    </Box>
  );
}

/** Stat card for dashboard row */
function StatCard({ icon, label, value, accent, delay = 0 }: {
  icon: React.ReactNode; label: string; value: number | string; accent: string; delay?: number;
}) {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  return (
    <GlassCard
      sx={{
        p: { xs: 2, md: 2.5 },
        flex: 1,
        minWidth: 0,
        opacity: 0,
        animation: `fadeSlideUp 0.5s ease ${delay}s forwards`,
        '@keyframes fadeSlideUp': {
          from: { opacity: 0, transform: 'translateY(16px)' },
          to:   { opacity: 1, transform: 'translateY(0)' },
        },
      }}
    >
      <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
        <Box
          sx={{
            width: 40, height: 40, borderRadius: '12px', flexShrink: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: `${accent}22`,
            border: `1px solid ${accent}33`,
            color: accent,
          }}
        >
          {icon}
        </Box>
        <Box sx={{ minWidth: 0 }}>
          <Typography sx={{ fontSize: '1.5rem', fontWeight: 900, lineHeight: 1, color: isDark ? '#f1f5f9' : '#0f172a', letterSpacing: '-0.03em' }}>
            {value}
          </Typography>
          <Typography sx={{ fontSize: '0.72rem', fontWeight: 600, color: isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.45)', mt: 0.2, whiteSpace: 'nowrap' }}>
            {label}
          </Typography>
        </Box>
      </Stack>
    </GlassCard>
  );
}

/** Order tracking timeline */
function OrderTimeline({ status }: { status?: OrderStatus }) {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const activeStep = getStepIndex(status);

  if (status === 'cancelled') {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
        <CancelledIcon sx={{ fontSize: 16, color: '#ef4444' }} />
        <Typography sx={{ fontSize: '0.78rem', fontWeight: 700, color: '#ef4444' }}>Order Cancelled</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0, mt: 1.5, position: 'relative' }}>
      {TIMELINE_STEPS.map((step, i) => {
        const isDone    = i <= activeStep;
        const isActive  = i === activeStep;
        const cfg = STATUS_CONFIG[step.key];

        return (
          <Box key={step.key} sx={{ display: 'flex', alignItems: 'center', flex: i < TIMELINE_STEPS.length - 1 ? 1 : 'none' }}>
            {/* Dot */}
            <Tooltip title={step.label} arrow>
              <Box
                sx={{
                  width: isActive ? 28 : 20,
                  height: isActive ? 28 : 20,
                  borderRadius: '50%',
                  flexShrink: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: isDone
                    ? (isActive ? cfg.color : (isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.12)'))
                    : (isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'),
                  border: isActive ? `2px solid ${cfg.color}` : isDone ? 'none' : `1.5px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}`,
                  boxShadow: isActive ? `0 0 0 4px ${cfg.color}22` : 'none',
                  transition: 'all 0.3s ease',
                  cursor: 'default',
                }}
              >
                {isActive && (
                  <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: '#fff' }} />
                )}
                {!isActive && isDone && (
                  <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.4)' }} />
                )}
              </Box>
            </Tooltip>
            {/* Connector line */}
            {i < TIMELINE_STEPS.length - 1 && (
              <Box
                sx={{
                  flex: 1,
                  height: 2,
                  mx: 0.5,
                  borderRadius: 1,
                  background: i < activeStep
                    ? (isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.15)')
                    : (isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'),
                  transition: 'background 0.3s ease',
                }}
              />
            )}
          </Box>
        );
      })}
    </Box>
  );
}

/** Single order card */
function OrderCard({ order, index }: { order: OrderItem; index: number }) {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const [expanded, setExpanded] = useState(false);
  const status = order.status ?? 'pending';
  const cfg = STATUS_CONFIG[status];
  const itemCount = order.products.reduce((s, p) => s + p.quantity, 0);

  return (
    <GlassCard
      sx={{
        overflow: 'hidden',
        opacity: 0,
        animation: `fadeSlideUp 0.45s ease ${index * 0.07}s forwards`,
        '@keyframes fadeSlideUp': {
          from: { opacity: 0, transform: 'translateY(14px)' },
          to:   { opacity: 1, transform: 'translateY(0)' },
        },
        transition: 'box-shadow 0.25s ease',
        '&:hover': {
          boxShadow: isDark
            ? '0 12px 40px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.08)'
            : '0 8px 32px rgba(0,0,0,0.1)',
        },
      }}
    >
      {/* Accent top bar */}
      <Box sx={{ height: 3, background: `linear-gradient(90deg, ${cfg.color}cc, ${cfg.color}44)` }} />

      <Box sx={{ p: { xs: 2, md: 2.5 } }}>
        {/* Header row */}
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ justifyContent: 'space-between', alignItems: { xs: 'flex-start', sm: 'center' }, mb: 1.5 }}>
          <Box>
            <Typography sx={{ fontSize: '0.68rem', fontWeight: 800, letterSpacing: '0.2em', color: isDark ? 'rgba(255,255,255,0.35)' : 'rgba(0,0,0,0.35)', mb: 0.3 }}>
              ORDER
            </Typography>
            <Typography sx={{ fontSize: '0.95rem', fontWeight: 800, fontFamily: 'monospace', color: isDark ? '#e2e8f0' : '#0f172a', letterSpacing: '0.05em' }}>
              #{order.id.slice(0, 8).toUpperCase()}
            </Typography>
          </Box>

          <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
            <Chip
              icon={<Box sx={{ color: `${cfg.color} !important`, display: 'flex', alignItems: 'center', ml: '6px !important' }}>{cfg.icon}</Box>}
              label={cfg.label}
              size="small"
              sx={{ height: 26, fontSize: '0.72rem', fontWeight: 800, bgcolor: cfg.bg, color: cfg.color, border: `1px solid ${cfg.color}44`, '& .MuiChip-icon': { color: cfg.color } }}
            />
            <Typography sx={{ fontSize: '1.1rem', fontWeight: 900, color: isDark ? '#60a5fa' : '#1d4ed8', letterSpacing: '-0.02em' }}>
              {fmt(order.totalCostCents)}
            </Typography>
          </Stack>
        </Stack>

        {/* Meta row */}
        <Stack direction="row" spacing={2} sx={{ mb: 1.5, flexWrap: 'wrap', gap: 0.5 }}>
          <Typography sx={{ fontSize: '0.75rem', color: isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.45)' }}>
            {new Date(order.orderTimeMs).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
          </Typography>
          <Typography sx={{ fontSize: '0.75rem', color: isDark ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.25)' }}>·</Typography>
          <Typography sx={{ fontSize: '0.75rem', color: isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.45)' }}>
            {itemCount} {itemCount === 1 ? 'item' : 'items'}
          </Typography>
        </Stack>

        {/* Tracking timeline */}
        <OrderTimeline status={status} />

        {/* Expand toggle */}
        {order.products.length > 0 && (
          <Button
            size="small"
            onClick={() => setExpanded(p => !p)}
            sx={{
              mt: 1.5,
              fontSize: '0.72rem',
              fontWeight: 700,
              textTransform: 'none',
              color: isDark ? 'rgba(255,255,255,0.45)' : 'rgba(0,0,0,0.4)',
              px: 0,
              minWidth: 0,
              '&:hover': { background: 'none', color: isDark ? 'rgba(255,255,255,0.75)' : '#0f172a' },
            }}
          >
            {expanded ? '▲ Hide items' : `▼ Show ${order.products.length} product${order.products.length > 1 ? 's' : ''}`}
          </Button>
        )}

        {/* Expanded product list */}
        {expanded && (
          <Box sx={{ mt: 1.5, pt: 1.5, borderTop: `1px solid ${isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.06)'}` }}>
            <Stack spacing={1}>
              {order.products.map((p, i) => (
                <Stack key={i} direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
                  {p.image ? (
                    <Box
                      component="img"
                      src={normalizeImage(p.image)}
                      sx={{ width: 40, height: 40, borderRadius: '10px', objectFit: 'contain', bgcolor: isDark ? 'rgba(255,255,255,0.06)' : '#f8faff', p: 0.5, flexShrink: 0 }}
                    />
                  ) : (
                    <Box sx={{ width: 40, height: 40, borderRadius: '10px', bgcolor: isDark ? 'rgba(255,255,255,0.06)' : '#f0f4ff', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <StoreIcon sx={{ fontSize: 18, color: isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.2)' }} />
                    </Box>
                  )}
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography sx={{ fontSize: '0.82rem', fontWeight: 700, color: isDark ? 'rgba(255,255,255,0.8)' : '#1e293b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {p.name || 'Product'}
                    </Typography>
                    <Typography sx={{ fontSize: '0.72rem', color: isDark ? 'rgba(255,255,255,0.35)' : 'rgba(0,0,0,0.4)' }}>
                      Qty: {p.quantity}{p.priceCents ? ` · ${fmt(p.priceCents * p.quantity)}` : ''}
                    </Typography>
                  </Box>
                </Stack>
              ))}
            </Stack>
          </Box>
        )}
      </Box>
    </GlassCard>
  );
}

// ─── Main AccountPage ─────────────────────────────────────────────────────────
export default function AccountPage() {
  const { user, refresh } = useAuth();
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  const [tab, setTab] = useState(0);
  const [name, setName] = useState(user?.name || '');
  const [orders, setOrders] = useState<OrderItem[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(true);
  const [profileImage, setProfileImage] = useState<string | undefined>(normalizeImage(user?.profileImage));
  const [savingProfile, setSavingProfile] = useState(false);
  const [message, setMessage] = useState<MessageState>({ open: false, text: '', severity: 'success' });
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { setName(user?.name || ''); }, [user?.name]);
  useEffect(() => { setProfileImage(normalizeImage(user?.profileImage)); }, [user?.profileImage]);

  useEffect(() => {
    if (!message.open) return;
    const t = window.setTimeout(() => setMessage(p => ({ ...p, open: false })), 5000);
    return () => window.clearTimeout(t);
  }, [message.open]);

  useEffect(() => {
    if (!user) return;
    setOrdersLoading(true);
    api.get<OrderItem[]>('/api/orders?mine=true')
      .then(r => setOrders(r.data))
      .catch(() => setOrders([]))
      .finally(() => setOrdersLoading(false));
  }, [user?.id]);

  // ── Stats ──────────────────────────────────────────────────────────────────
  const stats = useMemo(() => ({
    total:      orders.length,
    inProgress: orders.filter(o => o.status === 'processing' || o.status === 'shipped' || o.status === 'pending').length,
    delivered:  orders.filter(o => o.status === 'delivered').length,
    cancelled:  orders.filter(o => o.status === 'cancelled').length,
  }), [orders]);

  // ── Profile actions ────────────────────────────────────────────────────────
  const uploadImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const preview = URL.createObjectURL(file);
    setProfileImage(preview);
    const formData = new FormData();
    formData.append('image', file);
    try {
      const res = await api.post<{ profileImage?: string }>('/api/auth/profile/image', formData);
      const img = normalizeImage(res.data?.profileImage);
      if (img) setProfileImage(img);
      await refresh();
      setMessage({ open: true, text: 'Profile photo updated!', severity: 'success' });
    } catch {
      setProfileImage(normalizeImage(user?.profileImage));
      setMessage({ open: true, text: 'Unable to upload photo.', severity: 'error' });
    } finally {
      URL.revokeObjectURL(preview);
    }
  };

  const saveProfile = async () => {
    setSavingProfile(true);
    try {
      await api.put('/api/auth/profile', { name });
      await refresh();
      setMessage({ open: true, text: 'Profile saved!', severity: 'success' });
    } catch {
      setMessage({ open: true, text: 'Unable to update profile.', severity: 'error' });
    } finally {
      setSavingProfile(false);
    }
  };

  if (!user) return <Navigate to="/auth" replace />;

  // ── Token colors ──────────────────────────────────────────────────────────
  const t = {
    pageBg: isDark
      ? 'radial-gradient(ellipse at 15% 0%, rgba(30,58,138,0.18) 0%, transparent 55%), radial-gradient(ellipse at 85% 100%, rgba(30,58,138,0.12) 0%, transparent 55%)'
      : 'radial-gradient(ellipse at 15% 0%, rgba(219,234,254,0.6) 0%, transparent 55%), radial-gradient(ellipse at 85% 100%, rgba(224,231,255,0.45) 0%, transparent 55%)',
    headingColor:   isDark ? '#f1f5f9' : '#0f172a',
    subColor:       isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.45)',
    tabBg:          isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)',
    tabActiveBg:    isDark ? 'rgba(59,130,246,0.2)'  : 'rgba(29,78,216,0.08)',
    tabActiveColor: isDark ? '#60a5fa' : '#1d4ed8',
    inputBg:        isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
    divider:        isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.07)',
  };

  return (
    <Box sx={{ minHeight: '100vh', background: t.pageBg, pb: 8, position: 'relative' }}>

      {/* ── Hero header ── */}
      <Box
        sx={{
          pt: { xs: 4, md: 6 },
          pb: { xs: 3, md: 4 },
          px: { xs: 2, md: 0 },
          opacity: 0,
          animation: 'fadeSlideUp 0.5s ease 0.05s forwards',
          '@keyframes fadeSlideUp': {
            from: { opacity: 0, transform: 'translateY(16px)' },
            to:   { opacity: 1, transform: 'translateY(0)' },
          },
        }}
      >
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2.5} sx={{ alignItems: { xs: 'flex-start', sm: 'center' } }}>
          {/* Avatar */}
          <Box sx={{ position: 'relative', flexShrink: 0 }}>
            <Avatar
              src={profileImage}
              sx={{
                width: { xs: 72, md: 88 },
                height: { xs: 72, md: 88 },
                fontSize: '2rem',
                fontWeight: 900,
                background: 'linear-gradient(135deg, #1d4ed8, #3b82f6)',
                border: isDark ? '3px solid rgba(255,255,255,0.1)' : '3px solid rgba(255,255,255,0.9)',
                boxShadow: '0 8px 24px rgba(59,130,246,0.3)',
              }}
            >
              {user.name?.slice(0, 1).toUpperCase()}
            </Avatar>
            <Box
              component="button"
              onClick={() => fileInputRef.current?.click()}
              sx={{
                position: 'absolute', bottom: -2, right: -2,
                width: 28, height: 28, borderRadius: '50%',
                background: 'linear-gradient(135deg, #1d4ed8, #3b82f6)',
                border: isDark ? '2px solid rgba(10,20,40,0.9)' : '2px solid #fff',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', transition: 'transform 0.2s ease',
                '&:hover': { transform: 'scale(1.1)' },
              }}
            >
              <EditIcon sx={{ fontSize: 13, color: '#fff' }} />
            </Box>
            <input ref={fileInputRef} hidden type="file" accept="image/*" onChange={uploadImage} />
          </Box>

          {/* Name & email */}
          <Box>
            <Typography sx={{ fontSize: { xs: '0.65rem', md: '0.7rem' }, fontWeight: 800, letterSpacing: '0.3em', color: isDark ? 'rgba(99,179,237,0.7)' : 'rgba(29,78,216,0.6)', textTransform: 'uppercase', mb: 0.25 }}>
              My Account
            </Typography>
            <Typography sx={{ fontSize: { xs: '1.8rem', md: '2.4rem' }, fontWeight: 900, letterSpacing: '-0.035em', lineHeight: 1, color: t.headingColor }}>
              {user.name}
            </Typography>
            <Typography sx={{ fontSize: '0.82rem', color: t.subColor, mt: 0.5 }}>
              {user.email}
              {user.role === 'admin' && (
                <Chip label="Admin" size="small" sx={{ ml: 1, height: 18, fontSize: '0.62rem', fontWeight: 800, bgcolor: 'rgba(59,130,246,0.15)', color: '#3b82f6', border: '1px solid rgba(59,130,246,0.3)' }} />
              )}
            </Typography>
          </Box>
        </Stack>
      </Box>

      {/* ── Stats row ── */}
      <Box sx={{ px: { xs: 2, md: 0 }, mb: 3 }}>
        <Stack direction="row" spacing={{ xs: 1, md: 1.5 }} sx={{ flexWrap: { xs: 'wrap', sm: 'nowrap' }, gap: { xs: 1, sm: 0 } }}>
          <StatCard icon={<OrdersIcon   sx={{ fontSize: 20 }} />} label="Total Orders"  value={ordersLoading ? '—' : stats.total}      accent="#3b82f6" delay={0.1} />
          <StatCard icon={<TrendingIcon  sx={{ fontSize: 20 }} />} label="In Progress"   value={ordersLoading ? '—' : stats.inProgress}  accent="#f59e0b" delay={0.17} />
          <StatCard icon={<DeliveredIcon sx={{ fontSize: 20 }} />} label="Delivered"     value={ordersLoading ? '—' : stats.delivered}   accent="#22c55e" delay={0.24} />
          <StatCard icon={<CancelledIcon sx={{ fontSize: 20 }} />} label="Cancelled"     value={ordersLoading ? '—' : stats.cancelled}   accent="#ef4444" delay={0.31} />
        </Stack>
      </Box>

      {/* ── Tab navigation ── */}
      <Box
        sx={{
          px: { xs: 2, md: 0 },
          mb: 3,
          opacity: 0,
          animation: 'fadeSlideUp 0.45s ease 0.35s forwards',
          '@keyframes fadeSlideUp': {
            from: { opacity: 0, transform: 'translateY(14px)' },
            to:   { opacity: 1, transform: 'translateY(0)' },
          },
        }}
      >
        <Box
          sx={{
            display: 'inline-flex',
            borderRadius: '16px',
            p: 0.5,
            background: t.tabBg,
            border: isDark ? '1px solid rgba(255,255,255,0.07)' : '1px solid rgba(0,0,0,0.07)',
            gap: 0.5,
          }}
        >
          {[
            { label: 'Orders',  icon: <OrdersIcon  sx={{ fontSize: 16 }} /> },
            { label: 'Profile', icon: <ProfileIcon sx={{ fontSize: 16 }} /> },
          ].map((t2, i) => (
            <Box
              key={t2.label}
              component="button"
              onClick={() => setTab(i)}
              sx={{
                border: 'none',
                cursor: 'pointer',
                borderRadius: '12px',
                px: { xs: 2, md: 2.5 },
                py: 1,
                display: 'flex',
                alignItems: 'center',
                gap: 0.75,
                fontSize: '0.82rem',
                fontWeight: tab === i ? 800 : 600,
                fontFamily: 'inherit',
                transition: 'all 0.2s ease',
                background: tab === i ? (isDark ? 'rgba(59,130,246,0.2)' : 'rgba(29,78,216,0.1)') : 'transparent',
                color: tab === i ? (isDark ? '#60a5fa' : '#1d4ed8') : (isDark ? 'rgba(255,255,255,0.45)' : 'rgba(0,0,0,0.45)'),
                boxShadow: tab === i ? (isDark ? 'inset 0 1px 0 rgba(255,255,255,0.08)' : 'inset 0 1px 0 rgba(255,255,255,0.9)') : 'none',
                '&:hover': {
                  color: tab === i ? undefined : (isDark ? 'rgba(255,255,255,0.75)' : '#0f172a'),
                  background: tab === i ? undefined : (isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)'),
                },
              }}
            >
              {t2.icon}
              {t2.label}
            </Box>
          ))}
        </Box>
      </Box>

      {/* ── Tab: Orders ── */}
      {tab === 0 && (
        <Box sx={{ px: { xs: 2, md: 0 } }}>
          {ordersLoading ? (
            <Stack spacing={2}>
              {[0, 1, 2].map(i => (
                <GlassCard key={i} sx={{ p: 2.5 }}>
                  <Stack spacing={1.5}>
                    <Stack direction="row" spacing={2} sx={{ justifyContent: 'space-between' }}>
                      <Skeleton variant="text" width={120} height={20} />
                      <Skeleton variant="rounded" width={80} height={26} sx={{ borderRadius: '20px' }} />
                    </Stack>
                    <Skeleton variant="text" width={160} height={16} />
                    <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mt: 0.5 }}>
                      {[0,1,2,3].map(j => <Skeleton key={j} variant="circular" width={20} height={20} />)}
                    </Stack>
                  </Stack>
                </GlassCard>
              ))}
            </Stack>
          ) : orders.length === 0 ? (
            <GlassCard sx={{ p: { xs: 4, md: 6 }, textAlign: 'center' }}>
              <Box sx={{ fontSize: '3rem', mb: 1.5 }}>🛍️</Box>
              <Typography sx={{ fontSize: '1.1rem', fontWeight: 800, color: t.headingColor, mb: 0.75 }}>
                No orders yet
              </Typography>
              <Typography sx={{ fontSize: '0.85rem', color: t.subColor, mb: 3 }}>
                Your order history will appear here after your first purchase.
              </Typography>
              <Button
                variant="contained"
                href="/"
                sx={{ borderRadius: '12px', fontWeight: 700, textTransform: 'none', px: 3, background: 'linear-gradient(135deg, #1d4ed8, #3b82f6)', boxShadow: '0 2px 12px rgba(59,130,246,0.35)' }}
              >
                Start Shopping
              </Button>
            </GlassCard>
          ) : (
            <Stack spacing={2}>
              {orders
                .slice()
                .sort((a, b) => b.orderTimeMs - a.orderTimeMs)
                .map((order, i) => (
                  <OrderCard key={order.id} order={order} index={i} />
                ))}
            </Stack>
          )}
        </Box>
      )}

      {/* ── Tab: Profile ── */}
      {tab === 1 && (
        <Box
          sx={{
            px: { xs: 2, md: 0 },
            opacity: 0,
            animation: 'fadeSlideUp 0.4s ease 0s forwards',
            '@keyframes fadeSlideUp': {
              from: { opacity: 0, transform: 'translateY(14px)' },
              to:   { opacity: 1, transform: 'translateY(0)' },
            },
          }}
        >
          <GlassCard sx={{ p: { xs: 2.5, md: 3.5 }, maxWidth: 520 }}>
            <Typography sx={{ fontSize: '0.68rem', fontWeight: 800, letterSpacing: '0.25em', color: t.subColor, textTransform: 'uppercase', mb: 2.5 }}>
              Account Settings
            </Typography>

            <Stack spacing={2.5}>
              {/* Avatar large */}
              <Stack direction="row" spacing={2} sx={{ alignItems: 'center' }}>
                <Avatar
                  src={profileImage}
                  sx={{ width: 64, height: 64, fontWeight: 900, fontSize: '1.5rem', background: 'linear-gradient(135deg, #1d4ed8, #3b82f6)', boxShadow: '0 4px 16px rgba(59,130,246,0.3)' }}
                >
                  {user.name?.slice(0, 1).toUpperCase()}
                </Avatar>
                <Box>
                  <Button
                    variant="outlined"
                    size="small"
                    onClick={() => fileInputRef.current?.click()}
                    startIcon={<EditIcon sx={{ fontSize: '0.85rem' }} />}
                    sx={{ borderRadius: '10px', textTransform: 'none', fontSize: '0.78rem', fontWeight: 700, borderColor: isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.15)', color: isDark ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.6)', '&:hover': { borderColor: '#3b82f6', color: '#3b82f6' } }}
                  >
                    Change Photo
                  </Button>
                  <Typography sx={{ fontSize: '0.7rem', color: t.subColor, mt: 0.5 }}>JPG or PNG, max 2MB</Typography>
                </Box>
              </Stack>

              <Divider sx={{ borderColor: t.divider }} />

              {/* Fields */}
              <TextField
                label="Full Name"
                value={name}
                onChange={e => setName(e.target.value)}
                fullWidth
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: '12px',
                    bgcolor: t.inputBg,
                    '& fieldset': { borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' },
                    '&:hover fieldset': { borderColor: '#3b82f6' },
                    '&.Mui-focused fieldset': { borderColor: '#3b82f6' },
                  },
                }}
              />
              <TextField
                label="Email Address"
                value={user.email}
                disabled
                fullWidth
                helperText="Email cannot be changed"
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: '12px',
                    bgcolor: t.inputBg,
                    '& fieldset': { borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' },
                  },
                }}
              />

              <Button
                variant="contained"
                onClick={saveProfile}
                disabled={savingProfile || name === user.name}
                sx={{
                  borderRadius: '12px',
                  fontWeight: 700,
                  textTransform: 'none',
                  py: 1.25,
                  background: 'linear-gradient(135deg, #1d4ed8, #3b82f6)',
                  boxShadow: '0 2px 12px rgba(59,130,246,0.35)',
                  '&:hover': { background: 'linear-gradient(135deg, #1e40af, #2563eb)', boxShadow: '0 4px 20px rgba(59,130,246,0.5)' },
                  '&:disabled': { background: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.07)', boxShadow: 'none' },
                }}
              >
                {savingProfile ? <CircularProgress size={18} sx={{ color: 'inherit' }} /> : 'Save Changes'}
              </Button>
            </Stack>
          </GlassCard>
        </Box>
      )}

      {/* ── Snackbar ── */}
      <Snackbar
        open={message.open}
        autoHideDuration={5000}
        onClose={() => setMessage(p => ({ ...p, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          severity={message.severity}
          variant="filled"
          onClose={() => setMessage(p => ({ ...p, open: false }))}
          sx={{ borderRadius: '12px', fontWeight: 700, boxShadow: '0 8px 32px rgba(0,0,0,0.2)' }}
        >
          {message.text}
        </Alert>
      </Snackbar>
    </Box>
  );
}
