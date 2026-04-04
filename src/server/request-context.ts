function normalizeIp(value: string | null) {
  if (!value) {
    return null;
  }

  const trimmed = value.trim();
  return trimmed || null;
}

function firstForwardedIp(value: string | null) {
  if (!value) {
    return null;
  }

  const candidate = value.split(",")[0]?.trim();
  return candidate || null;
}

export function readRequestIp(request: Request) {
  // Prefer edge-provider derived IP headers before generic forwarded headers.
  const connectingIp = normalizeIp(request.headers.get("cf-connecting-ip"));
  const realIp = normalizeIp(request.headers.get("x-real-ip"));
  const forwardedFor = firstForwardedIp(request.headers.get("x-forwarded-for"));

  return connectingIp || realIp || forwardedFor || null;
}

export function readRequestUserAgent(request: Request) {
  return request.headers.get("user-agent")?.trim() || null;
}