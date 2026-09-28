import { SUPABASE_URL, SUPABASE_ANON_KEY, CREATE_STUDENT_FUNCTION } from './supabase-config.js';

export const supabaseReady = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

async function request(path, options = {}) {
  if (!supabaseReady) throw new Error('Supabase 설정이 아직 입력되지 않았습니다.');
  const response = await fetch(`${SUPABASE_URL.replace(/\/$/, '')}/rest/v1/${path}`, {
    ...options,
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
      ...options.headers,
    },
  });
  const result = response.status === 204 ? null : await response.json().catch(() => null);
  if (!response.ok) throw new Error(result?.message || result?.msg || 'Supabase 요청에 실패했습니다.');
  return result;
}

export async function listStudents() {
  const rows = await request('students?select=id,name,grade,birthday&active=eq.true&order=name.asc');
  return rows || [];
}

export async function listAttendance(date) {
  return (await request(`attendance?select=student_id&attended_on=eq.${encodeURIComponent(date)}`) || []).map((row) => row.student_id);
}

export async function markAttendance(studentId, date, present) {
  if (present) {
    await request('attendance?on_conflict=student_id,attended_on', {
      method: 'POST', headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
      body: JSON.stringify({ student_id: studentId, attended_on: date }),
    });
  } else {
    await request(`attendance?student_id=eq.${encodeURIComponent(studentId)}&attended_on=eq.${encodeURIComponent(date)}`, { method: 'DELETE' });
  }
}

export async function createStudentAccount({ name, grade, birthday, username, password }) {
  if (!supabaseReady) throw new Error('먼저 supabase-config.js에 Supabase URL과 anon key를 입력하세요.');
  const response = await fetch(`${SUPABASE_URL.replace(/\/$/, '')}/functions/v1/${CREATE_STUDENT_FUNCTION}`, {
    method: 'POST',
    headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, grade, birthday, username, password }),
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result.error || '학생 계정을 만들지 못했습니다.');
  return result.student;
}

export async function loadSiteContent() {
  const records = await request('site_content?select=key,value');
  return Object.fromEntries((records || []).map(({ key, value }) => [key, value]));
}

export async function saveSiteContent(key, value) {
  await request('site_content?on_conflict=key', {
    method: 'POST',
    headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
    body: JSON.stringify({ key, value, updated_at: new Date().toISOString() }),
  });
}

export async function uploadPublicImage(file, folder = 'bulletins') {
  const extension = file.name.includes('.') ? file.name.split('.').pop().toLowerCase().replace(/[^a-z0-9]/g, '') : 'jpg';
  const path = `${folder}/${crypto.randomUUID()}.${extension || 'jpg'}`;
  const baseUrl = SUPABASE_URL.replace(/\/$/, '');
  const response = await fetch(`${baseUrl}/storage/v1/object/public-materials/${path.split('/').map(encodeURIComponent).join('/')}`, {
    method: 'POST', headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}`, 'Content-Type': file.type || 'application/octet-stream', 'x-upsert': 'false' }, body: file,
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result.message || result.error || '이미지 업로드에 실패했습니다.');
  return `${baseUrl}/storage/v1/object/public/public-materials/${path.split('/').map(encodeURIComponent).join('/')}`;
}
