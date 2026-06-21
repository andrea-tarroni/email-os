import { Request, Response, NextFunction } from "express";

export function adminAuth(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  const expectedUser = process.env.ADMIN_USERNAME ?? "";
  const expectedPass = process.env.ADMIN_PASSWORD ?? "";

  if (header?.startsWith("Basic ")) {
    const decoded = Buffer.from(header.slice(6), "base64").toString("utf8");
    const [user, pass] = decoded.split(":");
    if (user === expectedUser && pass === expectedPass) {
      return next();
    }
  }

  res.set("WWW-Authenticate", 'Basic realm="Email OS Admin"');
  res.status(401).send("Authentication required");
}
