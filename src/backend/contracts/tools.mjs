// Tool contracts: the single definition of every MCP tool's input shape and output envelope.
// `pnpm run contracts` generates contracts/schema/v<CONTRACT_VERSION>/*.json from this file; the
// frontend reads those JSON files, never this module.
import { z } from 'zod';

/** Bump when a contract changes incompatibly; CI fails if generated files are stale. */
export const CONTRACT_VERSION = 1;

const sha256 = z.string().regex(/^[a-f0-9]{64}$/);
const offsetDateTime = z.string().datetime({ offset: true });

/** Capture interval bounds come from configuration (config/default.toml → [capture]). */
export const captureInput = ({ intervalMinSeconds = 5, intervalMaxSeconds = 3600, intervalSeconds = 10 } = {}) => z.object({
  enabled: z.boolean(),
  intervalSeconds: z.number().int().min(intervalMinSeconds).max(intervalMaxSeconds).default(intervalSeconds),
}).strict();

/** Redundancy windows come from configuration (config/default.toml → [redundancy].allowed_days). */
export const daysInput = (allowed = [30, 60, 90]) => z.union(allowed.map(d => z.literal(d)));

export const inputs = {
  open_skill_manager: () => z.object({}).strict(),
  check_recording_status: () => z.object({}).strict(),
  configure_auto_capture: config => captureInput(config?.capture),
  check_plugin_status: config => z.object({
    includeReport: z.boolean().optional().describe('Deprecated: use generate_redundancy_report.'),
    days: daysInput(config?.redundancy.allowedDays).optional(),
  }).strict(),
  generate_redundancy_report: config => z.object({ days: daysInput(config?.redundancy.allowedDays).optional() }).strict(),
  import_usage: () => z.object({}).strict(),
  query_usage: () => z.object({ from: offsetDateTime.optional(), to: offsetDateTime.optional(), timeZone: z.string().max(80).optional() }).strict(),
  record_plugin_calls: () => z.object({
    calls: z.array(z.object({ id: z.string().regex(/^[A-Za-z0-9_-]{16,160}$/), plugin: z.string().regex(/^[a-z0-9][a-z0-9_-]{0,79}$/), tool: z.string().max(240) }).strict()).min(1).max(32),
  }).strict(),
  record_skill_use: () => z.object({ id: z.string().regex(/^[A-Za-z0-9_-]{16,80}$/), skills: z.array(z.string().min(1).max(1024)).min(1).max(32) }).strict(),
  save_skill_note: () => z.object({ id: sha256, fingerprint: sha256, note: z.string().max(1000), retain: z.boolean(), expectedRevision: z.number().int().nonnegative() }).strict(),
  preview_skill_archive: () => z.object({ skillId: sha256 }).strict(),
  preview_skill_restore: () => z.object({ archiveId: z.string().uuid() }).strict(),
  execute_skill_plan: () => z.object({ token: z.string().uuid() }).strict(),
  cancel_skill_plan: () => z.object({ token: z.string().uuid() }).strict(),
  query_activity_views: () => z.object({
    requests: z.array(z.object({
      kind: z.enum(['plugins', 'skills']), metric: z.enum(['calls', 'adoptions', 'reads', 'explicit']),
      year: z.number().int().min(2000).max(2100), source: z.enum(['host-event', 'assistant-report']).optional(),
      from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(), to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    }).strict()).min(1).max(8),
  }).strict(),
};

// Output envelopes: the discriminating fields every client may rely on. Inner documents stay open
// (passthrough) so additive changes are compatible within a contract version.
const inventory = z.object({
  mode: z.literal('inventory'), scannedAt: z.string(), skills: z.array(z.object({ id: z.string(), name: z.string(), path: z.string(), fingerprint: z.string(), source: z.string() }).passthrough()),
  issues: z.array(z.object({ path: z.string(), reason: z.string() }).passthrough()), inventoryScope: z.literal('management').optional(),
}).passthrough();
const plan = z.object({ mode: z.literal('management-plan'), plan: z.object({ token: z.string(), title: z.string(), impact: z.string() }).passthrough() }).passthrough();

export const outputs = {
  inventory,
  recordingStatus: z.object({ mode: z.literal('recording-status'), health: z.object({ summary: z.object({ error: z.number(), warning: z.number(), unknown: z.number() }).passthrough() }).passthrough() }).passthrough(),
  captureConfiguration: z.object({ mode: z.literal('capture-configuration') }).passthrough(),
  plan,
  cancelled: z.object({ mode: z.literal('management-cancelled') }).strict(),
  activityViews: z.object({ mode: z.literal('activity-views'), views: z.array(z.object({ request: z.object({}).passthrough(), yearView: z.object({}).passthrough(), dayStatus: z.record(z.string(), z.string()) }).passthrough()) }).strict(),
};
