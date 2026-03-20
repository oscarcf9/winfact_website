import crypto from "crypto";
import { escapeHtml } from "@/lib/utils";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://winfactpicks.com";
const LOGO_TEXT = "WinFact Picks";

function getUnsubscribeSecret(): string {
  const secret = process.env.UNSUBSCRIBE_SECRET;
  if (!secret) {
    throw new Error("UNSUBSCRIBE_SECRET environment variable is required");
  }
  return secret;
}

export function generateUnsubscribeUrl(email: string): string {
  const secret = getUnsubscribeSecret();
  const token = crypto.createHmac("sha256", secret).update(email).digest("hex");
  return `${SITE_URL}/api/unsubscribe?email=${encodeURIComponent(email)}&token=${token}`;
}

function baseTemplate(headline: string, body: string, ctaText: string, ctaUrl: string, recipientEmail?: string): string {
  const unsubUrl = recipientEmail ? generateUnsubscribeUrl(recipientEmail) : `${SITE_URL}/api/unsubscribe`;
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
        Miami, FL &bull; support@winfactpicks.com<br>
        <a href="${unsubUrl}" style="color: #9ca3af; text-decoration: underline;">Unsubscribe</a>
      </p>
    </div>
  </div>
</body>
</html>`;
}

export function welcomeEmail(planName: string, trialEndDate: string | null, recipientEmail?: string): { subject: string; htmlEn: string; htmlEs: string } {
  const safePlan = escapeHtml(planName);
  const safeDate = trialEndDate ? escapeHtml(trialEndDate) : null;
  const trialLine = safeDate
    ? `<p>Your <strong>7-day free trial</strong> is active until <strong>${safeDate}</strong>. You won't be charged until then.</p>`
    : "";

  return {
    subject: "Welcome to WinFact VIP!",
    htmlEn: baseTemplate(
      "Welcome to WinFact VIP!",
      `<p>You're officially a <strong>${safePlan}</strong> member. Here's what's next:</p>
      ${trialLine}
      <ul style="padding-left: 20px;">
        <li>Check your <strong>Dashboard</strong> for today's picks</li>
        <li>Join our <strong>Telegram channel</strong> for instant alerts</li>
        <li>Picks are posted daily by 11am ET</li>
      </ul>
      <p>Let's start winning.</p>`,
      "Go to Dashboard",
      `${SITE_URL}/dashboard`,
      recipientEmail
    ),
    htmlEs: baseTemplate(
      "\u00a1Bienvenido a WinFact VIP!",
      `<p>Ahora eres miembro de <strong>${safePlan}</strong>. Esto es lo que sigue:</p>
      ${trialLine}
      <ul style="padding-left: 20px;">
        <li>Revisa tu <strong>Panel</strong> para ver los picks de hoy</li>
        <li>\u00danete a nuestro <strong>canal de Telegram</strong> para alertas instant\u00e1neas</li>
        <li>Los picks se publican diariamente antes de las 11am ET</li>
      </ul>
      <p>Empecemos a ganar.</p>`,
      "Ir al Panel",
      `${SITE_URL}/dashboard`,
      recipientEmail
    ),
  };
}

export function paymentFailedEmail(amountDue: string, recipientEmail?: string): { subject: string; htmlEn: string; htmlEs: string } {
  const safeAmount = escapeHtml(amountDue);
  return {
    subject: "Action required \u2014 payment failed",
    htmlEn: baseTemplate(
      "Payment Failed",
      `<p>We weren't able to process your payment of <strong>${safeAmount}</strong>.</p>
      <p>Please update your payment method to keep your VIP access. Your account will remain active for a few days while we retry, but continued failures may result in losing access to picks.</p>
      <p>This takes less than 30 seconds:</p>`,
      "Update Payment Method",
      `${SITE_URL}/api/stripe/portal`,
      recipientEmail
    ),
    htmlEs: baseTemplate(
      "Pago fallido",
      `<p>No pudimos procesar tu pago de <strong>${safeAmount}</strong>.</p>
      <p>Por favor actualiza tu m\u00e9todo de pago para mantener tu acceso VIP. Tu cuenta permanecer\u00e1 activa por unos d\u00edas mientras reintentamos, pero fallos continuos pueden resultar en la p\u00e9rdida de acceso a los picks.</p>
      <p>Esto toma menos de 30 segundos:</p>`,
      "Actualizar M\u00e9todo de Pago",
      `${SITE_URL}/api/stripe/portal`,
      recipientEmail
    ),
  };
}

export function cancellationEmail(accessEndDate: string, promoCode: string, recipientEmail?: string): { subject: string; htmlEn: string; htmlEs: string } {
  const safeDate = escapeHtml(accessEndDate);
  const safePromo = escapeHtml(promoCode);
  return {
    subject: "Your subscription has been cancelled",
    htmlEn: baseTemplate(
      "We're sorry to see you go",
      `<p>Your WinFact VIP subscription has been cancelled. You'll continue to have access until <strong>${safeDate}</strong>.</p>
      <p>If you change your mind, you can resubscribe anytime. As a returning member, use code <strong>${safePromo}</strong> to get a special discount on your next subscription.</p>
      <p>We'd love to have you back.</p>`,
      "Resubscribe Now",
      `${SITE_URL}/pricing`,
      recipientEmail
    ),
    htmlEs: baseTemplate(
      "Lamentamos verte ir",
      `<p>Tu suscripci\u00f3n VIP de WinFact ha sido cancelada. Continuar\u00e1s teniendo acceso hasta el <strong>${safeDate}</strong>.</p>
      <p>Si cambias de opini\u00f3n, puedes resuscribirte en cualquier momento. Como miembro que regresa, usa el c\u00f3digo <strong>${safePromo}</strong> para obtener un descuento especial en tu pr\u00f3xima suscripci\u00f3n.</p>
      <p>Nos encantar\u00eda tenerte de vuelta.</p>`,
      "Resuscribirse",
      `${SITE_URL}/pricing`,
      recipientEmail
    ),
  };
}

export function upgradeConfirmationEmail(newPlanName: string, recipientEmail?: string): { subject: string; htmlEn: string; htmlEs: string } {
  const safePlan = escapeHtml(newPlanName);
  return {
    subject: `You're now ${newPlanName}!`,
    htmlEn: baseTemplate(
      `You're now ${safePlan}!`,
      `<p>Your plan has been upgraded to <strong>${safePlan}</strong>. You now have full access to all VIP features.</p>
      <p>Check your dashboard for today's picks!</p>`,
      "View Dashboard",
      `${SITE_URL}/dashboard`,
      recipientEmail
    ),
    htmlEs: baseTemplate(
      `\u00a1Ahora eres ${safePlan}!`,
      `<p>Tu plan ha sido actualizado a <strong>${safePlan}</strong>. Ahora tienes acceso completo a todas las funciones VIP.</p>
      <p>\u00a1Revisa tu panel para ver los picks de hoy!</p>`,
      "Ver Panel",
      `${SITE_URL}/dashboard`,
      recipientEmail
    ),
  };
}

export function trialEndingSoonEmail(daysLeft: number, trialEndDate: string, recipientEmail?: string): { subject: string; htmlEn: string; htmlEs: string } {
  const dayWord = daysLeft === 1 ? "day" : "days";
  return {
    subject: `Your VIP trial ends in ${daysLeft} ${dayWord}`,
    htmlEn: baseTemplate(
      `Your VIP trial ends in ${daysLeft} ${dayWord}`,
      `<p>Just a quick heads up: your free VIP trial ends on <strong>${trialEndDate}</strong>.</p>
      <p>After that, your subscription will automatically renew. If you'd like to continue getting access to all VIP picks, no action needed.</p>
      <p>If you want to make changes or cancel, you can manage your subscription anytime from your billing portal.</p>
      <p>Don't want to lose access? Use code <strong>PICK80</strong> if you'd like to switch to a different plan at 80% off.</p>`,
      "Manage Subscription",
      `${SITE_URL}/api/stripe/portal`,
      recipientEmail
    ),
    htmlEs: baseTemplate(
      `Tu prueba VIP termina en ${daysLeft} d\u00eda${daysLeft === 1 ? "" : "s"}`,
      `<p>Solo un aviso r\u00e1pido: tu prueba gratuita VIP termina el <strong>${trialEndDate}</strong>.</p>
      <p>Despu\u00e9s de eso, tu suscripci\u00f3n se renovar\u00e1 autom\u00e1ticamente. Si deseas seguir teniendo acceso a todos los picks VIP, no necesitas hacer nada.</p>
      <p>Si quieres hacer cambios o cancelar, puedes administrar tu suscripci\u00f3n en cualquier momento desde tu portal de facturaci\u00f3n.</p>
      <p>\u00bfNo quieres perder acceso? Usa el c\u00f3digo <strong>PICK80</strong> si deseas cambiar a un plan diferente con 80% de descuento.</p>`,
      "Administrar Suscripci\u00f3n",
      `${SITE_URL}/api/stripe/portal`,
      recipientEmail
    ),
  };
}

export function freeWelcomeEmail(name: string | null, recipientEmail?: string): { subject: string; htmlEn: string; htmlEs: string } {
  const safeName = name ? escapeHtml(name.split(" ")[0]) : null;
  const greeting = safeName ? `Hey ${safeName}` : "Welcome";
  return {
    subject: "Welcome to WinFact Picks — Your Edge Starts Now",
    htmlEn: baseTemplate(
      `${greeting}, welcome to WinFact Picks!`,
      `<p>You're in. You'll now receive <strong>free data-driven picks</strong> from our analytics models.</p>
      <p>Here's what to do next:</p>
      <ul style="padding-left: 20px;">
        <li>Check your <strong>Dashboard</strong> for today's free picks</li>
        <li>Join our <strong>Telegram community</strong> for instant pick alerts</li>
        <li>Upgrade to <strong>VIP</strong> for full access to every pick, analysis, and edge alert</li>
      </ul>
      <p>Use code <strong>PICK80</strong> for 80% off your first VIP subscription.</p>
      <p>Let's start winning.</p>`,
      "View Today's Picks",
      `${SITE_URL}/dashboard`,
      recipientEmail
    ),
    htmlEs: baseTemplate(
      `${greeting}, \u00a1bienvenido a WinFact Picks!`,
      `<p>Ya est\u00e1s dentro. Ahora recibir\u00e1s <strong>picks gratuitos basados en datos</strong> de nuestros modelos anal\u00edticos.</p>
      <p>Esto es lo que sigue:</p>
      <ul style="padding-left: 20px;">
        <li>Revisa tu <strong>Panel</strong> para ver los picks gratuitos de hoy</li>
        <li>\u00danete a nuestra <strong>comunidad de Telegram</strong> para alertas instant\u00e1neas</li>
        <li>Actualiza a <strong>VIP</strong> para acceso completo a cada pick, an\u00e1lisis y alerta de ventaja</li>
      </ul>
      <p>Usa el c\u00f3digo <strong>PICK80</strong> para 80% de descuento en tu primera suscripci\u00f3n VIP.</p>
      <p>Empecemos a ganar.</p>`,
      "Ver Picks de Hoy",
      `${SITE_URL}/dashboard`,
      recipientEmail
    ),
  };
}

export function renewalReminderEmail(planName: string, renewalDate: string, amount: string, recipientEmail?: string): { subject: string; htmlEn: string; htmlEs: string } {
  const safePlan = escapeHtml(planName);
  const safeDate = escapeHtml(renewalDate);
  const safeAmount = escapeHtml(amount);
  return {
    subject: `Your ${planName} subscription renews in 2 days`,
    htmlEn: baseTemplate(
      "Subscription Renewal Reminder",
      `<p>Just a heads up \u2014 your <strong>${safePlan}</strong> subscription will renew on <strong>${safeDate}</strong> for <strong>${safeAmount}</strong>.</p>
      <p>No action is needed if you'd like to continue. If you want to make changes to your plan or update your payment method, you can do so from your billing portal.</p>`,
      "Manage Billing",
      `${SITE_URL}/api/stripe/portal`,
      recipientEmail
    ),
    htmlEs: baseTemplate(
      "Recordatorio de Renovaci\u00f3n",
      `<p>Solo un aviso \u2014 tu suscripci\u00f3n <strong>${safePlan}</strong> se renovar\u00e1 el <strong>${safeDate}</strong> por <strong>${safeAmount}</strong>.</p>
      <p>No se necesita acci\u00f3n si deseas continuar. Si quieres hacer cambios a tu plan o actualizar tu m\u00e9todo de pago, puedes hacerlo desde tu portal de facturaci\u00f3n.</p>`,
      "Administrar Facturaci\u00f3n",
      `${SITE_URL}/api/stripe/portal`,
      recipientEmail
    ),
  };
}
