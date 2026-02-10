"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Bell } from "@phosphor-icons/react";
import { formatDistanceToNow } from "date-fns";
import { cs } from "date-fns/locale";
import { cn } from "@/lib/utils";
import {
  getMyNotifications,
  getUnreadNotificationCount,
  markNotificationRead,
  markAllNotificationsRead,
} from "@/actions/notifications";
import { motion, AnimatePresence } from "framer-motion";
import { useSocket } from "@/hooks/useSocket";

interface Notification {
  id: string;
  type: string;
  title: string;
  body: string;
  link: string | null;
  isRead: boolean;
  createdAt: Date;
}

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const panelRef = useRef<HTMLDivElement>(null);
  const { on, isConnected } = useSocket();

  // Fetch unread count on mount and periodically (fallback if socket disconnects)
  const fetchUnread = useCallback(async () => {
    try {
      const count = await getUnreadNotificationCount();
      setUnreadCount(count);
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    fetchUnread();
    // Fallback polling only when Socket.IO is not connected – 60s instead of 30s
    const interval = setInterval(() => {
      if (!isConnected) fetchUnread();
    }, 60_000);
    return () => clearInterval(interval);
  }, [fetchUnread, isConnected]);

  // Real-time: listen for new notifications via Socket.IO
  useEffect(() => {
    const unsub = on("notification:new", (data: { title?: string; body?: string }) => {
      // Increment badge count immediately
      setUnreadCount((c) => c + 1);
      // If panel is open, prepend the new notification
      if (data?.title) {
        setNotifications((prev) => [
          {
            id: `rt-${Date.now()}`,
            type: "GENERAL",
            title: data.title ?? "",
            body: data.body ?? "",
            link: null,
            isRead: false,
            createdAt: new Date(),
          },
          ...prev,
        ]);
      }
    });
    return unsub;
  }, [on]);

  // Fetch full list when panel opens
  useEffect(() => {
    if (open) {
      getMyNotifications(30).then(setNotifications).catch(() => {});
    }
  }, [open]);

  // Close on click outside
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener("mousedown", handleClick);
    }
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  const handleMarkRead = async (id: string) => {
    await markNotificationRead(id);
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
    );
    setUnreadCount((c) => Math.max(0, c - 1));
  };

  const handleMarkAllRead = async () => {
    await markAllNotificationsRead();
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    setUnreadCount(0);
  };

  const handleNotificationClick = (n: Notification) => {
    if (!n.isRead) handleMarkRead(n.id);
    if (n.link) window.location.href = n.link;
    setOpen(false);
  };

  return (
    <div className="relative" ref={panelRef}>
      {/* Bell button */}
      <button
        onClick={() => setOpen(!open)}
        aria-label="Notifikace"
        className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-background-secondary hover:bg-background-tertiary active:scale-[0.97] btn-press focus-ring transition-colors"
      >
        <Bell
          className="h-[18px] w-[18px] text-foreground-secondary"
          weight={unreadCount > 0 ? "fill" : "regular"}
        />
        {/* Badge */}
        <AnimatePresence>
          {unreadCount > 0 && (
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0 }}
              transition={{ type: "spring", stiffness: 500, damping: 20 }}
              className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white"
            >
              {unreadCount > 99 ? "99+" : unreadCount}
            </motion.span>
          )}
        </AnimatePresence>
      </button>

      {/* Dropdown panel */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 top-full mt-2 z-50 w-80 max-h-[420px] overflow-hidden rounded-2xl border border-border bg-card shadow-xl"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <h3 className="text-sm font-semibold text-foreground">
                Notifikace
              </h3>
              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAllRead}
                  className="text-xs font-medium text-accent hover:text-accent-hover transition-colors"
                >
                  Označit vše
                </button>
              )}
            </div>

            {/* List */}
            <div className="max-h-[360px] overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 text-center">
                  <Bell className="h-8 w-8 text-foreground-muted mb-2" />
                  <p className="text-sm text-foreground-secondary">
                    Žádné notifikace
                  </p>
                </div>
              ) : (
                notifications.map((n) => (
                  <button
                    key={n.id}
                    onClick={() => handleNotificationClick(n)}
                    className={cn(
                      "flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-background-secondary border-b border-border last:border-0",
                      !n.isRead && "bg-accent-subtle"
                    )}
                  >
                    {/* Unread dot */}
                    <div className="mt-1.5 shrink-0">
                      <div
                        className={cn(
                          "h-2 w-2 rounded-full",
                          n.isRead
                            ? "bg-transparent"
                            : "bg-blue-500"
                        )}
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p
                        className={cn(
                          "text-sm leading-snug",
                          n.isRead
                            ? "text-foreground-secondary"
                            : "font-semibold text-foreground"
                        )}
                      >
                        {n.title}
                      </p>
                      <p className="mt-0.5 text-xs text-foreground-muted line-clamp-2">
                        {n.body}
                      </p>
                      <p className="mt-1 text-[11px] text-foreground-muted">
                        {formatDistanceToNow(new Date(n.createdAt), {
                          addSuffix: true,
                          locale: cs,
                        })}
                      </p>
                    </div>
                  </button>
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
