import { openaiIcon } from './openai-icon.mjs';
import { serviceIcons } from './service-icons.mjs';

export function activityIcon(entry, registry = [], managerIcon) {
  const name = entry.id.split('@')[0].replaceAll('-', '_');
  if (name === 'plugin_skill_manager' && managerIcon) return { icon: managerIcon };
  if (['cua_repl', 'codex_app', 'node_repl', 'search_service'].includes(name)) return { icon: openaiIcon, openai: true };
  const normalize = value => value?.toLowerCase().replace(/[-\s]+/g, '_');
  const exact = registry.filter(p => p.id === entry.id || normalize(p.id.split('@')[0]) === name);
  const matches = exact.length ? exact : registry.filter(p => normalize(p.displayName) === name);
  const record = matches.length === 1 ? matches[0] : null;
  if (record?.icon) return { icon: record.icon, iconDark: record.iconDark, openai: record.icon === openaiIcon };
  // Historical tool-only services may have no installed plugin record.
  // This display fallback must not change the ledger ID or installed inventory.
  return serviceIcons[name] || {};
}

export function safeActivityIcon(value) {
  return typeof value === 'string' && (/^data:image\/(png|jpeg|webp|svg\+xml|x-icon);base64,[A-Za-z0-9+/=]+$/.test(value) || /^https:\/\/files\.openai\.com\//.test(value));
}
