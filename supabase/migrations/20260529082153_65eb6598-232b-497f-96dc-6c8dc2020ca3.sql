
-- Status enums
create type public.project_status as enum ('draft', 'active', 'in_review', 'completed', 'archived');
create type public.rate_type as enum ('hourly', 'fixed');
create type public.scope_status as enum ('pending', 'in_progress', 'done');

-- Projects
create table public.projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  description text,
  client_name text,
  client_email text,
  status public.project_status not null default 'draft',
  rate_type public.rate_type not null default 'hourly',
  rate_amount numeric(12,2),
  currency text not null default 'USD',
  deadline date,
  color text not null default '#7F77DD',
  position int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

grant select, insert, update, delete on public.projects to authenticated;
grant all on public.projects to service_role;

alter table public.projects enable row level security;

create policy "Users select own projects" on public.projects
  for select to authenticated using (user_id = auth.uid());
create policy "Users insert own projects" on public.projects
  for insert to authenticated with check (user_id = auth.uid());
create policy "Users update own projects" on public.projects
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "Users delete own projects" on public.projects
  for delete to authenticated using (user_id = auth.uid());

create trigger projects_set_updated_at
  before update on public.projects
  for each row execute function public.set_updated_at();

create index projects_user_status_idx on public.projects (user_id, status);

-- Scope items
create table public.scope_items (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  description text,
  status public.scope_status not null default 'pending',
  position int not null default 0,
  estimated_hours numeric(6,2),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

grant select, insert, update, delete on public.scope_items to authenticated;
grant all on public.scope_items to service_role;

alter table public.scope_items enable row level security;

create policy "Users select own scope_items" on public.scope_items
  for select to authenticated using (user_id = auth.uid());
create policy "Users insert own scope_items" on public.scope_items
  for insert to authenticated with check (user_id = auth.uid());
create policy "Users update own scope_items" on public.scope_items
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "Users delete own scope_items" on public.scope_items
  for delete to authenticated using (user_id = auth.uid());

create trigger scope_items_set_updated_at
  before update on public.scope_items
  for each row execute function public.set_updated_at();

create index scope_items_project_idx on public.scope_items (project_id);

-- Time entries
create table public.time_entries (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  description text,
  duration_minutes int not null check (duration_minutes >= 0),
  entry_date date not null default current_date,
  created_at timestamptz not null default now()
);

grant select, insert, update, delete on public.time_entries to authenticated;
grant all on public.time_entries to service_role;

alter table public.time_entries enable row level security;

create policy "Users select own time_entries" on public.time_entries
  for select to authenticated using (user_id = auth.uid());
create policy "Users insert own time_entries" on public.time_entries
  for insert to authenticated with check (user_id = auth.uid());
create policy "Users update own time_entries" on public.time_entries
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "Users delete own time_entries" on public.time_entries
  for delete to authenticated using (user_id = auth.uid());

create index time_entries_project_idx on public.time_entries (project_id, entry_date desc);

-- Templates
create table public.templates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  category text,
  content jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

grant select, insert, update, delete on public.templates to authenticated;
grant all on public.templates to service_role;

alter table public.templates enable row level security;

create policy "Users select own templates" on public.templates
  for select to authenticated using (user_id = auth.uid());
create policy "Users insert own templates" on public.templates
  for insert to authenticated with check (user_id = auth.uid());
create policy "Users update own templates" on public.templates
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "Users delete own templates" on public.templates
  for delete to authenticated using (user_id = auth.uid());

create trigger templates_set_updated_at
  before update on public.templates
  for each row execute function public.set_updated_at();
