import { createContext, useContext, useMemo, useState } from "react";

export type DeliverySpeed = "standard" | "express";

export type DeliveryZoneId =
  | "lagos-mainland"
  | "lagos-island"
  | "rest-of-nigeria"
  | "international";

export type DeliveryZone = {
  id: DeliveryZoneId;
  name: string;
  eta: string;
  isLagos: boolean;
};

export const DELIVERY_ZONES: DeliveryZone[] = [
  { id: "lagos-mainland", name: "Lagos Mainland", eta: "1-2 Days", isLagos: true },
  { id: "lagos-island", name: "Lagos Island", eta: "1-2 Days", isLagos: true },
  { id: "rest-of-nigeria", name: "Rest of Nigeria", eta: "3-5 Days", isLagos: false },
  { id: "international", name: "International", eta: "5-10 Days", isLagos: false },
];

export type DeliveryDetails = {
  zoneId: DeliveryZoneId;
  address: string;
  phoneNumber: string;
  speed: DeliverySpeed;
};

type DeliveryContextValue = {
  details: DeliveryDetails | null;
  selectedZone: DeliveryZone | null;
  isValid: boolean;
  setDetails: (next: DeliveryDetails) => void;
  clearDetails: () => void;
};

const STORAGE_KEY = "shreda_delivery_details_v1";

const DeliveryContext = createContext<DeliveryContextValue | null>(null);

const isPhoneValid = (value: string): boolean => {
  const normalized = value.replace(/[^\d+]/g, "");
  return /^(\+234|0)\d{10}$/.test(normalized);
};

const isAddressValid = (value: string): boolean => value.trim().length >= 10;

const isDetailsValid = (value: DeliveryDetails | null): boolean => {
  if (!value) return false;
  const zone = DELIVERY_ZONES.find((item) => item.id === value.zoneId);
  if (!zone) return false;
  if (!isAddressValid(value.address)) return false;
  if (!isPhoneValid(value.phoneNumber)) return false;
  if (!zone.isLagos && value.speed !== "standard") return false;
  return true;
};

const readStoredDetails = (): DeliveryDetails | null => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as DeliveryDetails;
    return isDetailsValid(parsed) ? parsed : null;
  } catch {
    return null;
  }
};

export function DeliveryProvider({ children }: { children: React.ReactNode }) {
  const [details, setDetailsState] = useState<DeliveryDetails | null>(readStoredDetails);

  const value = useMemo<DeliveryContextValue>(() => {
    const selectedZone = details
      ? DELIVERY_ZONES.find((item) => item.id === details.zoneId) ?? null
      : null;

    return {
      details,
      selectedZone,
      isValid: isDetailsValid(details),
      setDetails: (next) => {
        setDetailsState(next);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      },
      clearDetails: () => {
        setDetailsState(null);
        localStorage.removeItem(STORAGE_KEY);
      },
    };
  }, [details]);

  return <DeliveryContext.Provider value={value}>{children}</DeliveryContext.Provider>;
}

export function useDelivery() {
  const ctx = useContext(DeliveryContext);
  if (!ctx) {
    throw new Error("useDelivery must be used within DeliveryProvider");
  }
  return ctx;
}

export const deliveryValidation = {
  isAddressValid,
  isPhoneValid,
};
