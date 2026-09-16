import {
  CreditCard,
  Images,
  LayoutDashboard,
  History,
  Settings,
  Sparkles,
  Layers,
  Maximize2,
} from "lucide-react";

export const PRIMARY_NAV = [
  { href: "/app", label: "Dashboard", Icon: LayoutDashboard },
  { href: "/generate", label: "Generate", Icon: Sparkles },
  { href: "/image-to-image", label: "Image to Image", Icon: Layers, proOnly: true },
  { href: "/upscale", label: "Upscale", Icon: Maximize2, proOnly: true },
  { href: "/gallery", label: "Gallery", Icon: Images },
  { href: "/history", label: "History", Icon: History },
] as const;

export const SECONDARY_NAV = [
  { href: "/billing", label: "Billing", Icon: CreditCard },
  { href: "/settings", label: "Settings", Icon: Settings },
] as const;

/** Condensed set for the mobile bottom bar — five items is the practical max. */
export const MOBILE_NAV = [
  { href: "/app", label: "Home", Icon: LayoutDashboard },
  { href: "/generate", label: "Generate", Icon: Sparkles },
  { href: "/gallery", label: "Gallery", Icon: Images },
  { href: "/history", label: "History", Icon: History },
  { href: "/settings", label: "Settings", Icon: Settings },
] as const;
