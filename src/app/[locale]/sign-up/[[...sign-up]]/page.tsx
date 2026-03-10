import { SignUp } from "@clerk/nextjs";
import Link from "next/link";
import { BarChart3, Zap, Shield, Bell } from "lucide-react";

export default function SignUpPage() {
  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      {/* Left — Branding Panel */}
      <div className="hidden lg:flex lg:w-1/2 relative bg-navy overflow-hidden">
        {/* Background decoration */}
        <div className="absolute inset-0 bg-dot-pattern opacity-30" />
        <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full bg-accent/20 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 rounded-full bg-primary/20 blur-3xl" />

        <div className="relative z-10 flex flex-col justify-center items-center text-center w-full max-w-lg mx-auto px-8 py-12">
          {/* Logo */}
          <Link href="/" className="inline-flex items-center gap-2 mb-10">
            <span className="font-heading text-2xl font-bold text-white">
              Win<span className="text-gradient-primary bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">Fact</span>
            </span>
          </Link>

          <h1 className="font-heading text-3xl font-bold text-white leading-tight mb-3">
            Start winning with data.
          </h1>
          <p className="text-base text-white/60 max-w-sm leading-relaxed">
            Join thousands of smart bettors using analytics-driven picks to gain an edge.
          </p>

          {/* Features */}
          <div className="mt-10 space-y-3 text-left w-full max-w-xs">
            {[
              { icon: BarChart3, text: "Data-driven picks backed by advanced models" },
              { icon: Zap, text: "Real-time alerts before lines move" },
              { icon: Shield, text: "Bankroll management tools included" },
              { icon: Bell, text: "Personalized notifications by sport" },
            ].map(({ icon: Icon, text }) => (
              <div key={text} className="flex items-center gap-3">
                <span className="flex items-center justify-center w-8 h-8 shrink-0 rounded-lg bg-white/5 border border-white/10">
                  <Icon className="h-4 w-4 text-accent" />
                </span>
                <span className="text-sm text-white/70">{text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right — Sign-Up Form */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12 bg-white">
        {/* Mobile logo */}
        <div className="lg:hidden mb-8">
          <Link href="/" className="inline-flex items-center gap-2">
            <span className="font-heading text-2xl font-bold text-navy">
              Win<span className="logo-gradient">Fact</span>
            </span>
          </Link>
        </div>

        <SignUp
          forceRedirectUrl="/dashboard"
          appearance={{
            elements: {
              rootBox: "w-full max-w-md mx-auto",
              card: "shadow-none border-0 p-0 bg-transparent w-full",
              headerTitle: "font-heading text-2xl text-navy font-bold",
              headerSubtitle: "text-gray-500 text-sm",
              formButtonPrimary:
                "bg-primary hover:bg-secondary text-white font-semibold rounded-lg h-11 text-sm shadow-md hover:shadow-lg transition-all",
              formFieldInput:
                "rounded-lg border-gray-200 bg-gray-50/50 text-navy text-sm h-11 focus:border-primary focus:ring-2 focus:ring-primary/20",
              formFieldLabel: "text-sm font-medium text-gray-700",
              footerActionLink: "text-primary hover:text-secondary font-medium",
              identityPreviewEditButton: "text-primary hover:text-secondary",
              card__main: "gap-6",
              socialButtonsBlockButton:
                "border border-gray-200 rounded-lg h-11 text-sm font-medium text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition-all",
              socialButtonsBlockButtonText: "text-sm font-medium",
              dividerLine: "bg-gray-200",
              dividerText: "text-gray-400 text-xs",
              formFieldInputShowPasswordButton: "text-gray-400 hover:text-primary",
              footer: "hidden",
            },
          }}
        />

        {/* Custom footer */}
        <p className="mt-8 text-sm text-gray-500 text-center">
          Already have an account?{" "}
          <Link href="/sign-in" className="text-primary hover:text-secondary font-medium">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
