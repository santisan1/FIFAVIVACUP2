export interface VercelRequest {
  method?: string;
  headers: Record<string, string | string[] | undefined>;
  body?: unknown;
}

export interface VercelResponse {
  status: (code: number) => VercelResponse;
  json: (body: unknown) => void;
  setHeader: (name: string, value: string) => void;
}

export function readBody<T extends Record<string, unknown>>(req: VercelRequest): T {
  return typeof req.body === 'string' ? JSON.parse(req.body) as T : (req.body ?? {}) as T;
}

export function methodNotAllowed(res: VercelResponse) {
  res.setHeader('Allow', 'POST');
  return res.status(405).json({ error: 'Method not allowed' });
}
