const RELATIVE_BASE = "http://relative.invalid";

export function keepCampaignParams(rawUrl: string): string {
  const url = new URL(rawUrl, RELATIVE_BASE);
  const campaignParams = new URLSearchParams();

  for (const [name, value] of url.searchParams) {
    if (name.startsWith("utm_")) campaignParams.append(name, value);
  }

  url.search = campaignParams.toString();
  url.hash = "";

  if (url.origin === RELATIVE_BASE) return `${url.pathname}${url.search}`;
  return url.toString();
}
