// JSON-file implementation of the repository ports (src/backend/ports/repositories.mjs).
import path from 'node:path';
import { Adoptions } from './adoptions.mjs';
import { PluginCalls } from './plugin-calls.mjs';
import { SkillNotes } from './skill-notes.mjs';
import { Presence } from './presence.mjs';
import { CaptureSettings } from './capture-settings.mjs';

export function createJsonRepositories({ dataDir, config, env = process.env }) {
  const file = name => path.join(dataDir, name);
  return {
    adoptions: new Adoptions(file('adoptions.json')),
    pluginCalls: new PluginCalls(file('plugin-calls.json')),
    notes: new SkillNotes(file('skill-notes.json')),
    presence: new Presence(file('presence.json')),
    captureSettings: new CaptureSettings(file('auto-capture-settings.json'), env, { enabled: config.capture.enabled, intervalSeconds: config.capture.intervalSeconds }),
  };
}
