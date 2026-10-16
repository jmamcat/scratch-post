import type { Metrics } from './types.ts';

/** Push durations in seconds: the Prometheus defaults up to 2.5 s (R-OPS-03). */
export const HISTOGRAM_BUCKETS = [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5];

type Kind = 'counter' | 'gauge' | 'histogram';
type Labels = Record<string, string>;

interface Sample {
  labels: Labels;
  value: number;
  /** Histograms: observations per bucket (the last slot is +Inf), not cumulative. */
  counts: number[];
  sum: number;
  count: number;
}

interface Family {
  kind: Kind;
  help: string;
  series: Map<string, Sample>;
}

/** A metrics registry that renders the Prometheus text format, version 0.0.4. */
export interface Registry extends Metrics {
  text(): string;
}

const BUILT_IN: [name: string, kind: Kind, help: string][] = [
  ['quire_http_requests_total', 'counter', 'HTTP requests by route pattern and status.'],
  ['quire_commits_total', 'counter', 'Commits recorded in the revision log.'],
  ['quire_push_duration_seconds', 'histogram', 'Time spent handling POST /api/sync/push.'],
  ['quire_conflicts_open', 'gauge', 'Conflicts with status open.'],
  ['quire_live_rooms', 'gauge', 'Live editing rooms.'],
  ['quire_live_connections', 'gauge', 'Live editing connections.'],
  ['quire_backup_last_success_timestamp_seconds', 'gauge', 'Unix time of the last successful backup, 0 if none.'],
  ['quire_db_bytes', 'gauge', 'Size of quire.db and its write-ahead log in bytes.'],
  ['quire_backups_total', 'counter', 'Backup bundles written, by kind (full or incremental).'],
];

export function createMetrics(): Registry {
  const families = new Map<string, Family>();
  const familyOf = (name: string, kind: Kind): Family => {
    let family = families.get(name);
    if (!family) {
      family = { kind, help: '', series: new Map() };
      families.set(name, family);
    }
    return family;
  };
  const sampleOf = (family: Family, labels: Labels): Sample => {
    const key = labelKey(labels);
    let sample = family.series.get(key);
    if (!sample) {
      const counts = family.kind === 'histogram' ? new Array<number>(HISTOGRAM_BUCKETS.length + 1).fill(0) : [];
      sample = { labels, value: 0, counts, sum: 0, count: 0 };
      family.series.set(key, sample);
    }
    return sample;
  };

  for (const [name, kind, help] of BUILT_IN) familyOf(name, kind).help = help;
  sampleOf(familyOf('quire_commits_total', 'counter'), {});

  return {
    inc(name, labels = {}, by = 1) {
      sampleOf(familyOf(name, 'counter'), labels).value += by;
    },
    set(name, value, labels = {}) {
      sampleOf(familyOf(name, 'gauge'), labels).value = value;
    },
    observe(name, seconds, labels = {}) {
      const sample = sampleOf(familyOf(name, 'histogram'), labels);
      const found = HISTOGRAM_BUCKETS.findIndex((le) => seconds <= le);
      const bucket = found === -1 ? HISTOGRAM_BUCKETS.length : found;
      sample.counts[bucket] = (sample.counts[bucket] ?? 0) + 1;
      sample.sum += seconds;
      sample.count += 1;
    },
    text() {
      const out: string[] = [];
      for (const [name, family] of families) {
        if (family.help) out.push(`# HELP ${name} ${family.help}`);
        out.push(`# TYPE ${name} ${family.kind}`);
        for (const sample of family.series.values()) {
          if (family.kind === 'histogram') out.push(...histogramLines(name, sample));
          else out.push(`${name}${braces(sample.labels)} ${sample.value}`);
        }
      }
      return `${out.join('\n')}\n`;
    },
  };
}

function histogramLines(name: string, sample: Sample): string[] {
  const lines: string[] = [];
  let cumulative = 0;
  HISTOGRAM_BUCKETS.forEach((le, i) => {
    cumulative += sample.counts[i] ?? 0;
    lines.push(`${name}_bucket${braces({ ...sample.labels, le: String(le) })} ${cumulative}`);
  });
  lines.push(`${name}_bucket${braces({ ...sample.labels, le: '+Inf' })} ${sample.count}`);
  lines.push(`${name}_sum${braces(sample.labels)} ${sample.sum}`);
  lines.push(`${name}_count${braces(sample.labels)} ${sample.count}`);
  return lines;
}

function braces(labels: Labels): string {
  const entries = Object.entries(labels);
  if (entries.length === 0) return '';
  return `{${entries.map(([k, v]) => `${k}="${escapeLabel(v)}"`).join(',')}}`;
}

function labelKey(labels: Labels): string {
  return JSON.stringify(Object.entries(labels).sort(([a], [b]) => a.localeCompare(b)));
}

function escapeLabel(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/"/g, '\\"');
}
