export function readCookie(req, name) {
  const header = req.headers.cookie || "";
  const cookies = header.split(";").map((e) => e.trim()).filter(Boolean);

  for (const cookie of cookies) {
    const sep = cookie.indexOf("=");
    if (sep === -1) continue;
    const cookieName = decodeURIComponent(cookie.slice(0, sep));
    if (cookieName === name) {
      return decodeURIComponent(cookie.slice(sep + 1));
    }
  }

  return "";
}
