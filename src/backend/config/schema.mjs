// Validation schema for the merged configuration (keys are camelCase after loading).
import { z } from 'zod';

const int = (min = 0) => z.number().int().min(min);
const localized = z.object({ zh: z.string().min(1), en: z.string().min(1) }).strict();
const bytes = int(1);

export const configSchema = z.object({
  app: z.object({
    host: z.string().min(1),
    locale: z.enum(['auto', 'en', 'zh']),
  }).strict(),
  paths: z.object({ dataDir: z.string() }).strict(),
  features: z.object({ archive: z.boolean(), toolEvents: z.boolean(), dashboard: z.boolean() }).strict(),
  host: z.object({
    id: z.string().min(1),
    homeEnv: z.string(),
    homeDefault: z.string().min(1),
    dataSubdir: z.string().min(1),
    archiveSubdir: z.string().min(1),
  }).strict(),
  hostCli: z.object({
    command: z.string(),
    timeoutMs: int(100),
    maxOutputBytes: bytes,
    probeTimeoutMs: int(100),
  }).strict(),
  capture: z.object({
    enabled: z.boolean(),
    intervalSeconds: int(1),
    intervalMinSeconds: int(1),
    intervalMaxSeconds: int(1),
  }).strict().refine(c => c.intervalMinSeconds <= c.intervalSeconds && c.intervalSeconds <= c.intervalMaxSeconds,
    { message: 'capture.interval_seconds must lie within [interval_min_seconds, interval_max_seconds]' }),
  storage: z.object({
    limits: z.object({ ledger: bytes, captureIndex: bytes, presence: bytes, skillFile: bytes, archive: bytes }).strict(),
  }).strict(),
  dashboard: z.object({ pluginStatusCacheSeconds: int(0) }).strict(),
  components: z.object({
    maxDepth: int(1), maxVisited: int(1), maxComponents: int(1), maxTotalBytes: bytes, maxFileBytes: bytes,
    ignoredDirs: z.array(z.string()),
  }).strict(),
  redundancy: z.object({
    defaultDays: int(1),
    allowedDays: z.array(int(1)).min(1),
    maxDirectoriesScanned: int(0), maxGroups: int(1), maxMembersPerGroup: int(1), maxDifferences: int(1),
    maxRelations: int(1), maxDependencyHints: int(0), maxPluginGroups: int(1),
    overlap: z.object({
      minSharedTerms: int(1), minJaccard: z.number().min(0).max(1), maxCompared: int(2),
      maxDescriptionChars: int(1), maxTerms: int(1), maxSharedTermsShown: int(1), maxPairsShown: int(1),
      tasks: z.array(z.object({ id: z.string().min(1), pattern: z.string().min(1), label: localized.optional() }).strict()),
    }).strict(),
    guidance: z.object({
      purposes: z.array(z.object({ name: z.string().min(1), zh: z.string().min(1), en: z.string().min(1) }).strict()),
      rules: z.array(z.object({ id: z.string().min(1), names: z.array(z.string().min(1)).min(1), task: z.string().optional(), overridesSuite: z.boolean().default(false), zh: z.string().min(1), en: z.string().min(1) }).strict()),
    }).strict(),
    protected: z.object({
      namePrefixes: z.array(z.string()), marketplaces: z.array(z.string()),
      curatedMarketplace: z.string(), curatedPlugins: z.array(z.string()),
    }).strict(),
  }).strict().refine(r => r.allowedDays.includes(r.defaultDays), { message: 'redundancy.default_days must be one of allowed_days' }),
}).strict();

/** @typedef {z.infer<typeof configSchema>} Config */
