import "server-only";

export type ExtractedEvent = {
  title: string;
  date: string; // YYYY-MM-DD
  endDate: string | null; // YYYY-MM-DD, for multi-day ranges
  allDay: boolean;
  startTime: string | null; // HH:MM, 24-hour
  endTime: string | null; // HH:MM, 24-hour
};

type Result<T> = { ok: true; value: T } | { ok: false; error: string };

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error(`${label} timed out`)), ms)),
  ]);
}

function stripHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/\s+/g, " ")
    .trim();
}

async function resolveSourceText(input: string): Promise<Result<string>> {
  if (!/^https?:\/\//i.test(input)) {
    return { ok: true, value: input };
  }

  let res: Response;
  try {
    res = await withTimeout(
      fetch(input, { headers: { "user-agent": "FamilyPlannerImport/1.0" } }),
      10_000,
      "Fetching that page"
    );
  } catch {
    return { ok: false, error: "Couldn't fetch that page — check the URL and try again." };
  }
  if (!res.ok) {
    return { ok: false, error: `Couldn't fetch that page (HTTP ${res.status}).` };
  }

  const html = await res.text();
  const text = stripHtml(html);
  if (!text) {
    return { ok: false, error: "That page didn't have any readable text." };
  }
  return { ok: true, value: text.slice(0, 20_000) };
}

function isValidDate(value: unknown): value is string {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function isValidTime(value: unknown): value is string {
  return typeof value === "string" && /^\d{2}:\d{2}$/.test(value);
}

export async function extractEventsFromInput(
  input: string
): Promise<{ ok: true; events: ExtractedEvent[] } | { ok: false; error: string }> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return {
      ok: false,
      error:
        "This feature isn't set up yet — an ANTHROPIC_API_KEY environment variable needs to be added.",
    };
  }

  const source = await resolveSourceText(input);
  if (!source.ok) return source;

  const today = new Date().toISOString().slice(0, 10);

  const prompt = `Today's date is ${today}. Extract every distinct calendar-worthy event, date, or deadline mentioned in the text below (e.g. inset days, school trips, term dates, deadlines, club sessions, sports days, holidays, parents' evenings, exeats). Ignore anything that isn't tied to a specific date.

For dates given without a year, infer the most sensible year given today's date (assume the near future, not the past, unless the text clearly states a past year).

If an item spans a range (e.g. an exeat or half term from one day to another), use "date" for the first day and "endDate" for the last day, with "startTime"/"endTime" as the times on those respective days if given.

Call the record_events tool with everything you find. If nothing looks like an event, call it with an empty events array.

Text:
"""
${source.value}
"""`;

  const tool = {
    name: "record_events",
    description: "Record every distinct calendar event found in the text.",
    input_schema: {
      type: "object",
      properties: {
        events: {
          type: "array",
          items: {
            type: "object",
            properties: {
              title: { type: "string", description: "Short plain-English event name" },
              date: { type: "string", description: "Start date, YYYY-MM-DD" },
              endDate: {
                type: "string",
                description: "End date as YYYY-MM-DD for a multi-day range, or an empty string if it's a single day",
              },
              allDay: { type: "boolean", description: "true if no specific time is given" },
              startTime: {
                type: "string",
                description: "Start time as HH:MM in 24-hour format, or an empty string if no time is given",
              },
              endTime: {
                type: "string",
                description: "End time as HH:MM in 24-hour format, or an empty string if no end time is given",
              },
            },
            required: ["title", "date", "endDate", "allDay", "startTime", "endTime"],
          },
        },
      },
      required: ["events"],
    },
  };

  let res: Response;
  try {
    res = await withTimeout(
      fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: "claude-sonnet-5",
          max_tokens: 4096,
          messages: [{ role: "user", content: prompt }],
          tools: [tool],
          tool_choice: { type: "tool", name: "record_events" },
        }),
      }),
      30_000,
      "Extracting events"
    );
  } catch {
    return { ok: false, error: "Couldn't reach the extraction service — try again in a moment." };
  }

  if (!res.ok) {
    return { ok: false, error: `Extraction failed (HTTP ${res.status}).` };
  }

  const json = await res.json();
  const content: unknown[] = Array.isArray(json?.content) ? json.content : [];
  const toolUse = content.find(
    (block): block is { type: "tool_use"; input: unknown } =>
      typeof block === "object" &&
      block !== null &&
      (block as { type?: unknown }).type === "tool_use" &&
      (block as { name?: unknown }).name === "record_events"
  );

  const rawEvents =
    toolUse && typeof toolUse.input === "object" && toolUse.input !== null
      ? (toolUse.input as { events?: unknown }).events
      : undefined;

  if (!Array.isArray(rawEvents)) {
    return {
      ok: false,
      error: "Couldn't understand the extracted events — try pasting a smaller, cleaner chunk of text.",
    };
  }

  const events: ExtractedEvent[] = rawEvents
    .filter((e): e is Record<string, unknown> => typeof e === "object" && e !== null)
    .map((e) => ({
      title: typeof e.title === "string" ? e.title.trim() : "",
      date: isValidDate(e.date) ? e.date : "",
      endDate: isValidDate(e.endDate) ? e.endDate : null,
      allDay: Boolean(e.allDay),
      startTime: isValidTime(e.startTime) ? e.startTime : null,
      endTime: isValidTime(e.endTime) ? e.endTime : null,
    }))
    .filter((e) => e.title && e.date);

  if (events.length === 0) {
    return { ok: false, error: "Didn't find any dated events in that text." };
  }

  return { ok: true, events };
}
