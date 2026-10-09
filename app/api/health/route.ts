import { health } from "@/lib/data";

export const dynamic = "force-dynamic";

/** Open this URL to check the setup: /api/health */
export async function GET() {
  const sheet = await health();
  return Response.json(
    {
      googleSheet: sheet,
      env: {
        SHEETS_API_URL: !!process.env.SHEETS_API_URL,
        SHEETS_API_TOKEN: !!process.env.SHEETS_API_TOKEN,
        MARKETING_EMAILS: process.env.MARKETING_EMAILS ? "custom" : "default (zakaria.lahmaid@jumia.com)",
        ALLOWED_EMAIL_DOMAINS: process.env.ALLOWED_EMAIL_DOMAINS ?? "default (jumia.com)",
      },
    },
    { status: sheet.ok ? 200 : 500 }
  );
}
