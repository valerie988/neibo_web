import { useEffect, useRef, useState, useCallback } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { Send, ArrowLeft, Plus, Search, X } from "lucide-react";
import { chatApi } from "../services/api";
import { useChatStore } from "../store/chatStore";
import { useAuthStore } from "../store/authStore";
import { format } from "date-fns";
import clsx from "clsx";
import api from "../services/api";

function formatTime(iso: string) {
  try {
    const d = new Date(iso);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - d.getTime()) / 86400000);
    if (diffDays === 0) return format(d, "HH:mm");
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return format(d, "EEE");
    return format(d, "dd MMM");
  } catch {
    return "";
  }
}

// ── Avatar initials ───────────────────────────────────────────────────────────
function Avatar({ name, size = "md" }: { name: string; size?: "sm" | "md" }) {
  const initials = (name || "?")
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
  const cls = size === "sm" ? "w-8 h-8 text-xs" : "w-10 h-10 text-sm";
  return (
    <div
      className={`${cls} rounded-full bg-green-200 flex items-center justify-center text-green-800 font-bold flex-shrink-0`}
    >
      {initials}
    </div>
  );
}

// ── Conversation row ──────────────────────────────────────────────────────────
function ConvoItem({ convo, active, onClick, currentUserId }: any) {
  // Resolve the other participant's name
  const otherName = convo.other_name || convo.participant_name || "User";
  const lastMsg = convo.last_message || convo.lastMessage || "";
  const updatedAt = convo.updated_at || convo.lastMessageAt || "";
  const unread = convo.unread_count || convo.unreadCount || 0;

  return (
    <button
      onClick={onClick}
      className={clsx(
        "w-full text-left px-4 py-3 border-b border-green-50 hover:bg-green-50/60 transition-colors flex items-center gap-3",
        active && "bg-green-50 border-l-2 border-l-green-600",
      )}
    >
      <Avatar name={otherName} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between">
          <p
            className={clsx(
              "text-sm truncate",
              unread > 0
                ? "font-bold text-green-900"
                : "font-medium text-gray-800",
            )}
          >
            {otherName}
          </p>
          {updatedAt && (
            <span className="text-[10px] text-gray-400 flex-shrink-0 ml-2">
              {formatTime(updatedAt)}
            </span>
          )}
        </div>
        <div className="flex items-center justify-between mt-0.5">
          <p
            className={clsx(
              "text-xs truncate flex-1",
              unread > 0 ? "text-green-700 font-medium" : "text-gray-400",
            )}
          >
            {lastMsg || "No messages yet"}
          </p>
          {unread > 0 && (
            <span className="ml-2 flex-shrink-0 w-5 h-5 bg-green-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
              {unread}
            </span>
          )}
        </div>
      </div>
    </button>
  );
}

// ── Message bubble ────────────────────────────────────────────────────────────
function Bubble({ msg, isMe }: { msg: any; isMe: boolean }) {
  const time = msg.created_at ? formatTime(msg.created_at) : "";
  return (
    <div className={clsx("flex mb-1", isMe ? "justify-end" : "justify-start")}>
      <div
        className={clsx(
          "max-w-[70%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed break-words",
          isMe
            ? "bg-green-700 text-white rounded-br-sm"
            : "bg-white text-gray-800 rounded-bl-sm shadow-sm border border-green-50",
        )}
      >
        <p>{msg.text}</p>
        <p
          className={clsx(
            "text-[10px] mt-1 select-none",
            isMe ? "text-green-300 text-right" : "text-gray-400",
          )}
        >
          {time}
          {isMe && " ✓"}
        </p>
      </div>
    </div>
  );
}

// ── New conversation modal ────────────────────────────────────────────────────
function NewChatModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: (convoId: string, receiverId: string, name: string) => void;
}) {
  const { user } = useAuthStore();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const search = useCallback(
    async (q: string) => {
      if (!q.trim()) {
        setResults([]);
        return;
      }
      setLoading(true);
      try {
        // Search for users by name — we use the users endpoint or products farmer list
        const role = user?.role === "farmer" ? "customer" : "farmer";
        const { data } = await api.get(
          `/api/users/search?q=${encodeURIComponent(q)}&role=${role}`,
        );
        setResults(data || []);
      } catch {
        // Fallback: search products to find farmers
        try {
          const { data } = await api.get(
            `/api/products?search=${encodeURIComponent(q)}&limit=10`,
          );
          // Extract unique farmers
          const seen = new Set<string>();
          const farmers: any[] = [];
          (data || []).forEach((p: any) => {
            if (p.farmer && !seen.has(p.farmer.id)) {
              seen.add(p.farmer.id);
              farmers.push(p.farmer);
            }
          });
          setResults(farmers);
        } catch {
          setResults([]);
        }
      } finally {
        setLoading(false);
      }
    },
    [user],
  );

  useEffect(() => {
    const t = setTimeout(() => search(query), 300);
    return () => clearTimeout(t);
  }, [query, search]);

  const startChat = async (person: any) => {
    try {
      // Create or get conversation on the backend
      const { data } = await api.post("/api/chat/conversations", {
        receiver_id: person.id,
      });
      onCreated(data.id, person.id, person.full_name);
    } catch {
      // Fallback: create locally and pass the receiver info
      onCreated(`new-${person.id}`, person.id, person.full_name);
    }
    onClose();
  };

  return (
    <div
      className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b border-green-50">
          <h3 className="font-bold text-green-900">New Message</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-4">
          <div className="flex items-center gap-2 bg-green-50 rounded-xl px-3 py-2 border border-green-100">
            <Search size={16} className="text-green-400 flex-shrink-0" />
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={
                user?.role === "farmer"
                  ? "Search customers…"
                  : "Search farmers by name or product…"
              }
              className="flex-1 bg-transparent text-sm text-green-900 placeholder-green-300 focus:outline-none"
            />
          </div>
        </div>

        <div className="max-h-72 overflow-y-auto px-4 pb-4">
          {loading && (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="h-12 bg-green-50 rounded-xl animate-pulse"
                />
              ))}
            </div>
          )}
          {!loading && query && results.length === 0 && (
            <p className="text-center text-sm text-gray-400 py-6">
              No results found
            </p>
          )}
          {!loading && !query && (
            <p className="text-center text-sm text-gray-400 py-6">
              {user?.role === "farmer"
                ? "Type to search for customers"
                : "Type a farmer name or product to find them"}
            </p>
          )}
          {results.map((person) => (
            <button
              key={person.id}
              onClick={() => startChat(person)}
              className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-green-50 transition-colors text-left"
            >
              <Avatar name={person.full_name} />
              <div>
                <p className="font-semibold text-sm text-green-900">
                  {person.full_name}
                </p>
                <p className="text-xs text-gray-400 capitalize">
                  {person.role}
                  {person.location ? ` · ${person.location}` : ""}
                </p>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Main ChatPage ─────────────────────────────────────────────────────────────
export default function ChatPage() {
  const { id } = useParams<{ id?: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const {
    messages: storeMessages,
    send,
    setMessages,
    connected,
  } = useChatStore();

  const [conversations, setConversations] = useState<any[]>([]);
  const [activeConvo, setActiveConvo] = useState<string | null>(id || null);
  const [activeName, setActiveName] = useState<string>("");
  const [activeReceiver, setActiveReceiver] = useState<string>("");
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const [showNewChat, setShowNewChat] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Pre-select from URL params (?with=userId&name=Name)
  const withUserId = searchParams.get("with");
  const withName = searchParams.get("name");

  // ── Load conversations ──────────────────────────────────────────────────────
  const loadConversations = useCallback(async () => {
    try {
      const { data } = await chatApi.conversations();
      setConversations(data || []);
    } catch {
      setConversations([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  // ── Auto-open conversation from URL param ───────────────────────────────────
  useEffect(() => {
    if (withUserId && withName && !activeConvo) {
      // Find existing conversation with this user or open a new one
      const existing = conversations.find(
        (c) =>
          c.participant_one === withUserId || c.participant_two === withUserId,
      );
      if (existing) {
        openConvo(existing.id, withName, withUserId);
      } else if (conversations.length > 0 || !loading) {
        // No existing convo — set receiver info so first message creates it
        setActiveName(withName);
        setActiveReceiver(withUserId);
        setActiveConvo(`pending-${withUserId}`); // placeholder id
      }
    }
  }, [withUserId, withName, conversations, loading]);

  // ── Open a conversation ─────────────────────────────────────────────────────
  const openConvo = useCallback(
    async (convoId: string, name: string, receiverId: string) => {
      setActiveConvo(convoId);
      setActiveName(name);
      setActiveReceiver(receiverId);

      // Mark as read
      try {
        await api.post(`/api/chat/conversations/${convoId}/read`);
      } catch {}

      // Load messages
      try {
        const { data } = await chatApi.messages(convoId);
        setMessages(convoId, data || []);
      } catch {
        setMessages(convoId, []);
      }

      setTimeout(() => {
        bottomRef.current?.scrollIntoView({ behavior: "smooth" });
        inputRef.current?.focus();
      }, 100);
    },
    [setMessages],
  );

  // ── Handle incoming real-time messages ──────────────────────────────────────
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [storeMessages, activeConvo]);

  // ── Send ────────────────────────────────────────────────────────────────────
  const handleSend = useCallback(async () => {
    const trimmed = text.trim();
    if (!trimmed || !activeReceiver) return;
    setText("");

    if (activeConvo && !activeConvo.startsWith("pending-")) {
      // Normal send via WebSocket
      send(activeReceiver, trimmed, activeConvo);
    } else {
      // First message — create conversation on server then send
      try {
        const { data } = await api.post("/api/chat/conversations", {
          receiver_id: activeReceiver,
        });
        const newConvoId = data.id;
        setActiveConvo(newConvoId);
        send(activeReceiver, trimmed, newConvoId);
        await loadConversations(); // refresh list
      } catch {
        // Fallback: send without a convo id (server creates it)
        send(activeReceiver, trimmed);
      }
    }

    setTimeout(
      () => bottomRef.current?.scrollIntoView({ behavior: "smooth" }),
      100,
    );
  }, [text, activeConvo, activeReceiver, send, loadConversations]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // ── Get name for conversation list item ─────────────────────────────────────
  const getConvoName = (c: any) => {
    if (c.other_name) return c.other_name;
    if (c.participant_name) return c.participant_name;
    // Try to infer from participant IDs
    const otherId =
      c.participant_one === user?.id ? c.participant_two : c.participant_one;
    return otherId?.slice(0, 8) || "User";
  };

  const getConvoReceiverId = (c: any) => {
    return c.participant_one === user?.id
      ? c.participant_two
      : c.participant_one;
  };

  const currentMessages = storeMessages[activeConvo || ""] || [];

  return (
    <>
      {showNewChat && (
        <NewChatModal
          onClose={() => setShowNewChat(false)}
          onCreated={(convoId, receiverId, name) => {
            setActiveConvo(convoId);
            setActiveName(name);
            setActiveReceiver(receiverId);
            if (!convoId.startsWith("new-")) {
              chatApi
                .messages(convoId)
                .then((r) => setMessages(convoId, r.data || []))
                .catch(() => {});
            } else {
              setMessages(convoId, []);
            }
            loadConversations();
          }}
        />
      )}

      <div className="flex h-[calc(100vh-6rem)] bg-white rounded-3xl shadow-sm border border-green-50 overflow-hidden">
        {/* ── Left panel: conversation list ─────────────────────────────────── */}
        <div
          className={clsx(
            "flex flex-col border-r border-green-50 flex-shrink-0",
            activeConvo
              ? "hidden md:flex w-72 lg:w-80"
              : "flex w-full md:w-72 lg:w-80",
          )}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-4 border-b border-green-50">
            <div>
              <h2 className="text-base font-black text-green-900">Messages</h2>
              <p className="text-xs text-gray-400">
                {conversations.length} conversation
                {conversations.length !== 1 ? "s" : ""}
              </p>
            </div>
            <button
              onClick={() => setShowNewChat(true)}
              className="w-9 h-9 bg-green-700 text-white rounded-xl flex items-center justify-center hover:bg-green-800 transition-colors"
              title="New conversation"
            >
              <Plus size={18} />
            </button>
          </div>

          {/* List */}
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="p-3 space-y-2">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="h-14 bg-green-50 rounded-xl animate-pulse"
                  />
                ))}
              </div>
            ) : conversations.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center p-6">
                <p className="text-3xl mb-3">💬</p>
                <p className="text-sm font-semibold text-gray-600">
                  No conversations yet
                </p>
                <p className="text-xs text-gray-400 mt-1 mb-4">
                  {user?.role === "customer"
                    ? "Message a farmer from any product page"
                    : "Customers will message you from your listings"}
                </p>
                <button
                  onClick={() => setShowNewChat(true)}
                  className="flex items-center gap-2 bg-green-700 text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-green-800 transition-colors"
                >
                  <Plus size={16} /> Start a chat
                </button>
              </div>
            ) : (
              conversations.map((c) => (
                <ConvoItem
                  key={c.id}
                  convo={{ ...c, other_name: getConvoName(c) }}
                  active={activeConvo === c.id}
                  currentUserId={user?.id}
                  onClick={() =>
                    openConvo(c.id, getConvoName(c), getConvoReceiverId(c))
                  }
                />
              ))
            )}
          </div>

          {/* Connection status */}
          <div
            className={clsx(
              "px-4 py-2 text-[10px] font-medium border-t border-green-50 flex items-center gap-1.5",
              connected ? "text-green-500" : "text-gray-400",
            )}
          >
            <span
              className={clsx(
                "w-1.5 h-1.5 rounded-full",
                connected ? "bg-green-500" : "bg-gray-300",
              )}
            />
            {connected ? "Connected" : "Connecting…"}
          </div>
        </div>

        {/* ── Right panel: message area ─────────────────────────────────────── */}
        <div
          className={clsx(
            "flex-1 flex flex-col min-w-0",
            !activeConvo && "hidden md:flex",
          )}
        >
          {!activeConvo ? (
            /* Empty state */
            <div className="flex-1 flex flex-col items-center justify-center text-center p-10">
              <div className="w-16 h-16 bg-green-50 rounded-2xl flex items-center justify-center mb-4">
                <Send size={28} className="text-green-400" />
              </div>
              <p className="font-bold text-green-900 text-lg">Your messages</p>
              <p className="text-sm text-gray-400 mt-2 max-w-xs">
                Select a conversation to read messages or start a new one with
                the <strong>+</strong> button.
              </p>
              <button
                onClick={() => setShowNewChat(true)}
                className="mt-6 flex items-center gap-2 bg-green-700 text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-green-800 transition-colors"
              >
                <Plus size={16} /> New Message
              </button>
            </div>
          ) : (
            <>
              {/* Chat header */}
              <div className="flex items-center gap-3 px-4 py-3.5 border-b border-green-50 bg-white flex-shrink-0">
                <button
                  onClick={() => setActiveConvo(null)}
                  className="md:hidden text-green-700 p-1"
                >
                  <ArrowLeft size={20} />
                </button>
                <Avatar name={activeName} />
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-green-900 text-sm truncate">
                    {activeName || "Conversation"}
                  </p>
                  <p className="text-xs text-gray-400">
                    {connected ? "Online" : "Offline"}
                  </p>
                </div>
              </div>

              {/* Messages area */}
              <div className="flex-1 overflow-y-auto p-4 bg-green-50/20">
                {currentMessages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-center">
                    <p className="text-3xl mb-3">👋</p>
                    <p className="font-semibold text-green-900">Say hello!</p>
                    <p className="text-sm text-gray-400 mt-1">
                      This is the beginning of your conversation with{" "}
                      {activeName}.
                    </p>
                  </div>
                ) : (
                  <>
                    {currentMessages.map((msg: any) => (
                      <Bubble
                        key={msg.id}
                        msg={msg}
                        isMe={msg.sender_id === user?.id}
                      />
                    ))}
                  </>
                )}
                <div ref={bottomRef} />
              </div>

              {/* Input bar */}
              <div className="flex items-end gap-2 px-4 py-3 border-t border-green-50 bg-white flex-shrink-0">
                <div
                  className={clsx(
                    "flex-1 border rounded-2xl px-4 py-2.5 transition-colors bg-green-50/50",
                    text ? "border-green-500" : "border-gray-200",
                  )}
                >
                  <textarea
                    ref={inputRef}
                    value={text}
                    onChange={(e) => {
                      setText(e.target.value);
                      // Auto-grow
                      e.target.style.height = "auto";
                      e.target.style.height =
                        Math.min(e.target.scrollHeight, 120) + "px";
                    }}
                    onKeyDown={handleKeyDown}
                    placeholder="Type a message… (Enter to send, Shift+Enter for new line)"
                    rows={1}
                    className="w-full text-sm text-gray-800 resize-none focus:outline-none bg-transparent leading-relaxed max-h-32"
                    style={{ height: "24px" }}
                  />
                </div>
                <button
                  onClick={handleSend}
                  disabled={!text.trim()}
                  className="w-10 h-10 bg-green-700 rounded-xl flex items-center justify-center text-white hover:bg-green-800 transition-all disabled:opacity-30 disabled:cursor-not-allowed flex-shrink-0 active:scale-95"
                >
                  <Send size={16} />
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}
