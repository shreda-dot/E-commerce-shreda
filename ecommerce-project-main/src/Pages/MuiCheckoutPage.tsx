import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Grid,
  Snackbar,
  Stack,
  Typography,
  useTheme,
} from '@mui/material';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutlined';
import LocalShippingOutlinedIcon from '@mui/icons-material/LocalShippingOutlined';
import LockIcon from '@mui/icons-material/Lock';
import ShieldOutlinedIcon from '@mui/icons-material/ShieldOutlined';
import VerifiedUserOutlinedIcon from '@mui/icons-material/VerifiedUserOutlined';
import { useFlutterwave } from 'flutterwave-react-v3';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../contexts/AuthContext';
import { DELIVERY_ZONES, useDelivery } from '../contexts/DeliveryContext';
import type { CheckoutLocationState, PaymentSummary } from '../types';

type Props = {
  onOrderPlaced: () => Promise<void>;
};

const moneyUsd = (cents: number) => `$${(cents / 100).toFixed(2)}`;
const moneyNgn = (amount: number) =>
  `₦${amount.toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const CHECKOUT_STATE_KEY = "shreda_checkout_state_v1";

type ApiError = { response?: { data?: { error?: string } } };
const getErrorMessage = (error: unknown, fallback: string): string => {
  if (typeof error === 'object' && error !== null) {
    const typed = error as ApiError;
    return typed.response?.data?.error || fallback;
  }
  return fallback;
};

export default function MuiCheckoutPage({ onOrderPlaced }: Props) {
  const { user } = useAuth();
  const { details, isValid: isDeliveryValid } = useDelivery();
  const location = useLocation();
  const navigate = useNavigate();
  const muiTheme = useTheme();
  const isDark   = muiTheme.palette.mode === 'dark';
  const publicKey = import.meta.env.VITE_FLUTTERWAVE_PUBLIC_KEY ?? '';
  const [exchangeRate, setExchangeRate] = useState(1600);
  const [rateSource, setRateSource] = useState<"loading" | "live" | "fallback">("loading");

  const c = isDark
    ? {
        pageBg:       'linear-gradient(140deg, #020b18 0%, #071528 55%, #0a1e3a 100%)',
        glowBlob1:    'rgba(25,118,210,0.07)',
        glowBlob2:    'rgba(66,165,245,0.05)',
        watermark:    'rgba(25, 118, 210, 0.04)',
        headerOver:   'rgba(66, 165, 245, 0.75)',
        headerTitle:  '#f0f6ff',
        accentLine:   '#42A5F5',
        panelBg:      'rgba(255,255,255,0.03)',
        panelBorder:  'rgba(255,255,255,0.08)',
        sslBg:        'rgba(25, 118, 210, 0.06)',
        sslBorder:    'rgba(25, 118, 210, 0.35)',
        sslText:      '#42A5F5',
        label:        'rgba(255,255,255,0.4)',
        valuePrimary: '#f0f6ff',
        valueSecond:  'rgba(255,255,255,0.75)',
        badgeBorder:  'rgba(25,118,210,0.25)',
        badgeBg:      'rgba(25,118,210,0.1)',
        badgeText:    '#42A5F5',
        cardBg:       'linear-gradient(160deg, rgba(10,28,60,0.95) 0%, rgba(6,18,40,0.98) 100%)',
        cardBorder:   'rgba(25, 118, 210, 0.2)',
        cardShadow:   '0 0 30px rgba(25, 118, 210, 0.2), 0 20px 60px rgba(0,0,0,0.5)',
        invoiceOver:  'rgba(66,165,245,0.7)',
        invoiceTitle: '#f0f6ff',
        txLabel:      'rgba(255,255,255,0.5)',
        txText:       '#42A5F5',
        tableHead:    'rgba(255,255,255,0.4)',
        tableRow:     'rgba(255,255,255,0.65)',
        tableVal:     '#e8f0ff',
        rowBorder:    'rgba(255,255,255,0.06)',
        divider:      'rgba(255,255,255,0.12)',
        notchBg:      'linear-gradient(140deg, #020b18, #071528)',
        notchBorder:  'rgba(25,118,210,0.15)',
        secureBg:     'rgba(10,28,60,0.98)',
        secureBorder: 'rgba(25,118,210,0.25)',
        secureText:   'rgba(66,165,245,0.7)',
        totalLabel:   'rgba(255,255,255,0.35)',
        totalAmt:     '#ffffff',
        rateText:     'rgba(255,255,255,0.3)',
        footerText:   'rgba(255,255,255,0.25)',
        emptyBorder:  'rgba(25,118,210,0.15)',
        emptyBg:      'rgba(10,28,60,0.4)',
      }
    : {
        pageBg:       'linear-gradient(140deg, #f0f5ff 0%, #e8f0fc 55%, #f5f8ff 100%)',
        glowBlob1:    'rgba(25,118,210,0.05)',
        glowBlob2:    'rgba(25,118,210,0.03)',
        watermark:    'rgba(25, 118, 210, 0.03)',
        headerOver:   'rgba(21, 101, 192, 0.8)',
        headerTitle:  '#0a1e3a',
        accentLine:   '#1565c0',
        panelBg:      'rgba(25,118,210,0.04)',
        panelBorder:  'rgba(25,118,210,0.12)',
        sslBg:        'rgba(25, 118, 210, 0.06)',
        sslBorder:    'rgba(25, 118, 210, 0.3)',
        sslText:      '#1565c0',
        label:        'rgba(0,0,0,0.45)',
        valuePrimary: '#0a1e3a',
        valueSecond:  'rgba(0,0,0,0.65)',
        badgeBorder:  'rgba(25,118,210,0.2)',
        badgeBg:      'rgba(25,118,210,0.07)',
        badgeText:    '#1565c0',
        cardBg:       'rgba(255,255,255,0.97)',
        cardBorder:   'rgba(25, 118, 210, 0.18)',
        cardShadow:   '0 0 30px rgba(25, 118, 210, 0.12), 0 8px 40px rgba(0,0,0,0.06)',
        invoiceOver:  'rgba(21,101,192,0.8)',
        invoiceTitle: '#0a1e3a',
        txLabel:      'rgba(0,0,0,0.4)',
        txText:       '#1565c0',
        tableHead:    'rgba(0,0,0,0.4)',
        tableRow:     'rgba(0,0,0,0.65)',
        tableVal:     '#0a1e3a',
        rowBorder:    'rgba(0,0,0,0.06)',
        divider:      'rgba(25,118,210,0.18)',
        notchBg:      'linear-gradient(140deg, #e8f0fc, #f0f5ff)',
        notchBorder:  'rgba(25,118,210,0.12)',
        secureBg:     'rgba(248,250,255,0.98)',
        secureBorder: 'rgba(25,118,210,0.2)',
        secureText:   'rgba(21,101,192,0.75)',
        totalLabel:   'rgba(0,0,0,0.4)',
        totalAmt:     '#0a1e3a',
        rateText:     'rgba(0,0,0,0.35)',
        footerText:   'rgba(0,0,0,0.3)',
        emptyBorder:  'rgba(25,118,210,0.15)',
        emptyBg:      'rgba(240,245,255,0.8)',
      };

  const [summary, setSummary] = useState<PaymentSummary | null>(null);
  const [checkoutState, setCheckoutState] = useState<CheckoutLocationState | null>(null);
  const [validating, setValidating] = useState(false);
  const [payNonce, setPayNonce] = useState(0);
  const [pendingModalOpen, setPendingModalOpen] = useState(false);
  const [notification, setNotification] = useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'error' | 'info';
  }>({ open: false, message: '', severity: 'info' });

  const txDisplayId = useMemo(
    () => `TXN-${Math.random().toString(36).substring(2, 10).toUpperCase()}`,
    [],
  );

  const closeNotification = () =>
    setNotification((prev) => ({ ...prev, open: false }));

  const loadSummary = async (draftOrderId?: string) => {
    try {
      const response = await api.get<PaymentSummary>('/api/payment-summary', {
        params: draftOrderId ? { draftOrderId } : undefined,
      });
      setSummary(response.data);
    } catch {
      setNotification({
        open: true,
        message: 'Unable to load checkout summary.',
        severity: 'error',
      });
    }
  };

  const loadDraft = async (draftOrderId: string) => {
    try {
      const res = await api.get<{
        draftOrderId: string;
        totalCostCents: number;
        payload?: {
          items?: Array<{ productId: string; quantity: number }>;
          delivery?: unknown;
        };
      }>(`/api/orders/pre-check/${draftOrderId}`);
      return res.data;
    } catch {
      return null;
    }
  };

  const loadExchangeRate = async () => {
    try {
      const response = await api.get<{ rate: number; source?: string }>("/api/exchange-rate/usd-ngn");
      const rate = Number(response.data?.rate);
      if (Number.isFinite(rate) && rate > 0) {
        setExchangeRate(rate);
      }
      const source = String(response.data?.source || "").toLowerCase();
      setRateSource(source.includes("fallback") ? "fallback" : "live");
    } catch {
      // Keep fallback rate; checkout remains functional.
      setRateSource("fallback");
    }
  };

  useEffect(() => {
    if (!user) {
      setNotification({
        open: true,
        message: 'You must be logged in to complete your purchase',
        severity: 'info',
      });
      window.setTimeout(() => {
        navigate('/auth', {
          state: {
            from: '/checkout',
            info: 'You must be logged in to complete your purchase',
          },
        });
      }, 250);
      return;
    }
    if (!isDeliveryValid || !details) {
      setNotification({
        open: true,
        message: 'Select and save a delivery location before payment.',
        severity: 'info',
      });
      window.setTimeout(() => {
        navigate('/cart');
      }, 250);
      return;
    }
    const locationState = (location.state ?? null) as CheckoutLocationState | null;
    const raw = localStorage.getItem(CHECKOUT_STATE_KEY);
    let storedState: CheckoutLocationState | null = null;
    if (raw) {
      try {
        storedState = JSON.parse(raw) as CheckoutLocationState;
      } catch {
        storedState = null;
      }
    }
    const resolved = locationState ?? storedState;
    if (resolved) setCheckoutState(resolved);

    void (async () => {
      if (resolved?.draftOrderId) {
        const draft = await loadDraft(resolved.draftOrderId);
        if (!draft) {
          setNotification({
            open: true,
            message: "Checkout draft expired. Please review cart again.",
            severity: "info",
          });
          navigate("/cart");
          return;
        }
      }
      await loadSummary(resolved?.draftOrderId);
    })();
    loadExchangeRate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, isDeliveryValid, details, navigate, location.state]);

  const usdTotal = (checkoutState?.totalCostCents ?? summary?.totalCostCents ?? 0) / 100;
  const amountNgn = Math.round(usdTotal * exchangeRate * 100) / 100;

  const fwConfig = useMemo(() => {
    const email = user?.email?.trim() || 'customer@example.com';
    const name = user?.name?.trim() || 'Customer';
    return {
      public_key: publicKey,
      tx_ref: `shreda-${payNonce}-${Date.now()}`,
      amount: amountNgn,
      currency: 'NGN' as const,
      payment_options: 'card,ussd,mobilemoney',
      customer: {
        email,
        phone_number: '08000000000',
        name,
      },
      customizations: {
        title: 'Shreda Checkout',
        description: 'Secure payment via Flutterwave',
        logo: '',
      },
    };
  }, [publicKey, payNonce, amountNgn, user?.email, user?.name]);

  const handleFlutterPayment = useFlutterwave(fwConfig);

  const validatingRef = useRef(validating);
  validatingRef.current = validating;

  // ─── FIX: Cart Clearance (Hard Reset) ──────────────────────────────────────
  // ROOT CAUSE: The original code called navigate('/account') and then awaited
  // onOrderPlaced(). React navigation fires immediately, so the component
  // unmounts before onOrderPlaced() (which calls setCartItems([])) can run.
  // The cart state and localStorage were never cleared before the page changed,
  // so the cart badge showed stale items until the next full page reload.
  //
  // THE FIX:
  // 1. Call onOrderPlaced() FIRST — this clears setCartItems([]) and
  //    localStorage in App.tsx's handleOrderPlaced immediately.
  // 2. THEN navigate to /account with a success flag so the account page
  //    can optionally show a confirmation message.
  // ─────────────────────────────────────────────────────────────────────────
  const onFwSuccess = async (response: { transaction_id?: number | string }) => {
    const transactionId = response?.transaction_id;
    if (transactionId === undefined || transactionId === null) {
      setNotification({
        open: true,
        message: 'Payment succeeded but no transaction id was returned. Contact support.',
        severity: 'error',
      });
      return;
    }

    setValidating(true);
    try {
      const verifyRes = await api.post<{
        success?: boolean;
        order?: unknown;
        message?: string;
      }>('/api/flutterwave/verify', {
        transaction_id: transactionId,
        draftOrderId: checkoutState?.draftOrderId ?? undefined,
      });

      const ok =
        verifyRes.status >= 200 &&
        verifyRes.status < 300 &&
        verifyRes.data?.success !== false;

      if (!ok) {
        setNotification({
          open: true,
          message: 'Verification did not complete successfully.',
          severity: 'error',
        });
        return;
      }

      // ✅ STEP 1: Clear cart state + localStorage BEFORE navigation.
      // onOrderPlaced() → App.tsx handleOrderPlaced() → setCartItems([]) + writeGuestCart([])
      await onOrderPlaced();
      localStorage.removeItem(CHECKOUT_STATE_KEY);

      // ✅ STEP 2: Show success notification
      setNotification({
        open: true,
        message: 'Payment successful! Your order is being processed.',
        severity: 'success',
      });

      // ✅ STEP 3: Navigate AFTER cart is cleared so the badge updates instantly
      navigate('/account');

    } catch (error: unknown) {
      setNotification({
        open: true,
        message: getErrorMessage(error, 'Verification failed. Please contact support if you were charged.'),
        severity: 'error',
      });
    } finally {
      setValidating(false);
    }
  };

  useEffect(() => {
    if (!pendingModalOpen) return;
    setPendingModalOpen(false);
    handleFlutterPayment({
      callback: (response) => {
        void onFwSuccess(response);
      },
      onClose: () => {
        if (!validatingRef.current) {
          setNotification({
            open: true,
            message: 'Payment window closed.',
            severity: 'info',
          });
        }
      },
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingModalOpen, handleFlutterPayment]);

  const startPayment = () => {
    const hasItems = (summary?.totalItems ?? checkoutState?.items?.length ?? 0) > 0;
    if (!publicKey || !hasItems || amountNgn <= 0) return;
    setPayNonce((n) => n + 1);
    setPendingModalOpen(true);
  };

  const isLoading = validating;
  const canPay =
    Boolean(publicKey) &&
    (Boolean(summary) || Boolean(checkoutState)) &&
    (summary?.totalItems ?? checkoutState?.items?.length ?? 0) > 0 &&
    Boolean(details) &&
    isDeliveryValid &&
    amountNgn > 0;

  return (
    <Box
      sx={{
        minHeight: '100vh',
        background: c.pageBg,
        mx: { xs: -2, sm: -3, md: -4, lg: -6 },
        px: { xs: 2, sm: 3, md: 5, lg: 7 },
        py: { xs: 4, md: 7 },
        position: 'relative',
        overflow: 'hidden',
        transition: 'background 0.4s ease',
      }}
    >
      {/* Background watermark */}
      <Box sx={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none', userSelect: 'none', overflow: 'hidden', zIndex: 0 }}>
        <Typography sx={{ fontSize: { xs: '3.5rem', md: '9rem' }, fontWeight: 900, letterSpacing: '0.45em', color: c.watermark, transform: 'rotate(-28deg)', whiteSpace: 'nowrap', lineHeight: 1 }}>
          SHREDA AUTHENTICITY
        </Typography>
      </Box>

      {/* Ambient glow blobs */}
      <Box sx={{ position: 'absolute', width: 400, height: 400, borderRadius: '50%', background: `radial-gradient(circle, ${c.glowBlob1} 0%, transparent 70%)`, top: -100, right: -100, pointerEvents: 'none', zIndex: 0 }} />
      <Box sx={{ position: 'absolute', width: 300, height: 300, borderRadius: '50%', background: `radial-gradient(circle, ${c.glowBlob2} 0%, transparent 70%)`, bottom: 0, left: '10%', pointerEvents: 'none', zIndex: 0 }} />

      <Box sx={{ position: 'relative', zIndex: 1, maxWidth: 1200, mx: 'auto' }}>
        {/* Page header */}
        <Stack direction="row" sx={{ mb: { xs: 4, md: 6 }, alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <Box>
            <Typography variant="overline" sx={{ color: 'rgba(66, 165, 245, 0.75)', letterSpacing: '0.35em', fontSize: '0.68rem', display: 'block', mb: 0.5 }}>
              SHREDA STORE
            </Typography>
            <Typography variant="h3" sx={{ fontWeight: 900, color: c.headerTitle, letterSpacing: '-0.03em', lineHeight: 1, fontSize: { xs: '2rem', md: '2.75rem' } }}>
              Checkout
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, px: 2, py: 0.9, border: `1px solid ${c.sslBorder}`, borderRadius: 2, backdropFilter: 'blur(8px)', background: c.sslBg }}>
            <LockIcon sx={{ fontSize: 13, color: c.sslText }} />
            <Typography sx={{ color: c.sslText, fontSize: '0.65rem', letterSpacing: '0.2em', fontWeight: 700 }}>256-BIT SSL</Typography>
          </Box>
        </Stack>

        {!publicKey && (
          <Alert severity="warning" sx={{ mb: 3 }}>
            Set <code>VITE_FLUTTERWAVE_PUBLIC_KEY</code> in your frontend environment to enable payments.
          </Alert>
        )}

        <Grid container spacing={{ xs: 3, md: 5 }} sx={{ alignItems: 'flex-start' }}>
          {/* LEFT: Delivery & security */}
          <Grid size={{ xs: 12, md: 5 }}>
            <Stack spacing={4}>
              <Box>
                <Typography sx={{ fontSize: '0.65rem', letterSpacing: '0.3em', color: c.invoiceOver, fontWeight: 700, mb: 2.5 }}>
                  DELIVERY DETAILS
                </Typography>
                <Stack spacing={2.5}>
                  {[
                    {
                      icon: <LocalShippingOutlinedIcon sx={{ fontSize: 16, color: c.accentLine }} />,
                      sub: 'Shipping Method',
                      main: details?.speed === 'express' ? 'Express Delivery' : 'Standard Delivery',
                      detail: (() => {
                        const zone = details
                          ? DELIVERY_ZONES.find((z) => z.id === details.zoneId)
                          : null;
                        return zone ? `${zone.name} • ETA ${zone.eta}` : 'Estimated: 3 - 5 Business Days';
                      })(),
                    },
                    { icon: <CheckCircleOutlineIcon sx={{ fontSize: 16, color: c.accentLine }} />, sub: 'Account', main: user?.name ?? 'Customer', detail: user?.email ?? '—' },
                    { icon: <CheckCircleOutlineIcon sx={{ fontSize: 16, color: c.accentLine }} />, sub: 'Delivery Phone', main: details?.phoneNumber ?? '—', detail: details?.address ?? '—' },
                  ].map(({ icon, sub, main, detail }) => (
                    <Box key={sub} sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5 }}>
                      <Box sx={{ mt: 0.3, width: 32, height: 32, borderRadius: 1.5, border: `1px solid ${c.badgeBorder}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        {icon}
                      </Box>
                      <Box>
                        <Typography sx={{ color: c.label, fontSize: '0.7rem', mb: 0.3 }}>{sub}</Typography>
                        <Typography sx={{ color: c.valuePrimary, fontWeight: 600, fontSize: '0.9rem' }}>{main}</Typography>
                        <Typography sx={{ color: c.valueSecond, fontSize: '0.75rem' }}>{detail}</Typography>
                      </Box>
                    </Box>
                  ))}
                </Stack>
              </Box>

              <Box>
                <Typography sx={{ fontSize: '0.65rem', letterSpacing: '0.3em', color: c.invoiceOver, fontWeight: 700, mb: 2 }}>
                  SECURITY FEATURES
                </Typography>
                <Stack spacing={1.5}>
                  {[
                    { icon: <LockIcon sx={{ fontSize: 14, color: c.accentLine }} />, label: 'End-to-End Encryption' },
                    { icon: <ShieldOutlinedIcon sx={{ fontSize: 14, color: c.accentLine }} />, label: 'Flutterwave PCI-DSS Compliant' },
                    { icon: <VerifiedUserOutlinedIcon sx={{ fontSize: 14, color: c.accentLine }} />, label: 'Fraud Monitoring Active' },
                  ].map(({ icon, label }) => (
                    <Box key={label} sx={{ display: 'flex', alignItems: 'center', gap: 1.25, px: 1.5, py: 1, borderRadius: 1.5, border: `1px solid ${c.panelBorder}`, background: c.panelBg }}>
                      {icon}
                      <Typography sx={{ color: c.tableRow, fontSize: '0.78rem' }}>{label}</Typography>
                    </Box>
                  ))}
                </Stack>
              </Box>

              {summary && (
                <Box>
                  <Typography sx={{ fontSize: '0.65rem', letterSpacing: '0.3em', color: c.invoiceOver, fontWeight: 700, mb: 2 }}>
                    COST BREAKDOWN
                  </Typography>
                  <Stack spacing={1}>
                    {[
                      { label: 'Products', value: moneyUsd(summary.productCostCents) },
                      { label: 'Shipping', value: moneyUsd(summary.shippingCostCents) },
                      { label: 'Tax', value: moneyUsd(summary.taxCents) },
                    ].map(({ label, value }) => (
                      <Box key={label} sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Typography sx={{ color: c.label, fontSize: '0.82rem' }}>{label}</Typography>
                        <Typography sx={{ color: c.valueSecond, fontSize: '0.82rem', fontWeight: 500 }}>{value}</Typography>
                      </Box>
                    ))}
                    {checkoutState && (
                      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Typography sx={{ color: c.label, fontSize: '0.82rem' }}>
                          {checkoutState.deliveryZoneLabel} Fee
                        </Typography>
                        <Typography sx={{ color: c.valueSecond, fontSize: '0.82rem', fontWeight: 500 }}>
                          {moneyUsd(checkoutState.deliveryFeeCents)}
                        </Typography>
                      </Box>
                    )}
                  </Stack>
                </Box>
              )}
            </Stack>
          </Grid>

          {/* RIGHT: Invoice card */}
          <Grid size={{ xs: 12, md: 7 }}>
            {summary ? (
              <Box sx={{ position: 'relative', borderRadius: 4, background: c.cardBg, backdropFilter: 'blur(15px)', WebkitBackdropFilter: 'blur(15px)', border: `1px solid ${c.cardBorder}`, boxShadow: c.cardShadow, overflow: 'hidden', transition: 'background 0.4s ease, box-shadow 0.4s ease' }}>
                <Box sx={{ height: 3, background: 'linear-gradient(90deg, #0d47a1, #1976D2, #42A5F5, #1976D2, #0d47a1)', backgroundSize: '200% 100%', '@keyframes accentSlide': { '0%': { backgroundPosition: '0% 0' }, '100%': { backgroundPosition: '200% 0' } }, animation: 'accentSlide 5s linear infinite' }} />

                <Box sx={{ p: { xs: 3, md: 4 } }}>
                  <Stack direction="row" sx={{ mb: 3.5, justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <Box>
                      <Typography sx={{ fontSize: '0.6rem', letterSpacing: '0.4em', color: c.invoiceOver, fontWeight: 700, mb: 0.5 }}>DIGITAL INVOICE</Typography>
                      <Typography sx={{ fontSize: '1.3rem', fontWeight: 800, color: c.invoiceTitle, letterSpacing: '-0.01em' }}>Order Summary</Typography>
                    </Box>
                    <Box sx={{ textAlign: 'right' }}>
                      <Typography sx={{ fontSize: '0.6rem', letterSpacing: '0.25em', color: c.txLabel, mb: 0.5 }}>TRANSACTION ID</Typography>
                      <Box sx={{ px: 1.5, py: 0.6, background: c.badgeBg, border: `1px solid ${c.badgeBorder}`, borderRadius: 1.5 }}>
                        <Typography sx={{ fontSize: '0.7rem', fontFamily: 'monospace', color: c.txText, fontWeight: 700, letterSpacing: '0.1em' }}>{txDisplayId}</Typography>
                      </Box>
                    </Box>
                  </Stack>

                  <Stack spacing={1.5} sx={{ mb: 0.5 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', pb: 1.5, borderBottom: `1px solid ${c.rowBorder}` }}>
                      <Typography sx={{ color: c.tableHead, fontSize: '0.7rem', letterSpacing: '0.2em' }}>ITEM</Typography>
                      <Typography sx={{ color: c.tableHead, fontSize: '0.7rem', letterSpacing: '0.2em' }}>AMOUNT</Typography>
                    </Box>
                    {[
                      { label: `Items (×${summary.totalItems})`, value: moneyUsd(checkoutState?.subtotalCents ?? summary.productCostCents) },
                      {
                        label: checkoutState?.shippingLabel || `Shipping (${checkoutState?.deliveryZoneLabel?.replace(" • ", " - ") || "Standard"})`,
                        value: moneyUsd((checkoutState?.deliveryFeeCents ?? 0) + summary.shippingCostCents),
                      },
                      { label: 'Tax', value: moneyUsd(checkoutState?.taxCents ?? summary.taxCents) },
                    ].map(({ label, value }) => (
                      <Box key={label} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Typography sx={{ color: c.tableRow, fontSize: '0.88rem' }}>{label}</Typography>
                        <Typography sx={{ color: c.tableVal, fontSize: '0.88rem', fontWeight: 500 }}>{value}</Typography>
                      </Box>
                    ))}
                    {checkoutState?.items?.slice(0, 4).map((item) => (
                      <Box key={item.productId} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Typography sx={{ color: c.tableRow, fontSize: '0.78rem' }}>
                          {item.name} x{item.quantity}
                        </Typography>
                        <Typography sx={{ color: c.tableVal, fontSize: '0.78rem', fontWeight: 500 }}>
                          {moneyUsd(item.lineTotalCents)}
                        </Typography>
                      </Box>
                    ))}
                  </Stack>

                  {/* Perforated divider */}
                  <Box sx={{ position: 'relative', my: 3.5, mx: { xs: -3, md: -4 } }}>
                    <Box sx={{ position: 'absolute', left: -12, top: '50%', transform: 'translateY(-50%)', width: 24, height: 24, borderRadius: '50%', background: c.notchBg, border: `1px solid ${c.notchBorder}`, zIndex: 2 }} />
                    <Box sx={{ mx: '12px', borderTop: `1.5px dashed ${c.divider}` }} />
                    <Box sx={{ position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%, -50%)', display: 'flex', alignItems: 'center', gap: 0.5, px: 1.5, py: 0.5, background: c.secureBg, border: `1px solid ${c.secureBorder}`, borderRadius: 1, zIndex: 3 }}>
                      <LockIcon sx={{ fontSize: 10, color: c.secureText }} />
                      <Typography sx={{ fontSize: '0.55rem', color: c.secureText, letterSpacing: '0.2em', fontWeight: 700 }}>SECURE</Typography>
                    </Box>
                    <Box sx={{ position: 'absolute', right: -12, top: '50%', transform: 'translateY(-50%)', width: 24, height: 24, borderRadius: '50%', background: c.notchBg, border: `1px solid ${c.notchBorder}`, zIndex: 2 }} />
                  </Box>

                  {/* Total */}
                  <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ mb: 3.5, alignItems: { xs: 'flex-start', sm: 'center' }, justifyContent: 'space-between' }}>
                    <Box>
                      <Typography sx={{ fontSize: '0.6rem', letterSpacing: '0.3em', color: c.totalLabel, mb: 0.5 }}>TOTAL DUE</Typography>
                      <Typography sx={{ fontSize: { xs: '2.8rem', md: '3.5rem' }, fontWeight: 900, color: c.totalAmt, letterSpacing: '-0.03em', lineHeight: 1 }}>
                        {moneyUsd(checkoutState?.totalCostCents ?? summary.totalCostCents)}
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: { xs: 'flex-start', sm: 'flex-end' }, gap: 0.75 }}>
                      <Chip
                        label={moneyNgn(amountNgn)}
                        sx={{ background: 'linear-gradient(90deg, #0d47a1, #1565c0)', color: '#ffffff', fontWeight: 800, fontSize: '0.9rem', height: 36, px: 1, border: '1px solid rgba(66,165,245,0.3)', letterSpacing: '0.01em', '& .MuiChip-label': { px: 2 } }}
                      />
                      <Typography sx={{ color: c.rateText, fontSize: '0.68rem', letterSpacing: '0.05em' }}>
                        1 USD = {exchangeRate.toLocaleString()} NGN
                      </Typography>
                      <Typography sx={{ color: c.rateText, fontSize: '0.62rem', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                        Rate Source: {rateSource === "loading" ? "Loading..." : rateSource === "fallback" ? "Fallback" : "Parallel-adjusted live"}
                      </Typography>
                    </Box>
                  </Stack>

                  {/* Pay button */}
                  {isLoading ? (
                    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1.5, py: 3 }}>
                      <CircularProgress size={36} sx={{ color: 'primary.main' }} />
                      <Typography variant="body2" sx={{ color: c.tableRow }}>Verifying payment with server…</Typography>
                    </Box>
                  ) : (
                    <Button
                      variant="contained"
                      size="large"
                      fullWidth
                      disabled={!canPay}
                      onClick={startPayment}
                      sx={{
                        py: 2, fontWeight: 800, fontSize: '1rem', letterSpacing: '0.08em', borderRadius: 2.5, position: 'relative', overflow: 'hidden', color: '#ffffff',
                        background: 'linear-gradient(90deg, #0d47a1 0%, #1565c0 20%, #1976D2 40%, #42A5F5 60%, #1976D2 80%, #0d47a1 100%)',
                        backgroundSize: '200% auto', border: 'none', boxShadow: '0 4px 20px rgba(25,118,210,0.4)',
                        '@keyframes shimmer': { '0%': { backgroundPosition: '0% center' }, '100%': { backgroundPosition: '200% center' } },
                        animation: 'shimmer 4s linear infinite',
                        transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                        '&:hover': { transform: 'scale(1.025)', boxShadow: '0 8px 40px rgba(25,118,210,0.65), 0 0 0 1px rgba(66,165,245,0.4)', animation: 'none', background: 'linear-gradient(90deg, #1565c0, #42A5F5)', color: '#ffffff' },
                        '&:disabled': { background: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.06)', color: isDark ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.25)', boxShadow: 'none', animation: 'none' },
                      }}
                    >
                      Pay with Flutterwave
                    </Button>
                  )}

                  {/* Footer trust row */}
                  <Stack direction="row" spacing={3} sx={{ mt: 2.5, justifyContent: 'center' }}>
                    {[
                      { icon: <LockIcon sx={{ fontSize: 11, color: c.secureText }} />, label: 'Encrypted' },
                      { icon: <ShieldOutlinedIcon sx={{ fontSize: 11, color: c.secureText }} />, label: 'PCI-DSS' },
                      { icon: <VerifiedUserOutlinedIcon sx={{ fontSize: 11, color: c.secureText }} />, label: 'Verified' },
                    ].map(({ icon, label }) => (
                      <Box key={label} sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        {icon}
                        <Typography sx={{ fontSize: '0.65rem', color: c.footerText, letterSpacing: '0.1em' }}>{label}</Typography>
                      </Box>
                    ))}
                  </Stack>
                </Box>
              </Box>
            ) : (
              <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 300, borderRadius: 4, border: `1px solid ${c.emptyBorder}`, background: c.emptyBg }}>
                <CircularProgress sx={{ color: 'primary.main' }} />
              </Box>
            )}
          </Grid>
        </Grid>
      </Box>

      <Snackbar open={notification.open} autoHideDuration={6000} onClose={closeNotification} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert severity={notification.severity} variant="filled" onClose={closeNotification} sx={{ borderRadius: 2 }}>
          {notification.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
