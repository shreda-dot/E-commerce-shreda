import {
  AppBar,
  Badge,
  Box,
  Button,
  Container,
  Divider,
  Drawer,
  IconButton,
  InputAdornment,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  OutlinedInput,
  Stack,
  Toolbar,
  Typography,
  useMediaQuery,
  useTheme,
  Avatar,
  Menu,
  MenuItem,
  Tooltip,
} from '@mui/material';
import {
  Search as SearchIcon,
  ShoppingCart as CartIcon,
  DarkMode as DarkModeIcon,
  LightMode as LightModeIcon,
  Menu as MenuIcon,
  AccountCircle as AccountIcon,
  Logout as LogoutIcon,
  AdminPanelSettings as AdminIcon,
  ShoppingBag as ShopIcon,
  Dashboard as DashboardIcon,
} from '@mui/icons-material';
import { useState } from 'react';
import { Link as RouterLink, useLocation, useNavigate } from 'react-router-dom';
import type { User } from '../types';

type Props = {
  cartCount: number;
  mode: 'light' | 'dark';
  onToggleMode: () => void;
  user: User | null;
  onLogout: () => Promise<void>;
  search: string;
  onSearchChange: (value: string) => void;
  children: React.ReactNode;
};

export default function AppShell({
  cartCount,
  mode,
  onToggleMode,
  user,
  onLogout,
  search,
  onSearchChange,
  children
}: Props) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const isTiny = useMediaQuery(theme.breakpoints.down('sm'));
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const location = useLocation();
  const navigate = useNavigate();

  const handleMenu = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = async () => {
    handleClose();
    await onLogout();
    navigate('/');
  };

  const navItems = [
    { label: 'Shop', to: '/', icon: <ShopIcon /> },
    { label: 'Cart', to: '/cart', icon: <CartIcon /> },
    { label: 'Account', to: '/account', icon: <AccountIcon /> }
  ];

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default', display: 'flex', flexDirection: 'column' }}>
      <AppBar
        position="sticky"
        color="inherit"
        elevation={0}
        sx={{
          borderBottom: 1,
          borderColor: 'divider',
          backdropFilter: 'blur(12px)',
          backgroundColor: mode === 'light' ? 'rgba(255,255,255,0.8)' : 'rgba(26,16,40,0.8)',
          zIndex: (theme) => theme.zIndex.drawer + 1
        }}
      >
        <Toolbar sx={{ gap: { xs: 1, sm: 2 }, minHeight: { xs: 64, sm: 72 }, px: { xs: 1, sm: 3 } }}>
          <Stack direction="row" spacing={1} sx={{ flexShrink: 0, alignItems: 'center' }}>
            <Typography
              component={RouterLink}
              to="/"
              variant="h5"
              sx={{
                textDecoration: 'none',
                color: 'primary.main',
                fontWeight: 900,
                letterSpacing: '-0.5px',
                display: 'flex',
                alignItems: 'center',
                gap: 0.5
              }}
            >
              <ShopIcon sx={{ fontSize: 32 }} />
              {!isTiny && 'SHREDA'}
            </Typography>
          </Stack>

          <Box sx={{ flex: 1, display: 'flex', justifyContent: 'center', px: { xs: 1, sm: 4 } }}>
            <OutlinedInput
              size="small"
              value={search}
              onChange={(event) => onSearchChange(event.target.value)}
              placeholder="Search products..."
              startAdornment={
                <InputAdornment position="start">
                  <SearchIcon color="action" fontSize="small" />
                </InputAdornment>
              }
              sx={{
                width: '100%',
                maxWidth: 600,
                borderRadius: 3,
                bgcolor: 'background.paper',
                transition: 'all 0.2s ease',
                '& fieldset': { borderColor: 'transparent' },
                '&:hover fieldset': { borderColor: 'divider' },
                '&.Mui-focused fieldset': { borderColor: 'primary.main', borderWidth: '1px' },
                boxShadow: '0 2px 8px rgba(0,0,0,0.05)'
              }}
            />
          </Box>

          <Stack direction="row" spacing={{ xs: 0.5, sm: 1 }} sx={{ flexShrink: 0, alignItems: 'center' }}>
            {!isMobile && (
              <Stack direction="row" spacing={1}>
                {navItems.map((item) => (
                  <Button
                    key={item.to}
                    component={RouterLink}
                    to={item.to}
                    color={location.pathname === item.to ? 'primary' : 'inherit'}
                    sx={{
                      borderRadius: 2,
                      fontWeight: 700,
                      textTransform: 'none',
                      fontSize: '0.95rem',
                      px: 2
                    }}
                  >
                    {item.label}
                  </Button>
                ))}
              </Stack>
            )}

            <Tooltip title="Cart">
              <IconButton component={RouterLink} to="/cart" color="inherit" sx={{ ml: { xs: 0, sm: 1 } }}>
                <Badge badgeContent={cartCount} color="error" overlap="circular">
                  <CartIcon />
                </Badge>
              </IconButton>
            </Tooltip>

            <Tooltip title={mode === 'dark' ? 'Light Mode' : 'Dark Mode'}>
              <IconButton color="inherit" onClick={onToggleMode}>
                {mode === 'dark' ? <LightModeIcon /> : <DarkModeIcon />}
              </IconButton>
            </Tooltip>

            {user ? (
              <>
                <Tooltip title="Account">
                  <IconButton onClick={handleMenu} color="inherit">
                    <Avatar
                      src={user.profileImage || ''}
                      sx={{ width: 32, height: 32, bgcolor: 'primary.main', fontSize: '0.875rem', fontWeight: 700 }}
                    >
                      {user.name?.[0] || user.email?.[0] || 'U'}
                    </Avatar>
                  </IconButton>
                </Tooltip>
                <Menu
                  anchorEl={anchorEl}
                  open={Boolean(anchorEl)}
                  onClose={handleClose}
                  transformOrigin={{ horizontal: 'right', vertical: 'top' }}
                  anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
                  slotProps={{
                    paper: {
                      sx: { mt: 1.5, minWidth: 200, borderRadius: 3, boxShadow: '0 8px 24px rgba(0,0,0,0.12)' }
                    }
                  }}
                >
                  <Box sx={{ px: 2, py: 1.5 }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>{user.name}</Typography>
                    <Typography variant="caption" color="text.secondary">{user.email}</Typography>
                  </Box>
                  <Divider />
                  <MenuItem onClick={() => { handleClose(); navigate('/account'); }}>
                    <ListItemIcon><AccountIcon fontSize="small" /></ListItemIcon>
                    Account
                  </MenuItem>
                  {user.role === 'admin' && (
                    <MenuItem onClick={() => { handleClose(); navigate('/admin'); }}>
                      <ListItemIcon><AdminIcon fontSize="small" /></ListItemIcon>
                      Admin Panel
                    </MenuItem>
                  )}
                  <MenuItem onClick={handleLogout} sx={{ color: 'error.main' }}>
                    <ListItemIcon><LogoutIcon fontSize="small" color="error" /></ListItemIcon>
                    Logout
                  </MenuItem>
                </Menu>
              </>
            ) : (
              <Button
                component={RouterLink}
                to="/auth"
                variant="contained"
                disableElevation
                sx={{
                  borderRadius: 2,
                  px: { xs: 1.5, sm: 3 },
                  fontWeight: 800,
                  textTransform: 'none',
                  ml: 1
                }}
              >
                Login
              </Button>
            )}

            {isMobile && (
              <IconButton onClick={() => setDrawerOpen(true)} color="inherit" sx={{ ml: 0.5 }}>
                <MenuIcon />
              </IconButton>
            )}
          </Stack>
        </Toolbar>
      </AppBar>

      <Drawer
        anchor="right"
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        slotProps={{ paper: { sx: { width: 280, borderRadius: '20px 0 0 20px' } } }}
      >
        <Box sx={{ p: 3 }}>
          <Typography variant="h6" color="primary" sx={{ fontWeight: 900, mb: 3 }}>Navigation</Typography>
          <List>
            {navItems.map((item) => (
              <ListItemButton
                key={item.to}
                component={RouterLink}
                to={item.to}
                onClick={() => setDrawerOpen(false)}
                selected={location.pathname === item.to}
                sx={{ borderRadius: 2, mb: 1 }}
              >
                <ListItemIcon color={location.pathname === item.to ? 'primary' : 'inherit'}>
                  {item.icon}
                </ListItemIcon>
                <ListItemText primary={<Typography sx={{ fontWeight: 700 }}>{item.label}</Typography>} />
              </ListItemButton>
            ))}
            {user?.role === 'admin' && (
              <ListItemButton
                component={RouterLink}
                to="/admin"
                onClick={() => setDrawerOpen(false)}
                selected={location.pathname === '/admin'}
                sx={{ borderRadius: 2, mb: 1 }}
              >
                <ListItemIcon><AdminIcon /></ListItemIcon>
                <ListItemText primary={<Typography sx={{ fontWeight: 700 }}>Admin Panel</Typography>} />
              </ListItemButton>
            )}
          </List>
          <Divider sx={{ my: 2 }} />
          {user ? (
            <Button
              fullWidth
              variant="outlined"
              color="error"
              onClick={handleLogout}
              startIcon={<LogoutIcon />}
              sx={{ borderRadius: 2, fontWeight: 700 }}
            >
              Logout
            </Button>
          ) : (
            <Button
              fullWidth
              variant="contained"
              component={RouterLink}
              to="/auth"
              onClick={() => setDrawerOpen(false)}
              sx={{ borderRadius: 2, fontWeight: 700 }}
            >
              Login / Signup
            </Button>
          )}
        </Box>
      </Drawer>

      <Box component="main" sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <Container maxWidth="lg" sx={{ py: { xs: 2, sm: 4 }, flex: 1 }}>
          {children}
        </Container>
      </Box>
      
      <Box component="footer" sx={{ py: 4, px: 2, textAlign: 'center', borderTop: 1, borderColor: 'divider', mt: 'auto' }}>
        <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600 }}>
          © 2024 SHREDA Ecommerce. Built with MUI.
        </Typography>
      </Box>
    </Box>
  );
}
