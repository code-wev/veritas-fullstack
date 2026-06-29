import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { email, password, fullName } = await req.json();

    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (!RESEND_API_KEY) {
      return new Response(
        JSON.stringify({ 
          error: "RESEND_API_KEY is not configured on the Supabase Edge Function environment.",
          emailSent: false
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "Veritas Onboarding <onboarding@resend.dev>",
        to: [email],
        subject: "Welcome to Veritas AML Platform - Your Credentials",
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
            <h2 style="color: #1E3A8A; margin-bottom: 4px;">Veritas Compliance Platform</h2>
            <p style="color: #64748B; font-size: 14px; margin-top: 0; margin-bottom: 24px;">Secure AML Auditing & Review</p>
            
            <p>Hello <strong>${fullName}</strong>,</p>
            <p>An administrator has created a client user account for you. You can log in using the temporary credentials below:</p>
            
            <div style="background-color: #F8FAFC; border: 1px solid #E2E8F0; padding: 16px; border-radius: 6px; margin: 20px 0;">
              <p style="margin: 0 0 8px 0; font-size: 14px;"><strong>Login Email:</strong> <span style="font-family: monospace;">${email}</span></p>
              <p style="margin: 0; font-size: 14px;"><strong>Temporary Password:</strong> <span style="font-family: monospace;">${password}</span></p>
            </div>
            
            <p><strong>Next Steps:</strong></p>
            <p>For your security, you will be prompted to change this temporary password and complete your profile setup (including uploading an optional profile picture) upon your first login.</p>
            
            <hr style="border: 0; border-top: 1px solid #E2E8F0; margin: 24px 0;" />
            <p style="color: #94A3B8; font-size: 12px; line-height: 1.5; margin: 0;">
              This is an automated onboarding notification. Please contact your Veritas compliance administrator if you did not request this account.
            </p>
          </div>
        `,
      }),
    });

    if (!res.ok) {
      const errorText = await res.text();
      return new Response(
        JSON.stringify({ 
          error: `Resend API returned status ${res.status}: ${errorText}`,
          emailSent: false 
        }),
        { status: res.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await res.json();
    return new Response(
      JSON.stringify({ message: "Email sent successfully", emailSent: true, data }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: error.message, emailSent: false }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
