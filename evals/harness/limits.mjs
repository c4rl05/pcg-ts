/**
 * Classify how an agent session ended, so the runner can tell a usage-limit
 * stop (discard the slot, sleep, retry) from the agent's own failure (keep
 * it, score it) and from transient infrastructure errors.
 *
 * The formats a subscription limit takes are NOT all observed on this
 * machine: nobody can trigger a real limit on purpose. Each pattern below
 * says whether it was OBSERVED (seen in a real transcript here) or ASSUMED
 * (taken from public issue reports / the CLI's error documentation titles).
 * `evals/harness/limits.test.mjs` pins every one of them with a fixture.
 *
 *   kind            meaning                                  runner action
 *   ok              session finished normally                score
 *   cap-turns       hit its own turn cap                     score (failure class)
 *   cap-wall        killed at the wall-clock cap             score (failure class)
 *   cap-tokens      killed at the token cap                  score (failure class)
 *   usage-limit     subscription limit                       discard, sleep, retry
 *   auth            not logged in / token expired            discard, short backoff, retry (infra clock)
 *   api-error       overloaded / 5xx / network               discard, short backoff, retry
 *   cli-error       ended before the agent's first turn      discard, short backoff, retry
 *   other           the agent worked, then the session died  score as failure, flagged
 *
 * api-error and cli-error share an infrastructure clock in run.mjs: past
 * `limits.wakeAfterInfraHours` of nothing but those, the owner is woken
 * instead of the schedule being burned on records the report must exclude.
 */

const MINUTE = 60_000;

/** Backoff for a limit without a reported reset time: 15 min doubling, capped at 2 h. */
export function backoffMs(attempt, { baseMinutes = 15, maxMinutes = 120 } = {}) {
  return Math.min(baseMinutes * 2 ** Math.max(0, attempt), maxMinutes) * MINUTE;
}

/** Short backoff for transient API errors: 1, 2, 4, 8 min, capped at 15. */
export function transientBackoffMs(attempt) {
  return Math.min(2 ** Math.max(0, attempt), 15) * MINUTE;
}

const MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];

/** Offset (ms) of `timeZone` from UTC at instant `utcMs`. */
function tzOffsetMs(utcMs, timeZone) {
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  const parts = Object.fromEntries(fmt.formatToParts(new Date(utcMs)).map((p) => [p.type, p.value]));
  const asUtc = Date.UTC(+parts.year, +parts.month - 1, +parts.day, +parts.hour % 24, +parts.minute, +parts.second);
  return asUtc - Math.floor(utcMs / 1000) * 1000;
}

/** Wall-clock fields in `timeZone` (or local when null) to a UTC instant. */
export function zonedToUtc({ year, month, day, hour, minute }, timeZone) {
  if (!timeZone) return new Date(year, month, day, hour, minute, 0, 0).getTime();
  const guess = Date.UTC(year, month, day, hour, minute);
  let utc = guess - tzOffsetMs(guess, timeZone);
  utc = guess - tzOffsetMs(utc, timeZone); // second pass settles DST edges
  return utc;
}

function validTimeZone(tz) {
  if (!tz) return null;
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: tz });
    return tz;
  } catch {
    return null;
  }
}

/** Wall-clock fields of `nowMs` in `timeZone` (local when null). */
function fieldsIn(nowMs, timeZone) {
  if (!timeZone) {
    const d = new Date(nowMs);
    return { year: d.getFullYear(), month: d.getMonth(), day: d.getDate() };
  }
  const fmt = new Intl.DateTimeFormat("en-US", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" });
  const p = Object.fromEntries(fmt.formatToParts(new Date(nowMs)).map((x) => [x.type, x.value]));
  return { year: +p.year, month: +p.month - 1, day: +p.day };
}

/**
 * Parse the reset clause of a limit message into an epoch-ms instant.
 * Accepts "resets 3pm", "resets 3:30pm (Europe/Madrid)", "resets Sep 18, 9am",
 * "reset at 14:00", "resets in 2h 13m", "resets in 45 minutes". Returns null
 * when nothing parses.
 */
export function parseResetClause(text, nowMs = Date.now()) {
  const rel = /resets?\s+in\s+(?:(\d+)\s*(?:h|hr|hrs|hours?))?\s*(?:(\d+)\s*(?:m|min|mins|minutes?))?/i.exec(text);
  if (rel && (rel[1] || rel[2])) return nowMs + ((+rel[1] || 0) * 60 + (+rel[2] || 0)) * MINUTE;
  const abs =
    /resets?\s+(?:at\s+|on\s+)?(?:([A-Za-z]{3,9})\.?\s+(\d{1,2})(?:st|nd|rd|th)?,?\s+(?:at\s+)?)?(\d{1,2})(?::(\d{2}))?\s*(am|pm)?(?:\s*\(([^)]+)\))?/i.exec(text);
  if (!abs) return null;
  const [, monName, dayStr, hStr, mStr, ampm, tzRaw] = abs;
  if (!ampm && !mStr) return null; // a bare number is not a time
  let hour = +hStr;
  const minute = mStr ? +mStr : 0;
  if (hour > 23 || minute > 59) return null;
  if (ampm) {
    if (hour < 1 || hour > 12) return null;
    hour = (hour % 12) + (ampm.toLowerCase() === "pm" ? 12 : 0);
  }
  const tz = validTimeZone(tzRaw?.trim());
  const today = fieldsIn(nowMs, tz);
  if (monName) {
    const month = MONTHS.indexOf(monName.slice(0, 3).toLowerCase());
    if (month < 0) return null;
    let at = zonedToUtc({ year: today.year, month, day: +dayStr, hour, minute }, tz);
    // Only a date far in the past is next year's; a recently passed one is simply past (and ignored by the caller).
    if (at < nowMs - 180 * 24 * 60 * MINUTE) at = zonedToUtc({ year: today.year + 1, month, day: +dayStr, hour, minute }, tz);
    return at;
  }
  let at = zonedToUtc({ ...today, hour, minute }, tz);
  if (at <= nowMs) {
    const d = new Date(Date.UTC(today.year, today.month, today.day + 1));
    at = zonedToUtc({ year: d.getUTCFullYear(), month: d.getUTCMonth(), day: d.getUTCDate(), hour, minute }, tz);
  }
  return at;
}

/** Epoch seconds or milliseconds to ms. */
function epochToMs(n) {
  const v = Number(n);
  if (!Number.isFinite(v) || v <= 0) return null;
  return v < 1e11 ? v * 1000 : v;
}

// ASSUMED: the pipe-epoch form older CLI builds printed as the -p result
// ("Claude AI usage limit reached|1751234567"), from public issue reports.
const PIPE_EPOCH = /usage limit reached\|(\d{9,13})/i;
// ASSUMED: prose forms ("You've hit your session limit · resets 3pm",
// "5-hour limit reached ∙ resets 2pm", "Weekly limit reached · resets Sep 18, 9am",
// "Claude usage limit reached. Your limit will reset at 3pm (Europe/Madrid)").
// Only the listed qualifiers: "reached the context limit" is a failed run, not a usage limit.
const LIMIT_QUALIFIER = "(?:session|weekly|daily|hourly|usage|opus|sonnet|fable|haiku|5-hour|five-hour|model|plan|subscription)";
const LIMIT_PROSE = new RegExp(
  `(?:hit|reached)\\s+(?:your|the)\\s+${LIMIT_QUALIFIER}(?:\\s+usage)?\\s+limit|\\b${LIMIT_QUALIFIER}\\s+limit\\s+(?:reached|hit|exceeded)|usage limit reached|out of (?:extra )?usage|rate_limit_error`,
  "i",
);
const AUTH = /invalid api key|please run \/login|not logged in|oauth token (?:has )?expired|authentication_error|\b401\b.*unauthori[sz]ed|login required|credit balance is too low/i;
// HTTP statuses only in an API context: a stack frame's `file.js:500:12` is not a 500.
const TRANSIENT = /overloaded_error|\boverloaded\b|(?:api error|status(?: code)?|http\/\d(?:\.\d)?|http status)[ :]{0,3}(?:5\d\d|429)\b|internal server error|\bapi_error\b|econnreset|etimedout|enotfound|eai_again|socket hang up|network error|fetch failed|request timed out/i;

/**
 * Classify a finished session.
 *
 * @param {object} s
 * @param {number|null} s.exitCode
 * @param {string} [s.stderr]          stderr tail
 * @param {object[]} [s.events]        parsed stream-json events
 * @param {string[]} [s.capsHit]       caps the launcher enforced ("wall", "tokens")
 * @param {number} [s.nowMs]
 * @returns {{ kind: string, resetAt: string|null, evidence: string, source: string }}
 */
export function classifySession({ exitCode, stderr = "", events = [], capsHit = [], nowMs = Date.now() }) {
  const result = [...events].reverse().find((e) => e?.type === "result") ?? null;
  const at = (ms) => (ms && ms > nowMs ? new Date(ms).toISOString() : null); // a reset in the past is no reset

  // OBSERVED shape of the event (an `allowed` status arrives in normal runs);
  // the `rejected` status that means a hit is ASSUMED.
  const rejected = [...events]
    .reverse()
    .find((e) => e?.type === "rate_limit_event" && /rejected|exceeded|blocked/i.test(String(e?.rate_limit_info?.status ?? e?.status ?? "")));
  if (rejected) {
    const info = rejected.rate_limit_info ?? rejected;
    return { kind: "usage-limit", resetAt: at(epochToMs(info.resetsAt ?? info.resets_at)), evidence: JSON.stringify(info).slice(0, 300), source: "rate_limit_event" };
  }

  const abnormal = !result || result.is_error === true || (result.subtype && result.subtype !== "success") || (exitCode !== 0 && exitCode !== null) || capsHit.length > 0;

  // Only text the CLI produced, never the agent's own prose: synthetic
  // assistant messages (the CLI's injected API-error text, scanned ALWAYS,
  // since one can precede a result that looks normal), and — for a session
  // that ended abnormally — the errored result, stderr and non-JSON stdout.
  const texts = [];
  for (const e of events) {
    if (e?.type === "assistant" && (e.message?.model === "<synthetic>" || e.error || e.isApiErrorMessage)) {
      for (const b of e.message?.content ?? []) if (b?.type === "text") texts.push(b.text);
      if (e.error) texts.push(String(e.error));
    }
  }
  if (abnormal) {
    if (result && (result.is_error || result.subtype !== "success")) {
      texts.push(String(result.result ?? ""), ...(Array.isArray(result.errors) ? result.errors.map(String) : []));
      if (result.api_error_status) texts.push(`status ${result.api_error_status}`);
    }
    for (const e of events) if (e?.type === "raw") texts.push(String(e.line ?? ""));
    texts.push(stderr);
  }
  const blob = texts.filter(Boolean).join("\n");

  // A limit outranks a cap: a session stuck retrying a 429 until the wall
  // clock killed it was stopped by the limit, not by its own slowness.
  const pipe = PIPE_EPOCH.exec(blob);
  if (pipe) return { kind: "usage-limit", resetAt: at(epochToMs(pipe[1])), evidence: pipe[0], source: "text:pipe-epoch" };
  if (LIMIT_PROSE.test(blob)) {
    const line = blob.split("\n").find((l) => LIMIT_PROSE.test(l)) ?? blob;
    return { kind: "usage-limit", resetAt: at(parseResetClause(blob, nowMs)), evidence: line.slice(0, 300), source: "text:prose" };
  }

  if (capsHit.includes("wall")) return { kind: "cap-wall", resetAt: null, evidence: "killed at wall-clock cap", source: "launcher" };
  if (capsHit.includes("tokens")) return { kind: "cap-tokens", resetAt: null, evidence: "killed at token cap", source: "launcher" };
  if (result?.subtype === "error_max_turns") return { kind: "cap-turns", resetAt: null, evidence: "result subtype error_max_turns", source: "result" };
  if (!abnormal) return { kind: "ok", resetAt: null, evidence: "", source: "result" };

  if (AUTH.test(blob)) return { kind: "auth", resetAt: null, evidence: (AUTH.exec(blob) ?? [""])[0], source: "text" };
  if (TRANSIENT.test(blob)) return { kind: "api-error", resetAt: null, evidence: (TRANSIENT.exec(blob) ?? [""])[0], source: "text" };
  // The agent never got a turn (bad flags, unknown model, crash on start,
  // spawn failure): the harness or the CLI failed, not the agent.
  const agentTurns = events.filter((e) => e?.type === "assistant" && e.message?.model !== "<synthetic>").length;
  if (agentTurns === 0) return { kind: "cli-error", resetAt: null, evidence: blob.slice(-300), source: "no agent turns" };
  return { kind: "other", resetAt: null, evidence: blob.slice(-300), source: "fallback" };
}

/** Kinds whose slot is discarded unscored and retried. */
export const RETRY_KINDS = new Set(["usage-limit", "auth", "api-error", "cli-error"]);

/** Retry kinds that are infrastructure trouble rather than the subscription limit. */
export const INFRA_KINDS = new Set(["api-error", "cli-error", "auth"]);

/**
 * How long to sleep after a discarded session. `blockAttempt` counts
 * consecutive blocked sessions of the same family.
 */
export function sleepPlan(classification, blockAttempt, { nowMs = Date.now(), marginMs = 2 * MINUTE, maxSleepMs = 8 * 24 * 60 * MINUTE } = {}) {
  if (INFRA_KINDS.has(classification.kind)) return { sleepMs: transientBackoffMs(blockAttempt), probe: false, reason: `${classification.kind}, transient` };
  const reset = classification.resetAt ? Date.parse(classification.resetAt) : NaN;
  if (Number.isFinite(reset) && reset > nowMs) {
    const ms = Math.min(reset + marginMs - nowMs, maxSleepMs);
    return { sleepMs: ms, probe: false, reason: `reset reported for ${classification.resetAt}` };
  }
  return { sleepMs: backoffMs(blockAttempt), probe: true, reason: "no reset time reported; backing off and probing" };
}
