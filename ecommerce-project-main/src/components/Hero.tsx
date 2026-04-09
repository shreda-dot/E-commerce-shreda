import {
  Box,
  Typography,
  Button,
  Stack,
  IconButton,
  useTheme,
} from "@mui/material";
import {
  ArrowForwardIos as NextIcon,
  ArrowBackIosNew as PrevIcon,
} from "@mui/icons-material";
import { useEffect, useState } from "react";

const heroSlides = [
  {
    title: "Streetwear Essentials",
    subtitle: "Clean fits. Premium feel.",
    image: "/images/hero1.png",
  },
  {
    title: "Tech Deals",
    subtitle: "Upgrade your lifestyle",
    image: "/images/hero2.png",
  },
  {
    title: "Footwear Drop",
    subtitle: "Comfort meets style",
    image: "/images/hero3.png",
  },
];

export default function HeroSection() {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";

  const [index, setIndex] = useState(0);

  // 🔥 Auto slide
  useEffect(() => {
    const interval = setInterval(() => {
      setIndex((prev) => (prev + 1) % heroSlides.length);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleNext = () => {
    setIndex((prev) => (prev + 1) % heroSlides.length);
  };

  const handlePrev = () => {
    setIndex((prev) => (prev - 1 + heroSlides.length) % heroSlides.length);
  };

  const active = heroSlides[index];

  return (
    <Box
      sx={{
        position: "relative",
        mb: 8,
      }}
    >
      {/* ─── HERO CARD ─── */}
      <Box
        sx={{
          borderRadius: "24px",
          overflow: "hidden",
          border: isDark
            ? "1px solid rgba(255,255,255,0.08)"
            : "1px solid rgba(0,0,0,0.05)",
          bgcolor: isDark ? "#020617" : "#fff",
        }}
      >
        {/* IMAGE */}
        <Box
          sx={{
            height: { xs: 260, md: 420 },
            display: "grid",
            placeItems: "center",
            bgcolor: isDark ? "#020617" : "#f8fafc",
          }}
        >
          <Box
            component="img"
            src={active.image}
            alt={active.title}
            sx={{
              maxHeight: "100%",
              maxWidth: "100%",
              objectFit: "contain",
              transition: "0.4s ease",
            }}
          />
        </Box>

        {/* TEXT BELOW IMAGE (YOUR REQUIREMENT ✅) */}
        <Box
          sx={{
            p: { xs: 3, md: 4 },
            textAlign: "center",
          }}
        >
          <Typography
            variant="h4"
            sx={{
              fontWeight: 900,
              letterSpacing: "-0.03em",
              color: isDark ? "#f1f5f9" : "#0f172a",
            }}
          >
            {active.title}
          </Typography>

          <Typography
            variant="body1"
            sx={{
              mt: 1,
              mb: 3,
              color: isDark ? "#94a3b8" : "#64748b",
            }}
          >
            {active.subtitle}
          </Typography>

          <Button
            variant="contained"
            sx={{
              borderRadius: "10px",
              px: 4,
              py: 1.2,
              fontWeight: 700,
              textTransform: "none",
              background:
                "linear-gradient(135deg, #1d4ed8, #3b82f6)",
              "&:hover": {
                background:
                  "linear-gradient(135deg, #1e40af, #2563eb)",
              },
            }}
          >
            Shop Now
          </Button>
        </Box>
      </Box>

      {/* ─── NAV BUTTONS ─── */}
      <IconButton
        onClick={handlePrev}
        sx={{
          position: "absolute",
          top: "40%",
          left: -16,
          bgcolor: "rgba(0,0,0,0.4)",
          color: "#fff",
          "&:hover": { bgcolor: "rgba(0,0,0,0.6)" },
        }}
      >
        <PrevIcon fontSize="small" />
      </IconButton>

      <IconButton
        onClick={handleNext}
        sx={{
          position: "absolute",
          top: "40%",
          right: -16,
          bgcolor: "rgba(0,0,0,0.4)",
          color: "#fff",
          "&:hover": { bgcolor: "rgba(0,0,0,0.6)" },
        }}
      >
        <NextIcon fontSize="small" />
      </IconButton>

      {/* ─── DOT INDICATORS ─── */}
      <Stack
        direction="row"
        spacing={1}
        sx={{
          justifyContent: "center",
          mt: 2,
        }}
      >
        {heroSlides.map((_, i) => (
          <Box
            key={i}
            onClick={() => setIndex(i)}
            sx={{
              width: index === i ? 22 : 8,
              height: 8,
              borderRadius: "10px",
              cursor: "pointer",
              transition: "0.3s",
              bgcolor:
                index === i ? "#3b82f6" : "rgba(100,116,139,0.4)",
            }}
          />
        ))}
      </Stack>
    </Box>
  );
}