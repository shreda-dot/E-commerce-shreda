import {
  Alert,
  Box,
  Card,
  CardContent,
  CircularProgress,
  Divider,
  Snackbar,
  Stack,
  Typography,
} from '@mui/material';
import { PayPalButtons, usePayPalScriptReducer } from '@paypal/react-paypal-js';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../contexts/AuthContext';
import type { PaymentSummary } from '../types';

type Props = {
  onOrderPlaced: () => Promise<void>;
};

const money = (cents: number) => `$${(cents / 100).toFixed(2)}`;

type ApiError = { response?: { data?: { error?: string } } };
const getErrorMessage = (error: unknown, fallback: string): string => {
  if (typeof error === 'object' && error !== null) {
    const typed = error as ApiError;
    return typed.response?.data?.error || fallback;
  }
  return fallback;
};

const FONT = '"Inter", "Roboto", sans-serif';

export default function MuiCheckoutPage({ onOrderPlaced }: Props) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [{ isPending: paypalLoading }] = usePayPalScriptReducer();

  // If the PayPal SDK hasn't finished loading after 8 s, render the buttons
  // anyway and let the PayPalButtons component handle its own pending state.
  const [paypalTimedOut, setPaypalTimedOut] = useState(false);
  useEffect(() => {
    if (!paypalLoading) return;
    const timer = window.setTimeout(() => setPaypalTimedOut(true), 8000);
    return () => window.clearTimeout(timer);
  }, [paypalLoading]);

  const [summary, setSummary] = useState<PaymentSummary | null>(null);
  const [validating, setValidating] = useState(false);
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
          state: { from: '/cart', info: 'You must be logged in to complete your purchase' },
        });
      }, 250);
      return;
    }
    loadSummary();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── PayPal callbacks ────────────────────────────────────────────────────────

  /** Step 1 – Called when the user clicks the PayPal button.
   *  We ask our backend to create a PayPal order and return its ID. */
  const createOrder = async (): Promise<string> => {
    const response = await api.post<{ paypalOrderId: string }>('/api/orders/paypal/create');
    return response.data.paypalOrderId;
  };

  /** Step 2 – Called after the user approves the payment in the PayPal popup.
   *  We send the PayPal order ID to our backend, which captures the funds
   *  and — only if PayPal confirms — saves the order and clears the cart. */
  const onApprove = async (data: { orderID: string }) => {
    setValidating(true);
    try {
      await api.post('/api/orders/capture', { paypalOrderId: data.orderID });
      await onOrderPlaced();
      await loadSummary();
      setNotification({
        open: true,
        message: 'Payment Successful! Your order is being processed.',
        severity: 'success',
      });
    } catch (error: unknown) {
      setNotification({
        open: true,
        message: getErrorMessage(error, 'Payment failed. Please try again.'),
        severity: 'error',
      });
    } finally {
      setValidating(false);
    }
  };

  const onError = () => {
    setNotification({
      open: true,
      message: 'Your card was declined or the payment was cancelled. Please try again.',
      severity: 'error',
    });
  };

  // ── Render ──────────────────────────────────────────────────────────────────

  const isLoading = (paypalLoading && !paypalTimedOut) || validating;

  return (
    <Stack spacing={2}>
      <Typography variant="h4" sx={{ fontWeight: 800, fontFamily: FONT }}>
        Checkout
      </Typography>

      {summary && (
        <Card>
          <CardContent>
            <Stack spacing={1}>
              <Typography sx={{ fontFamily: FONT }}>Items: {summary.totalItems}</Typography>
              <Typography sx={{ fontFamily: FONT }}>
                Product Cost: {money(summary.productCostCents)}
              </Typography>
              <Typography sx={{ fontFamily: FONT }}>
                Shipping: {money(summary.shippingCostCents)}
              </Typography>
              <Typography sx={{ fontFamily: FONT }}>Tax: {money(summary.taxCents)}</Typography>
              <Divider />
              <Typography variant="h6" sx={{ fontFamily: FONT }}>
                Total: {money(summary.totalCostCents)}
              </Typography>

              {/* ── Payment area ────────────────────────────────────────── */}
              <Box sx={{ mt: 2 }}>
                {isLoading ? (
                  /* CircularProgress while PayPal SDK loads or backend validates */
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
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{ fontFamily: FONT }}
                    >
                      {validating ? 'Validating payment…' : 'Loading payment options…'}
                    </Typography>
                  </Box>
                ) : (
                  <PayPalButtons
                    style={{
                      layout: 'vertical',
                      shape: 'rect',
                      label: 'pay',
                      height: 48,
                    }}
                    createOrder={createOrder}
                    onApprove={onApprove}
                    onError={onError}
                    disabled={!summary || summary.totalItems === 0}
                  />
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
          sx={{ borderRadius: 2, fontFamily: FONT }}
        >
          {notification.message}
        </Alert>
      </Snackbar>
    </Stack>
  );
}
