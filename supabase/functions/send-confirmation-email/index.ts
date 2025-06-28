import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  try {
    let body;
    try {
      body = await req.json();
    } catch {
      return new Response(JSON.stringify({ error: "Invalid JSON in request body", success: false }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }
    const { email, orderId, sessionId } = body;
    if (!email || !sessionId) {
      return new Response(JSON.stringify({ error: "Missing email or sessionId", success: false }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }
    const client = new SMTPClient({
      connection: {
        hostname: Deno.env.get("SMTP_HOST") || "smtp.gmail.com",
        port: parseInt(Deno.env.get("SMTP_PORT") || "587"),
        tls: true,
        auth: {
          username: Deno.env.get("SMTP_USER") || "",
          password: Deno.env.get("SMTP_PASS") || "",
        },
      },
    });
    const emailTemplate = `\
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Order Confirmation</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
            .order-details { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; }
            .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
            .button { display: inline-block; background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🎉 Order Confirmed!</h1>
              <p>Thank you for shopping with By jojo store</p>
            </div>
            <div class="content">
              <h2>Hello!</h2>
              <p>We're excited to confirm that your order has been successfully placed and is now being processed.</p>
              
              <div class="order-details">
                <h3>Order Information</h3>
                <p><strong>Order ID:</strong> ${orderId || 'Processing'}</p>
                <p><strong>Session ID:</strong> ${sessionId}</p>
                <p><strong>Email:</strong> ${email}</p>
                <p><strong>Status:</strong> Confirmed & Processing</p>
              </div>

              <p>We'll send you another email with tracking information once your order ships. In the meantime, you can contact our support team if you have any questions.</p>
              
              <a href="${Deno.env.get("FRONTEND_URL") || "http://localhost:3000"}" class="button">Continue Shopping</a>
            </div>
            <div class="footer">
              <p>Thank you for choosing By jojo store!</p>
              <p>Need help? Contact us at support@byjojostore.com</p>
            </div>
          </div>
        </body>
      </html>\
    `;
    if (Deno.env.get("SMTP_USER") && Deno.env.get("SMTP_PASS")) {
      await client.send({
        from: Deno.env.get("SMTP_USER") || "noreply@byjojostore.com",
        to: email,
        subject: "🛍️ Order Confirmation - By jojo store",
        html: emailTemplate,
      });
      await client.close();
    }
    return new Response(JSON.stringify({ 
      success: true, 
      message: "Confirmation email sent successfully",
      email: email,
      orderId: orderId
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message, success: false }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
