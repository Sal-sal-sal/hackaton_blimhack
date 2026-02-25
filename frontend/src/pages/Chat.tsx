import { useState, useRef, useEffect, type FormEvent } from "react";
import { Send, Search, MessageCircle, ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAppSelector } from "@/store";

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

const MOCK_USERS: Record<number, { name: string; avatar: string }> = {
  2: { name: "Alice Johnson", avatar: "AJ" },
  3: { name: "Bob Smith", avatar: "BS" },
  4: { name: "Carol White", avatar: "CW" },
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
  if (uid == null) return { name: "Unknown", avatar: "?" };
  return MOCK_USERS[uid] ?? { name: `User ${uid}`, avatar: String(uid) };
}

// ─── Avatar ───────────────────────────────────────────────────────────────────

const AVATAR_COLORS = [
  "bg-rose-400", "bg-purple-400", "bg-blue-400",
  "bg-green-400", "bg-amber-400", "bg-pink-400", "bg-cyan-400",
];

function Avatar({ initials, size = "md" }: { initials: string; size?: "sm" | "md" | "lg" }) {
  const color = AVATAR_COLORS[initials.charCodeAt(0) % AVATAR_COLORS.length];
  const sizeClass =
    size === "sm" ? "h-7 w-7 text-[10px]" :
    size === "lg" ? "h-14 w-14 text-lg" :
    "h-10 w-10 text-sm";

  return (
    <div className={cn("shrink-0 rounded-full flex items-center justify-center font-semibold text-white", color, sizeClass)}>
      {initials.slice(0, 2).toUpperCase()}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ChatPage() {
  const MY_ID = 1; // TODO: replace with useAuth().user?.id
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
    fetch("/api/chats/", { headers: authHeaders })
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

  const filteredChats = chats.filter((c) => {
    if (!search) return true;
    return getOtherUser(c, MY_ID).name.toLowerCase().includes(search.toLowerCase());
  });

  const activeChat = chats.find((c) => c.id === activeChatId) ?? null;
  const activePeer = activeChat ? getOtherUser(activeChat, MY_ID) : null;

  return (
    <div className="flex h-[calc(100vh-3.5rem)] overflow-hidden rounded-xl border bg-background">

      {/* ── Sidebar ─────────────────────────────────────────────────────── */}
      <aside className={cn(
        "flex w-full flex-col border-r md:w-80 md:flex-shrink-0",
        mobileView === "chat" && "hidden md:flex",
      )}>

        {/* Header */}
        <div className="border-b p-4">
          <h2 className="mb-3 text-xl font-bold">Сообщения</h2>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Поиск"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-full bg-muted py-2 pl-9 pr-4 text-sm outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
        </div>

        {/* Conversation list */}
        <div className="flex-1 overflow-y-auto">
          {filteredChats.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center gap-2 p-6 text-center text-muted-foreground">
              <MessageCircle className="h-12 w-12 opacity-30" />
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
                    "flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/60",
                    isActive && "bg-muted",
                  )}
                >
                  <Avatar initials={peer.avatar} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-1">
                      <span className="truncate text-sm font-semibold">{peer.name}</span>
                      {lastMsg && (
                        <span className="shrink-0 text-[11px] text-muted-foreground">
                          {formatTime(lastMsg.created_at)}
                        </span>
                      )}
                    </div>
                    {lastMsg ? (
                      <p className="truncate text-xs text-muted-foreground">
                        {isMine && <span className="mr-1 font-medium">Вы:</span>}
                        {lastMsg.content}
                      </p>
                    ) : (
                      <p className="text-xs italic text-muted-foreground/50">Нет сообщений</p>
                    )}
                  </div>
                </button>
              );
            })
          )}
        </div>
      </aside>

      {/* ── Message area ────────────────────────────────────────────────── */}
      <div className={cn(
        "flex flex-1 flex-col",
        mobileView === "list" && "hidden md:flex",
      )}>
        {activeChatId == null ? (
          /* Empty state */
          <div className="flex flex-1 flex-col items-center justify-center gap-4 text-muted-foreground">
            <div className="flex h-20 w-20 items-center justify-center rounded-full border-2 border-current">
              <MessageCircle className="h-10 w-10" />
            </div>
            <p className="text-lg font-semibold">Ваши сообщения</p>
            <p className="max-w-xs text-center text-sm">
              Выберите диалог слева, чтобы начать общение
            </p>
          </div>
        ) : (
          <>
            {/* Chat header */}
            <div className="flex items-center gap-3 border-b px-4 py-3">
              <button
                className="rounded-full p-1 hover:bg-muted md:hidden"
                onClick={() => setMobileView("list")}
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
              {activePeer && <Avatar initials={activePeer.avatar} />}
              <div>
                <p className="font-semibold">{activePeer?.name}</p>
                <p className="text-xs text-muted-foreground">В сети</p>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-4 py-4">
              {messages.length === 0 ? (
                <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                  Сообщений пока нет. Начните общение!
                </div>
              ) : (
                <div className="space-y-0.5">
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
                          "flex items-end gap-2",
                          isMe ? "justify-end" : "justify-start",
                          isFirst ? "mt-3" : "mt-0.5",
                        )}
                      >
                        {/* Peer avatar (shows only on last message of group) */}
                        {!isMe && (
                          <div className="w-7 shrink-0">
                            {isLast && activePeer ? (
                              <Avatar initials={activePeer.avatar} size="sm" />
                            ) : null}
                          </div>
                        )}

                        <div className={cn("flex max-w-xs flex-col lg:max-w-sm", isMe ? "items-end" : "items-start")}>
                          <div
                            className={cn(
                              "break-words px-3 py-2 text-sm leading-relaxed",
                              // Base shape
                              "rounded-[18px]",
                              // Sender-specific colour
                              isMe
                                ? "bg-primary text-primary-foreground"
                                : "bg-muted text-foreground",
                              // Flatten corner toward the tail when grouped
                              isMe && !isLast && "rounded-tr-[5px]",
                              isMe && !isFirst && "rounded-br-[5px]",
                              !isMe && !isLast && "rounded-tl-[5px]",
                              !isMe && !isFirst && "rounded-bl-[5px]",
                            )}
                          >
                            {msg.content}
                          </div>
                          {isLast && (
                            <span className="mt-0.5 text-[10px] text-muted-foreground">
                              {formatTime(msg.created_at)}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                  <div ref={bottomRef} />
                </div>
              )}
            </div>

            {/* Input bar */}
            <div className="border-t px-4 py-3">
              <form onSubmit={sendMessage} className="flex items-end gap-2">
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
                  placeholder="Напишите сообщение…"
                  rows={1}
                  className="flex-1 resize-none rounded-full border bg-muted px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary"
                  style={{ maxHeight: "120px", overflowY: "auto" }}
                  onInput={(e) => {
                    const el = e.currentTarget;
                    el.style.height = "auto";
                    el.style.height = `${el.scrollHeight}px`;
                  }}
                />
                <button
                  type="submit"
                  disabled={sending || !input.trim()}
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-40"
                >
                  <Send className="h-4 w-4" />
                </button>
              </form>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
