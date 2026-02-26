import { useState, useRef, useEffect, type FormEvent } from "react";
import {
  Send,
  Search,
  MessageCircle,
  ArrowLeft,
  Phone,
  Video,
  Info,
  Image,
  Heart,
  Smile,
  Briefcase,
  ExternalLink,
  MapPin,
  ChevronDown,
  ChevronUp,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAppSelector } from "@/store";
import { fetchApi } from "@/lib/fetchApi";
import { useGetFavoritesQuery, useDeleteFavoriteMutation } from "@/features/favorites/favoritesApi";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ApiMessage {
  id: number;
  chat_id: number;
  sender_id: number | null;
  content: string;
  created_at: string;
}

interface ApiChat {
  id: number;
  created_at: string;
  participants: { user_id: number; joined_at: string }[];
  last_message: ApiMessage | null;
}

// ─── Mock data (used when API is unavailable) ─────────────────────────────────

const MOCK_USERS: Record<number, { name: string; avatar: string; username: string }> = {
  2: { name: "Alice Johnson", avatar: "AJ", username: "alice_j" },
  3: { name: "Bob Smith", avatar: "BS", username: "bob.smith" },
  4: { name: "Carol White", avatar: "CW", username: "carol_w" },
};

const MOCK_CHATS: ApiChat[] = [
  {
    id: 1,
    created_at: new Date(Date.now() - 3600_000).toISOString(),
    participants: [
      { user_id: 1, joined_at: "" },
      { user_id: 2, joined_at: "" },
    ],
    last_message: {
      id: 10,
      chat_id: 1,
      sender_id: 2,
      content: "Привет! Как дела?",
      created_at: new Date(Date.now() - 600_000).toISOString(),
    },
  },
  {
    id: 2,
    created_at: new Date(Date.now() - 7200_000).toISOString(),
    participants: [
      { user_id: 1, joined_at: "" },
      { user_id: 3, joined_at: "" },
    ],
    last_message: {
      id: 20,
      chat_id: 2,
      sender_id: 1,
      content: "Увидимся завтра",
      created_at: new Date(Date.now() - 3600_000).toISOString(),
    },
  },
  {
    id: 3,
    created_at: new Date(Date.now() - 86400_000).toISOString(),
    participants: [
      { user_id: 1, joined_at: "" },
      { user_id: 4, joined_at: "" },
    ],
    last_message: null,
  },
];

const MOCK_MESSAGES: Record<number, ApiMessage[]> = {
  1: [
    { id: 1, chat_id: 1, sender_id: 2, content: "Привет!", created_at: new Date(Date.now() - 7200_000).toISOString() },
    { id: 2, chat_id: 1, sender_id: 1, content: "Привет! Рад тебя видеть", created_at: new Date(Date.now() - 7100_000).toISOString() },
    { id: 3, chat_id: 1, sender_id: 2, content: "Как продвигается проект?", created_at: new Date(Date.now() - 7000_000).toISOString() },
    { id: 4, chat_id: 1, sender_id: 1, content: "Всё хорошо, почти закончил", created_at: new Date(Date.now() - 6900_000).toISOString() },
    { id: 10, chat_id: 1, sender_id: 2, content: "Привет! Как дела?", created_at: new Date(Date.now() - 600_000).toISOString() },
  ],
  2: [
    { id: 20, chat_id: 2, sender_id: 1, content: "Увидимся завтра", created_at: new Date(Date.now() - 3600_000).toISOString() },
  ],
  3: [],
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatTime(iso: string) {
  const date = new Date(iso);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - date.getTime()) / 86400_000);

  if (diffDays === 0) return date.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
  if (diffDays === 1) return "Вчера";
  if (diffDays < 7) return date.toLocaleDateString("ru-RU", { weekday: "short" });
  return date.toLocaleDateString("ru-RU", { day: "numeric", month: "short" });
}

function getOtherUser(chat: ApiChat, myId: number) {
  const other = chat.participants.find((p) => p.user_id !== myId);
  const uid = other?.user_id;
  if (uid == null) return { name: "Unknown", avatar: "?", username: "unknown" };
  return MOCK_USERS[uid] ?? { name: `User ${uid}`, avatar: String(uid), username: `user${uid}` };
}

// ─── Avatar ───────────────────────────────────────────────────────────────────

const GRADIENT_PAIRS = [
  "from-amber-400 to-rose-500",
  "from-purple-500 to-pink-500",
  "from-blue-400 to-indigo-500",
  "from-green-400 to-teal-500",
  "from-rose-400 to-orange-400",
  "from-cyan-400 to-blue-500",
  "from-fuchsia-500 to-purple-600",
];

function Avatar({ initials, size = "md", online }: { initials: string; size?: "sm" | "md" | "lg"; online?: boolean }) {
  const gradient = GRADIENT_PAIRS[initials.charCodeAt(0) % GRADIENT_PAIRS.length];
  const sizeClass =
    size === "sm" ? "h-6 w-6 text-[9px]" :
    size === "lg" ? "h-14 w-14 text-lg" :
    "h-12 w-12 text-sm";

  return (
    <div className="relative">
      <div className={cn(
        "shrink-0 rounded-full bg-gradient-to-br flex items-center justify-center font-semibold text-white",
        gradient,
        sizeClass,
      )}>
        {initials.slice(0, 2).toUpperCase()}
      </div>
      {online && (
        <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-background bg-green-500" />
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ChatPage() {
  const MY_ID = 1;
  const token = useAppSelector((s) => s.auth.token);

  const [chats, setChats] = useState<ApiChat[]>(MOCK_CHATS);
  const [activeChatId, setActiveChatId] = useState<number | null>(null);
  const [messages, setMessages] = useState<ApiMessage[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [search, setSearch] = useState("");
  const [mobileView, setMobileView] = useState<"list" | "chat">("list");

  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const authHeaders: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};

  // Load chats
  useEffect(() => {
    fetchApi("/api/chats/", { headers: authHeaders })
      .then((r) => (r.ok ? r.json() : null))
      .then((data: ApiChat[] | null) => { if (data) setChats(data); })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Load messages when chat selected
  useEffect(() => {
    if (activeChatId == null) return;
    if (MOCK_MESSAGES[activeChatId]) setMessages(MOCK_MESSAGES[activeChatId]);
    fetch(`/api/chats/${activeChatId}/messages`, { headers: authHeaders })
      .then((r) => (r.ok ? r.json() : null))
      .then((data: ApiMessage[] | null) => { if (data) setMessages(data); })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeChatId]);

  // Auto-scroll
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function sendMessage(e: FormEvent) {
    e.preventDefault();
    const text = input.trim();
    if (!text || sending || activeChatId == null) return;

    const optimistic: ApiMessage = {
      id: Date.now(),
      chat_id: activeChatId,
      sender_id: MY_ID,
      content: text,
      created_at: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, optimistic]);
    setInput("");
    setSending(true);
    if (textareaRef.current) textareaRef.current.style.height = "auto";

    try {
      const res = await fetch(`/api/chats/${activeChatId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders },
        body: JSON.stringify({ content: text }),
      });
      if (res.ok) {
        const saved: ApiMessage = await res.json();
        setMessages((prev) => prev.map((m) => (m.id === optimistic.id ? saved : m)));
        setChats((prev) => prev.map((c) => (c.id === activeChatId ? { ...c, last_message: saved } : c)));
      }
    } catch {
      // Keep optimistic message
    } finally {
      setSending(false);
    }
  }

  function selectChat(id: number) {
    setActiveChatId(id);
    setMobileView("chat");
  }

  // Favorites
  const { data: favorites = [] } = useGetFavoritesQuery();
  const [deleteFavorite] = useDeleteFavoriteMutation();
  const [showFavorites, setShowFavorites] = useState(false);

  const filteredChats = chats.filter((c) => {
    if (!search) return true;
    return getOtherUser(c, MY_ID).name.toLowerCase().includes(search.toLowerCase());
  });

  const activeChat = chats.find((c) => c.id === activeChatId) ?? null;
  const activePeer = activeChat ? getOtherUser(activeChat, MY_ID) : null;

  return (
    <div className="flex h-full overflow-hidden bg-background">

      {/* ── Contact list (left panel) ─────────────────────────────────── */}
      <aside className={cn(
        "flex h-full flex-col border-r border-border/50",
        "w-full md:w-[350px] lg:w-[400px] md:flex-shrink-0",
        mobileView === "chat" && "hidden md:flex",
      )}>
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4">
          <h2 className="text-xl font-bold tracking-tight">Сообщения</h2>
          <button className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
            <MessageCircle className="h-5 w-5" />
          </button>
        </div>

        {/* Search */}
        <div className="px-4 pb-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Поиск..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-lg bg-muted/60 py-2 pl-9 pr-4 text-sm outline-none transition-colors placeholder:text-muted-foreground/60 focus:bg-muted focus:ring-1 focus:ring-primary/30"
            />
          </div>
        </div>

        {/* Liked Vacancies */}
        {favorites.length > 0 && (
          <div className="border-b px-4 py-2">
            <button
              onClick={() => setShowFavorites((v) => !v)}
              className="flex w-full items-center justify-between text-sm font-semibold text-foreground"
            >
              <span className="flex items-center gap-2">
                <Heart className="h-4 w-4 text-rose-500" />
                Понравившиеся
                <span className="rounded-full bg-rose-100 dark:bg-rose-900/30 px-2 py-0.5 text-[10px] font-bold text-rose-600 dark:text-rose-400">
                  {favorites.length}
                </span>
              </span>
              {showFavorites ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>

            {showFavorites && (
              <div className="mt-2 space-y-1.5 max-h-48 overflow-y-auto">
                {favorites.map((fav) => (
                  <div
                    key={fav.id}
                    className="flex items-center gap-2 rounded-lg border bg-card p-2 text-xs shadow-sm"
                  >
                    {fav.logo_url ? (
                      <img src={fav.logo_url} alt="" className="h-8 w-8 shrink-0 rounded-md object-cover" />
                    ) : (
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-muted">
                        <Briefcase className="h-3.5 w-3.5 text-muted-foreground" />
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="font-medium truncate">{fav.title}</p>
                      {fav.subtitle && <p className="text-muted-foreground truncate">{fav.subtitle}</p>}
                      <div className="flex items-center gap-2 mt-0.5">
                        {fav.salary && <span className="font-medium text-green-600 dark:text-green-400">{fav.salary}</span>}
                        {fav.location && (
                          <span className="flex items-center gap-0.5 text-muted-foreground">
                            <MapPin className="h-2.5 w-2.5" />{fav.location}
                          </span>
                        )}
                      </div>
                      {fav.tags.length > 0 && (
                        <div className="flex flex-wrap gap-0.5 mt-0.5">
                          {fav.tags.slice(0, 3).map((t) => (
                            <span key={t} className="rounded bg-muted px-1 py-0.5 text-[9px]">{t}</span>
                          ))}
                          {fav.tags.length > 3 && <span className="text-[9px] text-muted-foreground">+{fav.tags.length - 3}</span>}
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col gap-1 shrink-0">
                      {fav.url && (
                        <a href={fav.url} target="_blank" rel="noopener noreferrer" className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground">
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      )}
                      <button
                        onClick={() => deleteFavorite(fav.id)}
                        className="rounded p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tabs */}
        <div className="flex border-b px-4">
          <button className="relative flex-1 pb-3 text-sm font-semibold text-foreground">
            Основные
            <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-foreground" />
          </button>
          <button className="flex-1 pb-3 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
            Общие
          </button>
        </div>

        {/* Conversation list */}
        <div className="flex-1 overflow-y-auto">
          {filteredChats.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center gap-2 p-6 text-center text-muted-foreground">
              <MessageCircle className="h-12 w-12 opacity-20" />
              <p className="text-sm">Нет диалогов</p>
            </div>
          ) : (
            filteredChats.map((chat) => {
              const peer = getOtherUser(chat, MY_ID);
              const isActive = chat.id === activeChatId;
              const lastMsg = chat.last_message;
              const isMine = lastMsg?.sender_id === MY_ID;

              return (
                <button
                  key={chat.id}
                  onClick={() => selectChat(chat.id)}
                  className={cn(
                    "flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-muted/50",
                    isActive && "bg-muted/70",
                  )}
                >
                  <Avatar initials={peer.avatar} online={chat.id % 2 === 0} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-1">
                      <span className="truncate text-[14px] font-semibold">{peer.name}</span>
                      {lastMsg && (
                        <span className="shrink-0 text-[11px] text-muted-foreground">
                          {formatTime(lastMsg.created_at)}
                        </span>
                      )}
                    </div>
                    {lastMsg ? (
                      <p className="truncate text-[13px] text-muted-foreground">
                        {isMine && <span className="font-medium">Вы: </span>}
                        {lastMsg.content}
                      </p>
                    ) : (
                      <p className="text-[13px] italic text-muted-foreground/40">Нет сообщений</p>
                    )}
                  </div>
                </button>
              );
            })
          )}
        </div>
      </aside>

      {/* ── Chat area (right panel) ───────────────────────────────────── */}
      <div className={cn(
        "flex flex-1 flex-col",
        mobileView === "list" && "hidden md:flex",
      )}>
        {activeChatId == null ? (
          /* Empty state — Instagram style */
          <div className="flex flex-1 flex-col items-center justify-center gap-3 text-muted-foreground">
            <div className="flex h-24 w-24 items-center justify-center rounded-full border-2 border-current">
              <Send className="h-10 w-10 -rotate-45" />
            </div>
            <p className="text-xl font-light">Ваши сообщения</p>
            <p className="max-w-sm text-center text-sm text-muted-foreground/70">
              Отправляйте личные фото и сообщения другу или группе
            </p>
            <button className="mt-2 rounded-lg bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90">
              Отправить сообщение
            </button>
          </div>
        ) : (
          <>
            {/* Chat header */}
            <div className="flex items-center justify-between border-b px-4 py-2.5">
              <div className="flex items-center gap-3">
                <button
                  className="rounded-full p-1 hover:bg-muted md:hidden"
                  onClick={() => setMobileView("list")}
                >
                  <ArrowLeft className="h-5 w-5" />
                </button>
                {activePeer && <Avatar initials={activePeer.avatar} size="md" online />}
                <div>
                  <p className="text-[15px] font-semibold leading-tight">{activePeer?.name}</p>
                  <p className="text-[12px] text-muted-foreground">Активность: 5 мин. назад</p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button className="rounded-full p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
                  <Phone className="h-5 w-5" />
                </button>
                <button className="rounded-full p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
                  <Video className="h-5 w-5" />
                </button>
                <button className="rounded-full p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
                  <Info className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-4 py-4">
              {messages.length === 0 ? (
                <div className="flex h-full flex-col items-center justify-center gap-2">
                  {activePeer && <Avatar initials={activePeer.avatar} size="lg" />}
                  <p className="text-base font-semibold">{activePeer?.name}</p>
                  <p className="text-sm text-muted-foreground">{activePeer?.username}</p>
                  <p className="text-[13px] text-muted-foreground/60">
                    Начните общение с {activePeer?.name}
                  </p>
                </div>
              ) : (
                <div className="mx-auto max-w-2xl space-y-0.5">
                  {/* Profile intro at top */}
                  <div className="flex flex-col items-center gap-1 pb-6 pt-2">
                    {activePeer && <Avatar initials={activePeer.avatar} size="lg" />}
                    <p className="text-base font-semibold">{activePeer?.name}</p>
                    <p className="text-[13px] text-muted-foreground">{activePeer?.username}</p>
                  </div>

                  {messages.map((msg, idx) => {
                    const isMe = msg.sender_id === MY_ID;
                    const prevSame = messages[idx - 1]?.sender_id === msg.sender_id;
                    const nextSame = messages[idx + 1]?.sender_id === msg.sender_id;
                    const isFirst = !prevSame;
                    const isLast = !nextSame;

                    return (
                      <div
                        key={msg.id}
                        className={cn(
                          "group flex items-end gap-2",
                          isMe ? "justify-end" : "justify-start",
                          isFirst ? "mt-3" : "mt-[2px]",
                        )}
                      >
                        {/* Peer avatar */}
                        {!isMe && (
                          <div className="w-7 shrink-0">
                            {isLast && activePeer ? (
                              <Avatar initials={activePeer.avatar} size="sm" />
                            ) : null}
                          </div>
                        )}

                        <div className={cn("flex max-w-xs items-end gap-1 lg:max-w-md", isMe ? "flex-row-reverse" : "flex-row")}>
                          <div
                            className={cn(
                              "break-words px-3 py-2 text-[14px] leading-relaxed",
                              "rounded-[22px]",
                              isMe
                                ? "bg-primary text-primary-foreground"
                                : "bg-muted text-foreground",
                              // Flatten corners for grouped messages
                              isMe && !isLast && "rounded-tr-[6px]",
                              isMe && !isFirst && "rounded-br-[6px]",
                              !isMe && !isLast && "rounded-tl-[6px]",
                              !isMe && !isFirst && "rounded-bl-[6px]",
                            )}
                          >
                            {msg.content}
                          </div>
                          {/* Quick reactions — visible on hover */}
                          <div className="flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
                            <button className="rounded-full p-1 text-muted-foreground/50 hover:text-muted-foreground">
                              <Heart className="h-3.5 w-3.5" />
                            </button>
                            <button className="rounded-full p-1 text-muted-foreground/50 hover:text-muted-foreground">
                              <Smile className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>

                        {/* Timestamp */}
                        {isLast && (
                          <span className="hidden text-[10px] text-muted-foreground/60 group-hover:inline">
                            {formatTime(msg.created_at)}
                          </span>
                        )}
                      </div>
                    );
                  })}
                  <div ref={bottomRef} />
                </div>
              )}
            </div>

            {/* Input bar — Instagram style */}
            <div className="border-t px-4 py-3">
              <form
                onSubmit={sendMessage}
                className="flex items-end gap-2 rounded-full border bg-muted/30 px-3 py-1.5"
              >
                <button type="button" className="shrink-0 rounded-full p-1.5 text-muted-foreground transition-colors hover:text-foreground">
                  <Smile className="h-5 w-5" />
                </button>
                <textarea
                  ref={textareaRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      sendMessage(e as unknown as FormEvent);
                    }
                  }}
                  placeholder="Напишите сообщение..."
                  rows={1}
                  className="flex-1 resize-none bg-transparent py-1.5 text-sm outline-none placeholder:text-muted-foreground/50"
                  style={{ maxHeight: "100px", overflowY: "auto" }}
                  onInput={(e) => {
                    const el = e.currentTarget;
                    el.style.height = "auto";
                    el.style.height = `${el.scrollHeight}px`;
                  }}
                />
                {input.trim() ? (
                  <button
                    type="submit"
                    disabled={sending}
                    className="shrink-0 rounded-full p-1.5 font-semibold text-primary transition-opacity hover:opacity-80 disabled:opacity-40"
                  >
                    <Send className="h-5 w-5" />
                  </button>
                ) : (
                  <>
                    <button type="button" className="shrink-0 rounded-full p-1.5 text-muted-foreground transition-colors hover:text-foreground">
                      <Image className="h-5 w-5" />
                    </button>
                    <button type="button" className="shrink-0 rounded-full p-1.5 text-muted-foreground transition-colors hover:text-foreground">
                      <Heart className="h-5 w-5" />
                    </button>
                  </>
                )}
              </form>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
