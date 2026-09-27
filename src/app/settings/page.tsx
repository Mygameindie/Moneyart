"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { updateMyProfile, listPaymentMethods, addPaymentMethod, removePaymentMethod, uploadPublicFile } from "@/lib/data";
import { PaymentMethod } from "@/lib/types";
import { useAuth } from "@/components/AuthProvider";
import Avatar from "@/components/Avatar";

export default function SettingsPage() {
  const { user, loading, refresh } = useAuth();
  const router = useRouter();

  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileMsg, setProfileMsg] = useState<string | null>(null);

  const [methods, setMethods] = useState<PaymentMethod[]>([]);
  const [pmType, setPmType] = useState<PaymentMethod["type"]>("PAYPAL");
  const [pmLabel, setPmLabel] = useState("");
  const [pmValue, setPmValue] = useState("");
  const [pmQrFile, setPmQrFile] = useState<File | null>(null);
  const [addingMethod, setAddingMethod] = useState(false);
  const [pmError, setPmError] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !user) router.push("/login");
  }, [loading, user, router]);

  useEffect(() => {
    if (user) {
      setDisplayName(user.displayName);
      setBio(user.bio || "");
      setAvatarUrl(user.avatarUrl);
    }
  }, [user]);

  useEffect(() => {
    if (!user) return;
    listPaymentMethods(user.id).then(setMethods);
  }, [user]);

  async function onAvatarChange(file: File | null) {
    if (!file || !user) return;
    const uploaded = await uploadPublicFile(user.id, "avatars", file);
    setAvatarUrl(uploaded.url);
  }

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    setSavingProfile(true);
    setProfileMsg(null);
    try {
      await updateMyProfile(user.id, { displayName, bio, avatarUrl });
      await refresh();
      setProfileMsg("Saved!");
    } catch (err) {
      setProfileMsg(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSavingProfile(false);
    }
  }

  async function addMethod(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    setPmError(null);
    if (!pmLabel.trim() || !pmValue.trim()) {
      setPmError("Label and value are required");
      return;
    }
    setAddingMethod(true);
    try {
      let qrImageUrl: string | null = null;
      if (pmType === "QR" && pmQrFile) {
        const uploaded = await uploadPublicFile(user.id, "qr", pmQrFile);
        qrImageUrl = uploaded.url;
      }
      const paymentMethod = await addPaymentMethod(user.id, { type: pmType, label: pmLabel, value: pmValue, qrImageUrl });
      setMethods((prev) => [...prev, paymentMethod]);
      setPmLabel("");
      setPmValue("");
      setPmQrFile(null);
    } catch (err) {
      setPmError(err instanceof Error ? err.message : "Failed to add payment method");
    } finally {
      setAddingMethod(false);
    }
  }

  async function removeMethod(id: string) {
    await removePaymentMethod(id);
    setMethods((prev) => prev.filter((m) => m.id !== id));
  }

  if (loading || !user) return null;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="card p-6">
        <h1 className="mb-4 text-xl font-bold">Profile</h1>
        <form onSubmit={saveProfile} className="space-y-4">
          <div className="flex items-center gap-4">
            <Avatar src={avatarUrl} name={displayName || user.displayName} size={64} />
            <label className="btn-secondary cursor-pointer text-xs">
              Change avatar
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => onAvatarChange(e.target.files?.[0] ?? null)}
              />
            </label>
          </div>
          <div>
            <label className="mb-1 block text-xs text-white/60">Display name</label>
            <input className="input" value={displayName} onChange={(e) => setDisplayName(e.target.value)} maxLength={50} />
          </div>
          <div>
            <label className="mb-1 block text-xs text-white/60">Bio</label>
            <textarea className="input min-h-20" value={bio} onChange={(e) => setBio(e.target.value)} maxLength={500} />
          </div>
          {profileMsg && <p className="text-sm text-white/70">{profileMsg}</p>}
          <button className="btn-primary" disabled={savingProfile} type="submit">
            {savingProfile ? "Saving…" : "Save profile"}
          </button>
        </form>
      </div>

      <div className="card p-6">
        <h2 className="mb-1 text-xl font-bold">Payment methods</h2>
        <p className="mb-4 text-sm text-white/60">
          Add PayPal, a QR code, or an account number so buyers can pay you directly. MoneyArt
          never touches this money — you keep 100%.
        </p>

        <div className="mb-4 space-y-2">
          {methods.map((m) => (
            <div key={m.id} className="flex items-center justify-between rounded-xl border border-border bg-panel2 p-3">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-accent2">{m.type}</p>
                <p className="text-sm text-white/80">{m.label}</p>
                <p className="break-all text-xs text-white/50">{m.value}</p>
              </div>
              <button onClick={() => removeMethod(m.id)} className="text-xs text-accent hover:underline">
                Remove
              </button>
            </div>
          ))}
          {methods.length === 0 && <p className="text-sm text-white/40">No payment methods added yet.</p>}
        </div>

        <form onSubmit={addMethod} className="space-y-3 border-t border-border pt-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs text-white/60">Type</label>
              <select
                className="input"
                value={pmType}
                onChange={(e) => setPmType(e.target.value as PaymentMethod["type"])}
              >
                <option value="PAYPAL">PayPal</option>
                <option value="QR">QR code</option>
                <option value="BANK">Bank / account number</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs text-white/60">Label</label>
              <input
                className="input"
                value={pmLabel}
                onChange={(e) => setPmLabel(e.target.value)}
                placeholder="e.g. PayPal (USD)"
              />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-xs text-white/60">
              {pmType === "PAYPAL" ? "PayPal email or paypal.me link" : pmType === "BANK" ? "Account number / details" : "Caption shown under the QR"}
            </label>
            <input className="input" value={pmValue} onChange={(e) => setPmValue(e.target.value)} />
          </div>
          {pmType === "QR" && (
            <div>
              <label className="mb-1 block text-xs text-white/60">QR code image</label>
              <input
                type="file"
                accept="image/*"
                className="input"
                onChange={(e) => setPmQrFile(e.target.files?.[0] ?? null)}
              />
            </div>
          )}
          {pmError && <p className="text-sm text-accent">{pmError}</p>}
          <button className="btn-secondary" disabled={addingMethod} type="submit">
            {addingMethod ? "Adding…" : "Add payment method"}
          </button>
        </form>
      </div>
    </div>
  );
}
