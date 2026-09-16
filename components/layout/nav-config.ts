import {
  CreditCard,
  Images,
  LayoutDashboard,
  History,
  Package,
  Palette,
  Rows3,
  Settings,
  Sparkles,
  TrendingUp,
  Layers,
  Maximize2,
} from "lucide-react";

export const PRIMARY_NAV = [
  { href: "/app", label: "Dashboard", Icon: LayoutDashboard },
  { href: "/product-studio", label: "Product Studio", Icon: Package, feature: "productScenes" },
  { href: "/generate", label: "Generate", Icon: Sparkles },
  { href: "/image-to-image", label: "Image to Image", Icon: Layers, feature: "imageToImage" },
  { href: "/upscale", label: "Upscale", Icon: Maximize2, feature: "upscale" },
  { href: "/batch", label: "Batch", Icon: Rows3, feature: "batchGeneration" },
  { href: "/brand-kits", label: "Brand Kits", Icon: Palette, feature: "brandKits" },
  { href: "/gallery", label: "Gallery", Icon: Images },
  { href: "/history", label: "History", Icon: History },
  { href: "/performance", label: "Performance", Icon: TrendingUp, feature: "performanceTracking" },
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
