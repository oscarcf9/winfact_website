import { TicketGenerator } from "@/components/admin/ticket-generator/ticket-generator";
import type { Metadata } from "next";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function TicketGeneratorPage() {
  return <TicketGenerator />;
}
