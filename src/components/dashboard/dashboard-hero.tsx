"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState, useMemo } from "react";
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
} from "@phosphor-icons/react";
import { easings } from "@/components/animations/variants";

/* ── types ─────────────────────────────────────────────────── */
interface NewsItem {
  id: string;
  title: string;
  publishedAt: Date;
  author: { name: string; avatarUrl: string | null };
  _count: { comments: number };
}

interface DashboardHeroProps {
  userName: string;
  avatarUrl: string | null;
  pointsBalance: number;
  latestNews: NewsItem[];
  unreadMessages: number;
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
    "Neděle",
    "Pondělí",
    "Úterý",
    "Středa",
    "Čtvrtek",
    "Pátek",
    "Sobota",
  ];
  const months = [
    "ledna", "února", "března", "dubna", "května", "června",
    "července", "srpna", "září", "října", "listopadu", "prosince",
  ];
  return `${days[now.getDay()]}, ${now.getDate()}. ${months[now.getMonth()]}`;
}

/* ── sparkle particle component ────────────────────────────── */
function Sparkle({ delay, x, y, size }: { delay: number; x: number; y: number; size: number }) {
  return (
    <motion.div
      className="absolute rounded-full bg-white pointer-events-none"
      style={{ width: size, height: size, left: `${x}%`, top: `${y}%` }}
      initial={{ opacity: 0, scale: 0 }}
      animate={{
        opacity: [0, 0.8, 0],
        scale: [0, 1, 0],
      }}
      transition={{
        duration: 2.5,
        delay,
        repeat: Infinity,
        repeatDelay: Math.random() * 3 + 2,
        ease: "easeInOut",
      }}
    />
  );
}

/* ── news ticker item ──────────────────────────────────────── */
function NewsTickerItem({ news, index }: { news: NewsItem; index: number }) {
  const timeAgo = useMemo(() => {
    const diff = Date.now() - new Date(news.publishedAt).getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 60) return `před ${minutes}m`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `před ${hours}h`;
    const days = Math.floor(hours / 24);
    return `před ${days}d`;
  }, [news.publishedAt]);

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.6 + index * 0.1, duration: 0.4, ease: easings.emphasis }}
    >
      <Link
        href={`/news/${news.id}`}
        className="group flex items-center gap-3 rounded-xl bg-white/8 hover:bg-white/14 
                   backdrop-blur-sm border border-white/8 px-3 py-2.5 transition-all duration-200"
      >
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/10">
          <Newspaper className="h-4 w-4 text-blue-200" weight="duotone" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[13px] font-medium text-white/90 group-hover:text-white transition-colors">
            {news.title}
          </p>
          <p className="text-[11px] text-blue-200/60">
            {news.author.name} · {timeAgo}
          </p>
        </div>
        <CaretRight className="h-3.5 w-3.5 text-white/30 group-hover:text-white/60 transition-colors shrink-0" weight="bold" />
      </Link>
    </motion.div>
  );
}

/* ── animated counter ──────────────────────────────────────── */
function AnimatedCounter({ target }: { target: number }) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (target === 0) return;
    const duration = 1200;
    const steps = 30;
    const increment = target / steps;
    let current = 0;
    let step = 0;

    const timer = setInterval(() => {
      step++;
      // Ease-out
      const progress = step / steps;
      const eased = 1 - Math.pow(1 - progress, 3);
      current = Math.round(eased * target);
      setCount(current);
      if (step >= steps) {
        setCount(target);
        clearInterval(timer);
      }
    }, duration / steps);

    return () => clearInterval(timer);
  }, [target]);

  return <span className="tabular-nums">{count.toLocaleString("cs-CZ")}</span>;
}

/* ── main hero component ───────────────────────────────────── */
export default function DashboardHero({
  userName,
  avatarUrl,
  pointsBalance,
  latestNews,
  unreadMessages,
}: DashboardHeroProps) {
  const greeting = getGreeting();
  const dateStr = getFormattedDate();
  const GreetingIcon = greeting.icon;

  // Sparkles data (stable across renders)
  const sparkles = useMemo(
    () =>
      Array.from({ length: 8 }, (_, i) => ({
        id: i,
        x: Math.random() * 90 + 5,
        y: Math.random() * 80 + 10,
        size: Math.random() * 3 + 1.5,
        delay: Math.random() * 3,
      })),
    []
  );

  const firstName = userName?.split(" ")[0] ?? userName;

  return (
    <div className="relative isolate overflow-hidden rounded-2xl" data-hero>
      {/* ── Animated gradient background ──────────────────── */}
      <div className="absolute inset-0 hero-gradient animate-gradient" />

      {/* ── Mesh overlay for depth ────────────────────────── */}
      <div className="absolute inset-0 opacity-30 mix-blend-overlay"
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
        {/* Top row: date + messages badge */}
        <motion.div
          className="flex items-center justify-between mb-4"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: easings.emphasis }}
        >
          <div className="flex items-center gap-2 text-blue-100/70">
            <GreetingIcon className="h-4 w-4" weight="fill" />
            <span className="text-xs font-medium">{dateStr}</span>
          </div>
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
        </motion.div>

        {/* ── Main greeting ─────────────────────────────── */}
        <div className="flex items-start gap-4">
          {/* Avatar */}
          <motion.div
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: "spring", stiffness: 400, damping: 20, delay: 0.15 }}
            className="shrink-0"
          >
            <div className="relative">
              <div className="h-14 w-14 sm:h-16 sm:w-16 rounded-2xl overflow-hidden ring-2 ring-white/20 shadow-lg">
                {avatarUrl ? (
                  <Image
                    src={avatarUrl}
                    alt={userName}
                    width={64}
                    height={64}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="h-full w-full bg-white/20 flex items-center justify-center">
                    <span className="text-xl sm:text-2xl font-bold text-white/80">
                      {firstName?.[0]?.toUpperCase()}
                    </span>
                  </div>
                )}
              </div>
              {/* Online indicator */}
              <div className="absolute -bottom-0.5 -right-0.5 h-4 w-4 rounded-full bg-emerald-400 border-2 border-blue-600 shadow-sm" />
            </div>
          </motion.div>

          {/* Text */}
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
          className="mt-5 flex items-center gap-2.5 flex-wrap"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.35, ease: easings.emphasis }}
        >
          {/* Points */}
          <div className="flex items-center gap-2 rounded-xl bg-white/12 backdrop-blur-sm border border-white/10 px-3.5 py-2">
            <Star className="h-4.5 w-4.5 text-yellow-300 animate-sparkle" weight="fill" />
            <span className="text-sm font-bold text-white" data-points>
              <AnimatedCounter target={pointsBalance} /> bodů
            </span>
          </div>

          {/* View all news link */}
          <Link
            href="/news"
            className="flex items-center gap-1.5 rounded-xl bg-white/8 hover:bg-white/15 
                       backdrop-blur-sm border border-white/8 px-3.5 py-2 transition-all duration-200 group"
          >
            <Newspaper className="h-4 w-4 text-blue-200" weight="duotone" />
            <span className="text-sm font-medium text-white/80 group-hover:text-white transition-colors">
              Novinky
            </span>
            <CaretRight className="h-3 w-3 text-white/40 group-hover:translate-x-0.5 transition-transform" weight="bold" />
          </Link>
        </motion.div>

        {/* ── Latest news feed ─────────────────────────── */}
        {latestNews.length > 0 && (
          <motion.div
            className="mt-4 space-y-2"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5, duration: 0.4 }}
          >
            <p className="text-[11px] font-semibold uppercase tracking-widest text-blue-200/50 mb-2">
              Poslední novinky
            </p>
            {latestNews.slice(0, 3).map((news, i) => (
              <NewsTickerItem key={news.id} news={news} index={i} />
            ))}
          </motion.div>
        )}
      </div>

      {/* ── Bottom gradient fade ──────────────────────────── */}
      <div className="absolute inset-x-0 bottom-0 h-16 bg-linear-to-t from-blue-700/30 to-transparent pointer-events-none" />
    </div>
  );
}
