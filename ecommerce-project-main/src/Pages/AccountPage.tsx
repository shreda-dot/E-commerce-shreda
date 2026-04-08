import { Avatar, Box, Button, Card, CardContent, Divider, Stack, TextField, Typography } from '@mui/material';
import { useEffect, useMemo, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../contexts/AuthContext';

type OrderItem = {
  id: string;
  orderTimeMs: number;
  totalCostCents: number;
  products: Array<{ quantity: number }>;
};

export default function AccountPage() {
  const { user, refresh } = useAuth();
  const [name, setName] = useState(user?.name || '');
  const [orders, setOrders] = useState<OrderItem[]>([]);
  const [message, setMessage] = useState('');

  useEffect(() => {
    setName(user?.name || '');
  }, [user?.name]);

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
    const formData = new FormData();
    formData.append('image', file);
    try {
      await api.post('/api/auth/profile/image', formData);
      await refresh();
      setMessage('Profile image updated.');
    } catch {
      setMessage('Unable to upload image.');
    }
  };

  const saveProfile = async () => {
    try {
      await api.put('/api/auth/profile', { name });
      await refresh();
      setMessage('Profile updated.');
    } catch {
      setMessage('Unable to update profile.');
    }
  };

  const totalOrders = useMemo(() => orders.length, [orders.length]);

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  return (
    <Stack spacing={2}>
      <Typography variant="h4" sx={{ fontWeight: 800 }}>My Account</Typography>
      {message && <Typography color="primary">{message}</Typography>}
      <Card>
        <CardContent>
          <Stack spacing={2} direction={{ xs: 'column', md: 'row' }}>
            <Stack spacing={1} sx={{ alignItems: 'center' }}>
              <Avatar
                src={user.profileImage || undefined}
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
                <Divider sx={{ mt: 1 }} />
              </Box>
            ))}
            {orders.length === 0 && <Typography variant="body2">No purchases yet.</Typography>}
          </Stack>
        </CardContent>
      </Card>
    </Stack>
  );
}
