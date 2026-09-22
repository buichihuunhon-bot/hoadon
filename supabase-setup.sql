-- Chạy một lần trong Supabase Dashboard > SQL Editor.
-- Chỉ tài khoản đã đăng nhập mới đọc và ghi được bản dữ liệu của chính mình.
create table if not exists public.invoice_snapshots (
    user_id uuid primary key references auth.users(id) on delete cascade,
    payload jsonb not null check (jsonb_typeof(payload) = 'object'),
    revision bigint not null default 1 check (revision > 0),
    updated_at timestamptz not null default now()
);

alter table public.invoice_snapshots enable row level security;

revoke all on public.invoice_snapshots from anon;
revoke all on public.invoice_snapshots from authenticated;
grant select, insert, update on public.invoice_snapshots to authenticated;

drop policy if exists invoice_snapshots_select_own on public.invoice_snapshots;
create policy invoice_snapshots_select_own on public.invoice_snapshots
    for select to authenticated using ((select auth.uid()) = user_id);

drop policy if exists invoice_snapshots_insert_own on public.invoice_snapshots;
create policy invoice_snapshots_insert_own on public.invoice_snapshots
    for insert to authenticated with check ((select auth.uid()) = user_id);

drop policy if exists invoice_snapshots_update_own on public.invoice_snapshots;
create policy invoice_snapshots_update_own on public.invoice_snapshots
    for update to authenticated
    using ((select auth.uid()) = user_id)
    with check ((select auth.uid()) = user_id);
