"use client";

import { useState, useTransition, useRef, useEffect } from "react";
import {
  ArrowLeft,
  Send,
  User,
  MessageCircle,
  Package,
  Inbox,
} from "lucide-react";
import {
  sendMessage,
  getConversations,
  getConversationMessages,
} from "@/actions/messages";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { cs } from "date-fns/locale";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Conversation {
  partnerId: string;
  partnerName: string | null;
  partnerAvatar: string | null;
  lastMessage: string;
  lastMessageAt: Date;
  unreadCount: number;
  listingId: string | null;
  listingTitle: string | null;
}

interface ChatMessage {
  id: string;
  content: string;
  createdAt: Date;
  sender: {
    id: string;
    name: string | null;
    avatarUrl: string | null;
  };
}

// ---------------------------------------------------------------------------
// CONVERSATION LIST
// ---------------------------------------------------------------------------

function ConversationList({
  conversations,
  onSelect,
}: {
  conversations: Conversation[];
  onSelect: (conv: Conversation) => void;
}) {
  if (conversations.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <Inbox className="mb-3 h-12 w-12 text-foreground-muted" />
        <p className="text-sm font-medium text-foreground-secondary">
          Žádné zprávy
        </p>
        <p className="text-xs text-foreground-muted mt-1">
          Kontaktujte prodejce přes tržiště
        </p>
      </div>
    );
  }

  return (
    <div className="divide-y divide-border">
      {conversations.map((conv) => {
        const key = `${conv.partnerId}:${conv.listingId || "direct"}`;
        return (
          <button
            key={key}
            onClick={() => onSelect(conv)}
            className={cn(
              "w-full flex items-center gap-3 p-3 text-left transition-colors",
              "hover:bg-background-secondary active:bg-background-secondary",
            )}
          >
            {/* Avatar */}
            <div className="relative flex-shrink-0">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-background-secondary overflow-hidden">
                {conv.partnerAvatar ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={conv.partnerAvatar}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <User className="h-5 w-5 text-foreground-muted" />
                )}
              </div>
              {conv.unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-blue-600 text-[10px] font-bold text-white px-1">
                  {conv.unreadCount}
                </span>
              )}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <span
                  className={cn(
                    "text-sm truncate",
                    conv.unreadCount > 0
                      ? "font-bold text-foreground"
                      : "font-medium text-foreground",
                  )}
                >
                  {conv.partnerName || "Neznámý"}
                </span>
                <span className="text-[10px] text-foreground-muted ml-2 flex-shrink-0">
                  {formatDistanceToNow(new Date(conv.lastMessageAt), {
                    addSuffix: true,
                    locale: cs,
                  })}
                </span>
              </div>

              {conv.listingTitle && (
                <div className="flex items-center gap-1 mt-0.5">
                  <Package className="h-3 w-3 text-foreground-muted" />
                  <span className="text-[11px] text-foreground-muted truncate">
                    {conv.listingTitle}
                  </span>
                </div>
              )}

              <p
                className={cn(
                  "text-xs truncate mt-0.5",
                  conv.unreadCount > 0
                    ? "text-foreground"
                    : "text-foreground-muted",
                )}
              >
                {conv.lastMessage}
              </p>
            </div>
          </button>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// CHAT VIEW
// ---------------------------------------------------------------------------

function ChatView({
  partnerId,
  partnerName,
  partnerAvatar,
  listingId,
  listingTitle,
  currentUserId,
  onBack,
}: {
  partnerId: string;
  partnerName: string | null;
  partnerAvatar: string | null;
  listingId?: string | null;
  listingTitle?: string | null;
  currentUserId: string;
  onBack: () => void;
}) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [isPending, startTransition] = useTransition();
  const [loading, setLoading] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Load messages
  useEffect(() => {
    let active = true;
    setLoading(true);
    getConversationMessages(partnerId, listingId || undefined).then((msgs) => {
      if (active) {
        setMessages(msgs as ChatMessage[]);
        setLoading(false);
      }
    });
    return () => {
      active = false;
    };
  }, [partnerId, listingId]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = () => {
    if (!newMessage.trim()) return;

    const fd = new FormData();
    fd.set("content", newMessage.trim());
    fd.set("receiverId", partnerId);
    if (listingId) fd.set("listingId", listingId);

    const optimistic: ChatMessage = {
      id: `temp-${Date.now()}`,
      content: newMessage.trim(),
      createdAt: new Date(),
      sender: { id: currentUserId, name: "Vy", avatarUrl: null },
    };

    setMessages((prev) => [...prev, optimistic]);
    setNewMessage("");

    startTransition(async () => {
      const result = await sendMessage(fd);
      if (result.error) {
        // Remove optimistic message on error
        setMessages((prev) => prev.filter((m) => m.id !== optimistic.id));
        toast.error("Zprávu se nepodařilo odeslat");
      }
    });
  };

  const initials =
    partnerName
      ?.split(" ")
      .map((n) => n[0])
      .join("")
      .slice(0, 2) || "?";

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-border pb-3">
        <button
          onClick={onBack}
          className="flex h-8 w-8 items-center justify-center rounded-lg bg-background-secondary text-foreground-secondary hover:text-foreground flex-shrink-0"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-background-secondary overflow-hidden flex-shrink-0">
          {partnerAvatar ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={partnerAvatar}
              alt=""
              className="h-full w-full object-cover"
            />
          ) : (
            <span className="text-xs font-bold text-foreground-secondary">
              {initials}
            </span>
          )}
        </div>
        <div className="min-w-0">
          <p className="text-sm font-bold text-foreground truncate">
            {partnerName || "Neznámý"}
          </p>
          {listingTitle && (
            <p className="text-[11px] text-foreground-muted truncate">
              {listingTitle}
            </p>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto py-3 space-y-2 min-h-[200px] max-h-[400px]">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-slate-300 border-t-blue-600" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <MessageCircle className="h-8 w-8 text-foreground-muted mb-2" />
            <p className="text-xs text-foreground-muted">Začněte konverzaci</p>
          </div>
        ) : (
          messages.map((msg) => {
            const isMine = msg.sender.id === currentUserId;
            return (
              <div
                key={msg.id}
                className={cn(
                  "flex",
                  isMine ? "justify-end" : "justify-start",
                )}
              >
                <div
                  className={cn(
                    "max-w-[75%] rounded-2xl px-3 py-2 text-sm",
                    isMine
                      ? "bg-blue-600 text-white rounded-br-sm"
                      : "bg-background-secondary text-foreground rounded-bl-sm",
                  )}
                >
                  <p className="whitespace-pre-line break-words">
                    {msg.content}
                  </p>
                  <p
                    className={cn(
                      "text-[10px] mt-1",
                      isMine ? "text-blue-200" : "text-foreground-muted",
                    )}
                  >
                    {formatDistanceToNow(new Date(msg.createdAt), {
                      addSuffix: true,
                      locale: cs,
                    })}
                  </p>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="flex items-center gap-2 border-t border-border pt-3">
        <input
          type="text"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
          placeholder="Napište zprávu..."
          className={cn(
            "flex-1 rounded-xl border border-border px-3 py-2.5 text-sm bg-card text-foreground",
            "focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20",
          )}
        />
        <button
          onClick={handleSend}
          disabled={!newMessage.trim() || isPending}
          className={cn(
            "flex h-10 w-10 items-center justify-center rounded-xl",
            "bg-accent text-white shadow-accent glow-blue",
            "hover:bg-accent-hover active:scale-95 transition-all",
            "disabled:opacity-50 disabled:cursor-not-allowed",
          )}
        >
          <Send className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// MESSAGES CLIENT (main exported component)
// ---------------------------------------------------------------------------

interface MessagesClientProps {
  conversations: Conversation[];
  currentUserId: string;
  // Allow opening a specific chat from outside (e.g. marketplace)
  initialPartnerId?: string;
  initialPartnerName?: string;
  initialPartnerAvatar?: string;
  initialListingId?: string;
  initialListingTitle?: string;
}

export function MessagesClient({
  conversations,
  currentUserId,
  initialPartnerId,
  initialPartnerName,
  initialPartnerAvatar,
  initialListingId,
  initialListingTitle,
}: MessagesClientProps) {
  const [activeConv, setActiveConv] = useState<Conversation | null>(
    initialPartnerId
      ? {
          partnerId: initialPartnerId,
          partnerName: initialPartnerName || null,
          partnerAvatar: initialPartnerAvatar || null,
          lastMessage: "",
          lastMessageAt: new Date(),
          unreadCount: 0,
          listingId: initialListingId || null,
          listingTitle: initialListingTitle || null,
        }
      : null,
  );

  if (activeConv) {
    return (
      <ChatView
        partnerId={activeConv.partnerId}
        partnerName={activeConv.partnerName}
        partnerAvatar={activeConv.partnerAvatar}
        listingId={activeConv.listingId}
        listingTitle={activeConv.listingTitle}
        currentUserId={currentUserId}
        onBack={() => setActiveConv(null)}
      />
    );
  }

  return (
    <ConversationList
      conversations={conversations}
      onSelect={(conv) => setActiveConv(conv)}
    />
  );
}
