// Router: registers the route table on an MCP server and runs each call through a small middleware
// pipeline. It knows nothing about individual tools beyond what routes.mjs declares.

/** Unexpected failures never leak paths or stack traces to the caller. */
const unexpectedError = () => ({ isError: true, content: [{ type: 'text', text: '操作未完成，请重试；如持续失败，请运行环境诊断。' }] });

function withErrorBoundary(name, handler, log) {
  return async args => {
    try { return await handler(args); }
    catch (error) { log(`[${name}] ${error?.stack || error}`); return unexpectedError(); }
  };
}

/** Output contract check: violations are reported on stderr (stdout carries the protocol). */
function withOutputCheck(name, handler, outputs, log) {
  return async args => {
    const result = await handler(args);
    const data = result?.structuredContent;
    if (data && !result.isError) {
      const matched = Object.values(outputs).some(schema => schema.safeParse(data).success);
      if (!matched) log(`[${name}] structuredContent does not match any output contract`);
    }
    return result;
  };
}

/**
 * @param {import('@modelcontextprotocol/sdk/server/mcp.js').McpServer} server
 * @param {object} options
 * @param {import('./routes.mjs').Route[]} options.routes
 * @param {Record<string, Record<string, Function>>} options.controllers
 * @param {Set<string>} options.capabilities
 * @param {import('../../ports/host.mjs').HostUi} options.hostUi
 * @param {string} options.dashboardUri
 * @param {object} options.config
 * @param {boolean} options.captureEnabled
 * @param {Record<string, import('zod').ZodTypeAny>} [options.outputs]
 * @param {(line: string) => void} [options.log]
 * @returns {string[]} registered tool names
 */
export function mountRoutes(server, { routes, controllers, capabilities, hostUi, dashboardUri, config, captureEnabled, outputs = {}, log = line => process.stderr.write(line + '\n') }) {
  const registered = [];
  for (const route of routes) {
    if (route.requires?.some(capability => !capabilities.has(capability))) continue;
    const [controllerName, method] = route.handler.split('.');
    const handler = controllers[controllerName]?.[method];
    if (typeof handler !== 'function') throw new Error(`Route ${route.name} points to missing handler ${route.handler}`);
    const annotations = typeof route.annotations === 'function' ? route.annotations({ captureEnabled }) : route.annotations;
    const _meta = route.ui === 'dashboard' ? hostUi.toolMeta(dashboardUri) : route.ui === 'app-only' ? hostUi.appOnlyMeta(dashboardUri) : undefined;
    const definition = { title: route.title, description: route.description, inputSchema: route.input(config).shape, annotations, ...(_meta ? { _meta } : {}) };
    server.registerTool(route.name, definition, withErrorBoundary(route.name, withOutputCheck(route.name, args => handler(args), outputs, log), log));
    registered.push(route.name);
  }
  return registered;
}
