-- Supabase SQL Editor에서 실행하세요.
-- 요청에 따라 Supabase Auth 없이 공개 anon key로 읽고 씁니다.
create table if not exists public.site_content (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);
alter table public.site_content enable row level security;
grant select on public.site_content to anon, authenticated;
grant insert, update, delete on public.site_content to anon, authenticated;

drop policy if exists "public can read site content" on public.site_content;
create policy "public can read site content" on public.site_content
  for select to anon, authenticated using (true);
drop policy if exists "admins manage site content" on public.site_content;
drop policy if exists "website can edit site content" on public.site_content;
create policy "website can edit site content" on public.site_content
  for all to anon, authenticated using (true) with check (true);

-- 광고/주보 파일은 공개 사이트에 표시되어 누구나 읽을 수 있습니다.
-- Auth 없이 웹에서 업로드하도록 anon insert를 허용합니다.
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
