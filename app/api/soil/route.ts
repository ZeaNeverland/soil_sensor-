// Letakkan di: app/api/soil/route.ts
import { sb, isDevice, isDash, unauthorized } from '../../lib';

async function databaseError(r: Response) {
  const detail = await r.text();
  if (detail.includes('PGRST205') || detail.includes('Could not find the table')) {
    return Response.json(
      { error: 'Tabel readings belum dibuat di Supabase' },
      { status: 500 }
    );
  }
  return Response.json({ error: 'db error' }, { status: 500 });
}

// ESP32 mengirim pembacaan sensor
export async function POST(req: Request) {
  if (!isDevice(req)) return unauthorized();

  let body: { deviceId?: string; value?: number };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: 'bad json' }, { status: 400 });
  }
  const v = Number(body.value);
  if (!body.deviceId || !Number.isFinite(v)) {
    return Response.json({ error: 'bad request' }, { status: 400 });
  }

  let r: Response;
  try {
    r = await sb('readings', {
      method: 'POST',
      headers: { Prefer: 'return=minimal' },
      body: JSON.stringify({
        device_id: body.deviceId,
        value: Math.min(100, Math.max(0, v)),
      }),
    });
  } catch (error) {
    console.error(error);
    return Response.json({ error: 'database tidak dikonfigurasi' }, { status: 500 });
  }
  if (!r.ok) return databaseError(r);
  return Response.json({ ok: true });
}

// Dashboard membaca riwayat
export async function GET(req: Request) {
  if (!isDash(req)) return unauthorized();

  const { searchParams } = new URL(req.url);
  const deviceId = searchParams.get('deviceId') ?? '';
  const limit = Math.min(200, Math.max(1, Number(searchParams.get('limit') ?? 40)));

  let r: Response;
  try {
    r = await sb(
      `readings?select=value,created_at&device_id=eq.${encodeURIComponent(
        deviceId
      )}&order=created_at.desc&limit=${limit}`
    );
  } catch (error) {
    console.error(error);
    return Response.json({ error: 'database tidak dikonfigurasi' }, { status: 500 });
  }
  if (!r.ok) return databaseError(r);

  const rows = (await r.json()) as { value: number; created_at: string }[];
  return Response.json({ readings: rows.reverse() });
}