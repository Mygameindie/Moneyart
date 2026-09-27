"use client";

import { PaymentMethod } from "@/lib/types";

const TYPE_LABEL: Record<PaymentMethod["type"], string> = {
  PAYPAL: "PayPal",
  QR: "QR code",
  BANK: "Bank / account number",
};

export default function PaymentMethods({ methods }: { methods: PaymentMethod[] }) {
  if (methods.length === 0) {
    return <p className="text-sm text-white/40">This artist hasn&apos;t added a payment method yet.</p>;
  }

  return (
    <div className="space-y-3">
      {methods.map((m) => (
        <div key={m.id} className="rounded-xl border border-border bg-panel2 p-3">
          <div className="mb-1 flex items-center justify-between">
            <span className="text-xs font-medium uppercase tracking-wide text-accent2">
              {TYPE_LABEL[m.type]}
            </span>
            <span className="text-xs text-white/40">{m.label}</span>
          </div>
          {m.type === "QR" && m.qrImageUrl ? (
            <div className="flex flex-col items-center gap-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={m.qrImageUrl} alt={`${m.label} QR code`} className="h-40 w-40 rounded-lg object-contain bg-white p-1" />
              {m.value && <p className="text-sm text-white/70">{m.value}</p>}
            </div>
          ) : (
            <p className="select-all break-all font-mono text-sm text-white">{m.value}</p>
          )}
        </div>
      ))}
      <p className="text-xs text-white/40">
        Pay the artist directly using one of the methods above — MoneyArt takes no cut, they keep
        100% of what you send.
      </p>
    </div>
  );
}
