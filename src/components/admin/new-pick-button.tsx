"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { QuickPickModal } from "@/components/admin/quick-pick-modal";

type Props = {
  label: string;
};

export function NewPickButton({ label }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all duration-200 bg-gradient-to-r from-primary to-accent text-white hover:shadow-md hover:shadow-primary/20 cursor-pointer"
      >
        <Plus className="h-3.5 w-3.5" />
        {label}
      </button>
      <QuickPickModal
        open={open}
        onClose={() => setOpen(false)}
        onSuccess={() => {
          setOpen(false);
          window.location.reload();
        }}
      />
    </>
  );
}
