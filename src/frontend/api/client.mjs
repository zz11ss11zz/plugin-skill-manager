// The frontend's only gateway to the backend: MCP tool calls through the MCP Apps bridge. Responses
// are checked against the generated contracts (src/frontend/generated/contracts.mjs).
import { TOOLS, OUTPUT_MODES } from '../generated/contracts.mjs';

export class ContractError extends Error {}

/** @param {{ callServerTool: (request: {name: string, arguments: object}) => Promise<any> }} bridge */
export function createApiClient(bridge) {
  const call = async (name, args = {}) => {
    if (!Object.hasOwn(TOOLS, name)) throw new ContractError(`Unknown tool ${name}`);
    return bridge.callServerTool({ name, arguments: args });
  };
  const expectMode = (result, contract) => {
    if (result?.isError) return result;
    const mode = result?.structuredContent?.mode;
    if (mode !== OUTPUT_MODES[contract]) throw new ContractError(`Expected ${OUTPUT_MODES[contract]} but received ${mode}`);
    return result;
  };
  return {
    /** Raw tool call (results are passed to views unchanged). */
    call,
    openManager: () => call(TOOLS.open_skill_manager),
    checkPlugins: () => call(TOOLS.check_plugin_status),
    async activityViews(requests) {
      const result = expectMode(await call(TOOLS.query_activity_views, { requests }), 'activityViews');
      if (result.isError) throw new Error(result.content?.find(c => c.type === 'text')?.text || 'Activity views unavailable');
      return result.structuredContent.views;
    },
  };
}
