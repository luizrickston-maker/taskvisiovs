const BASE = process.env.SUPABASE_URL || 'https://gvjvwirlgzrmmeekpyzh.supabase.co';
const KEY  = process.env.SUPABASE_SERVICE_KEY; // passe via: SUPABASE_SERVICE_KEY=sb_secret_... node scripts/discover-users.mjs
const H    = { apikey: KEY, Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' };

async function get(path) {
  const r = await fetch(new URL(path, BASE).href, { headers: H });
  return r.json();
}

const UUIDS = [
  '0127a209-34af-4a06-af61-98283056ec97',
  'b2b019ba-198c-4a06-95cd-24302c7a9719',
  'f8ccc355-4e3a-4f84-a4fc-fdc98ddc1cb1',
];

// Tenta identificar via user_roles, corporate_team, workspaces
const roles    = await get('/rest/v1/user_roles?select=user_id,role');
const worksp   = await get('/rest/v1/workspaces?select=id,owner_user_id,name');
const ct       = await get('/rest/v1/corporate_team?select=member_user_id,name');
const wm       = await get('/rest/v1/workspace_members?select=user_id,role,workspace_id');

console.log('user_roles:',  JSON.stringify(roles,  null, 2));
console.log('workspaces:',  JSON.stringify(worksp, null, 2));
console.log('corporate_team:', JSON.stringify(ct,  null, 2));
console.log('workspace_members:', JSON.stringify(wm, null, 2));

// Tenta buscar cada UUID no auth admin
for (const id of UUIDS) {
  const r = await fetch(new URL(`/auth/v1/admin/users/${id}`, BASE).href, { headers: H });
  const u = await r.json();
  console.log(`\nUUID ${id}:`, u.email || u.message || JSON.stringify(u));
}