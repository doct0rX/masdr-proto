import { cookies } from "next/headers";
import type { Lang } from "./strings";

export const LANG_COOKIE = "masdr_lang";

export async function getLang(): Promise<Lang> {
  const c = await cookies();
  return c.get(LANG_COOKIE)?.value === "ar" ? "ar" : "en";
}
