"use client";

import { motion } from "framer-motion";
import { useEffect, useState, useMemo, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  Star,
  Newspaper,
  ChatCircle,
  CaretRight,
  SunHorizon,
  Sun,
  Moon,
  CloudSun,
  ChartBar,
  Briefcase,
  Lightning,
  Bell,
  WifiHigh,
  WifiSlash,
} from "@phosphor-icons/react";
import { easings } from "@/components/animations/variants";
import { useSocket } from "@/hooks/useSocket";
import type { ActivityItem } from "@/actions/dashboard-queries";

/* ── types ─────────────────────────────────────────────────── */
interface DashboardHeroProps {
  userName: string;
  avatarUrl: string | null;
  pointsBalance: number;
  unreadMessages: number;
  initialActivity: ActivityItem[];
  stats: {
    activePollCount: number;
    unreadNotifications: number;
    pendingReservations: number;
  } | null;
}

/* ── greeting based on time of day ─────────────────────────── */
function getGreeting(): { text: string; icon: typeof Sun; period: string } {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 9)
    return { text: "Dobré ráno", icon: SunHorizon, period: "morning" };
  if (hour >= 9 && hour < 12)
    return { text: "Dobré dopoledne", icon: Sun, period: "forenoon" };
  if (hour >= 12 && hour < 17)
    return { text: "Dobré odpoledne", icon: CloudSun, period: "afternoon" };
  if (hour >= 17 && hour < 21)
    return { text: "Dobrý večer", icon: Moon, period: "evening" };
  return { text: "Dobrou noc", icon: Moon, period: "night" };
}

/* ── today's formatted date ────────────────────────────────── */
function getFormattedDate(): string {
  const now = new Date();
  const days = [
    "Neděle", "Pondělí", "Úterý", "Středa", "Čtvrtek", "Pátek", "Sobota",
  ];
  const months = [
    "ledna", "února", "března", "dubna", "května", "června",
    "července", "srpna", "září", "října", "listopadu", "prosince",
  ];
  return `${days[now.getDay()]}, ${now.getDate()}. ${months[now.getMonth()]}`;
}

/* ── sparkle particle ──────────────────────────────────────── */
function Sparkle({ delay, x, y, size }: { delay: number; x: number; y: number; size: number }) {
  return (
    <motion.div
      className="absolute rounded-full bg-white pointer-events-none"
      style={{ width: size, height: size, left: `${x}%`, top: `${y}%` }}
      initial={{ opacity: 0, scale: 0 }}
      animate={{ opacity: [0, 0.8, 0], scale: [0, 1, 0] }}
      transition={{
        duration: 2.5, delay,
        repeat: Infinity, repeatDelay: Math.random() * 3 + 2,
        ease: "easeInOut",
      }}
    />
  );
}

/* ── animated counter ──────────────────────────────────────── */
function AnimatedCounter({ target }: { target: number }) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (target === 0) return;
    const steps = 30;
    let step = 0;
    const timer = setInterval(() => {
      step++;
      const eased = 1 - Math.pow(1 - step / steps, 3);
      setCount(Math.round(eased * target));
      if (step >= steps) { setCount(target); clearInterval(timer); }
    }, 40);
    return () => clearInterval(timer);
  }, [target]);

  return <span className="tabular-nums">{count.toLocaleString("cs-CZ")}</span>;
}

/* ── icon map for activity items ───────────────────────────── */
const ACTIVITY_ICONS: Record<string, typeof Newspaper> = {
  Newspaper, ChartBar, Star, Briefcase, Lightning, Bell,
};

const ACTIVITY_COLORS: Record<string, string> = {
  blue: "bg-blue-500/20 text-blue-300",
  violet: "bg-violet-500/20 text-violet-300",
  amber: "bg-amber-500/20 text-amber-300",
  emerald: "bg-emerald-500/20 text-emerald-300",
  rose: "bg-rose-500/20 text-rose-300",
};

/* ── time ago helper ───────────────────────────────────────── */
function timeAgo(date: Date | string): string {
  const diff = Date.now() - new Date(date).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "právě teď";
  if (minutes < 60) return `před ${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `před ${hours}h`;
  const days = Math.floor(hours / 24);
  return `před ${days}d`;
}

/* ── activity feed item ────────────────────────────────────── */
function ActivityFeedItem({
  item,
  index,
  isNew,
}: {
  item: ActivityItem;
  index: number;
  isNew?: boolean;
}) {
  const Icon = ACTIVITY_ICONS[item.icon] || Lightning;
  const colorClass = ACTIVITY_COLORS[item.color] || ACTIVITY_COLORS.blue;

  return (
    <motion.div
      initial={isNew ? { opacity: 0, y: -20, scale: 0.95 } : { opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0, y: 0, scale: 1 }}
      transition={{
        delay: isNew ? 0 : 0.4 + index * 0.08,
        duration: 0.35,
        ease: easings.emphasis,
      }}
      layout
    >
      <Link
        href={item.link}
        className="group flex items-center gap-3 rounded-xl bg-white/8 hover:bg-white/14
                   backdrop-blur-sm border border-white/8 px-3 py-2.5 transition-all duration-200"
      >
        <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${colorClass}`}>
          <Icon className="h-4 w-4" weight="duotone" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="truncate text-[13px] font-medium text-white/90 group-hover:text-white transition-colors">
              {item.title}
            </p>
            {isNew && (
              <span className="shrink-0 rounded-full bg-emerald-400/20 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-emerald-300">
                Nové
              </span>
            )}
          </div>
          <p className="truncate text-[11px] text-blue-200/60">
            {item.description} · {timeAgo(item.timestamp)}
          </p>
        </div>
        <CaretRight
          className="h-3.5 w-3.5 text-white/30 group-hover:text-white/60 transition-colors shrink-0"
          weight="bold"
        />
      </Link>
    </motion.div>
  );
}

/* ── main hero component ───────────────────────────────────── */
export default function DashboardHero({
  userName,
  avatarUrl,
  pointsBalance,
  unreadMessages,
  initialActivity,
  stats,
}: DashboardHeroProps) {
  const greeting = getGreeting();
  const dateStr = getFormattedDate();
  const GreetingIcon = greeting.icon;

  const [activity, setActivity] = useState<ActivityItem[]>(initialActivity);
  const [newItemIds, setNewItemIds] = useState<Set<string>>(new Set());
  const [livePoints, setLivePoints] = useState(pointsBalance);
  const { on, isConnected } = useSocket();

  // Sparkles data (stable across renders)
  const sparkles = useMemo(
    () =>
      Array.from({ length: 6 }, (_, i) => ({
        id: i,
        x: Math.random() * 90 + 5,
        y: Math.random() * 80 + 10,
        size: Math.random() * 3 + 1.5,
        delay: Math.random() * 3,
      })),
    [],
  );

  const firstName = userName?.split(" ")[0] ?? userName;

  // ── Realtime activity updates ───────────────────────────
  const handleRealtimeActivity = useCallback(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (data: any) => {
      if (!data?.id) return;
      const newItem: ActivityItem = {
        id: data.id,
        type: data.type || "news",
        title: data.title || "Nová aktivita",
        description: data.description || "",
        link: data.link || "/dashboard",
        timestamp: new Date(),
        icon: data.icon || "Lightning",
        color: data.color || "blue",
      };
      setActivity((prev) => [newItem, ...prev].slice(0, 8));
      setNewItemIds((prev) => new Set(prev).add(newItem.id));
      setTimeout(() => {
        setNewItemIds((prev) => {
          const next = new Set(prev);
          next.delete(newItem.id);
          return next;
        });
      }, 10000);
    },
    [],
  );

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handlePointsUpdate = useCallback((data: any) => {
    if (data?.balance !== undefined) {
      setLivePoints(data.balance);
    }
  }, []);

  useEffect(() => {
    const unsub1 = on("activity:new", handleRealtimeActivity);
    const unsub2 = on("news:published", handleRealtimeActivity);
    const unsub3 = on("poll:created", handleRealtimeActivity);
    const unsub4 = on("points:updated", handlePointsUpdate);
    return () => { unsub1(); unsub2(); unsub3(); unsub4(); };
  }, [on, handleRealtimeActivity, handlePointsUpdate]);

  return (
    <div className="relative isolate overflow-hidden rounded-2xl" data-hero>
      {/* ── Animated gradient background ──────────────────── */}
      <div className="absolute inset-0 hero-gradient animate-gradient" />

      {/* ── Mesh overlay for depth ────────────────────────── */}
      <div
        className="absolute inset-0 opacity-30 mix-blend-overlay"
        style={{
          backgroundImage: `radial-gradient(ellipse 80% 60% at 70% 20%, rgba(255,255,255,0.3), transparent),
                            radial-gradient(ellipse 60% 50% at 20% 80%, rgba(99,102,241,0.2), transparent)`,
        }}
      />

      {/* ── Sparkle particles ─────────────────────────────── */}
      {sparkles.map((s) => (
        <Sparkle key={s.id} delay={s.delay} x={s.x} y={s.y} size={s.size} />
      ))}

      {/* ── Content ───────────────────────────────────────── */}
      <div className="relative z-10 p-5 sm:p-6">
        {/* Top row: date + connection status + messages badge */}
        <motion.div
          className="flex items-center justify-between mb-4"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: easings.emphasis }}
        >
          <div className="flex items-center gap-2 text-blue-100/70">
            <GreetingIcon className="h-4 w-4" weight="fill" />
            <span className="text-xs font-medium">{dateStr}</span>
            <div className="flex items-center gap-1 ml-1">
              {isConnected ? (
                <WifiHigh className="h-3 w-3 text-emerald-400/70" weight="bold" />
              ) : (
                <WifiSlash className="h-3 w-3 text-white/30" weight="bold" />
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {unreadMessages > 0 && (
              <Link
                href="/messages"
                className="flex items-center gap-1.5 rounded-full bg-white/10 hover:bg-white/20
                           backdrop-blur-sm border border-white/10 px-2.5 py-1 transition-all duration-200"
              >
                <ChatCircle className="h-3.5 w-3.5 text-blue-200" weight="fill" />
                <span className="text-[11px] font-semibold text-white">{unreadMessages}</span>
              </Link>
            )}
          </div>
        </motion.div>

        {/* ── Main greeting ─────────────────────────────── */}
        <div className="flex items-start gap-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: "spring", stiffness: 400, damping: 20, delay: 0.15 }}
            className="shrink-0"
          >
            <div className="relative">
              <div className="h-14 w-14 sm:h-16 sm:w-16 rounded-2xl overflow-hidden ring-2 ring-white/20 shadow-lg">
                {avatarUrl ? (
                  <Image src={avatarUrl} alt={userName} width={64} height={64} className="h-full w-full object-cover" />
                ) : (
                  <div className="h-full w-full bg-white/20 flex items-center justify-center">
                    <span className="text-xl sm:text-2xl font-bold text-white/80">
                      {firstName?.[0]?.toUpperCase()}
                    </span>
                  </div>
                )}
              </div>
              <div className="absolute -bottom-0.5 -right-0.5 h-4 w-4 rounded-full bg-emerald-400 border-2 border-blue-600 shadow-sm" />
            </div>
          </motion.div>

          <motion.div
            className="flex-1 min-w-0"
            initial={{ opacity: 0, x: -15 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.2, ease: easings.emphasis }}
          >
            <p className="text-sm font-medium text-blue-200/80">{greeting.text},</p>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white truncate">
              {firstName} 👋
            </h1>
          </motion.div>
        </div>

        {/* ── Stat pills ───────────────────────────────── */}
        <motion.div
          className="mt-5 flex items-center gap-2 flex-wrap"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3, ease: easings.emphasis }}
        >
          <div className="flex items-center gap-2 rounded-xl bg-white/12 backdrop-blur-sm border border-white/10 px-3 py-2">
            <Star className="h-4 w-4 text-yellow-300 animate-sparkle" weight="fill" />
            <span className="text-sm font-bold text-white">
              <AnimatedCounter target={livePoints} /> bodů
            </span>
          </div>

          {stats && stats.activePollCount > 0 && (
            <Link
              href="/polls"
              className="flex items-center gap-1.5 rounded-xl bg-violet-500/15 hover:bg-violet-500/25
                         backdrop-blur-sm border border-violet-400/20 px-3 py-2 transition-all duration-200 group"
            >
              <ChartBar className="h-4 w-4 text-violet-300" weight="duotone" />
              <span className="text-sm font-medium text-violet-200 group-hover:text-white transition-colors">
                {stats.activePollCount} {stats.activePollCount === 1 ? "anketa" : stats.activePollCount < 5 ? "ankety" : "anket"}
              </span>
            </Link>
          )}

          {stats && stats.unreadNotifications > 0 && (
            <div className="flex items-center gap-1.5 rounded-xl bg-rose-500/15 backdrop-blur-sm border border-rose-400/20 px-3 py-2">
              <Bell className="h-4 w-4 text-rose-300" weight="fill" />
              <span className="text-sm font-medium text-rose-200">
                {stats.unreadNotifications}
              </span>
            </div>
          )}
        </motion.div>

        {/* ── Activity feed — "Co je nového" ───────────── */}
        {activity.length > 0 && (
          <motion.div
            className="mt-4 space-y-1.5"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4, duration: 0.4 }}
          >
            <div className="flex items-center justify-between mb-2">
              <p className="text-[11px] font-semibold uppercase tracking-widest text-blue-200/50">
                Co je nového
              </p>
              {isConnected && (
                <div className="flex items-center gap-1">
                  <div className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-[10px] text-emerald-300/60">Live</span>
                </div>
              )}
            </div>
            {activity.slice(0, 4).map((item, i) => (
              <ActivityFeedItem
                key={item.id}
                item={item}
                index={i}
                isNew={newItemIds.has(item.id)}
              />
            ))}
          </motion.div>
        )}
      </div>

      {/* ── Bottom gradient fade ──────────────────────────── */}
      <div className="absolute inset-x-0 bottom-0 h-16 bg-linear-to-t from-blue-700/30 to-transparent pointer-events-none" />
    </div>
  );
}
