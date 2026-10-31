-- ============================================================
-- ウォーターフォール開発向けタスク管理アプリ テーブル定義
-- SupabaseのSQL Editorで実行する
-- ※RLSを有効にし、ログインした人は「自分が登録したデータ」だけを表示・編集・削除できる（未ログインでは何もできない）
-- ※何度実行しても同じ状態になるように書いている（実行済みの環境に再実行してもよい）
-- ※初回実行の前に、下の「既存データの引き継ぎ」のメールアドレスを書き換えること
-- ============================================================

-- ------------------------------------------------------------
-- 1. テーブル作成（すでにあれば何もしない）
--    user_id：登録したユーザー。登録時にログイン中のユーザーIDが自動で入る（auth.uid()）
--             ユーザーを削除すると、そのユーザーのデータも削除される（on delete cascade）
-- ------------------------------------------------------------

-- メンバー
create table if not exists public.members (
  id uuid primary key default gen_random_uuid(),
  user_id uuid default auth.uid() references auth.users (id) on delete cascade, -- 登録したユーザー
  name text not null,                       -- メンバー名
  role text not null default '',            -- 役職
  load integer not null default 0,          -- 負荷（％）
  created_at timestamptz not null default now()
);

-- プロジェクト
create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid default auth.uid() references auth.users (id) on delete cascade, -- 登録したユーザー
  name text not null,                       -- プロジェクト名
  start_date date,                          -- 開始日
  delivery_date date,                       -- 納入日
  created_at timestamptz not null default now()
);

-- ソフトウェア（1つのプロジェクトに複数）
create table if not exists public.softwares (
  id uuid primary key default gen_random_uuid(),
  user_id uuid default auth.uid() references auth.users (id) on delete cascade, -- 登録したユーザー
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
  user_id uuid default auth.uid() references auth.users (id) on delete cascade, -- 登録したユーザー
  software_id uuid not null references public.softwares (id) on delete cascade, -- 対象ソフト（削除時は工程も削除）
  phase_no smallint not null check (phase_no between 1 and 7), -- 工程番号（1 開発準備 〜 7 納品）
  plan_start date,                          -- 予定開始日
  plan_end date,                            -- 予定終了日
  actual_start date,                        -- 実績開始日
  actual_end date,                          -- 実績終了日
  progress integer not null default 0 check (progress between 0 and 100), -- 工程進捗（％）
  unique (software_id, phase_no)            -- 同じソフトに同じ工程は1つだけ
);

-- タスク（メンバー個人にひも付く作業。ソフトの工程とは別に管理する）
create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid default auth.uid() references auth.users (id) on delete cascade, -- 登録したユーザー
  name text not null,                       -- タスク名
  start_date date,                          -- 開始日
  end_date date,                            -- 終了予定日
  assignee_id uuid references public.members (id) on delete set null, -- 担当（メンバー削除時は空にする）
  progress integer not null default 0 check (progress between 0 and 100), -- 進捗（％）
  description text not null default '',     -- タスク内容
  created_at timestamptz not null default now()
);

-- プロジェクトのフェーズ（1つのプロジェクトに4フェーズ・番号は1〜4で固定）
-- 1 原理試作 / 2 機能試作 / 3 量産試作 / 4 リリース（ソフトの工程と同じ扱い）
create table if not exists public.project_phases (
  id uuid primary key default gen_random_uuid(),
  user_id uuid default auth.uid() references auth.users (id) on delete cascade, -- 登録したユーザー
  project_id uuid not null references public.projects (id) on delete cascade, -- 対象プロジェクト（削除時はフェーズも削除）
  phase_no smallint not null check (phase_no between 1 and 4), -- フェーズ番号（1 原理試作 〜 4 リリース）
  plan_start date,                          -- 予定開始日
  plan_end date,                            -- 予定終了日
  actual_start date,                        -- 実績開始日
  actual_end date,                          -- 実績終了日
  progress integer not null default 0 check (progress between 0 and 100), -- フェーズ進捗（％）
  unique (project_id, phase_no)             -- 同じプロジェクトに同じフェーズは1つだけ
);

-- ------------------------------------------------------------
-- 2. 登録したユーザーの列を追加（user_id がない古いテーブル用。すでにあれば何もしない）
-- ------------------------------------------------------------
alter table public.members add column if not exists user_id uuid default auth.uid() references auth.users (id) on delete cascade;
alter table public.projects add column if not exists user_id uuid default auth.uid() references auth.users (id) on delete cascade;
alter table public.softwares add column if not exists user_id uuid default auth.uid() references auth.users (id) on delete cascade;
alter table public.phases add column if not exists user_id uuid default auth.uid() references auth.users (id) on delete cascade;
alter table public.tasks add column if not exists user_id uuid default auth.uid() references auth.users (id) on delete cascade;
alter table public.project_phases add column if not exists user_id uuid default auth.uid() references auth.users (id) on delete cascade;

-- ------------------------------------------------------------
-- 3. 既存データの引き継ぎ
--    登録者が空（user_id が null）のデータを、下のメールアドレスのアカウントの登録分にする
--    ★ 'your-email@example.com' を、引き継ぎ先のアカウント（アプリで会員登録済みのもの）のメールアドレスに書き換えて実行する
--    ※メールアドレスが見つからない場合は何も変わらない（登録者が空のデータは誰からも見えないまま）
-- ------------------------------------------------------------
update public.members        set user_id = (select id from auth.users where email = 'your-email@example.com') where user_id is null;
update public.projects       set user_id = (select id from auth.users where email = 'your-email@example.com') where user_id is null;
update public.softwares      set user_id = (select id from auth.users where email = 'your-email@example.com') where user_id is null;
update public.phases         set user_id = (select id from auth.users where email = 'your-email@example.com') where user_id is null;
update public.tasks          set user_id = (select id from auth.users where email = 'your-email@example.com') where user_id is null;
update public.project_phases set user_id = (select id from auth.users where email = 'your-email@example.com') where user_id is null;

-- ------------------------------------------------------------
-- 4. 登録済みのプロジェクトに、4フェーズ分の空の行を作る（すでにある行はそのまま）
--    フェーズの登録者は、プロジェクトの登録者と同じにする
-- ------------------------------------------------------------
insert into public.project_phases (project_id, phase_no, user_id)
select p.id, n, p.user_id from public.projects p cross join generate_series(1, 4) as n
on conflict (project_id, phase_no) do nothing;

-- ------------------------------------------------------------
-- 5. 登録者での絞り込みを速くするための索引（すでにあれば何もしない）
-- ------------------------------------------------------------
create index if not exists members_user_id_idx on public.members (user_id);
create index if not exists projects_user_id_idx on public.projects (user_id);
create index if not exists softwares_user_id_idx on public.softwares (user_id);
create index if not exists phases_user_id_idx on public.phases (user_id);
create index if not exists tasks_user_id_idx on public.tasks (user_id);
create index if not exists project_phases_user_id_idx on public.project_phases (user_id);

-- ------------------------------------------------------------
-- 6. RLS（行ごとの権限）
--    自分が登録した行（auth.uid() = user_id）だけ、表示・登録・編集・削除できる
--    以前の「ログイン者は全員読み書き可」のポリシーは削除する
-- ------------------------------------------------------------

-- RLSを有効化
alter table public.members enable row level security;
alter table public.projects enable row level security;
alter table public.softwares enable row level security;
alter table public.phases enable row level security;
alter table public.tasks enable row level security;
alter table public.project_phases enable row level security;

-- 以前のポリシー（全員で共有）を削除
drop policy if exists "ログイン者は全員読み書き可" on public.members;
drop policy if exists "ログイン者は全員読み書き可" on public.projects;
drop policy if exists "ログイン者は全員読み書き可" on public.softwares;
drop policy if exists "ログイン者は全員読み書き可" on public.phases;
drop policy if exists "ログイン者は全員読み書き可" on public.tasks;
drop policy if exists "ログイン者は全員読み書き可" on public.project_phases;

-- 自分が登録したデータだけ読み書きできるポリシー（作り直せるよう、同名のポリシーがあれば先に削除する）
-- using：表示・編集・削除できる行の条件、with check：登録・編集後の行が満たすべき条件（他人のIDでは登録できない）
drop policy if exists "自分の登録データのみ" on public.members;
create policy "自分の登録データのみ" on public.members
  for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "自分の登録データのみ" on public.projects;
create policy "自分の登録データのみ" on public.projects
  for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "自分の登録データのみ" on public.softwares;
create policy "自分の登録データのみ" on public.softwares
  for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "自分の登録データのみ" on public.phases;
create policy "自分の登録データのみ" on public.phases
  for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "自分の登録データのみ" on public.tasks;
create policy "自分の登録データのみ" on public.tasks
  for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "自分の登録データのみ" on public.project_phases;
create policy "自分の登録データのみ" on public.project_phases
  for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- 権限：ログインした人には読み書きを許可し、未ログイン（anon）からは取り上げる
grant select, insert, update, delete on public.members, public.projects, public.softwares, public.phases, public.tasks, public.project_phases to authenticated;
revoke all on public.members, public.projects, public.softwares, public.phases, public.tasks, public.project_phases from anon;
