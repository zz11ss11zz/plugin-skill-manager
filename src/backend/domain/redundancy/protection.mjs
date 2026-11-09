// Which entries are official/bundled and therefore never redundancy candidates. The lists are
// host configuration (config/hosts/<host>.toml → [redundancy.protected]).

/** @param {{namePrefixes: string[], marketplaces: string[], curatedMarketplace: string, curatedPlugins: string[]}} settings */
export function createProtection(settings) {
  const prefixes = settings.namePrefixes.map(p => p.toLowerCase());
  const marketplaces = new Set(settings.marketplaces), curated = new Set(settings.curatedPlugins);
  const name = value => prefixes.some(prefix => String(value || '').toLowerCase().startsWith(prefix));
  const plugin = (id, marketplace = '') => {
    const [pluginName, market = marketplace] = String(id || '').split('@');
    return name(pluginName) || marketplaces.has(market) || (Boolean(settings.curatedMarketplace) && market === settings.curatedMarketplace && curated.has(pluginName));
  };
  return Object.freeze({ name, plugin });
}
