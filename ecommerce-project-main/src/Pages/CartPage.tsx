import {
  Alert,
  alpha,
  Button,
  Card,
  CardContent,
  CardMedia,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormHelperText,
  Grid,
  IconButton,
  MenuItem,
  Paper,
  Step,
  StepLabel,
  Stepper,
  Stack,
  TextField,
  Typography,
  Box,
  Divider,
  Snackbar,
  Tooltip,
  useTheme,
} from "@mui/material";
import {
  Delete as DeleteIcon,
  ShoppingCartCheckout as CheckoutIcon,
  ArrowBack as BackIcon,
} from "@mui/icons-material";
import { useMemo, useState } from "react";
import { Link as RouterLink, useNavigate } from "react-router-dom";
import { api } from "../api";
import {
  DELIVERY_ZONES,
  deliveryValidation,
  useDelivery,
  type DeliveryDetails,
  type DeliverySpeed,
  type DeliveryZone,
  type DeliveryZoneId,
} from "../contexts/DeliveryContext";
import type { CartItem } from "../types";
import type { CheckoutLocationState } from "../types";
import {
  Building2,
  Earth,
  MapPinHouse,
  Plane,
  Truck,
  Zap,
} from "lucide-react";

type Props = {
  cartItems: CartItem[];
  onCartChanged: () => Promise<void>;
  isAuthenticated: boolean;
};

const normalizeImage = (image: string) =>
  image.startsWith("/") ? image : `/${image}`;
const GUEST_CART_KEY = "shreda_guest_cart_v1";
const CHECKOUT_STATE_KEY = "shreda_checkout_state_v1";

const readGuestCart = (): CartItem[] => {
  try {
    const raw = localStorage.getItem(GUEST_CART_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as CartItem[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const writeGuestCart = (items: CartItem[]) => {
  localStorage.setItem(GUEST_CART_KEY, JSON.stringify(items));
};

const zoneIcons: Record<DeliveryZoneId, JSX.Element> = {
  "lagos-mainland": <Building2 size={18} />,
  "lagos-island": <MapPinHouse size={18} />,
  "rest-of-nigeria": <Truck size={18} />,
  international: <Plane size={18} />,
};

export default function CartPage({
  cartItems,
  onCartChanged,
  isAuthenticated,
}: Props) {
  const theme = useTheme();
  const { details, isValid: isDeliveryValid, setDetails } = useDelivery();
  const [notification, setNotification] = useState<{
    open: boolean;
    message: string;
    severity: "success" | "error" | "info";
  }>({ open: false, message: "", severity: "info" });
  const [removeDialogOpen, setRemoveDialogOpen] = useState(false);
  const [pendingRemoveProductId, setPendingRemoveProductId] = useState<
    string | null
  >(null);
  const [deliveryDialogOpen, setDeliveryDialogOpen] = useState(false);
  const [pendingCheckoutAfterSave, setPendingCheckoutAfterSave] = useState(false);
  const [selectedZone, setSelectedZone] = useState<DeliveryZone | null>(
    details ? DELIVERY_ZONES.find((item) => item.id === details.zoneId) ?? null : null,
  );
  const [address, setAddress] = useState(details?.address ?? "");
  const [phoneNumber, setPhoneNumber] = useState(details?.phoneNumber ?? "");
  const [speed, setSpeed] = useState<DeliverySpeed>(details?.speed ?? "standard");
  const [attemptedSave, setAttemptedSave] = useState(false);
  const navigate = useNavigate();

  const productTotal = useMemo(
    () =>
      cartItems.reduce(
        (sum, item) => sum + (item.product?.priceCents || 0) * item.quantity,
        0,
      ),
    [cartItems],
  );

  const tax = productTotal * 0.1; // 10% tax
  const grandTotal = productTotal + tax;

  const removeItem = async (productId: string) => {
    try {
      if (!isAuthenticated) {
        const nextItems = readGuestCart().filter(
          (item) => item.productId !== productId,
        );
        writeGuestCart(nextItems);
      } else {
        await api.delete(`/api/cart-items/${productId}`);
      }
      await onCartChanged();
      setNotification({
        open: true,
        message: "Item removed from cart.",
        severity: "success",
      });
    } catch {
      setNotification({
        open: true,
        message: "Unable to remove item.",
        severity: "error",
      });
    }
  };

  const updateQuantity = async (productId: string, quantity: number) => {
    try {
      if (!isAuthenticated) {
        const nextItems = readGuestCart().map((item) =>
          item.productId === productId ? { ...item, quantity } : item,
        );
        writeGuestCart(nextItems);
      } else {
        await api.put(`/api/cart-items/${productId}`, { quantity });
      }
      await onCartChanged();
      setNotification({
        open: true,
        message: "Cart updated.",
        severity: "success",
      });
    } catch {
      setNotification({
        open: true,
        message: "Unable to update quantity.",
        severity: "error",
      });
    }
  };

  const addressError =
    attemptedSave && !deliveryValidation.isAddressValid(address)
      ? "Enter at least 10 characters for address."
      : "";
  const phoneError =
    attemptedSave && !deliveryValidation.isPhoneValid(phoneNumber)
      ? "Use a valid Nigerian phone number (e.g. 080..., +234...)."
      : "";
  const canSaveDelivery = Boolean(
    selectedZone &&
      deliveryValidation.isAddressValid(address) &&
      deliveryValidation.isPhoneValid(phoneNumber),
  );

  const beginCheckout = async (deliveryDetails: DeliveryDetails) => {
    const deliveryZoneLabel = `${DELIVERY_ZONES.find((z) => z.id === deliveryDetails.zoneId)?.name ?? "Zone"} • ${deliveryDetails.speed === "express" ? "Express" : "Standard"}`;
    const payload: CheckoutLocationState = {
      draftOrderId: "",
      subtotalCents: productTotal,
      taxCents: Math.round(tax),
      totalCostCents: Math.round(grandTotal),
      deliveryZoneLabel,
      shippingLabel: `Shipping (${deliveryZoneLabel.replace(" • ", " - ")})`,
      deliveryFeeCents: 0,
      items: cartItems.map((item) => ({
        productId: item.productId,
        name: item.product?.name ?? "Product",
        image: item.product?.image,
        quantity: item.quantity,
        lineTotalCents: (item.product?.priceCents ?? 0) * item.quantity,
      })),
    };

    try {
      const res = await api.post<{
        draftOrderId: string;
        summary?: {
          shippingCostCents?: number;
          taxCents?: number;
          totalCostCents?: number;
          shippingLabel?: string;
          productCostCents?: number;
        };
      }>("/api/orders/pre-check", {
        delivery: deliveryDetails,
      });
      payload.draftOrderId = res.data.draftOrderId;
      payload.deliveryFeeCents = Number(res.data.summary?.shippingCostCents ?? payload.deliveryFeeCents);
      payload.taxCents = Number(res.data.summary?.taxCents ?? payload.taxCents);
      payload.totalCostCents = Number(res.data.summary?.totalCostCents ?? payload.totalCostCents);
      payload.subtotalCents = Number(res.data.summary?.productCostCents ?? payload.subtotalCents);
      payload.shippingLabel = String(res.data.summary?.shippingLabel || payload.shippingLabel || "");
      localStorage.setItem(CHECKOUT_STATE_KEY, JSON.stringify(payload));
      navigate("/checkout", { state: payload });
    } catch {
      setNotification({
        open: true,
        message: "Unable to start checkout. Please try again.",
        severity: "error",
      });
    }
  };

  const openDeliveryDialog = (autoCheckout = false) => {
    setPendingCheckoutAfterSave(autoCheckout);
    setSelectedZone(
      details ? DELIVERY_ZONES.find((item) => item.id === details.zoneId) ?? null : null,
    );
    setAddress(details?.address ?? "");
    setPhoneNumber(details?.phoneNumber ?? "");
    setSpeed(details?.speed ?? "standard");
    setAttemptedSave(false);
    setDeliveryDialogOpen(true);
  };

  const saveDeliveryDetails = () => {
    setAttemptedSave(true);
    if (!selectedZone || !canSaveDelivery) return;
    const payload: DeliveryDetails = {
      zoneId: selectedZone.id,
      address: address.trim(),
      phoneNumber: phoneNumber.trim(),
      speed: selectedZone.isLagos ? speed : "standard",
    };
    setDetails(payload);
    setDeliveryDialogOpen(false);
    setNotification({
      open: true,
      message: "Delivery details saved.",
      severity: "success",
    });
    if (pendingCheckoutAfterSave) {
      setPendingCheckoutAfterSave(false);
      void beginCheckout(payload);
    }
  };

  const handleCheckoutClick = async () => {
    if (!isAuthenticated) {
      setNotification({
        open: true,
        message: "You must be logged in to complete your purchase",
        severity: "info",
      });
      window.setTimeout(() => {
        navigate("/auth", {
          state: {
            from: "/cart",
            info: "You must be logged in to complete your purchase",
          },
        });
      }, 250);
      return;
    }
    if (!isDeliveryValid) {
      openDeliveryDialog(true);
      return;
    }
    if (!details) return;
    await beginCheckout(details);
  };

  const handleRequestRemove = (productId: string) => {
    setPendingRemoveProductId(productId);
    setRemoveDialogOpen(true);
  };

  const handleConfirmRemove = async () => {
    if (!pendingRemoveProductId) return;
    await removeItem(pendingRemoveProductId);
    setRemoveDialogOpen(false);
    setPendingRemoveProductId(null);
  };

  if (cartItems.length === 0) {
    return (
      <Box sx={{ textAlign: "center", py: 10 }}>
        <Typography variant="h3" sx={{ fontWeight: 900, mb: 2 }}>
          Your cart is empty
        </Typography>
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
      <Typography
        variant="h3"
        sx={{ fontWeight: 900, mb: 4, letterSpacing: "-1px" }}
      >
        Shopping Cart
      </Typography>
      <Paper
        sx={{
          mb: 3,
          p: { xs: 1.5, sm: 2 },
          borderRadius: 3,
          backdropFilter: "blur(12px)",
          border: `1px solid ${alpha(theme.palette.primary.main, 0.2)}`,
          bgcolor: alpha(theme.palette.background.paper, 0.68),
        }}
      >
        <Stepper
          alternativeLabel
          activeStep={1}
          sx={{ "& .MuiStepLabel-label": { fontSize: { xs: "0.72rem", sm: "0.82rem" } } }}
        >
          <Step completed={isDeliveryValid}>
            <StepLabel>Location</StepLabel>
          </Step>
          <Step>
            <StepLabel>Review Cart</StepLabel>
          </Step>
          <Step>
            <StepLabel>Payment</StepLabel>
          </Step>
        </Stepper>
      </Paper>

      <Grid container spacing={4}>
        <Grid size={{ xs: 12, md: 8 }}>
          <Stack spacing={2}>
            {cartItems.map((item) => (
              <Card
                key={item.id}
                sx={{ borderRadius: 4, overflow: "hidden", boxShadow: 2 }}
              >
                <CardContent
                  sx={{ display: "flex", alignItems: "center", gap: 3, p: 3 }}
                >
                  <Box
                    sx={{
                      bgcolor: "#fff",
                      p: 1,
                      borderRadius: 2,
                      border: "1px solid #eee",
                    }}
                  >
                    <CardMedia
                      component="img"
                      image={normalizeImage(
                        item.product?.image || "/images/logo.png",
                      )}
                      sx={{ width: 100, height: 100, objectFit: "contain" }}
                    />
                  </Box>
                  <Box sx={{ flexGrow: 1 }}>
                    <Typography variant="h6" sx={{ fontWeight: 800, mb: 0.5 }}>
                      {item.product?.name || "Product"}
                    </Typography>
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{ mb: 2 }}
                    >
                      In Stock
                    </Typography>
                    <Stack
                      direction="row"
                      spacing={3}
                      sx={{ alignItems: "center" }}
                    >
                      <TextField
                        select
                        size="small"
                        label="Qty"
                        value={item.quantity}
                        onChange={(event) =>
                          updateQuantity(
                            item.productId,
                            Number(event.target.value),
                          )
                        }
                        sx={{
                          width: 80,
                          "& .MuiOutlinedInput-root": { borderRadius: 2 },
                        }}
                      >
                        {[...Array(10).keys()].map((i) => (
                          <MenuItem key={i + 1} value={i + 1}>
                            {i + 1}
                          </MenuItem>
                        ))}
                      </TextField>
                      <Typography
                        variant="h6"
                        color="primary"
                        sx={{ fontWeight: 900 }}
                      >
                        $
                        {(
                          ((item.product?.priceCents || 0) * item.quantity) /
                          100
                        ).toFixed(2)}
                      </Typography>
                    </Stack>
                  </Box>
                  <IconButton
                    color="error"
                    onClick={() => handleRequestRemove(item.productId)}
                    sx={{
                      bgcolor: "error.lighter",
                      "&:hover": { bgcolor: "error.light" },
                    }}
                  >
                    <DeleteIcon />
                  </IconButton>
                </CardContent>
              </Card>
            ))}
          </Stack>
        </Grid>

        <Grid size={{ xs: 12, md: 4 }}>
          <Paper
            sx={{
              p: 4,
              borderRadius: 4,
              boxShadow: 4,
              position: "sticky",
              top: 100,
            }}
          >
            <Typography variant="h5" sx={{ fontWeight: 900, mb: 3 }}>
              Order Summary
            </Typography>
            <Stack spacing={2} sx={{ mb: 3 }}>
              <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                <Typography color="text.secondary" sx={{ fontWeight: 600 }}>
                  Subtotal
                </Typography>
                <Typography sx={{ fontWeight: 700 }}>
                  ${(productTotal / 100).toFixed(2)}
                </Typography>
              </Box>
              <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                <Typography color="text.secondary" sx={{ fontWeight: 600 }}>
                  Estimated Tax (10%)
                </Typography>
                <Typography sx={{ fontWeight: 700 }}>
                  ${(tax / 100).toFixed(2)}
                </Typography>
              </Box>
              <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                <Typography color="text.secondary" sx={{ fontWeight: 600 }}>
                  Shipping
                </Typography>
                <Typography color="success.main" sx={{ fontWeight: 700 }}>
                  FREE
                </Typography>
              </Box>
              <Box
                sx={{
                  p: 1.5,
                  borderRadius: 2,
                  border: `1px solid ${alpha(
                    isDeliveryValid ? theme.palette.success.main : theme.palette.warning.main,
                    0.28,
                  )}`,
                  bgcolor: alpha(
                    isDeliveryValid ? theme.palette.success.main : theme.palette.warning.main,
                    0.08,
                  ),
                }}
              >
                <Stack spacing={0.5}>
                  <Typography sx={{ fontWeight: 800, fontSize: "0.8rem" }}>
                    Delivery Zone
                  </Typography>
                  <Typography sx={{ fontSize: "0.8rem", color: "text.secondary" }}>
                    {isDeliveryValid && details
                      ? `${DELIVERY_ZONES.find((z) => z.id === details.zoneId)?.name ?? "Selected"} • ${details.speed === "express" ? "Express" : "Standard"}`
                      : "Select your delivery location before checkout."}
                  </Typography>
                  <Button
                    variant="text"
                    size="small"
                    onClick={() => openDeliveryDialog(false)}
                    sx={{ alignSelf: "flex-start", px: 0, fontWeight: 700 }}
                  >
                    {isDeliveryValid ? "Edit Delivery Details" : "Set Delivery Details"}
                  </Button>
                </Stack>
              </Box>
              <Divider sx={{ my: 1 }} />
              <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                <Typography variant="h6" sx={{ fontWeight: 900 }}>
                  Total
                </Typography>
                <Typography
                  variant="h6"
                  color="primary"
                  sx={{ fontWeight: 900 }}
                >
                  ${(grandTotal / 100).toFixed(2)}
                </Typography>
              </Box>
            </Stack>
            <Tooltip
              title={
                !isAuthenticated
                  ? "You must be logged in to complete your purchase"
                  : !isDeliveryValid
                    ? "Set delivery location and address before checkout"
                    : ""
              }
              arrow
            >
              <Button
                fullWidth
                variant="contained"
                size="large"
                startIcon={<CheckoutIcon />}
                onClick={handleCheckoutClick}
                sx={{
                  borderRadius: 3,
                  py: 2,
                  fontWeight: 800,
                  fontSize: "1.1rem",
                  textTransform: "none",
                  boxShadow: 4,
                }}
              >
                {!isAuthenticated
                  ? "Login to Order"
                  : isDeliveryValid
                    ? "Checkout Now"
                    : "Continue: Delivery Details"}
              </Button>
            </Tooltip>
          </Paper>
        </Grid>
      </Grid>
      <Snackbar
        open={notification.open}
        autoHideDuration={5000}
        onClose={() => setNotification((prev) => ({ ...prev, open: false }))}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert
          severity={notification.severity}
          variant="filled"
          onClose={() => setNotification((prev) => ({ ...prev, open: false }))}
          sx={{ borderRadius: 2 }}
        >
          {notification.message}
        </Alert>
      </Snackbar>
      <Dialog
        open={deliveryDialogOpen}
        onClose={() => setDeliveryDialogOpen(false)}
        fullWidth
        maxWidth="md"
        slotProps={{
          paper: {
            sx: {
              borderRadius: 4,
              border: `1px solid ${alpha(theme.palette.primary.main, 0.22)}`,
              backdropFilter: "blur(18px)",
              bgcolor: alpha(theme.palette.background.paper, 0.82),
              backgroundImage: "none",
            },
          },
        }}
      >
        <DialogTitle sx={{ pb: 1 }}>
          <Typography sx={{ fontWeight: 900, fontSize: "1.2rem" }}>
            Select Delivery Location
          </Typography>
          <Typography sx={{ color: "text.secondary", fontSize: "0.85rem", mt: 0.5 }}>
            Step 1 of 3 - Location, Step 2 - Review Cart, Step 3 - Payment.
          </Typography>
        </DialogTitle>
        <DialogContent sx={{ pt: 1 }}>
          <Grid container spacing={2}>
            {DELIVERY_ZONES.map((zone) => {
              const selected = selectedZone?.id === zone.id;
              return (
                <Grid key={zone.id} size={{ xs: 12, sm: 6 }}>
                  <Paper
                    onClick={() => {
                      setSelectedZone(zone);
                      if (!zone.isLagos) setSpeed("standard");
                    }}
                    sx={{
                      p: 2,
                      borderRadius: 3,
                      cursor: "pointer",
                      border: `1px solid ${alpha(
                        selected ? theme.palette.primary.main : theme.palette.divider,
                        selected ? 0.6 : 1,
                      )}`,
                      bgcolor: alpha(
                        selected ? theme.palette.primary.main : theme.palette.background.paper,
                        selected ? 0.12 : 0.55,
                      ),
                      transform: selected ? "translateY(-1px)" : "translateY(0)",
                      transition: "all 0.2s ease",
                      "&:hover": { borderColor: "primary.main", transform: "translateY(-2px)" },
                    }}
                  >
                    <Stack direction="row" spacing={1.2} sx={{ alignItems: "center", mb: 1 }}>
                      <Box
                        sx={{
                          width: 34,
                          height: 34,
                          borderRadius: 2,
                          display: "grid",
                          placeItems: "center",
                          color: selected ? "primary.main" : "text.secondary",
                          bgcolor: alpha(theme.palette.primary.main, selected ? 0.15 : 0.08),
                        }}
                      >
                        {zoneIcons[zone.id]}
                      </Box>
                      <Box>
                        <Typography sx={{ fontWeight: 800, fontSize: "0.92rem" }}>
                          {zone.name}
                        </Typography>
                        <Typography sx={{ fontSize: "0.76rem", color: "text.secondary" }}>
                          ETA: {zone.eta}
                        </Typography>
                      </Box>
                    </Stack>
                    <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
                      <Earth size={14} />
                      <Typography sx={{ fontSize: "0.75rem", color: "text.secondary" }}>
                        {zone.isLagos ? "Lagos priority coverage" : "Standard regional coverage"}
                      </Typography>
                    </Stack>
                  </Paper>
                </Grid>
              );
            })}
          </Grid>

          {selectedZone && (
            <Box sx={{ mt: 2.5 }}>
              <Typography sx={{ fontWeight: 800, mb: 1.25, fontSize: "0.9rem" }}>
                Delivery Contact Details
              </Typography>
              <Stack spacing={1.5}>
                <TextField
                  label="Specific Delivery Address"
                  value={address}
                  onChange={(event) => setAddress(event.target.value)}
                  fullWidth
                  multiline
                  minRows={2}
                  error={Boolean(addressError)}
                  helperText={addressError || "Include street, area, and nearby landmark."}
                />
                <TextField
                  label="Phone Number"
                  value={phoneNumber}
                  onChange={(event) => setPhoneNumber(event.target.value)}
                  fullWidth
                  error={Boolean(phoneError)}
                  helperText={phoneError || "We use this for delivery coordination."}
                />
                {selectedZone.isLagos ? (
                  <Box>
                    <Typography sx={{ fontSize: "0.8rem", fontWeight: 700, mb: 1 }}>
                      Delivery Speed
                    </Typography>
                    <Stack direction="row" spacing={1}>
                      <Button
                        variant={speed === "standard" ? "contained" : "outlined"}
                        onClick={() => setSpeed("standard")}
                        sx={{ borderRadius: 2, textTransform: "none", fontWeight: 700 }}
                      >
                        Standard
                      </Button>
                      <Button
                        variant={speed === "express" ? "contained" : "outlined"}
                        onClick={() => setSpeed("express")}
                        startIcon={<Zap size={14} />}
                        sx={{ borderRadius: 2, textTransform: "none", fontWeight: 700 }}
                      >
                        Express
                      </Button>
                    </Stack>
                  </Box>
                ) : (
                  <FormHelperText sx={{ ml: 0 }}>
                    Express delivery is currently available for Lagos zones only.
                  </FormHelperText>
                )}
              </Stack>
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button onClick={() => setDeliveryDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={saveDeliveryDetails}>
            Save & Continue
          </Button>
        </DialogActions>
      </Dialog>
      <Dialog
        open={removeDialogOpen}
        onClose={() => setRemoveDialogOpen(false)}
        slotProps={{ paper: { sx: { borderRadius: 2 } } }}
      >
        <DialogTitle>
          Remove Item
        </DialogTitle>
        <DialogContent>
          Are you sure you want to remove this item from your cart?
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRemoveDialogOpen(false)}>Cancel</Button>
          <Button color="error" onClick={handleConfirmRemove}>
            Confirm
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
