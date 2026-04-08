import { Alert, Button, Card, CardContent, Divider, Stack, Typography } from '@mui/material';
import { useEffect, useState } from 'react';
import { api } from '../api';
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

export default function MuiCheckoutPage({ onOrderPlaced }: Props) {
  const [summary, setSummary] = useState<PaymentSummary | null>(null);
  const [message, setMessage] = useState('');

  const loadSummary = async () => {
    try {
      const response = await api.get<PaymentSummary>('/api/payment-summary');
      setSummary(response.data);
    } catch {
      setMessage('Unable to load checkout summary.');
    }
  };

  useEffect(() => {
    loadSummary();
  }, []);

  const placeOrder = async () => {
    try {
      await api.post('/api/orders');
      await onOrderPlaced();
      await loadSummary();
      setMessage('Order placed successfully.');
    } catch (error: unknown) {
      setMessage(getErrorMessage(error, 'Unable to place order.'));
    }
  };

  return (
    <Stack spacing={2}>
      <Typography variant="h4" sx={{ fontWeight: 800 }}>Checkout</Typography>
      {message && <Alert severity={message.includes('successfully') ? 'success' : 'error'}>{message}</Alert>}
      {summary && (
        <Card>
          <CardContent>
            <Stack spacing={1}>
              <Typography>Items: {summary.totalItems}</Typography>
              <Typography>Product Cost: {money(summary.productCostCents)}</Typography>
              <Typography>Shipping: {money(summary.shippingCostCents)}</Typography>
              <Typography>Tax: {money(summary.taxCents)}</Typography>
              <Divider />
              <Typography variant="h6">Total: {money(summary.totalCostCents)}</Typography>
              <Button variant="contained" onClick={placeOrder}>Place Order</Button>
            </Stack>
          </CardContent>
        </Card>
      )}
    </Stack>
  );
}
