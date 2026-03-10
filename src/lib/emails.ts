const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://winfactpicks.com";
const LOGO_TEXT = "WinFact Picks";

function baseTemplate(headline: string, body: string, ctaText: string, ctaUrl: string): string {
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin: 0; padding: 0; background: #f1f5f9; font-family: 'Inter', Arial, sans-serif;">
  <div style="max-width: 600px; margin: 0 auto; padding: 32px 16px;">
    <!-- Header -->
    <div style="background: linear-gradient(135deg, #0B1F3B, #1168D9); padding: 24px 32px; border-radius: 16px 16px 0 0; text-align: center;">
      <h1 style="color: #ffffff; margin: 0; font-size: 22px; font-weight: 700; letter-spacing: -0.02em;">${LOGO_TEXT}</h1>
    </div>

    <!-- Body -->
    <div style="background: #ffffff; padding: 32px; border-left: 1px solid #e5e7eb; border-right: 1px solid #e5e7eb;">
      <h2 style="color: #0B1F3B; margin: 0 0 16px; font-size: 20px; font-weight: 700;">${headline}</h2>
      <div style="color: #374151; font-size: 14px; line-height: 1.7;">
        ${body}
      </div>
      ${ctaText ? `
      <div style="text-align: center; margin-top: 28px;">
        <a href="${ctaUrl}" style="display: inline-block; background: linear-gradient(135deg, #1168D9, #0BC4D9); color: #ffffff; text-decoration: none; padding: 14px 36px; border-radius: 10px; font-weight: 700; font-size: 14px;">${ctaText}</a>
      </div>` : ""}
    </div>

    <!-- Footer -->
    <div style="background: #f8fafc; padding: 20px 32px; border-radius: 0 0 16px 16px; border: 1px solid #e5e7eb; border-top: none; text-align: center;">
      <p style="margin: 0; color: #9ca3af; font-size: 11px;">
        ${LOGO_TEXT} &mdash; Data-driven sports betting picks<br>
        <a href="${SITE_URL}/unsubscribe" style="color: #9ca3af; text-decoration: underline;">Unsubscribe</a>
      </p>
    </div>
  </div>
</body>
</html>`;
}

export function welcomeEmail(planName: string, trialEndDate: string | null): { subject: string; htmlEn: string; htmlEs: string } {
  const trialLine = trialEndDate
    ? `<p>Your <strong>7-day free trial</strong> is active until <strong>${trialEndDate}</strong>. You won't be charged until then.</p>`
    : "";

  return {
    subject: "Welcome to WinFact VIP!",
    htmlEn: baseTemplate(
      "Welcome to WinFact VIP!",
      `<p>You're officially a <strong>${planName}</strong> member. Here's what's next:</p>
      ${trialLine}
      <ul style="padding-left: 20px;">
        <li>Check your <strong>Dashboard</strong> for today's picks</li>
        <li>Join our <strong>Telegram channel</strong> for instant alerts</li>
        <li>Picks are posted daily by 11am ET</li>
      </ul>
      <p>Let's start winning.</p>`,
      "Go to Dashboard",
      `${SITE_URL}/dashboard`
    ),
    htmlEs: baseTemplate(
      "\u00a1Bienvenido a WinFact VIP!",
      `<p>Ahora eres miembro de <strong>${planName}</strong>. Esto es lo que sigue:</p>
      ${trialLine}
      <ul style="padding-left: 20px;">
        <li>Revisa tu <strong>Panel</strong> para ver los picks de hoy</li>
        <li>\u00danete a nuestro <strong>canal de Telegram</strong> para alertas instant\u00e1neas</li>
        <li>Los picks se publican diariamente antes de las 11am ET</li>
      </ul>
      <p>Empecemos a ganar.</p>`,
      "Ir al Panel",
      `${SITE_URL}/dashboard`
    ),
  };
}

export function paymentFailedEmail(amountDue: string): { subject: string; htmlEn: string; htmlEs: string } {
  return {
    subject: "Action required \u2014 payment failed",
    htmlEn: baseTemplate(
      "Payment Failed",
      `<p>We weren't able to process your payment of <strong>${amountDue}</strong>.</p>
      <p>Please update your payment method to keep your VIP access. Your account will remain active for a few days while we retry, but continued failures may result in losing access to picks.</p>
      <p>This takes less than 30 seconds:</p>`,
      "Update Payment Method",
      `${SITE_URL}/api/stripe/portal`
    ),
    htmlEs: baseTemplate(
      "Pago fallido",
      `<p>No pudimos procesar tu pago de <strong>${amountDue}</strong>.</p>
      <p>Por favor actualiza tu m\u00e9todo de pago para mantener tu acceso VIP. Tu cuenta permanecer\u00e1 activa por unos d\u00edas mientras reintentamos, pero fallos continuos pueden resultar en la p\u00e9rdida de acceso a los picks.</p>
      <p>Esto toma menos de 30 segundos:</p>`,
      "Actualizar M\u00e9todo de Pago",
      `${SITE_URL}/api/stripe/portal`
    ),
  };
}

export function cancellationEmail(accessEndDate: string, promoCode: string): { subject: string; htmlEn: string; htmlEs: string } {
  return {
    subject: "Your subscription has been cancelled",
    htmlEn: baseTemplate(
      "We're sorry to see you go",
      `<p>Your WinFact VIP subscription has been cancelled. You'll continue to have access until <strong>${accessEndDate}</strong>.</p>
      <p>If you change your mind, you can resubscribe anytime. As a returning member, use code <strong>${promoCode}</strong> to get a special discount on your next subscription.</p>
      <p>We'd love to have you back.</p>`,
      "Resubscribe Now",
      `${SITE_URL}/pricing`
    ),
    htmlEs: baseTemplate(
      "Lamentamos verte ir",
      `<p>Tu suscripci\u00f3n VIP de WinFact ha sido cancelada. Continuar\u00e1s teniendo acceso hasta el <strong>${accessEndDate}</strong>.</p>
      <p>Si cambias de opini\u00f3n, puedes resuscribirte en cualquier momento. Como miembro que regresa, usa el c\u00f3digo <strong>${promoCode}</strong> para obtener un descuento especial en tu pr\u00f3xima suscripci\u00f3n.</p>
      <p>Nos encantar\u00eda tenerte de vuelta.</p>`,
      "Resuscribirse",
      `${SITE_URL}/pricing`
    ),
  };
}

export function upgradeConfirmationEmail(newPlanName: string): { subject: string; htmlEn: string; htmlEs: string } {
  return {
    subject: `You're now ${newPlanName}!`,
    htmlEn: baseTemplate(
      `You're now ${newPlanName}!`,
      `<p>Your plan has been upgraded to <strong>${newPlanName}</strong>. You now have full access to all VIP features.</p>
      <p>Check your dashboard for today's picks!</p>`,
      "View Dashboard",
      `${SITE_URL}/dashboard`
    ),
    htmlEs: baseTemplate(
      `\u00a1Ahora eres ${newPlanName}!`,
      `<p>Tu plan ha sido actualizado a <strong>${newPlanName}</strong>. Ahora tienes acceso completo a todas las funciones VIP.</p>
      <p>\u00a1Revisa tu panel para ver los picks de hoy!</p>`,
      "Ver Panel",
      `${SITE_URL}/dashboard`
    ),
  };
}

export function renewalReminderEmail(planName: string, renewalDate: string, amount: string): { subject: string; htmlEn: string; htmlEs: string } {
  return {
    subject: `Your ${planName} subscription renews in 2 days`,
    htmlEn: baseTemplate(
      "Subscription Renewal Reminder",
      `<p>Just a heads up \u2014 your <strong>${planName}</strong> subscription will renew on <strong>${renewalDate}</strong> for <strong>${amount}</strong>.</p>
      <p>No action is needed if you'd like to continue. If you want to make changes to your plan or update your payment method, you can do so from your billing portal.</p>`,
      "Manage Billing",
      `${SITE_URL}/api/stripe/portal`
    ),
    htmlEs: baseTemplate(
      "Recordatorio de Renovaci\u00f3n",
      `<p>Solo un aviso \u2014 tu suscripci\u00f3n <strong>${planName}</strong> se renovar\u00e1 el <strong>${renewalDate}</strong> por <strong>${amount}</strong>.</p>
      <p>No se necesita acci\u00f3n si deseas continuar. Si quieres hacer cambios a tu plan o actualizar tu m\u00e9todo de pago, puedes hacerlo desde tu portal de facturaci\u00f3n.</p>`,
      "Administrar Facturaci\u00f3n",
      `${SITE_URL}/api/stripe/portal`
    ),
  };
}
