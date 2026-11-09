// Port: the AI host (Codex today; Claude and others later). Application services only talk to a host
// through this shape. A new host = one adapter directory in src/backend/adapters/hosts/<id>/ plus
// config/hosts/<id>.toml; nothing in domain/, application/, inbound/ or frontend/ changes.

/**
 * @typedef {object} SkillRoots
 * @property {string} skills       personal Skill directory
 * @property {string} [agentSkills] secondary personal Skill directory
 * @property {string} cache        plugin cache directory
 */

/**
 * @typedef {object} PluginStatus
 * @property {string} checkedAt
 * @property {string} evidence
 * @property {Array<{id: string, version: string, enabled: boolean|null, displayName?: string, icon?: string, iconDark?: string}>} plugins
 */

/**
 * @typedef {object} HostUi
 * @property {(resourceUri: string) => object} toolMeta   _meta for the dashboard-opening tool
 * @property {(resourceUri: string) => object} appOnlyMeta _meta for tools only the dashboard may call
 * @property {string[]} resourceDomains                   image origins the dashboard may load
 */

/**
 * @typedef {object} Host
 * @property {string} id
 * @property {Set<string>} capabilities
 * @property {SkillRoots} roots
 * @property {string} dataDir
 * @property {string} archiveRoot
 * @property {() => Promise<object>} scanSkills                     inventory of local Skill files
 * @property {(parents: object[], limits?: object) => Promise<{components: object[], issues: object[]}>} discoverComponents
 * @property {() => Promise<PluginStatus>} installedPlugins          installed-plugin evidence
 * @property {(inventory: object, status: PluginStatus) => object} applyPluginStatus
 * @property {{ plugin: (id: string, marketplace?: string) => boolean, name: (value: string) => boolean }} isProtected
 * @property {HostUi} ui
 * @property {object} usageIndex                                     historical usage signals (repository)
 * @property {(calls: object) => object|null} createToolEventCapture  null when the host has no event log
 */

export {};
