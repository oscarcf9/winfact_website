import { z } from "zod";

export const createPickSchema = z.object({
  sport: z.string().min(1).max(50),
  league: z.string().max(100).optional().nullable(),
  matchup: z.string().min(3).max(200),
  pickText: z.string().min(2).max(500),
  gameDate: z.string().max(20).optional(),
  odds: z.number().int().min(-10000).max(10000).optional().nullable(),
  units: z.number().min(0.1).max(20).optional().nullable(),
  modelEdge: z.number().min(-50).max(50).optional().nullable(),
  confidence: z.enum(["standard", "strong", "top"]).optional().nullable(),
  analysisEn: z.string().max(5000).optional().nullable(),
  analysisEs: z.string().max(5000).optional().nullable(),
  tier: z.enum(["free", "vip"]).optional(),
  status: z.enum(["draft", "published", "settled"]).optional(),
  result: z.enum(["win", "loss", "push", "void"]).optional().nullable(),
  closingOdds: z.number().int().min(-10000).max(10000).optional().nullable(),
  distribute: z.boolean().optional(),
});

export const updatePickSchema = createPickSchema.partial();

export const createPostSchema = z.object({
  titleEn: z.string().min(3).max(300),
  titleEs: z.string().max(300).optional().nullable(),
  slug: z.string().min(3).max(200).regex(/^[a-z0-9-]+$/),
  bodyEn: z.string().min(10).max(100000),
  bodyEs: z.string().max(100000).optional().nullable(),
  category: z.enum(["free_pick", "game_preview", "strategy", "model_breakdown", "news"]),
  featuredImage: z.string().max(500).optional().nullable(),
  seoTitle: z.string().max(200).optional().nullable(),
  seoDescription: z.string().max(500).optional().nullable(),
  status: z.enum(["draft", "published", "scheduled"]).optional(),
  publishedAt: z.string().max(30).optional().nullable(),
  author: z.string().max(100).optional().nullable(),
  tags: z.array(z.string().max(50)).optional(),
});

export const updatePostSchema = createPostSchema.partial();

export const siteContentSchema = z.object({
  key: z.string().min(1).max(100).regex(/^[a-zA-Z0-9_.-]+$/),
  value: z.string().max(50000),
});

export const checkoutSchema = z.object({
  plan: z.string().min(1).max(50),
  promoCode: z.string().min(2).max(30).regex(/^[A-Z0-9_-]+$/i).optional(),
});

export const emailSchema = z.object({
  subject: z.string().min(1).max(200),
  message: z.string().min(1).max(10000),
});
