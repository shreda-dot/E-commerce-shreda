import { Box, Container, Paper, Stack, Typography } from "@mui/material";

export default function PrivacyPage() {
  return (
    <Container maxWidth="md" sx={{ py: { xs: 4, md: 6 } }}>
      <Paper elevation={0} sx={{ p: { xs: 2.5, sm: 3.5 }, borderRadius: 3, border: "1px solid", borderColor: "divider" }}>
        <Stack spacing={2}>
          <Typography variant="h4" sx={{ fontWeight: 900 }}>
            Privacy Policy
          </Typography>
          <Typography color="text.secondary">Last updated: April 2026</Typography>

          <Box>
            <Typography variant="h6" sx={{ fontWeight: 800, mb: 0.75 }}>1. Information We Collect</Typography>
            <Typography variant="body2" color="text.secondary">
              We collect account and transaction information including your name, email address, order details, and shipping preferences to process purchases and provide support.
            </Typography>
          </Box>

          <Box>
            <Typography variant="h6" sx={{ fontWeight: 800, mb: 0.75 }}>2. How We Use Data</Typography>
            <Typography variant="body2" color="text.secondary">
              Your data is used for order fulfillment, payment verification, account security, fraud prevention, and service improvements. We do not sell personal data.
            </Typography>
          </Box>

          <Box>
            <Typography variant="h6" sx={{ fontWeight: 800, mb: 0.75 }}>3. Payment and Security</Typography>
            <Typography variant="body2" color="text.secondary">
              Payments are processed through approved third-party providers. Shreda stores only essential transaction references and applies reasonable security controls to protect account data.
            </Typography>
          </Box>

          <Box>
            <Typography variant="h6" sx={{ fontWeight: 800, mb: 0.75 }}>4. Data Sharing</Typography>
            <Typography variant="body2" color="text.secondary">
              We may share limited data with logistics, payment, and compliance partners solely for service delivery and legal obligations under Nigerian law.
            </Typography>
          </Box>

          <Box>
            <Typography variant="h6" sx={{ fontWeight: 800, mb: 0.75 }}>5. Cookies and Analytics</Typography>
            <Typography variant="body2" color="text.secondary">
              We may use cookies or similar technologies for session handling, cart continuity, and performance analytics.
            </Typography>
          </Box>

          <Box>
            <Typography variant="h6" sx={{ fontWeight: 800, mb: 0.75 }}>6. Your Rights</Typography>
            <Typography variant="body2" color="text.secondary">
              You may request updates or corrections to your profile information. For privacy-related requests, contact us through our official support channels.
            </Typography>
          </Box>
        </Stack>
      </Paper>
    </Container>
  );
}

