export type GenerationType =
  | "TEXT_TO_IMAGE"
  | "IMAGE_TO_IMAGE"
  | "PRODUCT_SCENE"
  | "UPSCALE";

export type GenerationStatus =
  | "QUEUED"
  | "PROCESSING"
  | "COMPLETED"
  | "FAILED"
  | "CANCELLED";

export type UpscaleFactor = 2 | 4;

export type CreditTransactionType =
  | "PURCHASE"
  | "SUBSCRIPTION"
  | "GENERATION"
  | "UPSCALE"
  | "REFUND"
  | "ADMIN_ADJUSTMENT";

export type SubscriptionStatus =
  | "active"
  | "trialing"
  | "past_due"
  | "canceled"
  | "incomplete"
  | "incomplete_expired"
  | "unpaid"
  | "paused";

export interface GenerationOutput {
  id: string;
  generation_id: string;
  storage_path: string;
  width: number;
  height: number;
  seed: number | null;
  is_favorite: boolean;
  created_at: string;
  /** Populated at read time from a signed URL; never persisted. */
  url?: string;
}

export interface Generation {
  id: string;
  user_id: string;
  type: GenerationType;
  status: GenerationStatus;
  prompt: string;
  negative_prompt: string | null;
  style_id: string | null;
  provider: string;
  model: string;
  width: number | null;
  height: number | null;
  seed: number | null;
  steps: number | null;
  guidance: number | null;
  strength: number | null;
  upscale_factor: number | null;
  image_count: number;
  credit_cost: number;
  source_image_path: string | null;
  parent_generation_id: string | null;
  error_message: string | null;
  created_at: string;
  completed_at: string | null;
  outputs?: GenerationOutput[];
}

export interface CreditBalance {
  user_id: string;
  balance: number;
  lifetime_granted: number;
  lifetime_spent: number;
  updated_at: string;
}

export interface CreditTransaction {
  id: string;
  user_id: string;
  type: CreditTransactionType;
  amount: number;
  balance_after: number;
  generation_id: string | null;
  description: string | null;
  created_at: string;
}

export interface Profile {
  id: string;
  email: string;
  display_name: string | null;
  plan: "FREE" | "PRO";
  created_at: string;
}

export interface Subscription {
  id: string;
  user_id: string;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  plan: "FREE" | "PRO";
  status: SubscriptionStatus | null;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
  updated_at: string;
}

/** Shape returned by every API route on failure. */
export interface ApiError {
  error: string;
  code?: string;
}
