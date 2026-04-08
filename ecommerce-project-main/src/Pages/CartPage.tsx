import {
  Alert,
  Button,
  Card,
  CardContent,
  CardMedia,
  IconButton,
  MenuItem,
  Stack,
  TextField,
  Typography,
  Box,
  Divider,
  Grid,
  Paper,
} from '@mui/material';
import {
  Delete as DeleteIcon,
  ShoppingCartCheckout as CheckoutIcon,
  ArrowBack as BackIcon,
} from '@mui/icons-material';
import { useMemo, useState } from 'react';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import { api } from '../api';
import type { CartItem } from '../types';

type Props = {
  cartItems: CartItem[];
  onCartChanged: () => Promise<void>;
};

const normalizeImage = (image: string) => (image.startsWith('/') ? image : `/${image}`);

export default function CartPage({ cartItems, onCartChanged }: Props) {
  const [error, setError] = useState('');
  const navigate = useNavigate();
  
  const productTotal = useMemo(
    () => cartItems.reduce((sum, item) => sum + ((item.product?.priceCents || 0) * item.quantity), 0),
    [cartItems]
  );
  
  const tax = productTotal * 0.1; // 10% tax
  const grandTotal = productTotal + tax;

  const removeItem = async (productId: string) => {
    try {
      await api.delete(`/api/cart-items/${productId}`);
      await onCartChanged();
      setError('');
    } catch {
      setError('Unable to remove item.');
    }
  };

  const updateQuantity = async (productId: string, quantity: number) => {
    try {
      await api.put(`/api/cart-items/${productId}`, { quantity });
      await onCartChanged();
      setError('');
    } catch {
      setError('Unable to update quantity.');
    }
  };

  if (cartItems.length === 0) {
    return (
      <Box sx={{ textAlign: 'center', py: 10 }}>
        <Typography variant="h3" sx={{ fontWeight: 900, mb: 2 }}>Your cart is empty</Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
          Looks like you haven't added anything to your cart yet.
        </Typography>
        <Button 
          component={RouterLink} 
          to="/" 
          variant="contained" 
          size="large"
          startIcon={<BackIcon />}
          sx={{ borderRadius: 3, fontWeight: 800, px: 4 }}
        >
          Start Shopping
        </Button>
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h3" sx={{ fontWeight: 900, mb: 4, letterSpacing: '-1px' }}>
        Shopping Cart
      </Typography>
      
      {error && <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }}>{error}</Alert>}

      <Grid container spacing={4}>
        <Grid size={{ xs: 12, md: 8 }}>
          <Stack spacing={2}>
            {cartItems.map((item) => (
              <Card key={item.id} sx={{ borderRadius: 4, overflow: 'hidden', boxShadow: 2 }}>
                <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 3, p: 3 }}>
                  <Box sx={{ bgcolor: '#fff', p: 1, borderRadius: 2, border: '1px solid #eee' }}>
                    <CardMedia
                      component="img"
                      image={normalizeImage(item.product?.image || '/images/logo.png')}
                      sx={{ width: 100, height: 100, objectFit: 'contain' }}
                    />
                  </Box>
                  <Box sx={{ flexGrow: 1 }}>
                    <Typography variant="h6" sx={{ fontWeight: 800, mb: 0.5 }}>
                      {item.product?.name || 'Product'}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                      In Stock
                    </Typography>
                    <Stack direction="row" spacing={3} sx={{ alignItems: 'center' }}>
                      <TextField
                        select
                        size="small"
                        label="Qty"
                        value={item.quantity}
                        onChange={(event) => updateQuantity(item.productId, Number(event.target.value))}
                        sx={{ 
                          width: 80,
                          '& .MuiOutlinedInput-root': { borderRadius: 2 }
                        }}
                      >
                        {[...Array(10).keys()].map((i) => (
                          <MenuItem key={i + 1} value={i + 1}>
                            {i + 1}
                          </MenuItem>
                        ))}
                      </TextField>
                      <Typography variant="h6" color="primary" sx={{ fontWeight: 900 }}>
                        ${(((item.product?.priceCents || 0) * item.quantity) / 100).toFixed(2)}
                      </Typography>
                    </Stack>
                  </Box>
                  <IconButton 
                    color="error" 
                    onClick={() => removeItem(item.productId)}
                    sx={{ bgcolor: 'error.lighter', '&:hover': { bgcolor: 'error.light' } }}
                  >
                    <DeleteIcon />
                  </IconButton>
                </CardContent>
              </Card>
            ))}
          </Stack>
        </Grid>

        <Grid size={{ xs: 12, md: 4 }}>
          <Paper sx={{ p: 4, borderRadius: 4, boxShadow: 4, position: 'sticky', top: 100 }}>
            <Typography variant="h5" sx={{ fontWeight: 900, mb: 3 }}>Order Summary</Typography>
            <Stack spacing={2} sx={{ mb: 3 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography color="text.secondary" sx={{ fontWeight: 600 }}>Subtotal</Typography>
                <Typography sx={{ fontWeight: 700 }}>${(productTotal / 100).toFixed(2)}</Typography>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography color="text.secondary" sx={{ fontWeight: 600 }}>Estimated Tax (10%)</Typography>
                <Typography sx={{ fontWeight: 700 }}>${(tax / 100).toFixed(2)}</Typography>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography color="text.secondary" sx={{ fontWeight: 600 }}>Shipping</Typography>
                <Typography color="success.main" sx={{ fontWeight: 700 }}>FREE</Typography>
              </Box>
              <Divider sx={{ my: 1 }} />
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="h6" sx={{ fontWeight: 900 }}>Total</Typography>
                <Typography variant="h6" color="primary" sx={{ fontWeight: 900 }}>
                  ${(grandTotal / 100).toFixed(2)}
                </Typography>
              </Box>
            </Stack>
            <Button 
              fullWidth 
              variant="contained" 
              size="large" 
              startIcon={<CheckoutIcon />}
              onClick={() => navigate('/checkout')}
              sx={{ 
                borderRadius: 3, 
                py: 2, 
                fontWeight: 800, 
                fontSize: '1.1rem',
                textTransform: 'none',
                boxShadow: 4
              }}
            >
              Checkout Now
            </Button>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', textAlign: 'center', mt: 2 }}>
              Secure checkout powered by SHREDA
            </Typography>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
}
