#!/bin/bash
# WinFact Picks — Environment Variable Checker
# Run: bash scripts/check-env.sh

echo "══════════════════════════════════════"
echo " WinFact Picks — Environment Check"
echo "══════════════════════════════════════"
echo ""

ERRORS=0
WARNINGS=0

check_var() {
  local var_name=$1
  local required=$2
  local label=$3
  local value=$(grep "^${var_name}=" .env.local 2>/dev/null | cut -d'=' -f2-)

  if [ -z "$value" ] || [ "$value" = "xxx" ] || [ "$value" = "your-"* ]; then
    if [ "$required" = "REQUIRED" ]; then
      echo "  ❌ $var_name — MISSING ($label)"
      ERRORS=$((ERRORS + 1))
    else
      echo "  ⚠️  $var_name — not set ($label)"
      WARNINGS=$((WARNINGS + 1))
    fi
  else
    local masked="${value:0:8}..."
    echo "  ✅ $var_name ($masked)"
  fi
}

check_key_type() {
  local var_name=$1
  local value=$(grep "^${var_name}=" .env.local 2>/dev/null | cut -d'=' -f2-)
  if echo "$value" | grep -q "test"; then
    echo "  ⚠️  $var_name uses TEST key (switch to LIVE for production)"
    WARNINGS=$((WARNINGS + 1))
  fi
}

echo "── Database (Turso) ──"
check_var "TURSO_DATABASE_URL" "REQUIRED" "Database connection"
check_var "TURSO_AUTH_TOKEN" "REQUIRED" "Database auth"

echo ""
echo "── Authentication (Clerk) ──"
check_var "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY" "REQUIRED" "Clerk public key"
check_var "CLERK_SECRET_KEY" "REQUIRED" "Clerk secret key"
check_var "CLERK_WEBHOOK_SECRET" "REQUIRED" "Clerk webhook signing"
check_key_type "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY"
check_key_type "CLERK_SECRET_KEY"

echo ""
echo "── Payments (Stripe) ──"
check_var "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY" "REQUIRED" "Stripe public key"
check_var "STRIPE_SECRET_KEY" "REQUIRED" "Stripe secret key"
check_var "STRIPE_WEBHOOK_SECRET" "REQUIRED" "Stripe webhook signing"
check_var "STRIPE_VIP_WEEKLY_PRICE_ID" "REQUIRED" "Weekly plan price ID"
check_var "STRIPE_VIP_MONTHLY_PRICE_ID" "REQUIRED" "Monthly plan price ID"
check_key_type "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY"
check_key_type "STRIPE_SECRET_KEY"

echo ""
echo "── Telegram ──"
check_var "TELEGRAM_BOT_TOKEN" "REQUIRED" "Bot token"
check_var "TELEGRAM_FREE_CHAT_ID" "REQUIRED" "Community group ID"
check_var "TELEGRAM_VIP_CHAT_ID" "OPTIONAL" "VIP group ID"
check_var "TELEGRAM_ADMIN_CHAT_ID" "REQUIRED" "Oscar's admin chat ID"

echo ""
echo "── Email (MailerLite) ──"
check_var "MAILERLITE_API_KEY" "REQUIRED" "API key"
check_var "MAILERLITE_FREE_GROUP_ID" "REQUIRED" "Free subscribers group"
check_var "MAILERLITE_VIP_GROUP_ID" "REQUIRED" "VIP subscribers group"
check_var "MAILERLITE_FROM_EMAIL" "OPTIONAL" "Sender email"
check_var "MAILERLITE_TRANSACTIONAL_GROUP_ID" "OPTIONAL" "Transactional group"

echo ""
echo "── AI Services ──"
check_var "ANTHROPIC_API_KEY" "REQUIRED" "Claude AI (blog + assistant)"
check_var "OPENAI_API_KEY" "OPTIONAL" "DALL-E (blog images)"

echo ""
echo "── Sports Data ──"
check_var "ODDS_API_KEY" "REQUIRED" "The Odds API"

echo ""
echo "── Media Storage (R2) ──"
check_var "R2_ACCOUNT_ID" "OPTIONAL" "Cloudflare account"
check_var "R2_ACCESS_KEY_ID" "OPTIONAL" "R2 access key"
check_var "R2_SECRET_ACCESS_KEY" "OPTIONAL" "R2 secret key"
check_var "R2_BUCKET_NAME" "OPTIONAL" "R2 bucket"
check_var "R2_PUBLIC_URL" "OPTIONAL" "R2 public URL"

echo ""
echo "── Security ──"
check_var "CRON_SECRET" "REQUIRED" "Cron endpoint protection"
check_var "UNSUBSCRIBE_SECRET" "REQUIRED" "Email unsubscribe signing"

echo ""
echo "── Site Config ──"
check_var "NEXT_PUBLIC_SITE_URL" "REQUIRED" "Site URL"
check_var "NEXT_PUBLIC_GA_MEASUREMENT_ID" "OPTIONAL" "Google Analytics"

echo ""
echo "══════════════════════════════════════"
if [ $ERRORS -gt 0 ]; then
  echo " ❌ $ERRORS REQUIRED variables missing"
fi
if [ $WARNINGS -gt 0 ]; then
  echo " ⚠️  $WARNINGS warnings"
fi
if [ $ERRORS -eq 0 ]; then
  echo " ✅ All required variables are set!"
fi
echo "══════════════════════════════════════"
