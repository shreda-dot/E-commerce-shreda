import axios from "axios";

const ONE_DAY_MS = 24 * 60 * 60 * 1000;
const FALLBACK_RATE = 1600; // sensible fallback for NG market display

let cachedRate = null;

const isFresh = (entry) =>
  entry && Date.now() - entry.fetchedAt < ONE_DAY_MS;

async function fetchPublicRate() {
  // No API key required endpoint
  const response = await axios.get("https://open.er-api.com/v6/latest/USD", {
    timeout: 8000,
    validateStatus: () => true,
  });

  if (response.status < 200 || response.status >= 300) {
    throw new Error(`Rate source HTTP ${response.status}`);
  }

  const ngn = Number(response.data?.rates?.NGN);
  if (!Number.isFinite(ngn) || ngn <= 0) {
    throw new Error("Invalid NGN rate payload");
  }

  // Parallel-market bias uplift to better reflect local pricing reality.
  const adjustedParallelRate = Math.round(ngn * 1.1);
  return {
    rate: adjustedParallelRate,
    source: "open.er-api+parallel-adjust",
    fetchedAt: Date.now(),
  };
}

export async function getUsdToNgnRate() {
  if (isFresh(cachedRate)) return cachedRate;

  try {
    const live = await fetchPublicRate();
    cachedRate = live;
    return live;
  } catch {
    if (cachedRate) return cachedRate;
    cachedRate = {
      rate: FALLBACK_RATE,
      source: "fallback",
      fetchedAt: Date.now(),
    };
    return cachedRate;
  }
}

