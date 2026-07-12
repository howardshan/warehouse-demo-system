-- ============================================================
-- Migration: 0002_user_profiles.sql
-- 守护铁律: 铁律 4/5/6（角色是 RLS 与信用/审批护栏的前提）
-- 目的:   把 auth.users 映射到业务角色。没有角色就无法在 DB 层
--          强制「只有 finance 能 block 客户」等规则。
-- 关联文档: /docs/modules/01-master-data.md
-- 关联 ADR: —
-- 回滚:   drop table user_profiles;
-- ============================================================

create table user_profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  full_name   text,
  role        app_role not null,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create or replace function public.current_user_role()
returns app_role
language sql
stable
security definer
set search_path = public
as $$
  select role from public.user_profiles
  where id = auth.uid() and is_active = true
$$;

create or replace function public.has_role(allowed app_role[])
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select role = any(allowed) from public.user_profiles
     where id = auth.uid() and is_active = true),
    false
  )
$$;

create or replace function public.handle_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger trg_user_profiles_updated_at
  before update on user_profiles
  for each row execute function public.handle_updated_at();

-- 新用户注册时自动建空档（角色需 admin 事后指定）
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.user_profiles (id, full_name, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.email),
    coalesce((new.raw_user_meta_data->>'role')::app_role, 'sales')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
