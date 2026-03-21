export interface Bill {
  id: string;
  identifier: string;
  title: string;
  session: string;
  classification: string[];
  latest_action: string;
  latest_action_date: string;
  first_action_date: string;
  url: string;
  topic: string;
  plain_english: string;
}

export interface Rep {
  id: string;
  name: string;
  party: string;
  district: string;
  chamber: string;
  image: string;
  email: string;
  bills: Bill[];
}

export interface ZipToReps {
  [zip: string]: string[];
}

let repsCache: Rep[] | null = null;
let zipCache: ZipToReps | null = null;

export async function getAllReps(): Promise<Rep[]> {
  if (repsCache) return repsCache;
  const res = await fetch("/data/az_reps_final.json");
  repsCache = await res.json();
  return repsCache!;
}

export async function getZipMap(): Promise<ZipToReps> {
  if (zipCache) return zipCache;
  const res = await fetch("/data/zip_to_reps.json");
  zipCache = await res.json();
  return zipCache!;
}

export async function getRepsByZip(zip: string): Promise<Rep[]> {
  const [reps, zipMap] = await Promise.all([getAllReps(), getZipMap()]);
  const names = zipMap[zip] || [];
  return reps.filter((r) => names.includes(r.name));
}

export async function getRepById(id: string): Promise<Rep | undefined> {
  const reps = await getAllReps();
  return reps.find((r) => r.id === id);
}

export async function getRepByName(name: string): Promise<Rep | undefined> {
  const reps = await getAllReps();
  return reps.find((r) => r.name === name);
}

export function getTopicBreakdown(bills: Bill[]): { topic: string; count: number; pct: number }[] {
  const counts: Record<string, number> = {};
  bills.forEach((b) => {
    counts[b.topic] = (counts[b.topic] || 0) + 1;
  });
  const total = bills.length || 1;
  return Object.entries(counts)
    .map(([topic, count]) => ({ topic, count, pct: Math.round((count / total) * 100) }))
    .sort((a, b) => b.count - a.count);
}

export function getBillProgressRate(bills: Bill[]): number {
  const advanced = bills.filter((b) => {
    const action = b.latest_action.toLowerCase();
    return (
      action.includes("senate") ||
      action.includes("house") ||
      action.includes("governor") ||
      action.includes("signed") ||
      action.includes("passed") ||
      action.includes("third reading") ||
      action.includes("second reading") ||
      action.includes("transmit") ||
      action.includes("dpa")
    );
  });
  return bills.length > 0 ? Math.round((advanced.length / bills.length) * 100) : 0;
}

export function slugify(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

export function getPartyColor(party: string): string {
  if (party.toLowerCase().includes("democrat")) return "#3b82f6";
  if (party.toLowerCase().includes("republican")) return "#ef4444";
  return "#8b5cf6";
}

export function getChamberLabel(chamber: string): string {
  return chamber === "lower" ? "House" : "Senate";
}

export const TOPIC_COLORS: Record<string, string> = {
  education: "#8b5cf6",
  healthcare: "#ec4899",
  "public safety": "#f59e0b",
  taxes: "#22c55e",
  environment: "#06b6d4",
  "government operations": "#6366f1",
  economy: "#f97316",
  "civil rights": "#a855f7",
  transportation: "#14b8a6",
  housing: "#eab308",
  technology: "#0ea5e9",
  immigration: "#d946ef",
  agriculture: "#84cc16",
  water: "#38bdf8",
  elections: "#fb923c",
};

export function getTopicColor(topic: string): string {
  return TOPIC_COLORS[topic.toLowerCase()] || "#64748b";
}
