-- ============================================================
-- ウォーターフォール開発向けタスク管理アプリ テーブル定義
-- SupabaseのSQL Editorで実行する
-- ※テストの妨げになるため、現在はRLSを無効にしている（URLを知っていれば誰でも読み書きできる状態）
-- ============================================================

-- メンバー
create table if not exists public.members (
  id uuid primary key default gen_random_uuid(),
  name text not null,                       -- メンバー名
  role text not null default '',            -- 役職
  load integer not null default 0,          -- 負荷（％）
  created_at timestamptz not null default now()
);

-- プロジェクト
create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  name text not null,                       -- プロジェクト名
  start_date date,                          -- 開始日
  delivery_date date,                       -- 納入日
  created_at timestamptz not null default now()
);

-- ソフトウェア（1つのプロジェクトに複数）
create table if not exists public.softwares (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade, -- 対象プロジェクト（削除時はソフトも削除）
  name text not null,                       -- ソフト名
  scale integer,                            -- 開発規模
  due_date date,                            -- 納期
  start_date date,                          -- 開始日
  planned_end_date date,                    -- 終了予定日
  assignee_id uuid references public.members (id) on delete set null, -- 担当メンバー（メンバー削除時は空にする）
  reviewer_id uuid references public.members (id) on delete set null, -- 調査（レビュー）担当
  created_at timestamptz not null default now()
);

-- 工程（1つのソフトに7工程・番号は1〜7で固定）
create table if not exists public.phases (
  id uuid primary key default gen_random_uuid(),
  software_id uuid not null references public.softwares (id) on delete cascade, -- 対象ソフト（削除時は工程も削除）
  phase_no smallint not null check (phase_no between 1 and 7), -- 工程番号（1 開発準備 〜 7 納品）
  plan_start date,                          -- 予定開始日
  plan_end date,                            -- 予定終了日
  actual_start date,                        -- 実績開始日
  actual_end date,                          -- 実績終了日
  progress integer not null default 0 check (progress between 0 and 100), -- 工程進捗（％）
  unique (software_id, phase_no)            -- 同じソフトに同じ工程は1つだけ
);

-- RLSを無効化（テスト用）
alter table public.members disable row level security;
alter table public.projects disable row level security;
alter table public.softwares disable row level security;
alter table public.phases disable row level security;

-- ログインなし（anon）でも読み書きできるように権限を付与
grant select, insert, update, delete on public.members, public.projects, public.softwares, public.phases to anon, authenticated;
