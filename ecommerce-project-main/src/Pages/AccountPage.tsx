import { Alert, Avatar, Box, Button, Card, CardContent, Chip, Divider, Snackbar, Stack, Step, StepLabel, Stepper, TextField, Typography } from '@mui/material';
import { useEffect, useMemo, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../contexts/AuthContext';

type OrderItem = {
  id: string;
  orderTimeMs: number;
  totalCostCents: number;
  status?: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
  products: Array<{ quantity: number }>;
};

type MessageState = {
  open: boolean;
  text: string;
  severity: 'success' | 'error';
};

const ORDER_STAGES = ['Processing', 'Shipped', 'Delivered'];

const normalizeImage = (image: string | null | undefined): string | undefined => {
  if (!image) return undefined;
  if (image.startsWith('blob:') || image.startsWith('http://') || image.startsWith('https://')) return image;
  return image.startsWith('/') ? image : `/${image}`;
};

const getOrderStep = (status: OrderItem['status']) => {
  if (status === 'delivered') return 2;
  if (status === 'shipped') return 1;
  return 0;
};

export default function AccountPage() {
  const { user, refresh } = useAuth();
  const [name, setName] = useState<string>(user?.name || '');
  const [orders, setOrders] = useState<OrderItem[]>([]);
  const [profileImage, setProfileImage] = useState<string | undefined>(normalizeImage(user?.profileImage));
  const [message, setMessage] = useState<MessageState>({ open: false, text: '', severity: 'success' });

  useEffect(() => {
    setName(user?.name || '');
  }, [user?.name]);

  useEffect(() => {
    setProfileImage(normalizeImage(user?.profileImage));
  }, [user?.profileImage]);

  useEffect(() => {
    if (!message.open) return;
    const timeout = window.setTimeout(() => {
      setMessage((prev) => ({ ...prev, open: false, text: '' }));
    }, 5000);
    return () => window.clearTimeout(timeout);
  }, [message.open]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        const response = await api.get<OrderItem[]>('/api/orders?mine=true');
        setOrders(response.data);
      } catch {
        setOrders([]);
      }
    })();
  }, [user?.id]);

  const uploadImage = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const preview = URL.createObjectURL(file);
    setProfileImage(preview);

    const formData = new FormData();
    formData.append('image', file);
    try {
      const response = await api.post<{ profileImage?: string }>('/api/auth/profile/image', formData);
      const serverImage = normalizeImage(response.data?.profileImage);
      if (serverImage) {
        setProfileImage(serverImage);
      }
      await refresh();
      setMessage({ open: true, text: 'Profile image updated.', severity: 'success' });
    } catch {
      setProfileImage(normalizeImage(user?.profileImage));
      setMessage({ open: true, text: 'Unable to upload image.', severity: 'error' });
    } finally {
      URL.revokeObjectURL(preview);
    }
  };

  const saveProfile = async () => {
    try {
      await api.put('/api/auth/profile', { name });
      await refresh();
      setMessage({ open: true, text: 'Profile updated.', severity: 'success' });
    } catch {
      setMessage({ open: true, text: 'Unable to update profile.', severity: 'error' });
    }
  };

  const totalOrders = useMemo(() => orders.length, [orders.length]);

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  return (
    <Stack spacing={2}>
      <Typography variant="h4" sx={{ fontWeight: 800 }}>My Account</Typography>
      <Card>
        <CardContent>
          <Stack spacing={2} direction={{ xs: 'column', md: 'row' }}>
            <Stack spacing={1} sx={{ alignItems: 'center' }}>
              <Avatar
                src={profileImage}
                sx={{ width: 84, height: 84 }}
              >
                {user.name?.slice(0, 1).toUpperCase()}
              </Avatar>
              <Button component="label" variant="outlined" size="small">
                Change Picture
                <input hidden type="file" accept="image/*" onChange={uploadImage} />
              </Button>
            </Stack>
            <Box sx={{ flexGrow: 1 }}>
              <Stack spacing={1.5}>
                <TextField label="Name" value={name} onChange={(e) => setName(e.target.value)} />
                <TextField label="Email" value={user.email} disabled />
                <Button variant="contained" onClick={saveProfile}>Save Profile</Button>
              </Stack>
            </Box>
          </Stack>
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <Typography variant="h6" sx={{ mb: 1 }}>Purchase History</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Total orders: {totalOrders}
          </Typography>
          <Stack spacing={1.5}>
            {orders.map((order) => (
              <Box key={order.id}>
                <Typography sx={{ fontWeight: 700 }}>
                  Order #{order.id.slice(0, 8)} - ${(order.totalCostCents / 100).toFixed(2)}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {new Date(order.orderTimeMs).toLocaleString()} | Items: {order.products.reduce((sum, p) => sum + p.quantity, 0)}
                </Typography>
                <Box sx={{ mt: 1.5, mb: 1 }}>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.75 }}>
                    Track Order
                  </Typography>
                  {order.status === 'cancelled' ? (
                    <Chip label="Cancelled" color="error" size="small" />
                  ) : (
                    <Stepper activeStep={getOrderStep(order.status)} alternativeLabel>
                      {ORDER_STAGES.map((stage) => (
                        <Step key={stage}>
                          <StepLabel>{stage}</StepLabel>
                        </Step>
                      ))}
                    </Stepper>
                  )}
                </Box>
                <Divider sx={{ mt: 1 }} />
              </Box>
            ))}
            {orders.length === 0 && <Typography variant="body2">No purchases yet.</Typography>}
          </Stack>
        </CardContent>
      </Card>
      <Snackbar
        open={message.open}
        autoHideDuration={5000}
        onClose={() => setMessage((prev) => ({ ...prev, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          severity={message.severity}
          variant="filled"
          onClose={() => setMessage((prev) => ({ ...prev, open: false }))}
          sx={{ width: '100%', borderRadius: 2 }}
        >
          {message.text}
        </Alert>
      </Snackbar>
    </Stack>
  );
}
