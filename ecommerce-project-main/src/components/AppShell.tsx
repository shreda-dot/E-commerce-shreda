import {
  AppBar,
  Avatar,
  Badge,
  Box,
  Button,
  ClickAwayListener,
  Container,
  Divider,
  Drawer,
  IconButton,
  InputAdornment,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  OutlinedInput,
  Paper,
  Popper,
  Stack,
  Toolbar,
  Tooltip,
  Typography,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import {
  AccountCircle as AccountIcon,
  AdminPanelSettings as AdminIcon,
  DarkMode as DarkModeIcon,
  Dashboard as DashboardIcon,
  LightMode as LightModeIcon,
  Logout as LogoutIcon,
  Menu as MenuIcon,
  SearchOutlined as SearchOutlinedIcon,
  ShoppingBag as ShopIcon,
  ShoppingCart as CartIcon,
} from "@mui/icons-material";
import { useEffect, useRef, useState } from "react";
import { Link as RouterLink, useLocation, useNavigate } from "react-router-dom";
import type { User } from "../types";

type Props = {
  cartCount: number;
  mode: "light" | "dark";
  onToggleMode: () => void;
  user: User | null;
  onLogout: () => Promise<void>;
  search: string;
  onSearchChange: (value: string) => void;
  children: React.ReactNode;
};

const normalizeImage = (image: string | null | undefined): string | undefined => {
  if (!image) return undefined;
  if (image.startsWith("blob:") || image.startsWith("http://") || image.startsWith("https://"))
    return image;
  return image.startsWith("/") ? image : `/${image}`;
};

/* Pages where a search query should redirect the user to the Shop */
const NON_SHOP_PATHS = ["/cart", "/account", "/admin", "/checkout"];

export default function AppShell({
  cartCount, mode, onToggleMode, user, onLogout, search, onSearchChange, children,
}: Props) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  const isTiny   = useMediaQuery(theme.breakpoints.down("sm"));

  const [drawerOpen, setDrawerOpen]         = useState(false);
  const [anchorEl, setAnchorEl]             = useState<null | HTMLElement>(null);
  const [isScrolled, setIsScrolled]         = useState(false);
  const [searchFocused, setSearchFocused]   = useState(false);
  const [searchAnchorEl, setSearchAnchorEl] = useState<null | HTMLElement>(null);
  const [recentSearches]                    = useState<string[]>([
    "Wireless Headphones", "Gaming Mouse", "Smart Watch",
  ]);

  const searchInputRef = useRef<HTMLInputElement>(null);
  const location       = useLocation();
  const navigate       = useNavigate();

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 50);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  /* ── account menu ── */
  const handleMenu  = (e: React.MouseEvent<HTMLElement>) => setAnchorEl(e.currentTarget);
  const handleClose = () => setAnchorEl(null);
  const handleLogout = async () => { handleClose(); await onLogout(); navigate("/"); };

  /* ── search ── */
  const handleSearchFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    setSearchFocused(true);
    setSearchAnchorEl(e.currentTarget);
  };
  const handleSearchBlur = () => {
    setSearchFocused(false);
    setTimeout(() => setSearchAnchorEl(null), 200);
  };
  /**
   * Update search value. If the user is on a non-shop page and starts typing,
   * redirect them to the shop so results are visible.
   */
  const handleSearchChange = (value: string) => {
    onSearchChange(value);
    if (value.length > 0 && NON_SHOP_PATHS.includes(location.pathname)) {
      navigate("/");
    }
  };

  const navItems = [
    { label: "Shop",    to: "/",        icon: <ShopIcon /> },
    { label: "Cart",    to: "/cart",    icon: <CartIcon /> },
    { label: "Account", to: "/account", icon: <AccountIcon /> },
  ];
  const searchOpen = Boolean(searchAnchorEl);
  const showSearchBar = location.pathname === "/";

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "background.default", display: "flex", flexDirection: "column" }}>

      {/* ── App Bar ── */}
      <AppBar
        position="sticky"
        color="inherit"
        elevation={0}
        sx={{
          borderBottom: isScrolled ? 1 : 0,
          borderColor: "divider",
          backdropFilter: "blur(16px)",
          WebkitBackdropFilter: "blur(16px)",
          backgroundColor: mode === "light" ? "rgba(255,255,255,0.8)" : "rgba(18,12,30,0.85)",
          zIndex: (t) => t.zIndex.drawer + 2,
          transition: "background-color 0.3s, border-bottom 0.3s",
        }}
      >
        <Toolbar sx={{ gap: { xs: 1, sm: 2 }, minHeight: { xs: 64, sm: 72 }, px: { xs: 1, sm: 3 } }}>

          {/* Logo */}
          <Stack direction="row" spacing={1} sx={{ flexShrink: 0, alignItems: "center" }}>
            <Typography
              component={RouterLink} to="/"
              variant="h5"
              sx={{
                textDecoration: "none", color: "primary.main", fontWeight: 900,
                letterSpacing: "-0.5px", display: "flex", alignItems: "center", gap: 0.5,
              }}
            >
              <ShopIcon sx={{ fontSize: 32 }} />
              {!isTiny && "SHREDA"}
            </Typography>
          </Stack>

          <Box sx={{ flex: 1 }} />

          {/* Right-side controls */}
          <Stack direction="row" spacing={{ xs: 0.5, sm: 1 }} sx={{ flexShrink: 0, alignItems: "center" }}>
            {!isMobile && (
              <Stack direction="row" spacing={1}>
                {navItems.map((item) => (
                  <Button
                    key={item.to}
                    component={RouterLink} to={item.to}
                    color={location.pathname === item.to ? "primary" : "inherit"}
                    sx={{ borderRadius: 2, fontWeight: 700, textTransform: "none", fontSize: "0.95rem", px: 2 }}
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

            <Tooltip title={mode === "dark" ? "Light Mode" : "Dark Mode"}>
              <IconButton color="inherit" onClick={onToggleMode}>
                {mode === "dark" ? <LightModeIcon /> : <DarkModeIcon />}
              </IconButton>
            </Tooltip>

            {user ? (
              <>
                <Tooltip title="Account">
                  <IconButton onClick={handleMenu} color="inherit">
                    <Avatar
                      src={normalizeImage(user.profileImage)}
                      sx={{ width: 32, height: 32, bgcolor: "primary.main", fontSize: "0.875rem", fontWeight: 700 }}
                    >
                      {user.name?.[0] || user.email?.[0] || "U"}
                    </Avatar>
                  </IconButton>
                </Tooltip>
                <Menu
                  anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={handleClose}
                  transformOrigin={{ horizontal: "right", vertical: "top" }}
                  anchorOrigin={{ horizontal: "right", vertical: "bottom" }}
                  slotProps={{ paper: { sx: { mt: 1.5, minWidth: 200, borderRadius: 3, boxShadow: "0 8px 24px rgba(0,0,0,0.12)" } } }}
                >
                  <Box sx={{ px: 2, py: 1.5 }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>{user.name}</Typography>
                    <Typography variant="caption" color="text.secondary">{user.email}</Typography>
                  </Box>
                  <Divider />
                  <MenuItem onClick={() => { handleClose(); navigate("/account"); }}>
                    <ListItemIcon><AccountIcon fontSize="small" /></ListItemIcon>
                    Account
                  </MenuItem>
                  {user.role === "admin" && (
                    <MenuItem onClick={() => { handleClose(); navigate("/admin"); }}>
                      <ListItemIcon><AdminIcon fontSize="small" /></ListItemIcon>
                      Admin Panel
                    </MenuItem>
                  )}
                  <MenuItem onClick={handleLogout} sx={{ color: "error.main" }}>
                    <ListItemIcon><LogoutIcon fontSize="small" color="error" /></ListItemIcon>
                    Logout
                  </MenuItem>
                </Menu>
              </>
            ) : (
              <Button
                component={RouterLink} to="/auth" variant="contained" disableElevation
                sx={{ borderRadius: 2, px: { xs: 1.5, sm: 3 }, fontWeight: 800, textTransform: "none", ml: 1 }}
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

      {showSearchBar && (
        <Box
          sx={{
            position: "sticky",
            top: isScrolled ? 8 : 76,
            zIndex: (t) => t.zIndex.drawer + 1,
            display: "flex",
            justifyContent: "center",
            width: "100%",
            px: 2,
            transition: "top 0.4s cubic-bezier(0.4, 0, 0.2, 1)",
            pointerEvents: "none",
          }}
        >
          <Box
            sx={{
              width: "100%",
              maxWidth: searchFocused ? (isScrolled ? 560 : 780) : (isScrolled ? 380 : 560),
              transition: "max-width 0.45s cubic-bezier(0.4, 0, 0.2, 1)",
              pointerEvents: "auto",
            }}
          >
            <OutlinedInput
              value={search}
              inputRef={searchInputRef}
              size={isScrolled ? "small" : "medium"}
              onChange={(e) => handleSearchChange(e.target.value)}
              onFocus={handleSearchFocus}
              onBlur={handleSearchBlur}
              placeholder={searchFocused ? "Discover something remarkable..." : "Search SHREDA..."}
              startAdornment={
                <InputAdornment position="start">
                  <SearchOutlinedIcon
                    sx={{
                      color: searchFocused ? "primary.main" : "text.disabled",
                      transition: "color 0.2s",
                      fontSize: isScrolled ? 18 : 20,
                    }}
                  />
                </InputAdornment>
              }
              sx={{
                width: "100%",
                borderRadius: "100px",
                bgcolor: mode === "light"
                  ? (searchFocused ? "rgba(255,255,255,0.97)" : "rgba(255,255,255,0.62)")
                  : (searchFocused ? "rgba(14,14,28,0.97)" : "rgba(14,14,28,0.62)"),
                backdropFilter: "blur(20px)",
                WebkitBackdropFilter: "blur(20px)",
                transition: "all 0.35s cubic-bezier(0.4, 0, 0.2, 1)",
                boxShadow: searchFocused
                  ? "0 0 0 1.5px rgba(25,118,210,0.45), 0 8px 32px rgba(25,118,210,0.12)"
                  : "0 2px 10px rgba(0,0,0,0.05)",
                "& fieldset": {
                  borderWidth: "1px !important",
                  borderColor: searchFocused
                    ? "primary.main"
                    : mode === "light" ? "rgba(0,0,0,0.07)" : "rgba(255,255,255,0.08)",
                  transition: "border-color 0.25s",
                },
                "&:hover fieldset": { borderColor: "primary.main" },
                "&.Mui-focused fieldset": { borderColor: "primary.main" },
                "& .MuiOutlinedInput-input": {
                  fontWeight: 500,
                  fontSize: isScrolled ? "0.88rem" : "0.95rem",
                  letterSpacing: "0.015em",
                  "&::placeholder": { opacity: 0.5 },
                },
              }}
            />

            <Popper
              open={searchOpen}
              anchorEl={searchAnchorEl}
              placement="bottom"
              sx={{ width: searchInputRef.current?.offsetWidth, zIndex: (t) => t.zIndex.drawer + 3 }}
            >
              <ClickAwayListener onClickAway={() => setSearchAnchorEl(null)}>
                <Paper sx={{ mt: 1, borderRadius: 3, boxShadow: "0 8px 32px rgba(0,0,0,0.12)", overflow: "hidden", bgcolor: "background.paper" }}>
                  <Box sx={{ p: 2 }}>
                    <Typography variant="overline" sx={{ fontWeight: 800, color: "text.secondary", px: 1, fontSize: "0.65rem", letterSpacing: "0.2em" }}>
                      Recent Searches
                    </Typography>
                    <List>
                      {recentSearches.map((item) => (
                        <ListItemButton
                          key={item}
                          onClick={() => { handleSearchChange(item); setSearchAnchorEl(null); }}
                          sx={{ borderRadius: 2 }}
                        >
                          <ListItemIcon sx={{ minWidth: 36 }}>
                            <SearchOutlinedIcon fontSize="small" />
                          </ListItemIcon>
                          <ListItemText
                            primary={
                              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                {item}
                              </Typography>
                            }
                          />
                        </ListItemButton>
                      ))}
                    </List>
                  </Box>
                </Paper>
              </ClickAwayListener>
            </Popper>
          </Box>
        </Box>
      )}

      {/* ── Mobile Drawer ── */}
      <Drawer
        anchor="right"
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        slotProps={{ paper: { sx: { width: 280, borderRadius: "20px 0 0 20px" } } }}
      >
        <Box sx={{ p: 3 }}>
          <Typography variant="h6" color="primary" sx={{ fontWeight: 900, mb: 3 }}>Navigation</Typography>
          <List>
            {navItems.map((item) => (
              <ListItemButton
                key={item.to}
                component={RouterLink} to={item.to}
                onClick={() => setDrawerOpen(false)}
                selected={location.pathname === item.to}
                sx={{ borderRadius: 2, mb: 1 }}
              >
                <ListItemIcon>{item.icon}</ListItemIcon>
                <ListItemText primary={<Typography sx={{ fontWeight: 700 }}>{item.label}</Typography>} />
              </ListItemButton>
            ))}
            {user?.role === "admin" && (
              <ListItemButton
                component={RouterLink} to="/admin"
                onClick={() => setDrawerOpen(false)}
                selected={location.pathname === "/admin"}
                sx={{ borderRadius: 2, mb: 1 }}
              >
                <ListItemIcon><AdminIcon /></ListItemIcon>
                <ListItemText primary={<Typography sx={{ fontWeight: 700 }}>Admin Panel</Typography>} />
              </ListItemButton>
            )}
          </List>
          <Divider sx={{ my: 2 }} />
          {user ? (
            <Button fullWidth variant="outlined" color="error" onClick={handleLogout} startIcon={<LogoutIcon />} sx={{ borderRadius: 2, fontWeight: 700 }}>
              Logout
            </Button>
          ) : (
            <Button fullWidth variant="contained" component={RouterLink} to="/auth" onClick={() => setDrawerOpen(false)} sx={{ borderRadius: 2, fontWeight: 700 }}>
              Login / Signup
            </Button>
          )}
        </Box>
      </Drawer>

      {/* ── Page content ── */}
      <Box component="main" sx={{ flex: 1, display: "flex", flexDirection: "column" }}>
        <Container maxWidth="lg" sx={{ py: { xs: 4, sm: 6 }, flex: 1 }}>
          {children}
        </Container>
      </Box>

      {/* ── Footer ── */}
      <Box
        component="footer"
        sx={{ py: 6, px: 2, borderTop: 1, borderColor: "divider", mt: "auto", bgcolor: "background.paper" }}
      >
        <Container maxWidth="lg">
          <Stack
            direction={{ xs: "column", sm: "row" }}
            spacing={3}
            sx={{ justifyContent: "space-between", alignItems: "center" }}
          >
            <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 700 }}>
              © 2026 Shreda Store
            </Typography>
            <Stack direction="row" spacing={4}>
              {[
                { label: "Privacy", to: "/privacy" },
                { label: "Terms",   to: "/terms"   },
                { label: "Contact", to: "/contact" },
              ].map(({ label, to }) => (
                <Typography
                  key={to}
                  component={RouterLink} to={to}
                  variant="body2"
                  sx={{ textDecoration: "none", color: "text.secondary", fontWeight: 600, "&:hover": { color: "primary.main" } }}
                >
                  {label}
                </Typography>
              ))}
            </Stack>
          </Stack>
        </Container>
      </Box>

    </Box>
  );
}
