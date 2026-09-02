export const ACCESS_COOKIE = "masdr_access";

/** SHA-256 hex via Web Crypto so it runs in both the proxy and Node route handlers. */
export async function sha256Hex(input: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export function accessCodeConfigured(): boolean {
  return !!process.env.ACCESS_CODE && process.env.ACCESS_CODE.length > 0;
}

export async function expectedAccessToken(): Promise<string> {
  return sha256Hex(`masdr-proto:${process.env.ACCESS_CODE ?? ""}`);
}
