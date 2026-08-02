import { z } from 'zod';
import { DomainNormalizationError, normalizeDomain } from '@/lib/domain/normalize';
import { LifecycleStage, WebsiteStatus } from '@prisma/client';

const optionalString = z
  .string()
  .trim()
  .transform((value) => (value.length === 0 ? undefined : value))
  .optional();

const tagsField = z
  .union([z.string(), z.array(z.string())])
  .optional()
  .transform((value) => {
    if (value == null) return [] as string[];
    const raw = Array.isArray(value) ? value : value.split(/[,;\n]/);
    const tags = raw.map((tag) => tag.trim()).filter(Boolean);
    return [...new Set(tags)];
  });

export const websiteStatusSchema = z.nativeEnum(WebsiteStatus);
export const lifecycleStageSchema = z.nativeEnum(LifecycleStage);

export const websiteCreateSchema = z.object({
    domain: z.string().trim().min(1, 'Домен обязателен').max(253),
  name: optionalString,
  primaryUrl: optionalString,
  status: websiteStatusSchema.default(WebsiteStatus.DRAFT),
  lifecycleStage: lifecycleStageSchema.default(LifecycleStage.IDEA),
  group: optionalString,
  tags: tagsField,
  launchedAt: z
    .string()
    .optional()
    .transform((value, ctx) => {
      if (!value || value.trim() === '') return undefined;
      const date = new Date(value);
      if (Number.isNaN(date.getTime())) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Invalid launchedAt date' });
        return z.NEVER;
      }
      return date;
    }),
});

export const websiteUpdateSchema = websiteCreateSchema.partial().extend({
  domain: z.string().trim().min(1).max(253).optional(),
});

export type WebsiteCreateInput = z.infer<typeof websiteCreateSchema>;
export type WebsiteUpdateInput = z.infer<typeof websiteUpdateSchema>;

export function parseDomainInput(domain: string): { domain: string; normalizedDomain: string } {
  try {
    const normalizedDomain = normalizeDomain(domain);
    const trimmed = domain.trim();
    // Keep a clean display domain (hostname-ish), not full URL clutter when possible.
    const display = (() => {
      try {
        const withScheme = /^[a-z][a-z0-9+.-]*:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
        return new URL(withScheme).hostname.replace(/\.$/, '') || trimmed;
      } catch {
        return trimmed;
      }
    })();
    return { domain: display, normalizedDomain };
  } catch (error) {
    if (error instanceof DomainNormalizationError) {
      throw error;
    }
    throw new DomainNormalizationError(`Cannot parse domain: ${domain}`);
  }
}
