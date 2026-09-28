import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (request.method !== 'POST') return respond({ error: 'POST 요청만 허용됩니다.' }, 405);

  const url = Deno.env.get('SUPABASE_URL');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !serviceKey) return respond({ error: '서버 환경 변수가 설정되지 않았습니다.' }, 500);

  const { name, grade, birthday, username, password } = await request.json().catch(() => ({}));
  const normalizedUsername = typeof username === 'string' ? username.trim().toLowerCase() : '';
  if (!name?.trim() || !['중1', '중2', '중3'].includes(grade) || !/^[a-z0-9._-]{3,30}$/.test(normalizedUsername) || typeof password !== 'string' || password.length < 8) {
    return respond({ error: '이름, 학년, 아이디(영문/숫자 3자 이상), 8자 이상 비밀번호를 확인해 주세요.' }, 400);
  }

  const admin = createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });
  const email = `${normalizedUsername}@starteens.local`;
  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email, password, email_confirm: true, user_metadata: { name: name.trim(), grade }, app_metadata: { role: 'student' },
  });
  if (createError) return respond({ error: createError.message }, 400);

  const { data: student, error: insertError } = await admin.from('students').insert({
    auth_user_id: created.user.id, name: name.trim(), grade, birthday: birthday?.trim() || null,
  }).select('id,name,grade,birthday').single();
  if (insertError) {
    await admin.auth.admin.deleteUser(created.user.id);
    return respond({ error: insertError.message }, 500);
  }
  return respond({ student }, 201);
});

function respond(body, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
}
