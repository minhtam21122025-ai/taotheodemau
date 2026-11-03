import app from '../src/server/app';

export default function handler(req: any, res: any) {
  // 1. Kiểm tra header đường dẫn gốc do Vercel cung cấp
  const original =
    req.headers['x-matched-path'] ||
    req.headers['x-forwarded-uri'] ||
    req.headers['x-original-url'] ||
    req.originalUrl;

  if (original && typeof original === 'string' && original.startsWith('/api')) {
    req.url = original;
  } else if (req.query && req.query.path) {
    const subpath = Array.isArray(req.query.path) ? req.query.path.join('/') : req.query.path;
    req.url = '/api/' + String(subpath).replace(/^\/+/, '');
  }

  // 2. Đảm bảo req.url luôn có prefix /api nếu bị rút ngắn
  if (req.url && !req.url.startsWith('/api') && (
    req.url.startsWith('/auth') ||
    req.url.startsWith('/exam') ||
    req.url.startsWith('/admin') ||
    req.url.startsWith('/health')
  )) {
    req.url = '/api' + req.url;
  }

  return app(req, res);
}
