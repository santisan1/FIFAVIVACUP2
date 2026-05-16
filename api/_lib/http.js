export function readBody(req) {
    return typeof req.body === 'string' ? JSON.parse(req.body) : (req.body ?? {});
}
export function methodNotAllowed(res) {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
}
