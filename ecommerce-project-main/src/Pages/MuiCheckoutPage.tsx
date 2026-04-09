import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Divider,
  Snackbar,
  Stack,
  Typography,
} from '@mui/material';
import { useFlutterwave } from 'flutterwave-react-v3';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../contexts/AuthContext';
import type { PaymentSummary } from '../types';

type Props = {
  onOrderPlaced: () => Promise<void>;
};

const moneyUsd = (cents: number) => `$${(cents / 100).toFixed(2)}`;

const moneyNgn = (amount: number) =>
  `₦${amount.toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

type ApiError = { response?: { data?: { error?: string } } };
const getErrorMessage = (error: unknown, fallback: string): string => {
  if (typeof error === 'object' && error !== null) {
    const typed = error as ApiError;
    return typed.response?.data?.error || fallback;
  }
  return fallback;
};

function readExchangeRate(): number {
  const raw = import.meta.env.VITE_USD_NGN_EXCHANGE_RATE;
  const n = raw !== undefined && raw !== '' ? Number(raw) : 1500;
  return Number.isFinite(n) && n > 0 ? n : 1500;
}

export default function MuiCheckoutPage({ onOrderPlaced }: Props) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const publicKey = import.meta.env.VITE_FLUTTERWAVE_PUBLIC_KEY ?? '';
  const exchangeRate = useMemo(() => readExchangeRate(), []);

  const [summary, setSummary] = useState<PaymentSummary | null>(null);
  const [validating, setValidating] = useState(false);
  /** Bumps before each open so `tx_ref` is unique (see useFlutterwave closure). */
  const [payNonce, setPayNonce] = useState(0);
  /** After state updates, effect opens the modal with a fresh `useFlutterwave` config. */
  const [pendingModalOpen, setPendingModalOpen] = useState(false);
  const [notification, setNotification] = useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'error' | 'info';
  }>({ open: false, message: '', severity: 'info' });

  const closeNotification = () =>
    setNotification((prev) => ({ ...prev, open: false }));

  const loadSummary = async () => {
    try {
      const response = await api.get<PaymentSummary>('/api/payment-summary');
      setSummary(response.data);
    } catch {
      setNotification({
        open: true,
        message: 'Unable to load checkout summary.',
        severity: 'error',
      });
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
            from: '/cart',
            info: 'You must be logged in to complete your purchase',
          },
        });
      }, 250);
      return;
    }
    loadSummary();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const usdTotal = summary ? summary.totalCostCents / 100 : 0;
  const amountNgn = summary
    ? Math.round(usdTotal * exchangeRate * 100) / 100
    : 0;

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
      }>('/api/flutterwave/verify', { transaction_id: transactionId });

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

      await onOrderPlaced();
      await loadSummary();
      setNotification({
        open: true,
        message: 'Payment successful! Your order is being processed.',
        severity: 'success',
      });
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
    // eslint-disable-next-line react-hooks/exhaustive-deps -- open only when user requests pay; handler updates with fwConfig
  }, [pendingModalOpen, handleFlutterPayment]);

  const startPayment = () => {
    if (!publicKey || !summary || summary.totalItems === 0 || amountNgn <= 0) {
      return;
    }
    setPayNonce((n) => n + 1);
    setPendingModalOpen(true);
  };

  const isLoading = validating;
  const canPay =
    Boolean(publicKey) &&
    Boolean(summary) &&
    (summary?.totalItems ?? 0) > 0 &&
    amountNgn > 0;

  return (
    <Stack spacing={2}>
      <Typography variant="h4" sx={{ fontWeight: 800 }}>
        Checkout
      </Typography>

      {!publicKey && (
        <Alert severity="warning">
          Set <code>VITE_FLUTTERWAVE_PUBLIC_KEY</code> in your frontend environment to enable
          payments.
        </Alert>
      )}

      {summary && (
        <Card>
          <CardContent>
            <Stack spacing={1}>
              <Typography>Items: {summary.totalItems}</Typography>
              <Typography>
                Product Cost: {moneyUsd(summary.productCostCents)}
              </Typography>
              <Typography>
                Shipping: {moneyUsd(summary.shippingCostCents)}
              </Typography>
              <Typography>Tax: {moneyUsd(summary.taxCents)}</Typography>
              <Divider />
              <Typography variant="h6">
                Total (USD): {moneyUsd(summary.totalCostCents)}
              </Typography>
              <Typography variant="body1" color="text.secondary">
                Charged in NGN: {moneyNgn(amountNgn)} (rate 1 USD = {exchangeRate} NGN)
              </Typography>

              <Box sx={{ mt: 2 }}>
                {isLoading ? (
                  <Box
                    sx={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: 1.5,
                      py: 3,
                    }}
                  >
                    <CircularProgress size={36} />
                    <Typography variant="body2" color="text.secondary">
                      Verifying payment with server…
                    </Typography>
                  </Box>
                ) : (
                  <Button
                    variant="contained"
                    size="large"
                    fullWidth
                    disabled={!canPay}
                    onClick={startPayment}
                    sx={{ py: 1.5, fontWeight: 700 }}
                  >
                    Pay with Flutterwave
                  </Button>
                )}
              </Box>
            </Stack>
          </CardContent>
        </Card>
      )}

      <Snackbar
        open={notification.open}
        autoHideDuration={6000}
        onClose={closeNotification}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          severity={notification.severity}
          variant="filled"
          onClose={closeNotification}
          sx={{ borderRadius: 2 }}
        >
          {notification.message}
        </Alert>
      </Snackbar>
    </Stack>
  );
}
