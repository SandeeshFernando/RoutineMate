
-- profiles
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  email text,
  avatar_url text,
  preferred_language text default 'Standard English',
  total_points integer default 0,
  current_streak integer default 0,
  longest_streak integer default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
alter table public.profiles enable row level security;
create policy "profiles_select_own" on public.profiles for select using (auth.uid() = id);
create policy "profiles_insert_own" on public.profiles for insert with check (auth.uid() = id);
create policy "profiles_update_own" on public.profiles for update using (auth.uid() = id);

-- goals
create table public.goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  category text not null,
  description text,
  deadline date,
  available_time_per_day text,
  current_level text,
  priority text,
  routine_style text,
  status text default 'active',
  progress_percentage integer default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
alter table public.goals enable row level security;
create policy "goals_all_own" on public.goals for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- tasks
create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  goal_id uuid references public.goals(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  description text,
  estimated_time text,
  priority text,
  status text default 'pending',
  due_date date,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
alter table public.tasks enable row level security;
create policy "tasks_all_own" on public.tasks for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ai_plans
create table public.ai_plans (
  id uuid primary key default gen_random_uuid(),
  goal_id uuid references public.goals(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  daily_plan text not null,
  weekly_plan text not null,
  strategy text not null,
  motivation text,
  recovery_plan text,
  challenge_plan text,
  raw_ai_response jsonb,
  created_at timestamptz default now()
);
alter table public.ai_plans enable row level security;
create policy "ai_plans_all_own" on public.ai_plans for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- daily_routines
create table public.daily_routines (
  id uuid primary key default gen_random_uuid(),
  goal_id uuid references public.goals(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  routine_date date not null,
  morning_plan text,
  main_tasks jsonb,
  break_plan text,
  evening_review text,
  completed_tasks integer default 0,
  total_tasks integer default 0,
  status text default 'pending',
  points_earned integer default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
alter table public.daily_routines enable row level security;
create policy "daily_routines_all_own" on public.daily_routines for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- reminders
create table public.reminders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  goal_id uuid references public.goals(id) on delete cascade,
  reminder_type text not null,
  reminder_time time,
  message text,
  is_active boolean default true,
  created_at timestamptz default now()
);
alter table public.reminders enable row level security;
create policy "reminders_all_own" on public.reminders for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- challenge_progress
create table public.challenge_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  goal_id uuid references public.goals(id) on delete cascade,
  day_number integer not null,
  challenge_date date,
  status text default 'pending',
  points_earned integer default 0,
  completed_at timestamptz,
  created_at timestamptz default now()
);
alter table public.challenge_progress enable row level security;
create policy "challenge_all_own" on public.challenge_progress for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- rewards
create table public.rewards (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  goal_id uuid references public.goals(id) on delete cascade,
  reward_name text not null,
  reward_type text not null,
  points_required integer,
  is_unlocked boolean default false,
  unlocked_at timestamptz,
  created_at timestamptz default now()
);
alter table public.rewards enable row level security;
create policy "rewards_all_own" on public.rewards for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- badges
create table public.badges (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  goal_id uuid references public.goals(id) on delete cascade,
  badge_name text not null,
  badge_description text,
  badge_icon text,
  day_unlocked integer,
  is_unlocked boolean default false,
  unlocked_at timestamptz,
  created_at timestamptz default now()
);
alter table public.badges enable row level security;
create policy "badges_all_own" on public.badges for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- updated_at trigger fn
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated before update on public.profiles for each row execute function public.set_updated_at();
create trigger goals_set_updated before update on public.goals for each row execute function public.set_updated_at();
create trigger tasks_set_updated before update on public.tasks for each row execute function public.set_updated_at();
create trigger daily_routines_set_updated before update on public.daily_routines for each row execute function public.set_updated_at();

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    new.raw_user_meta_data->>'avatar_url'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
