// MCP inbound adapter: builds an McpServer from the container, registers the dashboard resource and
// mounts the route table. Transport (stdio) is attached by the caller (main.mjs, tests, previews).
import packageInfo from '../../../../package.json' with { type: 'json' };
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { createContainer, createServices } from '../../container.mjs';
import { outputs } from '../../contracts/tools.mjs';
import { registerDashboard } from './resources/dashboard.mjs';
import { dashboardFile } from './resources/dashboard.mjs';
import { bundledDashboard } from '../../runtime/bundled-dashboard.mjs';
import { appIcon, sidebarIcon } from './resources/app-icon.mjs';
import { routes } from './routes.mjs';
import { mountRoutes } from './router.mjs';
import { createControllers } from './controllers/index.mjs';

/**
 * @param {object} [roots]     Skill roots override (tests, previews); defaults come from the host adapter
 * @param {object} [overrides] adapter overrides (see createContainer) plus `container` / `config`
 */
export function createServer(roots, overrides = {}) {
  const { container: given, config, ...adapters } = overrides;
  const container = given ?? createContainer({ roots, config, overrides: adapters });
  const services = createServices(container, { managerIcon: appIcon.src });
  const server = new McpServer({ name: 'plugin-skill-manager', version: packageInfo.version, icons: [sidebarIcon] });
  const dashboardUri = registerDashboard(server, dashboardFile, bundledDashboard, container.host.ui.resourceDomains);
  mountRoutes(server, { routes, controllers: createControllers(services), capabilities: container.capabilities, hostUi: container.host.ui,
    dashboardUri, config: container.config, captureEnabled: Boolean(container.capture), outputs });
  return server;
}
