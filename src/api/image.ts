export default async function handler(req: any, res: any) {
    const path = Array.isArray(req.query.path)
      ? req.query.path.join('/')
      : req.query.path;
  
    const response = await fetch(
      `https://uploads.mangadex.org/${path}`
    );
  
    const buffer = await response.arrayBuffer();
  
    res.setHeader(
      'Content-Type',
      response.headers.get('content-type') || 'image/jpeg'
    );
  
    res.send(Buffer.from(buffer));
  }