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
  sponsor_type: string;
  topic: string;
  plain_english: string;
  topic_source?: string;
}

export interface TopicMatch {
  topic: string;
  weight: number;
  type: "primary" | "cosponsor_only" | "no_bills";
}

export interface ScoredRep {
  id: string;
  name: string;
  party: string;
  district: string;
  chamber: string;
  image: string;
  email: string;
  say_topics: string[];
  do_topics_primary: string[];
  do_topics_cosponsor_only: string[];
  topic_matches: TopicMatch[];
  score: number | null;
  total_bills: number;
  primary_bills: number;
  cosponsor_bills: number;
  bills_by_topic: Record<string, { primary: number; cosponsor: number }>;
  statements: string[];
  has_data: boolean;
  plain_english_summary?: string;
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
let scoresCache: ScoredRep[] | null = null;

export async function getAllReps(): Promise<Rep[]> {
  if (repsCache) return repsCache;
  const res = await fetch("/data/az_reps_final.json");
  const all: Rep[] = await res.json();
  repsCache = all.filter((r) => r.chamber !== "executive" && r.bills.length > 0);
  return repsCache;
}

export async function getZipMap(): Promise<ZipToReps> {
  if (zipCache) return zipCache;
  const res = await fetch("/data/zip_to_reps.json");
  zipCache = await res.json();
  return zipCache!;
}

export async function getScores(): Promise<ScoredRep[]> {
  if (scoresCache) return scoresCache;
  try {
    const res = await fetch("/data/az_reps_scored.json");
    if (!res.ok) return [];
    scoresCache = await res.json();
    return scoresCache!;
  } catch {
    return [];
  }
}

export async function getScoreForRep(repId: string): Promise<ScoredRep | null> {
  const scores = await getScores();
  return scores.find((s) => s.id === repId) || null;
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

export function getTopicBreakdown(bills: Bill[]): { topic: string; count: number; pct: number }[] {
  const counts: Record<string, number> = {};
  bills.forEach((b) => {
    if (b.topic) counts[b.topic] = (counts[b.topic] || 0) + 1;
  });
  const total = bills.length || 1;
  return Object.entries(counts)
    .map(([topic, count]) => ({ topic, count, pct: Math.round((count / total) * 100) }))
    .sort((a, b) => b.count - a.count);
}

export function formatTopic(topic: string): string {
  return topic
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
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

export function getScoreColor(score: number): string {
  if (score >= 70) return "#22c55e";
  if (score >= 40) return "#f59e0b";
  return "#ef4444";
}

export function getScoreLabel(score: number): string {
  if (score >= 80) return "Strong Follow-Through";
  if (score >= 60) return "Mostly Aligned";
  if (score >= 40) return "Mixed Record";
  if (score >= 20) return "Weak Alignment";
  return "All Talk";
}

export const TOPIC_COLORS: Record<string, string> = {
  education: "#8b5cf6",
  healthcare: "#ec4899",
  public_safety: "#f59e0b",
  budget_and_finance: "#22c55e",
  civil_rights_and_elections: "#a855f7",
  economy: "#f97316",
  environment_and_water: "#06b6d4",
  government_operations: "#6366f1",
  immigration_and_borders: "#d946ef",
  infrastructure: "#14b8a6",
  local_government: "#eab308",
  social_services: "#fb923c",
};

export function getTopicColor(topic: string): string {
  return TOPIC_COLORS[topic] || "#64748b";
}
