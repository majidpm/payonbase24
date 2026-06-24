import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface EmailRequest {
  to: string;
  linkUrl: string;
  title: string;
  amount: number | null;
  description: string | null;
  senderName: string;
  expiresAt: string | null;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body: EmailRequest = await req.json();
    const { to, linkUrl, title, amount, description, senderName, expiresAt } = body;

    // Validation
    if (!to || !linkUrl || !title) {
      throw new Error("Missing required fields");
    }

    if (!RESEND_API_KEY) {
      throw new Error("RESEND_API_KEY is not configured");
    }

    // Format amount
    const amountText = amount 
      ? `$${parseFloat(amount.toString()).toFixed(2)} USDC` 
      : "any amount";

    // Format expiry
    const expiresText = expiresAt 
      ? `<p style="margin: 10px 0; color: #666; font-size: 14px;">⏰ This link expires on ${new Date(expiresAt).toLocaleDateString()}</p>`
      : "";

    // Format description
    const descriptionText = description 
      ? `<p style="color: #6b7280; margin: 10px 0; font-size: 14px;">${description}</p>`
      : "";

    // Send email via Resend
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "PayOnBase24 <onboarding@resend.dev>",
        to: [to],
        subject: `💳 Payment Request: ${title}`,
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>
          <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f3f4f6;">
            <table role="presentation" style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 20px;">
                  <table role="presentation" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
                    
                    <!-- Header -->
                    <tr>
                      <td style="background: linear-gradient(135deg, #3b82f6, #8b5cf6); padding: 40px 30px; text-align: center;">
                        <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: bold;">💳 Payment Request</h1>
                        <p style="color: #ffffff; margin: 10px 0 0 0; font-size: 16px; opacity: 0.9;">You have a new payment request</p>
                      </td>
                    </tr>
                    
                    <!-- Content -->
                    <tr>
                      <td style="padding: 30px;">
                        <p style="font-size: 16px; color: #374151; margin: 0 0 20px 0;">Hi there,</p>
                        <p style="font-size: 16px; color: #374151; margin: 0 0 20px 0;">
                          <strong style="color: #111827;">${senderName}</strong> has sent you a payment request:
                        </p>
                        
                        <!-- Payment Details Box -->
                        <table role="presentation" style="width: 100%; background-color: #f9fafb; border-radius: 12px; margin: 20px 0;">
                          <tr>
                            <td style="padding: 20px;">
                              <h2 style="margin: 0 0 10px 0; color: #111827; font-size: 20px;">${title}</h2>
                              <p style="font-size: 32px; font-weight: bold; color: #3b82f6; margin: 10px 0;">
                                ${amountText}
                              </p>
                              ${descriptionText}
                              ${expiresText}
                            </td>
                          </tr>
                        </table>
                        
                        <!-- CTA Button -->
                        <table role="presentation" style="width: 100%; margin: 30px 0;">
                          <tr>
                            <td style="text-align: center;">
                              <a href="${linkUrl}" style="display: inline-block; background: linear-gradient(135deg, #3b82f6, #8b5cf6); color: #ffffff; text-decoration: none; padding: 16px 40px; border-radius: 12px; font-weight: 600; font-size: 16px;">
                                Pay Now →
                              </a>
                            </td>
                          </tr>
                        </table>
                        
                        <!-- Security Note -->
                        <p style="font-size: 12px; color: #9ca3af; text-align: center; margin: 30px 0 0 0;">
                           This is a secure payment link powered by PayOnBase24 on Base Network
                        </p>
                      </td>
                    </tr>
                    
                    <!-- Footer -->
                    <tr>
                      <td style="background-color: #f9fafb; padding: 20px; text-align: center;">
                        <p style="font-size: 12px; color: #9ca3af; margin: 0;">
                          Powered by <strong style="color: #3b82f6;">PayOnBase24</strong> • Built on Base Network
                        </p>
                      </td>
                    </tr>
                    
                  </table>
                </td>
              </tr>
            </table>
          </body>
          </html>
        `,
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error("Resend API error:", errorData);
      throw new Error(`Failed to send email: ${response.status}`);
    }

    const responseData = await response.json();

    return new Response(
      JSON.stringify({ 
        success: true, 
        data: responseData,
        message: "Email sent successfully"
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );

  } catch (error) {
    console.error("Email function error:", error);
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      }
    );
  }
});