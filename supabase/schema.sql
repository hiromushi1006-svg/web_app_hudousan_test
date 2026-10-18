-- 物件テーブル
create table if not exists public.properties (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade, -- 登録したユーザー
  name text not null,                                  -- 物件名
  rent integer not null check (rent >= 0),             -- 家賃（円）
  area text not null,                                  -- エリア名
  layout text not null,                                -- 間取り（例：1LDK）
  created_at timestamptz not null default now()
);

-- ユーザーごとの一覧取得を高速化
create index if not exists properties_user_id_idx on public.properties (user_id);

-- RLSを有効化
alter table public.properties enable row level security;

-- 自分が登録した物件のみ表示できる
create policy "自分の物件のみ表示" on public.properties
  for select to authenticated
  using (auth.uid() = user_id);

-- 自分のユーザーIDでのみ登録できる
create policy "自分の物件のみ登録" on public.properties
  for insert to authenticated
  with check (auth.uid() = user_id);

-- 自分の物件のみ編集できる（他人のIDへの付け替えも不可）
create policy "自分の物件のみ編集" on public.properties
  for update to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- 自分の物件のみ削除できる
create policy "自分の物件のみ削除" on public.properties
  for delete to authenticated
  using (auth.uid() = user_id);
