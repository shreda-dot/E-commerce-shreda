import { Fab, Zoom } from "@mui/material";
import { KeyboardArrowUp as ArrowUpIcon } from "@mui/icons-material";
import { useEffect, useState } from "react";

export default function ScrollToTopFab() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const onScroll = () => setShow(window.scrollY > 260);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <Zoom in={show}>
      <Fab
        color="primary"
        size="medium"
        aria-label="scroll to top"
        onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
        sx={{
          position: "fixed",
          right: { xs: 16, sm: 24 },
          bottom: { xs: 20, sm: 28 },
          zIndex: (t) => t.zIndex.drawer + 4,
          boxShadow: "0 10px 24px rgba(2,132,199,0.35)",
        }}
      >
        <ArrowUpIcon />
      </Fab>
    </Zoom>
  );
}

