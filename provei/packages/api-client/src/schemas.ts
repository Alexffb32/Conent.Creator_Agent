import { z } from 'zod';

const trimmed = (min: number, max: number) => z.string().trim().min(min).max(max);

export const handleSchema = z
  .string()
  .trim()
  .toLowerCase()
  .regex(/^[a-z0-9_]{3,24}$/, 'Usa 3 a 24 letras minúsculas, números ou _');

export const citySchema = z.enum(['Covilhã', 'Fundão', 'Outra']);

export const onboardingSchema = z.object({
  displayName: trimmed(2, 80),
  handle: handleSchema,
  city: citySchema,
  terms: z.literal(true, { errorMap: () => ({ message: 'Tens de aceitar os termos' }) }),
  privacy: z.literal(true, { errorMap: () => ({ message: 'Tens de aceitar a política de privacidade' }) }),
  location: z.boolean().default(false),
  push: z.boolean().default(false),
  adsPersonalization: z.boolean().default(false),
});
export type OnboardingInput = z.infer<typeof onboardingSchema>;

export const profileUpdateSchema = z.object({
  displayName: trimmed(2, 80),
  handle: handleSchema,
  bio: z.string().trim().max(280).default(''),
  city: z.string().trim().max(60).default(''),
});

export const consentKindSchema = z.enum(['terms', 'privacy', 'location', 'push', 'ads_personalization']);
export const consentUpdateSchema = z.object({ kind: consentKindSchema, granted: z.boolean() });

export const slugSchema = z.string().trim().toLowerCase().regex(/^[a-z0-9-]{2,60}$/, 'Slug inválido');
export const uuidSchema = z.string().uuid();

export const restaurantCreateSchema = z.object({
  name: trimmed(2, 100),
  slug: slugSchema,
  city: z.string().trim().min(2).max(60),
  address: z.string().trim().max(200).default(''),
  lat: z.coerce.number().min(-90).max(90).optional(),
  lng: z.coerce.number().min(-180).max(180).optional(),
  phone: z.string().trim().max(30).default(''),
});

export const restaurantUpdateSchema = z.object({
  name: trimmed(2, 100),
  description: z.string().trim().max(1000).default(''),
  address: z.string().trim().max(200).default(''),
  city: z.string().trim().min(2).max(60),
  phone: z.string().trim().max(30).default(''),
  website: z.string().trim().url().or(z.literal('')).default(''),
  cuisine: z.array(z.string().trim().min(1).max(30)).max(6).default([]),
  priceLevel: z.coerce.number().int().min(1).max(4).optional(),
  lat: z.coerce.number().min(-90).max(90).optional(),
  lng: z.coerce.number().min(-180).max(180).optional(),
});

export const hoursSchema = z.record(
  z.enum(['seg', 'ter', 'qua', 'qui', 'sex', 'sab', 'dom']),
  z.object({ open: z.string().regex(/^\d{2}:\d{2}$/), close: z.string().regex(/^\d{2}:\d{2}$/) }).nullable(),
);

export const MAX_VIDEO_BYTES = 100 * 1024 * 1024;
export const MAX_PHOTO_BYTES = 10 * 1024 * 1024;
export const MAX_VIDEO_MS = 30_000;
export const ALLOWED_VIDEO_MIME = ['video/mp4', 'video/quicktime'] as const;
export const ALLOWED_PHOTO_MIME = ['image/jpeg', 'image/png', 'image/webp'] as const;

export const uploadRequestSchema = z.object({
  restaurantId: uuidSchema,
  kind: z.enum(['video', 'photo']),
  mime: z.string(),
  sizeBytes: z.number().int().positive(),
  durationMs: z.number().int().min(0).optional(),
}).superRefine((v, ctx) => {
  const okMime = v.kind === 'video' ? (ALLOWED_VIDEO_MIME as readonly string[]) : (ALLOWED_PHOTO_MIME as readonly string[]);
  if (!okMime.includes(v.mime)) ctx.addIssue({ code: 'custom', message: 'Formato de ficheiro não suportado', path: ['mime'] });
  const max = v.kind === 'video' ? MAX_VIDEO_BYTES : MAX_PHOTO_BYTES;
  if (v.sizeBytes > max) ctx.addIssue({ code: 'custom', message: `Ficheiro demasiado grande (máx. ${Math.round(max / 1024 / 1024)} MB)`, path: ['sizeBytes'] });
  if (v.kind === 'video' && (v.durationMs ?? 0) > MAX_VIDEO_MS) ctx.addIssue({ code: 'custom', message: 'O vídeo pode ter no máximo 30 segundos', path: ['durationMs'] });
});

export const postCreateSchema = z.object({
  restaurantId: uuidSchema,
  mediaId: uuidSchema,
  dishName: trimmed(2, 100),
  priceEuros: z.coerce.number().min(0).max(1000).optional(),
  caption: z.string().trim().max(500).default(''),
  tags: z.array(z.string().trim().toLowerCase().min(1).max(30)).max(8).default([]),
});

export const tableCreateSchema = z.object({ restaurantId: uuidSchema, label: trimmed(1, 30) });

export const callCreateSchema = z.object({ reason: z.enum(['call', 'bill', 'help']).default('call') });
export const callStatusSchema = z.object({ callId: uuidSchema, status: z.enum(['acknowledged', 'resolved', 'rejected']) });

export const reviewCreateSchema = z.object({
  restaurantId: uuidSchema,
  rating: z.coerce.number().int().min(1).max(5),
  text: z.string().trim().max(1000).default(''),
  photoMediaId: uuidSchema.optional(),
});
export const reviewReplySchema = z.object({ reviewId: uuidSchema, body: trimmed(2, 500) });
export const feedbackSchema = z.object({ restaurantId: uuidSchema, message: trimmed(2, 1000) });
export const reportSchema = z.object({
  targetType: z.enum(['review', 'post', 'restaurant', 'user']),
  targetId: uuidSchema,
  reason: trimmed(3, 500),
});

export const loyaltyProgramSchema = z.object({
  restaurantId: uuidSchema,
  stampsRequired: z.coerce.number().int().min(2).max(50),
  rewardText: trimmed(2, 120),
  pointsPerVisit: z.coerce.number().int().min(0).max(1000),
  pointsPerReviewPhoto: z.coerce.number().int().min(0).max(1000),
  pointsFirstVisit: z.coerce.number().int().min(0).max(1000),
  minIntervalHours: z.coerce.number().int().min(0).max(168),
  active: z.boolean().default(true),
});

export const menuCategorySchema = z.object({ restaurantId: uuidSchema, name: trimmed(1, 60) });
export const menuItemSchema = z.object({
  restaurantId: uuidSchema,
  categoryId: uuidSchema.optional(),
  name: trimmed(1, 100),
  description: z.string().trim().max(300).default(''),
  priceEuros: z.coerce.number().min(0).max(1000),
});
export const offerSchema = z.object({
  restaurantId: uuidSchema,
  title: trimmed(2, 80),
  description: z.string().trim().max(300).default(''),
  endsAt: z.coerce.date(),
});

export const inviteSchema = z.object({ restaurantId: uuidSchema, email: z.string().trim().toLowerCase().email() });

export const redeemSchema = z.object({ code: z.string().trim().min(6).max(12) });
export const staffVisitSchema = z.object({
  restaurantId: uuidSchema,
  userCode: z.string().trim().min(6).max(64),
  reason: z.string().trim().max(200).default(''),
  backdateMinutes: z.coerce.number().int().min(0).max(24 * 60).default(0),
});

export const watchProgressSchema = z.object({
  postId: uuidSchema,
  seconds: z.array(z.number().int().min(0).max(29)).max(10),
});

export const pushSubscriptionSchema = z.object({
  endpoint: z.string().url(),
  keys: z.object({ p256dh: z.string().min(10), auth: z.string().min(4) }),
});

export const adCampaignSchema = z.object({
  advertiserName: trimmed(2, 100),
  headline: trimmed(2, 80),
  body: z.string().trim().max(200).default(''),
  url: z.string().url().optional(),
  cities: z.array(z.string()).default([]),
  hours: z.array(z.number().int().min(0).max(23)).default([]),
  interests: z.array(z.string()).default([]),
  budgetEuros: z.coerce.number().min(1).max(100000),
  startsAt: z.coerce.date(),
  endsAt: z.coerce.date(),
});
