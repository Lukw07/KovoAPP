"use client";

import { useState, useTransition, useRef, useCallback } from "react";
import {
  User,
  Camera,
  Pencil,
  Save,
  X,
  Mail,
  Phone,
  Briefcase,
  Calendar,
  Building2,
  Shield,
  Star,
} from "lucide-react";
import { updateAvatar, updateProfile } from "@/actions/profile";
import { cn } from "@/lib/utils";
import { formatDistanceToNow, format } from "date-fns";
import { cs } from "date-fns/locale";
import { AvatarCropModal } from "./avatar-crop-modal";

interface ProfileUser {
  id: string;
  name: string;
  email: string;
  role: string;
  position: string | null;
  phone: string | null;
  avatarUrl: string | null;
  pointsBalance: number;
  hireDate: Date;
  department: { name: string } | null;
}

export function ProfileClient({ user }: { user: ProfileUser }) {
  const [isPending, startTransition] = useTransition();
  const [editing, setEditing] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [cropFile, setCropFile] = useState<File | null>(null);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Edit form state
  const [name, setName] = useState(user.name);
  const [phone, setPhone] = useState(user.phone || "");
  const [position, setPosition] = useState(user.position || "");

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setMessage({ type: "error", text: "Vyberte prosím obrázek" });
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setMessage({ type: "error", text: "Obrázek je příliš velký (max 10 MB)" });
      return;
    }

    setMessage(null);
    setCropFile(file);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleCropped = useCallback(async (croppedBlob: Blob) => {
    setCropFile(null);
    setAvatarUploading(true);
    setMessage(null);

    try {
      const fd = new FormData();
      fd.append("file", new File([croppedBlob], "avatar.webp", { type: "image/webp" }));

      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const data = await res.json();

      if (!res.ok || data.error) {
        setMessage({ type: "error", text: data.error || "Chyba při nahrávání" });
        setAvatarUploading(false);
        return;
      }

      const result = await updateAvatar(data.url);
      if (result.error) {
        setMessage({ type: "error", text: result.error });
      } else {
        setMessage({ type: "success", text: "Avatar aktualizován!" });
      }
    } catch {
      setMessage({ type: "error", text: "Něco se pokazilo" });
    }
    setAvatarUploading(false);
  }, []);

  const handleCropCancel = useCallback(() => {
    setCropFile(null);
  }, []);

  const handleSaveProfile = () => {
    setMessage(null);
    const fd = new FormData();
    fd.set("name", name);
    fd.set("phone", phone);
    fd.set("position", position);

    startTransition(async () => {
      const result = await updateProfile(fd);
      if (result.error) {
        setMessage({ type: "error", text: result.error });
      } else {
        setMessage({ type: "success", text: "Profil uložen!" });
        setEditing(false);
      }
    });
  };

  const initials =
    user.name
      ?.split(" ")
      .map((n) => n[0])
      .join("")
      .slice(0, 2) || "?";

  const tenure = formatDistanceToNow(new Date(user.hireDate), {
    locale: cs,
  });

  const hireDateFormatted = format(new Date(user.hireDate), "d. MMMM yyyy", {
    locale: cs,
  });

  return (
    <div className="space-y-4 animate-fadeInUp">
      <h1 className="text-xl font-bold text-foreground">
        Profil
      </h1>

      {/* Avatar + name card */}
      <div className="rounded-2xl bg-card border border-border p-6">
        <div className="flex items-center gap-4">
          {/* Avatar with upload overlay */}
          <div className="relative group">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-blue-600 text-2xl font-bold text-white overflow-hidden ring-4 ring-white dark:ring-slate-800">
              {user.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={user.avatarUrl}
                  alt={user.name}
                  className="h-full w-full object-cover"
                />
              ) : (
                initials
              )}
            </div>
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={avatarUploading}
              className={cn(
                "absolute inset-0 flex items-center justify-center rounded-full",
                "bg-black/0 group-hover:bg-black/40 transition-all cursor-pointer",
                avatarUploading && "bg-black/40",
              )}
            >
              <Camera
                className={cn(
                  "h-5 w-5 text-white transition-opacity",
                  avatarUploading
                    ? "opacity-100 animate-pulse"
                    : "opacity-0 group-hover:opacity-100",
                )}
              />
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileSelect}
            />
          </div>

          {/* Avatar crop modal */}
          {cropFile && (
            <AvatarCropModal
              file={cropFile}
              onCropped={handleCropped}
              onCancel={handleCropCancel}
            />
          )}

          <div className="flex-1 min-w-0">
            <p className="text-lg font-bold text-foreground truncate">
              {user.name}
            </p>
            <p className="text-sm text-foreground-secondary truncate">
              {user.email}
            </p>
            <span
              className={cn(
                "inline-flex items-center gap-1 mt-1 rounded-full px-2 py-0.5 text-[11px] font-semibold",
                user.role === "ADMIN"
                  ? "bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400"
                  : user.role === "MANAGER"
                    ? "bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400"
                    : "bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400",
              )}
            >
              <Shield className="h-3 w-3" />
              {roleLabel(user.role)}
            </span>
          </div>

          {/* Edit toggle */}
          <button
            onClick={() => {
              setEditing(!editing);
              setMessage(null);
            }}
            className={cn(
              "flex h-9 w-9 items-center justify-center rounded-xl transition-all",
              editing
                ? "bg-red-50 dark:bg-red-900/30 text-red-600"
                : "bg-background-secondary text-foreground-secondary hover:text-foreground",
            )}
          >
            {editing ? <X className="h-4 w-4" /> : <Pencil className="h-4 w-4" />}
          </button>
        </div>

        {/* Message */}
        {message && (
          <p
            className={cn(
              "mt-3 text-xs rounded-lg px-3 py-2 animate-fadeInUp",
              message.type === "success"
                ? "text-emerald-600 bg-emerald-50 dark:bg-emerald-900/30"
                : "text-red-600 bg-red-50 dark:bg-red-900/30",
            )}
          >
            {message.text}
          </p>
        )}
      </div>

      {/* Edit form */}
      {editing && (
        <div className="rounded-2xl bg-card border border-border p-4 space-y-3 animate-fadeInUp">
          <h3 className="text-sm font-bold text-foreground">
            Upravit profil
          </h3>

          <div className="space-y-1">
            <label className="text-xs font-medium text-foreground-secondary">
              Jméno
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={cn(
                "w-full rounded-xl border border-border px-3 py-2.5 text-sm bg-card text-foreground",
                "focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20",
              )}
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-foreground-secondary">
              Telefon
            </label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+420 ..."
              className={cn(
                "w-full rounded-xl border border-border px-3 py-2.5 text-sm bg-card text-foreground",
                "focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20",
              )}
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-foreground-secondary">
              Pozice
            </label>
            <input
              type="text"
              value={position}
              onChange={(e) => setPosition(e.target.value)}
              placeholder="Např. Programátor, Účetní..."
              className={cn(
                "w-full rounded-xl border border-border px-3 py-2.5 text-sm bg-card text-foreground",
                "focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20",
              )}
            />
          </div>

          <button
            onClick={handleSaveProfile}
            disabled={isPending}
            className={cn(
              "w-full flex items-center justify-center gap-2 rounded-xl py-2.5",
              "bg-accent shadow-accent glow-blue text-white text-sm font-semibold",
              "hover:bg-accent-hover active:scale-[0.99] transition-all",
              "disabled:opacity-50 disabled:cursor-not-allowed",
            )}
          >
            <Save className="h-4 w-4" />
            {isPending ? "Ukládám..." : "Uložit změny"}
          </button>
        </div>
      )}

      {/* Info card */}
      <div className="rounded-2xl bg-card border border-border p-4 space-y-3">
        <h3 className="text-sm font-bold text-foreground">
          Informace
        </h3>

        <InfoRow
          icon={<Mail className="h-4 w-4" />}
          label="E-mail"
          value={user.email}
        />
        {user.phone && (
          <InfoRow
            icon={<Phone className="h-4 w-4" />}
            label="Telefon"
            value={user.phone}
          />
        )}
        {user.position && (
          <InfoRow
            icon={<Briefcase className="h-4 w-4" />}
            label="Pozice"
            value={user.position}
          />
        )}
        {user.department && (
          <InfoRow
            icon={<Building2 className="h-4 w-4" />}
            label="Oddělení"
            value={user.department.name}
          />
        )}
        <InfoRow
          icon={<Calendar className="h-4 w-4" />}
          label="Nástup"
          value={hireDateFormatted}
        />
        <InfoRow
          icon={<Calendar className="h-4 w-4" />}
          label="Ve firmě"
          value={tenure}
        />
        <InfoRow
          icon={<Star className="h-4 w-4" />}
          label="Body"
          value={String(user.pointsBalance)}
        />
      </div>
    </div>
  );
}

function InfoRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-3 border-b border-border pb-3 last:border-0 last:pb-0">
      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-background-secondary text-foreground-secondary flex-shrink-0">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[11px] text-foreground-muted">
          {label}
        </p>
        <p className="text-sm font-medium text-foreground truncate">
          {value}
        </p>
      </div>
    </div>
  );
}

function roleLabel(role: string) {
  switch (role) {
    case "ADMIN":
      return "Administrátor";
    case "MANAGER":
      return "Vedoucí";
    case "EMPLOYEE":
      return "Zaměstnanec";
    default:
      return "—";
  }
}
