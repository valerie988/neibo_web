import { create } from "zustand";

interface Message {
  id: string; conversation_id: string;
  sender_id: string; receiver_id: string;
  text: string; created_at: string; read: boolean;
}

interface ChatState {
  ws: WebSocket | null;
  messages: Record<string, Message[]>;
  connected: boolean;
  connect:    (token: string) => void;
  disconnect: () => void;
  send:       (receiver_id: string, text: string, conversation_id?: string) => void;
  addMessage: (msg: Message) => void;
  setMessages:(conversation_id: string, msgs: Message[]) => void;
}

export const useChatStore = create<ChatState>((set, get) => ({
  ws: null,
  messages: {},
  connected: false,

  connect: (token) => {
    const proto = window.location.protocol === "https:" ? "wss" : "ws";
    const base  = import.meta.env.VITE_API_URL?.replace(/^https?/, proto) || `${proto}://localhost:8000`;
    const ws    = new WebSocket(`${base}/api/chat/ws/${token}`);
    ws.onopen    = ()    => set({ connected: true });
    ws.onclose   = ()    => set({ connected: false, ws: null });
    ws.onmessage = (evt) => {
      const data = JSON.parse(evt.data);
      if (data.type === "message") get().addMessage(data);
    };
    set({ ws });
  },

  disconnect: () => { get().ws?.close(); set({ ws: null, connected: false }); },

  send: (receiver_id, text, conversation_id) => {
    get().ws?.send(JSON.stringify({ type: "message", receiver_id, text, conversation_id }));
  },

  addMessage: (msg) => {
    set((state) => ({
      messages: {
        ...state.messages,
        [msg.conversation_id]: [...(state.messages[msg.conversation_id] || []), msg],
      },
    }));
  },

  setMessages: (conversation_id, msgs) => {
    set((state) => ({ messages: { ...state.messages, [conversation_id]: msgs } }));
  },
}));
