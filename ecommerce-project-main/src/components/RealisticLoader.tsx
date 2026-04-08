import { Box, CircularProgress, Typography } from "@mui/material";
import { keyframes } from "@mui/material/styles";
import type { SyntheticEvent } from "react";

const pulse = keyframes`
  0% { transform: scale(0.95); opacity: 0.5; }
  50% { transform: scale(1); opacity: 1; }
  100% { transform: scale(0.95); opacity: 0.5; }
`;

export default function RealisticLoader({
  message = "Loading Shreda...",
}: {
  message?: string;
}) {
  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "400px",
        width: "100%",
        gap: 4,
      }}
    >
      <Box
        sx={{
          position: "relative",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <CircularProgress
          size={70}
          thickness={4}
          sx={{ color: "primary.main" }}
        />
        <Box
          component="img"
          src="/images/logo.png"
          sx={{
            width: 35,
            height: 35,
            position: "absolute",
            animation: `${pulse} 2s infinite ease-in-out`,
          }}
          onError={(e: SyntheticEvent<HTMLImageElement, Event>) => {
            e.currentTarget.src =
              "https://raw.githubusercontent.com/vitejs/vite/main/packages/vite/src/node/server/public/vite.svg";
          }}
        />
      </Box>
      <Typography
        variant="h6"
        sx={{
          fontWeight: 800,
          color: "text.secondary",
          textAlign: "center",
          animation: `${pulse} 2s infinite ease-in-out`,
        }}
      >
        {message}
      </Typography>
    </Box>
  );
}
