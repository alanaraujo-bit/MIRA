export type AudienceContext = {
  countryCode: string;
  regionCode: string | null;
  languageCode: string;
  operatingSystem: string;
  browser: string;
};

function normalizedCode(value: string | null, pattern: RegExp): string | null {
  const normalized = value?.trim().toUpperCase() ?? "";
  return pattern.test(normalized) ? normalized : null;
}

export function countryCode(value: string | null): string {
  return normalizedCode(value, /^[A-Z]{2}$/) ?? "unknown";
}

export function regionCode(value: string | null): string | null {
  return normalizedCode(value, /^[A-Z0-9]{1,3}$/);
}

export function preferredLanguage(value: string | null): string {
  const candidate = value?.split(",", 1)[0]?.split(";", 1)[0]?.trim();
  if (!candidate || candidate === "*" || !/^[a-zA-Z]{2,3}(?:-[a-zA-Z]{2}|-[0-9]{3})?$/.test(candidate)) return "unknown";
  const [language, region] = candidate.split("-");
  return region ? `${language.toLowerCase()}-${region.toUpperCase()}` : language.toLowerCase();
}

export function classifyOperatingSystem(userAgent: string | null): string {
  if (!userAgent) return "Unknown";
  if (/bot|crawler|spider|preview|facebookexternalhit|slackbot/i.test(userAgent)) return "Automation";
  if (/iphone|ipad|ipod/i.test(userAgent)) return "iOS";
  if (/android/i.test(userAgent)) return "Android";
  if (/cros/i.test(userAgent)) return "ChromeOS";
  if (/windows/i.test(userAgent)) return "Windows";
  if (/mac os x|macintosh/i.test(userAgent)) return "macOS";
  if (/linux/i.test(userAgent)) return "Linux";
  return "Other";
}

export function classifyBrowser(userAgent: string | null): string {
  if (!userAgent) return "Unknown";
  if (/bot|crawler|spider|preview|facebookexternalhit|slackbot/i.test(userAgent)) return "Automation";
  if (/samsungbrowser/i.test(userAgent)) return "Samsung Internet";
  if (/edg(?:e|a|ios)?\//i.test(userAgent)) return "Edge";
  if (/firefox|fxios/i.test(userAgent)) return "Firefox";
  if (/crios|chrome|chromium/i.test(userAgent)) return "Chrome";
  if (/safari/i.test(userAgent)) return "Safari";
  return "Other";
}

export function audienceContext(headers: Headers): AudienceContext {
  const userAgent = headers.get("user-agent");
  return {
    countryCode: countryCode(headers.get("x-vercel-ip-country")),
    regionCode: regionCode(headers.get("x-vercel-ip-country-region")),
    languageCode: preferredLanguage(headers.get("accept-language")),
    operatingSystem: classifyOperatingSystem(userAgent),
    browser: classifyBrowser(userAgent),
  };
}
