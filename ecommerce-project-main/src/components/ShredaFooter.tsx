import { Box, Container, Divider, Grid, IconButton, Link as MuiLink, Stack, Typography, useTheme } from "@mui/material";
import { WhatsApp as WhatsAppIcon, Instagram as InstagramIcon, X as XIcon } from "@mui/icons-material";
import { Link as RouterLink } from "react-router-dom";

export default function ShredaFooter() {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const linkSx = {
    textDecoration: "none",
    color: "text.secondary",
    fontSize: { xs: "0.88rem", md: "0.9rem" },
    py: { xs: 0.35, sm: 0.15 },
    minHeight: { xs: 28, sm: "auto" },
    display: "inline-flex",
    alignItems: "center",
    transition: "color 0.2s ease, transform 0.2s ease",
    "&:hover": { color: "primary.main", transform: "translateX(2px)" },
  };

  return (
    <Box
      component="footer"
      sx={{
        mt: "auto",
        py: { xs: 4, sm: 5.5 },
        borderTop: "1px solid",
        borderColor: "divider",
        bgcolor: isDark ? "rgba(255,255,255,0.02)" : "rgba(255,255,255,0.72)",
        backdropFilter: "blur(12px)",
      }}
    >
      <Container maxWidth="lg">
        <Box
          sx={{
            border: "1px solid",
            borderColor: isDark ? "rgba(255,255,255,0.1)" : "rgba(15,23,42,0.08)",
            borderRadius: { xs: 2, sm: 2.5 },
            p: { xs: 2, sm: 3 },
            bgcolor: isDark ? "rgba(255,255,255,0.02)" : "rgba(255,255,255,0.62)",
            boxShadow: isDark ? "0 8px 26px rgba(0,0,0,0.3)" : "0 8px 24px rgba(15,23,42,0.05)",
          }}
        >
          <Grid container spacing={{ xs: 2, sm: 3 }}>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
              <Stack spacing={1.1} sx={{ textAlign: { xs: "center", sm: "left" }, alignItems: { xs: "center", sm: "flex-start" } }}>
                <Box component="img" src="/images/logo.png" alt="Shreda logo" sx={{ width: 52, height: 52, objectFit: "contain" }} />
                <Typography sx={{ fontWeight: 900, letterSpacing: "0.04em", color: "primary.main", fontSize: { xs: "1rem", md: "1.1rem" } }}>
                  SHREDA STORE
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 340, lineHeight: 1.65 }}>
                  Trusted e-commerce experience built for Nigerian shoppers with secure checkout and premium product discovery.
                </Typography>
              </Stack>
            </Grid>

            <Grid size={{ xs: 12, sm: 6, md: 2.6 }}>
              <Stack spacing={0.9} sx={{ textAlign: { xs: "center", sm: "left" }, alignItems: { xs: "center", sm: "flex-start" } }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>Quick Links</Typography>
                {[
                  { label: "Shop", to: "/" },
                  { label: "Account", to: "/account" },
                  { label: "Orders", to: "/account" },
                  { label: "Cart", to: "/cart" },
                ].map((item) => (
                  <MuiLink key={item.label} component={RouterLink} to={item.to} underline="none" sx={linkSx}>
                    {item.label}
                  </MuiLink>
                ))}
              </Stack>
            </Grid>

            <Grid size={{ xs: 12, sm: 6, md: 2.9 }}>
              <Stack spacing={0.9} sx={{ textAlign: { xs: "center", sm: "left" }, alignItems: { xs: "center", sm: "flex-start" } }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>Contact</Typography>
                <Typography variant="body2" color="text.secondary">Email: support@shreda.store</Typography>
                <Typography variant="body2" color="text.secondary">Phone: +234 701 187 2350</Typography>
                <Typography variant="body2" color="text.secondary">Location: Lagos, Nigeria</Typography>
              </Stack>
            </Grid>

            <Grid size={{ xs: 12, sm: 6, md: 2.5 }}>
              <Stack spacing={0.9} sx={{ textAlign: { xs: "center", sm: "left" }, alignItems: { xs: "center", sm: "flex-start" } }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>Social & Legal</Typography>
                <Stack direction="row" spacing={0.5} sx={{ justifyContent: { xs: "center", sm: "flex-start" } }}>
                  <IconButton component="a" href="https://wa.me/2347011872350" target="_blank" rel="noopener noreferrer" aria-label="WhatsApp" size="small" color="primary">
                    <WhatsAppIcon fontSize="small" />
                  </IconButton>
                  <IconButton component="a" href="https://www.instagram.com/shreda_shadrach/" target="_blank" rel="noopener noreferrer" aria-label="Instagram" size="small" color="primary">
                    <InstagramIcon fontSize="small" />
                  </IconButton>
                  <IconButton component="a" href="https://x.com/sha_dra_ch" target="_blank" rel="noopener noreferrer" aria-label="X" size="small" color="primary">
                    <XIcon fontSize="small" />
                  </IconButton>
                </Stack>
                <MuiLink component={RouterLink} to="/terms" underline="none" sx={linkSx}>
                  Terms & Conditions
                </MuiLink>
                <MuiLink component={RouterLink} to="/privacy" underline="none" sx={linkSx}>
                  Privacy Policy
                </MuiLink>
              </Stack>
            </Grid>
          </Grid>

          <Divider sx={{ my: { xs: 2.25, sm: 2.5 } }} />
          <Stack direction={{ xs: "column", sm: "row" }} spacing={1} sx={{ justifyContent: "space-between", alignItems: { xs: "center", sm: "center" }, textAlign: { xs: "center", sm: "left" } }}>
            <Typography variant="caption" color="text.secondary">
              © 2026 Shreda Store. All rights reserved.
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Built for trusted shopping in Nigeria.
            </Typography>
          </Stack>
        </Box>
      </Container>
    </Box>
  );
}

