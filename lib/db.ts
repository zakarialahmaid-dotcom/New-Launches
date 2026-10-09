import postgres from "postgres";
import type { Launch, Placement } from "./plan";

const url = process.env.DATABASE_URL || process.env.POSTGRES_URL;

declare global {
  // eslint-disable-next-line no-var
  var __sql: ReturnType<typeof postgres> | undefined;
  // eslint-disable-next-line no-var
  var __schema: Promise<void> | undefined;
}

function client() {
  if (!url) throw new Error("DATABASE_URL is not set. See README.md.");
  if (!global.__sql) {
    global.__sql = postgres(url, {
      max: 3,
      idle_timeout: 20,
      prepare: false, // works with pooled (pgbouncer) connections on Neon / Supabase
      ssl: /localhost|127\.0\.0\.1/.test(url) ? false : "require",
      // keep DATE columns as plain 'YYYY-MM-DD' strings
      types: { date: { to: 1082, from: [1082], serialize: (x: string) => x, parse: (x: string) => x } },
    });
  }
  return global.__sql;
}

async function migrate(sql: ReturnType<typeof postgres>) {
  await sql`
    create table if not exists launches (
      id serial primary key,
      name text not null,
      level text,
      launch_type text,
      category text,
      kam text,
      requested_go_live date,
      stock_ready boolean not null default false,
      landing_page text,
      offer text,
      hero_skus text,
      commercial_comments text,
      decision text,
      confirmed_go_live date,
      m2_p1_week int,
      m3_p1_week int,
      marketing_owner text,
      marketing_comments text,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    )`;
  await sql`
    create table if not exists placements (
      id serial primary key,
      launch_id int not null references launches(id) on delete cascade,
      date date not null,
      channel text not null,
      time text,
      details text,
      status text not null default 'Planned',
      owner text,
      created_at timestamptz not null default now()
    )`;
  await sql`create index if not exists placements_launch_date on placements (launch_id, date)`;
}

/** Returns a ready-to-use sql client; creates the tables on first use. */
export async function db() {
  const sql = client();
  if (!global.__schema) global.__schema = migrate(sql).catch((e) => { global.__schema = undefined; throw e; });
  await global.__schema;
  return sql;
}

export async function allLaunches(): Promise<Launch[]> {
  const sql = await db();
  return (await sql`select * from launches order by created_at desc`) as unknown as Launch[];
}

export async function getLaunch(id: number): Promise<Launch | null> {
  const sql = await db();
  const r = await sql`select * from launches where id = ${id}`;
  return (r[0] as unknown as Launch) || null;
}

export async function placements(launchId?: number): Promise<Placement[]> {
  const sql = await db();
  const r = launchId
    ? await sql`select * from placements where launch_id = ${launchId} order by date, id`
    : await sql`select * from placements order by date, id`;
  return r as unknown as Placement[];
}
