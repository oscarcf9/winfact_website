import { SignIn } from "@clerk/nextjs";

export default function AdminSignInPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0B1F3B]">
      {/* Background */}
      <div className="fixed inset-0 bg-dot-pattern opacity-20 pointer-events-none" />
      <div className="fixed -top-40 -right-40 w-96 h-96 rounded-full bg-primary/10 blur-3xl pointer-events-none" />
      <div className="fixed -bottom-40 -left-40 w-96 h-96 rounded-full bg-accent/10 blur-3xl pointer-events-none" />

      <div className="relative z-10 w-full max-w-md mx-auto px-6">
        {/* Admin Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-accent mb-4">
            <span className="text-white font-bold text-lg">W</span>
          </div>
          <h1 className="font-heading text-xl font-bold text-white">
            Admin Panel
          </h1>
          <p className="text-sm text-white/40 mt-1">
            Restricted access — authorized personnel only
          </p>
        </div>

        <SignIn
          forceRedirectUrl="/admin"
          appearance={{
            elements: {
              rootBox: "w-full",
              card: "bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl p-6",
              headerTitle: "font-heading text-lg text-white font-bold",
              headerSubtitle: "text-white/50 text-sm",
              formButtonPrimary:
                "bg-primary hover:bg-secondary text-white font-semibold rounded-lg h-11 text-sm shadow-md hover:shadow-lg transition-all",
              formFieldInput:
                "rounded-lg border-white/10 bg-white/5 text-white text-sm h-11 placeholder:text-white/30 focus:border-primary focus:ring-2 focus:ring-primary/20",
              formFieldLabel: "text-sm font-medium text-white/70",
              footerActionLink: "text-accent hover:text-primary font-medium",
              identityPreviewEditButton: "text-accent hover:text-primary",
              identityPreviewText: "text-white/80",
              card__main: "gap-5",
              socialButtonsBlockButton:
                "border border-white/10 rounded-lg h-11 text-sm font-medium text-white/70 hover:bg-white/5 hover:border-white/20 transition-all",
              socialButtonsBlockButtonText: "text-sm font-medium",
              dividerLine: "bg-white/10",
              dividerText: "text-white/30 text-xs",
              formFieldInputShowPasswordButton: "text-white/40 hover:text-accent",
              footer: "hidden",
              alertText: "text-red-400",
              formFieldErrorText: "text-red-400",
            },
          }}
        />
      </div>
    </div>
  );
}
