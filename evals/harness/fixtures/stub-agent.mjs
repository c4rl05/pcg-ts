/**
 * A stand-in agent adapter with the real adapter's interface, for exercising
 * run.mjs and selftest.mjs without spending allowance. It writes a
 * stream-json transcript shaped like the one Claude Code 2.1.272 emitted in
 * this harness' smoke run, then runs the REAL transcript parser and limit
 * classifier over it, so everything downstream of the session is the code
 * a real campaign uses.
 *
 * Driven by the JSON file named in STUB_AGENT_SCRIPT:
 *   { "outcomes": ["ok", "limit", "contaminated", ...],   // consumed one per task session
 *     "probeOutcomes": ["ok"],                              // consumed by limit probes
 *     "auditOutcomes": ["ok"],                              // consumed by isolation probes ("ok" | "limit")
 *     "graph": "<graph to write as graph.json on ok>",
 *     "stateFile": "<where the call counters persist across processes>",
 *     "version": "9.9.9" }
 *
 * Outcomes: ok | fail (writes a graph that fails checks, from "badGraph") |
 * none (writes nothing) | limit (prose limit message with a reset clause) |
 * limit-noreset | api-error | contaminated (reads ~/.claude) | leak
 * (init lists an MCP server) | apikey (init reports an API key source) |
 * cap-turns.
 * The isolation probe is answered from the files: with isolation it replies
 * NONE; without, it quotes the headings of <cwd>/CLAUDE.md, the way a real
 * leaking session does.
 */
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { billingEnvViolations as realBilling, jailOf, parseTranscript } from "../agents/claude-code.mjs";
import { classifySession } from "../limits.mjs";
import { sha256File } from "../sandbox.mjs";

export const id = "stub-agent";

function script() {
  const p = process.env.STUB_AGENT_SCRIPT;
  if (!p || !existsSync(p)) throw new Error("stub-agent: set STUB_AGENT_SCRIPT to a script JSON file");
  return JSON.parse(readFileSync(p, "utf8"));
}

function nextOutcome(kind) {
  const s = script();
  const state = existsSync(s.stateFile) ? JSON.parse(readFileSync(s.stateFile, "utf8")) : { task: 0, probe: 0, calls: [] };
  const list = kind === "probe" ? s.probeOutcomes ?? ["ok"] : kind === "audit" ? s.auditOutcomes ?? ["ok"] : s.outcomes ?? ["ok"];
  const i = state[kind] ?? 0;
  const outcome = list[Math.min(i, list.length - 1)];
  state[kind] = i + 1;
  state.calls.push({ kind, outcome });
  mkdirSync(dirname(s.stateFile), { recursive: true });
  writeFileSync(s.stateFile, JSON.stringify(state));
  return { outcome, s };
}

export function cliVersion() {
  try {
    return script().version ?? "0.0.0-stub";
  } catch {
    return "0.0.0-stub";
  }
}

export function adapterHash() {
  return sha256File(fileURLToPath(import.meta.url));
}

export function billingEnvViolations(env = process.env) {
  return realBilling(env);
}

export async function launch({ cwd, prompt, transcriptPath, isolation = true, tools, onSpawn }) {
  onSpawn?.(process.pid);
  const isProbe = /configuration audit/i.test(prompt);
  const isLimitProbe = /single word OK/.test(prompt);
  const { outcome, s } = isProbe ? nextOutcome("audit") : nextOutcome(isLimitProbe ? "probe" : "task");
  const init = { type: "system", subtype: "init", cwd, tools: tools ?? ["Bash", "Edit", "Glob", "Grep", "Read", "Write"], mcp_servers: [], plugins: [], skills: [], slash_commands: [], agents: ["claude", "Explore", "general-purpose", "Plan"], output_style: "default", apiKeySource: "none", model: "claude-sonnet-5", claude_code_version: cliVersion() };
  const events = [init];
  const msg = (n, content, usage = { input_tokens: 10, output_tokens: 50 }) => ({ type: "assistant", message: { id: `msg_${n}`, model: "claude-sonnet-5", content, usage } });
  const toolResult = (toolId, content, isError = false) => ({ type: "user", message: { content: [{ type: "tool_result", tool_use_id: toolId, content, is_error: isError }] } });
  const result = (extra) => ({ type: "result", subtype: "success", is_error: false, num_turns: 3, usage: { input_tokens: 30, output_tokens: 150 }, permission_denials: [], result: "done", ...extra });
  let capsHit = [];
  let exitCode = 0;

  if (isProbe && outcome === "limit") {
    events.push({ type: "result", subtype: "success", is_error: true, result: "Claude usage limit reached.", num_turns: 0 });
    exitCode = 1;
  } else if (isProbe) {
    let reply = "1. NONE\n2. NONE\n3. NONE\n4. NONE\n5. NONE\n6. NONE\n7. NONE";
    if (!isolation && existsSync(join(cwd, "CLAUDE.md"))) {
      const headings = readFileSync(join(cwd, "CLAUDE.md"), "utf8").split(/\r?\n/).filter((l) => /^#{1,6}\s/.test(l));
      reply = `1. Instruction files:\n${headings.join("\n")}`;
    }
    events.push(msg(1, [{ type: "text", text: reply }]), result({ num_turns: 1, result: reply }));
  } else {
    switch (outcome) {
      case "ok":
      case "fail":
      case "contaminated":
      case "cap-turns": {
        events.push(msg(1, [{ type: "tool_use", id: "t1", name: "Read", input: { file_path: join(cwd, "brief.md") } }]));
        events.push(toolResult("t1", "brief"));
        events.push(msg(2, [{ type: "tool_use", id: "t2", name: "Bash", input: { command: "npx pcg validate graph.json" } }]));
        events.push(toolResult("t2", "invalid", true));
        events.push(msg(3, [{ type: "tool_use", id: "t3", name: "Read", input: { file_path: join(cwd, "node_modules", "pcg-ts", "llms.txt") } }]));
        if (outcome === "contaminated") events.push(msg(4, [{ type: "tool_use", id: "t4", name: "Bash", input: { command: `cat ${join(homedir(), ".claude", "CLAUDE.md")}` } }]));
        const src = outcome === "fail" ? s.badGraph : s.graph;
        if (src) {
          copyFileSync(src, join(cwd, "graph.json"));
          writeFileSync(join(cwd, "probe-1.json"), "{}");
        }
        events.push(outcome === "cap-turns" ? result({ subtype: "error_max_turns", is_error: true, result: "" }) : result({}));
        if (outcome === "cap-turns") exitCode = 1;
        break;
      }
      case "none":
        events.push(msg(1, [{ type: "text", text: "I could not do it." }]), result({ result: "I could not do it." }));
        break;
      case "limit":
        events.push(result({ is_error: true, result: "You've hit your session limit · resets 3pm (Europe/Madrid)", num_turns: 0 }));
        exitCode = 1;
        break;
      case "limit-noreset":
        events.push(result({ is_error: true, result: "Claude usage limit reached.", num_turns: 0 }));
        exitCode = 1;
        break;
      case "api-error":
        events.push(result({ is_error: true, result: "API Error: 529 overloaded_error", num_turns: 0 }));
        exitCode = 1;
        break;
      case "crash":
        // the CLI died before the agent's first turn: no assistant message, no result
        exitCode = 1;
        break;
      case "leak":
        init.mcp_servers = [{ name: "SomeServer", status: "connected" }];
        events.push(result({}));
        break;
      case "apikey":
        init.apiKeySource = "ANTHROPIC_API_KEY";
        events.push(result({}));
        break;
      default:
        throw new Error(`stub-agent: unknown outcome "${outcome}"`);
    }
  }
  mkdirSync(dirname(transcriptPath), { recursive: true });
  writeFileSync(transcriptPath, events.map((e) => JSON.stringify(e)).join("\n") + "\n");
  const parsed = parseTranscript(events, { cwd, benignRoots: jailOf(cwd) });
  const classification = classifySession({ exitCode, events, capsHit, nowMs: Date.now() });
  if (classification.kind === "cap-turns") capsHit = ["turns"];
  return {
    exitCode,
    wallMs: 5,
    transcriptPath,
    usage: parsed.usage,
    turns: parsed.turns,
    toolCalls: parsed.toolCalls,
    toolCallsByName: parsed.toolCallsByName,
    limitHit: { hit: classification.kind === "usage-limit", resetAt: classification.resetAt ?? undefined },
    classification,
    capsHit,
    readPaths: parsed.readPaths,
    writes: parsed.writes,
    networkAttempts: parsed.networkAttempts,
    pcgCommands: parsed.pcgCommands,
    pcgFailures: parsed.pcgFailures,
    permissionDenials: parsed.permissionDenials,
    rateLimitEvents: parsed.rateLimitEvents,
    finalText: parsed.finalText,
    init: parsed.init,
    launch: { command: "stub", args: [], removedEnv: [], isolation },
  };
}
