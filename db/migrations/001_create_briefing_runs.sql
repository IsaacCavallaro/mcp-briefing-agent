create table if not exists briefing_runs (
  id text primary key,
  created_at timestamptz not null,
  mode text not null check (mode in ('mock', 'live')),
  topic text not null,
  audience text not null,
  brief_ids text[] not null default '{}',
  duration_ms integer not null check (duration_ms >= 0),
  request jsonb not null,
  result jsonb not null,
  trace jsonb not null,
  inserted_at timestamptz not null default now()
);

create index if not exists briefing_runs_created_at_idx
  on briefing_runs (created_at desc);

create index if not exists briefing_runs_mode_idx
  on briefing_runs (mode);

create index if not exists briefing_runs_topic_idx
  on briefing_runs using gin (to_tsvector('english', topic));
