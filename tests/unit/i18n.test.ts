import { describe, expect, it } from "vitest";
import en from "@/i18n/messages/en.json";
import ar from "@/i18n/messages/ar.json";
import { NOTIFICATION_KINDS, renderNotification } from "@/server/services/notifications";

type Tree = { [key: string]: string | Tree };

function flatten(tree: Tree, prefix = ""): Record<string, string> {
  return Object.entries(tree).reduce<Record<string, string>>((acc, [k, v]) => {
    if (typeof v === "string") acc[prefix + k] = v;
    else Object.assign(acc, flatten(v, `${prefix}${k}.`));
    return acc;
  }, {});
}

/** Top-level ICU argument names, e.g. {count, plural, ...} → count. */
function args(message: string): string[] {
  const names = new Set<string>();
  let depth = 0;
  for (let i = 0; i < message.length; i++) {
    if (message[i] === "{") {
      if (depth === 0) {
        const m = /^\{\s*([A-Za-z_]\w*)/.exec(message.slice(i));
        if (m) names.add(m[1]!);
      }
      depth++;
    } else if (message[i] === "}") depth--;
  }
  return [...names].sort();
}

describe("message catalogs", () => {
  const flatEn = flatten(en as Tree);
  const flatAr = flatten(ar as Tree);

  it("have identical keys", () => {
    expect(Object.keys(flatAr).sort()).toEqual(Object.keys(flatEn).sort());
  });

  it("use the same interpolation arguments", () => {
    const mismatches = Object.keys(flatEn).filter((k) => args(flatEn[k]!).join() !== args(flatAr[k] ?? "").join());
    expect(mismatches).toEqual([]);
  });

  it("have no empty translations", () => {
    expect(Object.entries(flatAr).filter(([, v]) => !v.trim())).toEqual([]);
  });
});

describe("notification rendering", () => {
  const data = { name: "Ahmed", reference: "AP-ABC234", facility: "Clinic", hotel: "Inn", date: "2026-11-02T05:00:00.000Z", checkIn: "2026-11-02", patient: "Sara", specialty: "Cardiology" };

  it("renders every kind in both languages", () => {
    for (const kind of NOTIFICATION_KINDS) {
      for (const locale of ["en", "ar"]) {
        const { title, body } = renderNotification(kind, data, locale);
        expect(title.length).toBeGreaterThan(0);
        expect(body).not.toMatch(/\{|\}/);
      }
    }
  });

  it("formats dates in the business time zone", () => {
    expect(renderNotification("appointmentConfirmed", data, "en").body).toContain("8:00 AM");
  });

  it("degrades gracefully for unknown kinds", () => {
    expect(renderNotification("mystery", {}, "en")).toEqual({ title: "mystery", body: "" });
  });
});
