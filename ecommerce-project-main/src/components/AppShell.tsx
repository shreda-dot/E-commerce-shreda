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
} from "@mui/material";
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
  SearchOutlined as SearchOutlinedIcon,
} from "@mui/icons-material";
import { useState, useEffect, useRef } from "react";
import { Link as RouterLink, useLocation, useNavigate } from "react-router-dom";
import { Paper, Popper, ClickAwayListener } from "@mui/material";
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

const normalizeImage = (
  image: string | null | undefined,
): string | undefined => {
  if (!image) return undefined;
  if (
    image.startsWith("blob:") ||
    image.startsWith("http://") ||
    image.startsWith("https://")
  )
    return image;
  return image.startsWith("/") ? image : `/${image}`;
};

export default function AppShell({
  cartCount,
  mode,
  onToggleMode,
  user,
  onLogout,
  search,
  onSearchChange,
  children,
}: Props) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  const isTiny = useMediaQuery(theme.breakpoints.down("sm"));
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [isScrolled, setIsScrolled] = useState(false);
  const [searchAnchorEl, setSearchAnchorEl] = useState<null | HTMLElement>(
    null,
  );
  const [recentSearches, setRecentSearches] = useState<string[]>([
    "Wireless Headphones",
    "Gaming Mouse",
    "Smart Watch",
  ]);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleMenu = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = async () => {
    handleClose();
    await onLogout();
    navigate("/");
  };

  const handleSearchFocus = (event: React.FocusEvent<HTMLInputElement>) => {
    setSearchAnchorEl(event.currentTarget);
  };

  const handleSearchBlur = () => {
    // Small delay to allow clicking on recent searches
    setTimeout(() => setSearchAnchorEl(null), 200);
  };

  const navItems = [
    { label: "Shop", to: "/", icon: <ShopIcon /> },
    { label: "Cart", to: "/cart", icon: <CartIcon /> },
    { label: "Account", to: "/account", icon: <AccountIcon /> },
  ];

  const searchOpen = Boolean(searchAnchorEl);

  return (
    <Box
      sx={{
        minHeight: "100vh",
        bgcolor: "background.default",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <AppBar
        position="sticky"
        color="inherit"
        elevation={0}
        sx={{
          borderBottom: isScrolled ? 1 : 0,
          borderColor: "divider",
          backdropFilter: "blur(12px)",
          backgroundColor:
            mode === "light" ? "rgba(255,255,255,0.8)" : "rgba(26,16,40,0.8)",
          zIndex: (theme) => theme.zIndex.drawer + 2,
          transition: "all 0.3s ease",
        }}
      >
        <Toolbar
          sx={{
            gap: { xs: 1, sm: 2 },
            minHeight: { xs: 64, sm: 72 },
            px: { xs: 1, sm: 3 },
          }}
        >
          <Stack
            direction="row"
            spacing={1}
            sx={{ flexShrink: 0, alignItems: "center" }}
          >
            <Typography
              component={RouterLink}
              to="/"
              variant="h5"
              sx={{
                textDecoration: "none",
                color: "primary.main",
                fontWeight: 900,
                letterSpacing: "-0.5px",
                display: "flex",
                alignItems: "center",
                gap: 0.5,
              }}
            >
              <ShopIcon sx={{ fontSize: 32 }} />
              {!isTiny && "SHREDA"}
            </Typography>
          </Stack>

          <Box sx={{ flex: 1 }} />

          <Stack
            direction="row"
            spacing={{ xs: 0.5, sm: 1 }}
            sx={{ flexShrink: 0, alignItems: "center" }}
          >
            {!isMobile && (
              <Stack direction="row" spacing={1}>
                {navItems.map((item) => (
                  <Button
                    key={item.to}
                    component={RouterLink}
                    to={item.to}
                    color={
                      location.pathname === item.to ? "primary" : "inherit"
                    }
                    sx={{
                      borderRadius: 2,
                      fontWeight: 700,
                      textTransform: "none",
                      fontSize: "0.95rem",
                      px: 2,
                    }}
                  >
                    {item.label}
                  </Button>
                ))}
              </Stack>
            )}

            <Tooltip title="Cart">
              <IconButton
                component={RouterLink}
                to="/cart"
                color="inherit"
                sx={{ ml: { xs: 0, sm: 1 } }}
              >
                <Badge
                  badgeContent={cartCount}
                  color="error"
                  overlap="circular"
                >
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
                      sx={{
                        width: 32,
                        height: 32,
                        bgcolor: "primary.main",
                        fontSize: "0.875rem",
                        fontWeight: 700,
                      }}
                    >
                      {user.name?.[0] || user.email?.[0] || "U"}
                    </Avatar>
                  </IconButton>
                </Tooltip>
                <Menu
                  anchorEl={anchorEl}
                  open={Boolean(anchorEl)}
                  onClose={handleClose}
                  transformOrigin={{ horizontal: "right", vertical: "top" }}
                  anchorOrigin={{ horizontal: "right", vertical: "bottom" }}
                  slotProps={{
                    paper: {
                      sx: {
                        mt: 1.5,
                        minWidth: 200,
                        borderRadius: 3,
                        boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
                      },
                    },
                  }}
                >
                  <Box sx={{ px: 2, py: 1.5 }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
                      {user.name}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {user.email}
                    </Typography>
                  </Box>
                  <Divider />
                  <MenuItem
                    onClick={() => {
                      handleClose();
                      navigate("/account");
                    }}
                  >
                    <ListItemIcon>
                      <AccountIcon fontSize="small" />
                    </ListItemIcon>
                    Account
                  </MenuItem>
                  {user.role === "admin" && (
                    <MenuItem
                      onClick={() => {
                        handleClose();
                        navigate("/admin");
                      }}
                    >
                      <ListItemIcon>
                        <AdminIcon fontSize="small" />
                      </ListItemIcon>
                      Admin Panel
                    </MenuItem>
                  )}
                  <MenuItem onClick={handleLogout} sx={{ color: "error.main" }}>
                    <ListItemIcon>
                      <LogoutIcon fontSize="small" color="error" />
                    </ListItemIcon>
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
                  textTransform: "none",
                  ml: 1,
                }}
              >
                Login
              </Button>
            )}

            {isMobile && (
              <IconButton
                onClick={() => setDrawerOpen(true)}
                color="inherit"
                sx={{ ml: 0.5 }}
              >
                <MenuIcon />
              </IconButton>
            )}
          </Stack>
        </Toolbar>
      </AppBar>

      {/* Floating Search Bar */}
      <Box
        sx={{
          position: "sticky",
          top: isScrolled ? 10 : 80,
          zIndex: (theme) => theme.zIndex.drawer + 1,
          display: "flex",
          justifyContent: "center",
          width: "100%",
          px: 2,
          transition: "all 0.4s cubic-bezier(0.4, 0, 0.2, 1)",
          pointerEvents: "none",
        }}
      >
        <Box
          sx={{
            width: "100%",
            maxWidth: isScrolled ? 400 : 600,
            pointerEvents: "auto",
          }}
        >
          <OutlinedInput
            size={isScrolled ? "small" : "medium"}
            value={search}
            inputRef={searchInputRef}
            onChange={(event) => onSearchChange(event.target.value)}
            onFocus={handleSearchFocus}
            onBlur={handleSearchBlur}
            placeholder="Search for items..."
            startAdornment={
              <InputAdornment position="start">
                <SearchOutlinedIcon color="primary" />
              </InputAdornment>
            }
            sx={{
              width: "100%",
              borderRadius: "30px",
              bgcolor:
                mode === "light"
                  ? "rgba(255,255,255,0.7)"
                  : "rgba(30,30,50,0.7)",
              backdropFilter: "blur(10px)",
              transition: "all 0.3s ease",
              fontFamily: '"Inter", sans-serif',
              boxShadow: isScrolled
                ? "0 4px 20px rgba(0,0,0,0.1)"
                : "0 8px 32px rgba(0,0,0,0.08)",
              "& fieldset": { borderColor: "rgba(0,0,0,0.05)" },
              "&:hover fieldset": { borderColor: "primary.main" },
              "&.Mui-focused": {
                transform: "scale(1.02)",
                bgcolor:
                  mode === "light"
                    ? "rgba(255,255,255,0.95)"
                    : "rgba(40,40,60,0.95)",
                boxShadow: "0 12px 40px rgba(0,0,0,0.15)",
              },
              "& .MuiOutlinedInput-input": {
                fontWeight: 600,
                fontSize: isScrolled ? "0.9rem" : "1rem",
              },
            }}
          />
          <Popper
            open={searchOpen}
            anchorEl={searchAnchorEl}
            placement="bottom"
            transition
            sx={{
              width: searchInputRef.current?.offsetWidth,
              zIndex: (theme) => theme.zIndex.drawer + 3,
            }}
          >
            {({ TransitionProps }) => (
              <Paper
                {...TransitionProps}
                sx={{
                  mt: 1,
                  borderRadius: 3,
                  boxShadow: "0 8px 32px rgba(0,0,0,0.12)",
                  overflow: "hidden",
                  bgcolor: "background.paper",
                }}
              >
                <Box sx={{ p: 2 }}>
                  <Typography
                    variant="overline"
                    sx={{ fontWeight: 800, color: "text.secondary", px: 1 }}
                  >
                    Recent Searches
                  </Typography>
                  <List size="small">
                    {recentSearches.map((item, index) => (
                      <ListItemButton
                        key={index}
                        onClick={() => {
                          onSearchChange(item);
                          setSearchAnchorEl(null);
                        }}
                        sx={{ borderRadius: 2 }}
                      >
                        <ListItemIcon sx={{ minWidth: 36 }}>
                          <SearchOutlinedIcon fontSize="small" />
                        </ListItemIcon>
                        <ListItemText
                          primary={item}
                          primaryTypographyProps={{
                            variant: "body2",
                            fontWeight: 600,
                          }}
                        />
                      </ListItemButton>
                    ))}
                  </List>
                </Box>
              </Paper>
            )}
          </Popper>
        </Box>
      </Box>

      <Drawer
        anchor="right"
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        slotProps={{
          paper: { sx: { width: 280, borderRadius: "20px 0 0 20px" } },
        }}
      >
        <Box sx={{ p: 3 }}>
          <Typography
            variant="h6"
            color="primary"
            sx={{ fontWeight: 900, mb: 3 }}
          >
            Navigation
          </Typography>
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
                <ListItemIcon
                  color={location.pathname === item.to ? "primary" : "inherit"}
                >
                  {item.icon}
                </ListItemIcon>
                <ListItemText
                  primary={
                    <Typography sx={{ fontWeight: 700 }}>
                      {item.label}
                    </Typography>
                  }
                />
              </ListItemButton>
            ))}
            {user?.role === "admin" && (
              <ListItemButton
                component={RouterLink}
                to="/admin"
                onClick={() => setDrawerOpen(false)}
                selected={location.pathname === "/admin"}
                sx={{ borderRadius: 2, mb: 1 }}
              >
                <ListItemIcon>
                  <AdminIcon />
                </ListItemIcon>
                <ListItemText
                  primary={
                    <Typography sx={{ fontWeight: 700 }}>
                      Admin Panel
                    </Typography>
                  }
                />
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

      <Box
        component="main"
        sx={{ flex: 1, display: "flex", flexDirection: "column" }}
      >
        <Container maxWidth="lg" sx={{ py: { xs: 4, sm: 6 }, flex: 1 }}>
          {children}
        </Container>
      </Box>

      <Box
        component="footer"
        sx={{
          py: 6,
          px: 2,
          borderTop: 1,
          borderColor: "divider",
          mt: "auto",
          bgcolor: "background.paper",
        }}
      >
        <Container maxWidth="lg">
          <Stack
            direction={{ xs: "column", sm: "row" }}
            justifyContent="space-between"
            alignItems="center"
            spacing={3}
          >
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ fontWeight: 700 }}
            >
              © 2026 Shreda Store
            </Typography>

            <Stack direction="row" spacing={4}>
              <Typography
                component={RouterLink}
                to="/privacy"
                variant="body2"
                sx={{
                  textDecoration: "none",
                  color: "text.secondary",
                  fontWeight: 600,
                  "&:hover": { color: "primary.main" },
                }}
              >
                Privacy
              </Typography>
              <Typography
                component={RouterLink}
                to="/terms"
                variant="body2"
                sx={{
                  textDecoration: "none",
                  color: "text.secondary",
                  fontWeight: 600,
                  "&:hover": { color: "primary.main" },
                }}
              >
                Terms
              </Typography>
              <Typography
                component={RouterLink}
                to="/contact"
                variant="body2"
                sx={{
                  textDecoration: "none",
                  color: "text.secondary",
                  fontWeight: 600,
                  "&:hover": { color: "primary.main" },
                }}
              >
                Contact
              </Typography>
            </Stack>
          </Stack>
        </Container>
      </Box>
    </Box>
  );
}
