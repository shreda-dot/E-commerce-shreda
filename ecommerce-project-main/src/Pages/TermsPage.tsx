import { Box, Container, Paper, Stack, Typography } from "@mui/material";

export default function TermsPage() {
  return (
    <Container maxWidth="md" sx={{ py: { xs: 4, md: 6 } }}>
      <Paper elevation={0} sx={{ p: { xs: 2.5, sm: 3.5 }, borderRadius: 3, border: "1px solid", borderColor: "divider" }}>
        <Stack spacing={2}>
          <Typography variant="h4" sx={{ fontWeight: 900 }}>
            Terms & Conditions
          </Typography>
          <Typography color="text.secondary">Last updated: April 2026</Typography>

          <Box>
            <Typography variant="h6" sx={{ fontWeight: 800, mb: 0.75 }}>1. Acceptance of Terms</Typography>
            <Typography variant="body2" color="text.secondary">
              By using Shreda Store, you agree to these terms and all applicable Nigerian laws and regulations.
            </Typography>
          </Box>

          <Box>
            <Typography variant="h6" sx={{ fontWeight: 800, mb: 0.75 }}>2. Orders and Payments</Typography>
            <Typography variant="body2" color="text.secondary">
              Orders are confirmed only after successful payment verification. Shreda reserves the right to decline or cancel orders for suspected fraud, stock errors, or payment failures.
            </Typography>
          </Box>

          <Box>
            <Typography variant="h6" sx={{ fontWeight: 800, mb: 0.75 }}>3. Pricing and Availability</Typography>
            <Typography variant="body2" color="text.secondary">
              Product prices, exchange rates, and stock levels may change without prior notice. Final pricing is displayed at checkout at the time of payment.
            </Typography>
          </Box>

          <Box>
            <Typography variant="h6" sx={{ fontWeight: 800, mb: 0.75 }}>4. Delivery and Returns</Typography>
            <Typography variant="body2" color="text.secondary">
              Delivery timelines are estimates and may vary by location within Nigeria. Returns or replacements are processed according to product condition, proof of purchase, and applicable consumer-protection obligations.
            </Typography>
          </Box>

          <Box>
            <Typography variant="h6" sx={{ fontWeight: 800, mb: 0.75 }}>5. User Responsibilities</Typography>
            <Typography variant="body2" color="text.secondary">
              You are responsible for accurate account information, secure password usage, and lawful platform use. Misuse, chargeback abuse, or malicious activity may lead to account suspension.
            </Typography>
          </Box>

          <Box>
            <Typography variant="h6" sx={{ fontWeight: 800, mb: 0.75 }}>6. Liability</Typography>
            <Typography variant="body2" color="text.secondary">
              To the extent permitted by law, Shreda is not liable for indirect, incidental, or consequential losses arising from platform downtime, shipping delays, or third-party service interruptions.
            </Typography>
          </Box>
        </Stack>
      </Paper>
    </Container>
  );
}

