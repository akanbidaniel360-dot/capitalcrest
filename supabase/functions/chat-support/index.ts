import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { messages, context } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const userCtx = context
      ? `User context: name=${context.name ?? "unknown"}, primary currency=${context.currency ?? "USD"}, KYC=${context.kyc ?? "none"}.`
      : "";

    const system = `You are Crest, the friendly 24/7 support assistant for Capital Crest — a premium digital banking platform.
${userCtx}

You can help with: account questions, deposits, withdrawals, transfers (local + international), crypto deposits (USDT ERC-20 to 0x56eeb7f7bfab320389b5a1a2666dd290e7cbc645, $100 minimum, auto-credited), virtual cards, loans, savings, currency conversion, grants, tax refunds, KYC verification, and general banking guidance.

Tone: warm, concise, confident, fintech-professional. Use clear short paragraphs. Use simple bullet points when listing steps.

Important rules:
- Never ask for or reveal passwords, full card numbers, CVV, or transaction PINs.
- For account-specific actions, guide the user to the right page (e.g. "/transfer", "/deposit", "/grants", "/tax-refund", "/settings").
- For complex disputes or account freezes, recommend emailing support@capitalcrest.app.
- Be direct: if you don't know, say so.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [{ role: "system", content: system }, ...messages],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limits exceeded, try again shortly." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "AI gateway error" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("chat-support error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
