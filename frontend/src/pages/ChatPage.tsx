import { useEffect, useRef, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { Send, ArrowLeft } from "lucide-react";
import { chatApi } from "../services/api";
import { useChatStore } from "../store/chatStore";
import { useAuthStore } from "../store/authStore";
import { format } from "date-fns";
import clsx from "clsx";

function formatTime(iso: string) {
  try { return format(new Date(iso), "HH:mm"); } catch { return ""; }
}

function ConvoItem({ convo, active, onClick, currentUserId }: any) {
  const otherId = convo.participant_one === currentUserId ? convo.participant_two : convo.participant_one;
  const msgs    = convo.messages || [];
  const last    = msgs[msgs.length - 1];
  return (
    <button onClick={onClick}
      className={clsx("w-full text-left px-4 py-3.5 border-b border-green-50 hover:bg-green-50/60 transition-colors", active && "bg-green-50")}>
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-green-200 flex items-center justify-center text-green-800 font-bold text-sm flex-shrink-0">
          {otherId?.slice(0, 2).toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-green-900 text-sm truncate">{otherId?.slice(0, 8)}…</p>
          <p className="text-xs text-gray-400 truncate">{last?.text || "No messages yet"}</p>
        </div>
        {convo.updated_at && <span className="text-xs text-gray-400 flex-shrink-0">{formatTime(convo.updated_at)}</span>}
      </div>
    </button>
  );
}

function Bubble({ msg, isMe }: { msg: any; isMe: boolean }) {
  return (
    <div className={clsx("flex", isMe ? "justify-end" : "justify-start")}>
      <div className={clsx(
        "max-w-[72%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed",
        isMe ? "bg-green-700 text-white rounded-br-md" : "bg-white text-gray-800 rounded-bl-md shadow-sm border border-green-50"
      )}>
        <p>{msg.text}</p>
        <p className={clsx("text-[10px] mt-1", isMe ? "text-green-200 text-right" : "text-gray-400")}>
          {formatTime(msg.created_at)}
        </p>
      </div>
    </div>
  );
}

export default function ChatPage() {
  const { id }          = useParams<{ id?: string }>();
  const [searchParams]  = useSearchParams();
  const { user }        = useAuthStore();
  const { messages: storeMessages, send, setMessages } = useChatStore();

  const [conversations, setConversations] = useState<any[]>([]);
  const [activeConvo,   setActiveConvo]   = useState<string | null>(id || null);
  const [text,          setText]          = useState("");
  const [loading,       setLoading]       = useState(true);
  const bottomRef = useRef<HTMLDivElement>(null);

  const withUserId = searchParams.get("with");
  const withName   = searchParams.get("name");

  useEffect(() => {
    chatApi.conversations()
      .then((r) => setConversations(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!activeConvo) return;
    chatApi.messages(activeConvo).then((r) => setMessages(activeConvo, r.data));
  }, [activeConvo]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [storeMessages, activeConvo]);

  const getReceiverId = () => {
    if (withUserId) return withUserId;
    const convo = conversations.find((c) => c.id === activeConvo);
    if (!convo) return "";
    return convo.participant_one === user?.id ? convo.participant_two : convo.participant_one;
  };

  const handleSend = () => {
    const trimmed    = text.trim();
    const receiverId = getReceiverId();
    if (!trimmed || !activeConvo || !receiverId) return;
    send(receiverId, trimmed, activeConvo);
    setText("");
  };

  const currentMessages = storeMessages[activeConvo || ""] || [];

  return (
    <div className="flex h-[calc(100vh-6rem)] bg-white rounded-3xl shadow-sm border border-green-50 overflow-hidden">

      {/* Conversation list */}
      <div className={clsx("w-full md:w-72 lg:w-80 border-r border-green-50 flex flex-col flex-shrink-0", activeConvo && "hidden md:flex")}>
        <div className="px-4 py-5 border-b border-green-50">
          <h2 className="text-lg font-black text-green-900">Messages</h2>
          <p className="text-xs text-gray-400 mt-0.5">{conversations.length} conversations</p>
        </div>
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="p-4 space-y-3">
              {[1, 2, 3].map(i => <div key={i} className="h-14 bg-green-50 rounded-xl animate-pulse" />)}
            </div>
          ) : conversations.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center p-6">
              <p className="text-3xl mb-3">💬</p>
              <p className="text-sm font-semibold text-gray-500">No conversations yet</p>
              <p className="text-xs text-gray-400 mt-1">Message a farmer from any product page</p>
            </div>
          ) : (
            conversations.map((c) => (
              <ConvoItem key={c.id} convo={c} active={activeConvo === c.id}
                currentUserId={user?.id} onClick={() => setActiveConvo(c.id)} />
            ))
          )}
        </div>
      </div>

      {/* Message area */}
      <div className={clsx("flex-1 flex flex-col", !activeConvo && "hidden md:flex")}>
        {!activeConvo ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-10">
            <p className="text-5xl mb-4">💬</p>
            <p className="font-bold text-green-900">Select a conversation</p>
            <p className="text-sm text-gray-400 mt-1">Choose from the list to start chatting</p>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="flex items-center gap-3 px-4 py-4 border-b border-green-50 flex-shrink-0">
              <button onClick={() => setActiveConvo(null)} className="md:hidden text-green-700"><ArrowLeft size={20} /></button>
              <div className="w-9 h-9 bg-green-200 rounded-full flex items-center justify-center text-green-800 font-bold text-sm">
                {(withName || "?").slice(0, 2).toUpperCase()}
              </div>
              <div>
                <p className="font-bold text-green-900 text-sm">{withName || "Conversation"}</p>
                <p className="text-xs text-green-500">🌱 Farmer</p>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-green-50/30">
              {currentMessages.length === 0 && (
                <div className="text-center py-10">
                  <p className="text-2xl mb-2">👋</p>
                  <p className="text-sm text-gray-400">Say hello to start the conversation</p>
                </div>
              )}
              {currentMessages.map((msg: any) => (
                <Bubble key={msg.id} msg={msg} isMe={msg.sender_id === user?.id} />
              ))}
              <div ref={bottomRef} />
            </div>

            {/* Input */}
            <div className="flex items-end gap-3 p-4 border-t border-green-50 bg-white flex-shrink-0">
              <div className={clsx("flex-1 border rounded-2xl px-4 py-3 transition-colors", text ? "border-green-400" : "border-gray-200")}>
                <textarea value={text} onChange={(e) => setText(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                  placeholder="Type a message…" rows={1}
                  className="w-full text-sm text-gray-800 resize-none focus:outline-none bg-transparent leading-relaxed" />
              </div>
              <button onClick={handleSend} disabled={!text.trim()}
                className="w-11 h-11 bg-green-700 rounded-xl flex items-center justify-center text-white hover:bg-green-800 transition-colors disabled:opacity-40 flex-shrink-0">
                <Send size={18} />
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
