-- Esquema inicial. Se você já criou essas tabelas no seu projeto Supabase, não execute novamente sem revisar.
create extension if not exists pgcrypto;

create table if not exists public.companies (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(btrim(name)) between 2 and 120),
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now()
);

create table if not exists public.company_members (
  company_id uuid not null references public.companies(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'member' check (role in ('owner','admin','member')),
  created_at timestamptz not null default now(),
  primary key (company_id,user_id)
);

create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  name text not null,
  kind text not null check (kind in ('income','expense')),
  created_at timestamptz not null default now(),
  unique(company_id,name,kind)
);

create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  category_id uuid references public.categories(id) on delete set null,
  kind text not null check (kind in ('income','expense')),
  description text not null,
  amount numeric(12,2) not null check (amount > 0),
  transaction_date date not null default current_date,
  payment_method text,
  notes text,
  created_by uuid not null default auth.uid() references auth.users(id),
  created_at timestamptz not null default now()
);

create or replace function public.is_company_member(target_company uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.company_members m where m.company_id = target_company and m.user_id = auth.uid());
$$;
revoke all on function public.is_company_member(uuid) from public;
grant execute on function public.is_company_member(uuid) to authenticated;

alter table public.companies enable row level security;
alter table public.company_members enable row level security;
alter table public.categories enable row level security;
alter table public.transactions enable row level security;

drop policy if exists companies_select_members on public.companies;
create policy companies_select_members on public.companies for select to authenticated using (public.is_company_member(id));
drop policy if exists members_select_same_company on public.company_members;
create policy members_select_same_company on public.company_members for select to authenticated using (public.is_company_member(company_id));
drop policy if exists categories_member_all on public.categories;
create policy categories_member_all on public.categories for all to authenticated using (public.is_company_member(company_id)) with check (public.is_company_member(company_id));
drop policy if exists transactions_member_all on public.transactions;
create policy transactions_member_all on public.transactions for all to authenticated using (public.is_company_member(company_id)) with check (public.is_company_member(company_id));

create or replace function public.create_company(company_name text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare new_company_id uuid; current_user_id uuid;
begin
  current_user_id := auth.uid();
  if current_user_id is null then raise exception 'É necessário estar conectado.'; end if;
  if company_name is null or pg_catalog.length(pg_catalog.btrim(company_name)) < 2 or pg_catalog.length(pg_catalog.btrim(company_name)) > 120 then raise exception 'O nome deve ter entre 2 e 120 caracteres.'; end if;
  insert into public.companies(name,created_by) values(pg_catalog.btrim(company_name),current_user_id) returning id into new_company_id;
  insert into public.company_members(company_id,user_id,role) values(new_company_id,current_user_id,'owner');
  return new_company_id;
end;
$$;
revoke all on function public.create_company(text) from public, anon;
grant execute on function public.create_company(text) to authenticated;
