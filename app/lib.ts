const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

export function sb(path: string, init?: RequestInit) {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error(
      'SUPABASE_URL dan SUPABASE_SERVICE_ROLE_KEY harus dikonfigurasi'
    );
  }

  const headers = new Headers(init?.headers);
  headers.set('apikey', SUPABASE_SERVICE_ROLE_KEY);
  headers.set('Authorization', `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`);

  return fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...init,
    headers,
  });
}

export function isDevice(req: Request) {
  return Boolean(process.env.DEVICE_KEY) &&
    req.headers.get('x-device-key') === process.env.DEVICE_KEY;
}

export function isDash(req: Request) {
  return Boolean(process.env.DASH_KEY) &&
    req.headers.get('x-dash-key') === process.env.DASH_KEY;
}

export function unauthorized() {
  return Response.json({ error: 'unauthorized' }, { status: 401 });
}
