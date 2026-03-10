import { Heading } from "@/components/ui/heading";
import { DollarSign } from "lucide-react";
import { PricingManager } from "@/components/admin/pricing-manager";

export default function AdminPricingPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-primary/10">
            <DollarSign className="h-5 w-5 text-primary" />
          </div>
          <div>
            <Heading as="h1" size="h3" className="text-navy">
              Pricing Plans
            </Heading>
            <p className="text-sm text-gray-500">
              Manage website pricing tiers, features, and Stripe configuration
            </p>
          </div>
        </div>
      </div>
      <PricingManager />
    </div>
  );
}
