-- Supabase SQL Editor에서 실행하세요.
create table if not exists public.students (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid unique not null references auth.users(id) on delete cascade,
  name text not null,
  grade text not null check (grade in ('중1', '중2', '중3')),
  birthday text,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.attendance (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete cascade,
  attended_on date not null default current_date,
  created_at timestamptz not null default now(),
  unique (student_id, attended_on)
);

create table if not exists public.site_content (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.students enable row level security;
alter table public.attendance enable row level security;
alter table public.site_content enable row level security;
grant select on public.students, public.attendance, public.site_content to anon, authenticated;
grant insert, delete on public.attendance to anon, authenticated;
grant insert, update, delete on public.site_content to authenticated;

drop policy if exists "public can view active student roster" on public.students;
create policy "public can view active student roster" on public.students
  for select to anon, authenticated using (active = true);
drop policy if exists "public can view attendance" on public.attendance;
create policy "public can view attendance" on public.attendance
  for select to anon, authenticated using (true);
drop policy if exists "admins manage attendance" on public.attendance;
create policy "website can update attendance" on public.attendance
  for all to anon, authenticated using (true) with check (true);

drop policy if exists "public can read site content" on public.site_content;
create policy "public can read site content" on public.site_content
  for select to anon, authenticated using (true);
drop policy if exists "admins manage site content" on public.site_content;
drop policy if exists "website can edit site content" on public.site_content;
create policy "website can edit site content" on public.site_content
  for all to anon, authenticated using (true) with check (true);

-- 광고/주보 이미지는 누구나 볼 수 있고 공개 anon key로 업로드할 수 있습니다.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('public-materials', 'public-materials', true, 10485760, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update set public = true, file_size_limit = 10485760,
  allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp'];

drop policy if exists "public can view ministry images" on storage.objects;
create policy "public can view ministry images" on storage.objects
  for select to anon, authenticated using (bucket_id = 'public-materials');
drop policy if exists "admins upload ministry images" on storage.objects;
drop policy if exists "website can upload ministry images" on storage.objects;
create policy "website can upload ministry images" on storage.objects
  for insert to anon, authenticated with check (bucket_id = 'public-materials');
drop policy if exists "admins update ministry images" on storage.objects;
drop policy if exists "website can update ministry images" on storage.objects;
drop policy if exists "admins delete ministry images" on storage.objects;
drop policy if exists "website can delete ministry images" on storage.objects;

-- 계정 생성 Edge Function이 service role로 students를 등록합니다.
