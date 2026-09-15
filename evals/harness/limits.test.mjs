// node --test --test-concurrency=1 "evals/harness/*.test.mjs"
import assert from "node:assert/strict";
import { test } from "node:test";
import { backoffMs, classifySession, parseResetClause, sleepPlan, zonedToUtc } from "./limits.mjs";

const MIN = 60_000;
const errResult = (text, extra = {}) => ({ type: "result", subtype: "success", is_error: true, result: text, num_turns: 0, ...extra });
const okResult = (text = "done") => ({ type: "result", subtype: "success", is_error: false, result: text, num_turns: 4 });

test("a normal session is ok, even when the agent's own reply talks about limits", () => {
  const c = classifySession({ exitCode: 0, events: [okResult("I hit the usage limit reached message in pcg's budget docs · resets 3pm")] });
  assert.equal(c.kind, "ok");
});

test("ASSUMED pipe-epoch format carries its reset time", () => {
  const c = classifySession({ exitCode: 1, events: [errResult("Claude AI usage limit reached|1789492800")] });
  assert.equal(c.kind, "usage-limit");
  assert.equal(c.resetAt, new Date(1789492800 * 1000).toISOString());
});

test("ASSUMED prose formats are limits, with reset parsed in the named zone", () => {
  const now = Date.UTC(2026, 8, 15, 10, 0); // 12:00 in Madrid (UTC+2)
  const c = classifySession({ exitCode: 1, events: [errResult("You've hit your session limit · resets 3pm (Europe/Madrid)")], nowMs: now });
  assert.equal(c.kind, "usage-limit");
  assert.equal(c.resetAt, new Date(Date.UTC(2026, 8, 15, 13, 0)).toISOString());

  for (const text of [
    "5-hour limit reached ∙ resets 2pm",
    "Weekly limit reached · resets Sep 18, 9am",
    "Claude usage limit reached. Your limit will reset at 3pm (America/New_York).",
    "You've reached your Sonnet limit · resets 11:30pm",
    "You're out of extra usage · resets 4am",
  ]) {
    const k = classifySession({ exitCode: 1, events: [errResult(text)], nowMs: now });
    assert.equal(k.kind, "usage-limit", text);
    assert.ok(k.resetAt, `reset parsed from: ${text}`);
  }
});

test("a limit without a reset time still classifies, and falls back to backoff with a probe", () => {
  const c = classifySession({ exitCode: 1, events: [errResult("Claude usage limit reached.")] });
  assert.equal(c.kind, "usage-limit");
  assert.equal(c.resetAt, null);
  const plan = sleepPlan(c, 0);
  assert.equal(plan.sleepMs, 15 * MIN);
  assert.equal(plan.probe, true);
});

test("OBSERVED rate_limit_event shape: allowed is not a hit, rejected is (ASSUMED)", () => {
  const allowed = { type: "rate_limit_event", rate_limit_info: { status: "allowed", resetsAt: 1789492800, rateLimitType: "five_hour" } };
  assert.equal(classifySession({ exitCode: 0, events: [allowed, okResult()] }).kind, "ok");
  const rejected = { type: "rate_limit_event", rate_limit_info: { status: "rejected", resetsAt: 1789492800, rateLimitType: "five_hour" } };
  const c = classifySession({ exitCode: 1, events: [rejected, errResult("")] });
  assert.equal(c.kind, "usage-limit");
  assert.equal(c.resetAt, new Date(1789492800 * 1000).toISOString());
});

test("caps are the agent's own failure classes, not limits", () => {
  assert.equal(classifySession({ exitCode: 1, events: [{ type: "result", subtype: "error_max_turns", is_error: true, num_turns: 80 }] }).kind, "cap-turns");
  assert.equal(classifySession({ exitCode: null, events: [], capsHit: ["wall"] }).kind, "cap-wall");
  assert.equal(classifySession({ exitCode: null, events: [], capsHit: ["tokens"] }).kind, "cap-tokens");
});

test("auth and transient API errors are told apart from limits", () => {
  assert.equal(classifySession({ exitCode: 1, events: [errResult("Invalid API key · Please run /login")] }).kind, "auth");
  assert.equal(classifySession({ exitCode: 1, events: [errResult("OAuth token has expired")] }).kind, "auth");
  assert.equal(classifySession({ exitCode: 1, events: [errResult("API Error: 529 {\"type\":\"overloaded_error\"}")] }).kind, "api-error");
  assert.equal(classifySession({ exitCode: 1, stderr: "Error: fetch failed ECONNRESET", events: [] }).kind, "api-error");
  assert.equal(classifySession({ exitCode: 1, stderr: "Error: unknown option --frobnicate", events: [] }).kind, "cli-error", "no agent turn: the CLI failed, not the agent");
  const worked = { type: "assistant", message: { id: "m1", model: "claude-sonnet-5", content: [{ type: "text", text: "working" }] } };
  assert.equal(classifySession({ exitCode: 1, stderr: "TypeError: x is undefined\n    at run (cli.js:500:12)", events: [worked] }).kind, "other", "a stack frame's :500: is not an HTTP 500");
});

test("review repros: context limit is not a usage limit; a synthetic limit before a normal result is; a limit outranks a wall cap", () => {
  const worked = { type: "assistant", message: { id: "m1", model: "claude-sonnet-5", content: [{ type: "text", text: "working" }] } };
  assert.notEqual(classifySession({ exitCode: 1, events: [worked, errResult("Prompt is too long: reached the context limit")] }).kind, "usage-limit");
  const synthetic = { type: "assistant", message: { model: "<synthetic>", content: [{ type: "text", text: "You've hit your session limit · resets 3pm" }] } };
  assert.equal(classifySession({ exitCode: 0, events: [synthetic, okResult("")] }).kind, "usage-limit");
  const stuck = { type: "assistant", message: { model: "<synthetic>", content: [{ type: "text", text: "API Error: 429 rate_limit_error: usage limit reached" }] } };
  assert.equal(classifySession({ exitCode: null, events: [worked, stuck], capsHit: ["wall"] }).kind, "usage-limit");
});

test("review 2 repros: node:http stack frame, recently passed dated reset, auth on the infra clock", () => {
  const worked = { type: "assistant", message: { id: "m1", model: "claude-sonnet-5", content: [{ type: "text", text: "working" }] } };
  assert.equal(classifySession({ exitCode: 1, stderr: "Error\n    at node:http:502:3", events: [worked] }).kind, "other");
  assert.equal(classifySession({ exitCode: 1, stderr: "API Error: 503 Service Unavailable", events: [worked] }).kind, "api-error");
  const now = Date.UTC(2026, 8, 15, 22, 0);
  assert.equal(parseResetClause("resets Sep 14, 9am (UTC)", now), Date.UTC(2026, 8, 14, 9, 0), "a date just passed stays in the past, not next year");
  assert.equal(parseResetClause("resets Jan 2, 9am (UTC)", now), Date.UTC(2027, 0, 2, 9, 0));
  const c = classifySession({ exitCode: 1, events: [errResult("Weekly limit reached · resets Sep 14, 9am (UTC)")], nowMs: now });
  assert.equal(c.kind, "usage-limit");
  assert.equal(c.resetAt, null);
  assert.equal(sleepPlan({ kind: "auth", resetAt: null }, 0).sleepMs, MIN, "auth backs off on the short infrastructure schedule");
});

test("a reset time in the past is no reset time: back off and probe", () => {
  const now = Date.UTC(2026, 8, 15, 10, 0);
  const c = classifySession({ exitCode: 1, events: [errResult("Claude AI usage limit reached|1700000000")], nowMs: now });
  assert.equal(c.kind, "usage-limit");
  assert.equal(c.resetAt, null);
  assert.equal(sleepPlan({ kind: "usage-limit", resetAt: new Date(now - 60_000).toISOString() }, 0, { nowMs: now }).probe, true);
});

test("synthetic assistant API-error messages count as CLI text", () => {
  const synthetic = { type: "assistant", message: { model: "<synthetic>", content: [{ type: "text", text: "Session limit reached ∙ resets 9pm" }] } };
  assert.equal(classifySession({ exitCode: 1, events: [synthetic, errResult("")] }).kind, "usage-limit");
});

test("backoff doubles from 15 minutes and caps at 2 hours", () => {
  assert.deepEqual([0, 1, 2, 3, 4, 9].map((a) => backoffMs(a) / MIN), [15, 30, 60, 120, 120, 120]);
});

test("reset clauses: relative, next-day rollover, dates, and junk", () => {
  const now = Date.UTC(2026, 8, 15, 22, 0);
  assert.equal(parseResetClause("resets in 2h 13m", now), now + 133 * MIN);
  assert.equal(parseResetClause("resets in 45 minutes", now), now + 45 * MIN);
  // 3pm UTC already passed at 22:00 UTC → tomorrow
  assert.equal(parseResetClause("resets 3pm (UTC)", now), Date.UTC(2026, 8, 16, 15, 0));
  assert.equal(parseResetClause("resets Sep 18, 9am (UTC)", now), Date.UTC(2026, 8, 18, 9, 0));
  assert.equal(parseResetClause("resets 14:30 (UTC)", now), Date.UTC(2026, 8, 16, 14, 30));
  assert.equal(parseResetClause("resets 3", now), null);
  assert.equal(parseResetClause("no clause here", now), null);
});

test("zoned conversion handles a DST zone", () => {
  // 2026-07-01 12:00 in New York is 16:00 UTC (EDT); 2026-01-01 12:00 is 17:00 UTC (EST)
  assert.equal(zonedToUtc({ year: 2026, month: 6, day: 1, hour: 12, minute: 0 }, "America/New_York"), Date.UTC(2026, 6, 1, 16, 0));
  assert.equal(zonedToUtc({ year: 2026, month: 0, day: 1, hour: 12, minute: 0 }, "America/New_York"), Date.UTC(2026, 0, 1, 17, 0));
});

test("a reported reset time sleeps until just after it, without probing", () => {
  const now = Date.UTC(2026, 8, 15, 10, 0);
  const plan = sleepPlan({ kind: "usage-limit", resetAt: new Date(now + 60 * MIN).toISOString() }, 3, { nowMs: now });
  assert.equal(plan.sleepMs, 62 * MIN);
  assert.equal(plan.probe, false);
});
