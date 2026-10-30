"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { AnimatePresence, motion } from "framer-motion";
import { Bot, Send, Trash2, User } from "lucide-react";
import { toast } from "sonner";
import { Link } from "@/i18n/navigation";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { apiFetch } from "@/lib/api-client";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
}

interface ChatInterfaceProps {
  initialMessages: Message[];
  isAuthenticated: boolean;
  loginHref: string;
}

export function ChatInterface({ initialMessages, isAuthenticated, loginHref }: ChatInterfaceProps) {
  const t = useTranslations("chat");
  const tc = useTranslations("common");
  const welcome: Message = { id: "welcome", role: "assistant", content: t("welcome") };
  const [messages, setMessages] = useState<Message[]>(initialMessages.length ? initialMessages : [welcome]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const idRef = useRef(0);
  const nextId = () => `m${Date.now()}-${idRef.current++}`;

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages]);

  const setAssistant = (id: string, content: string) =>
    setMessages((prev) => prev.map((m) => (m.id === id ? { ...m, content } : m)));

  const send = async (text: string) => {
    const userMessage = text.trim();
    if (!userMessage || isStreaming) return;
    setInput("");
    const userMsg: Message = { id: nextId(), role: "user", content: userMessage };
    const assistantId = nextId();
    const history = [...messages.filter((m) => m.id !== "welcome"), userMsg].map((m) => ({ role: m.role, content: m.content }));
    setMessages((prev) => [...prev, userMsg, { id: assistantId, role: "assistant", content: "" }]);
    setIsStreaming(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: history.slice(-20) }),
      });
      if (!res.ok || !res.body) {
        setAssistant(assistantId, res.status === 503 ? t("aiUnavailable") : res.status === 429 ? t("rateLimited") : t("error"));
        return;
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let content = "";
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        // SSE events are separated by a blank line; keep any partial event in the buffer.
        const events = buffer.split("\n\n");
        buffer = events.pop() ?? "";
        for (const event of events) {
          const line = event.split("\n").find((l) => l.startsWith("data: "));
          if (!line) continue;
          const data = line.slice(6);
          if (data === "[DONE]") continue;
          try {
            const parsed = JSON.parse(data) as { content?: string; error?: string };
            if (parsed.error) throw new Error(parsed.error);
            if (parsed.content) {
              content += parsed.content;
              setAssistant(assistantId, content);
            }
          } catch {
            if (!content) setAssistant(assistantId, t("error"));
          }
        }
      }
      if (!content) setAssistant(assistantId, t("error"));
    } catch {
      setAssistant(assistantId, t("error"));
    } finally {
      setIsStreaming(false);
      inputRef.current?.focus();
    }
  };

  const clearHistory = async () => {
    try {
      await apiFetch("/api/chat", { method: "DELETE" });
      setMessages([welcome]);
      toast.success(t("historyCleared"));
    } catch {
      toast.error(tc("error"));
    }
  };

  const suggestions = [t("suggestion1"), t("suggestion2"), t("suggestion3"), t("suggestion4")];
  const last = messages[messages.length - 1];

  return (
    <div className="flex h-[calc(100vh-14rem)] max-h-[720px] min-h-[420px] flex-col">
      <div className="mb-2 flex items-center justify-between gap-2 text-xs text-muted-foreground">
        <span>{t("disclaimer")}</span>
        {isAuthenticated ? (
          messages.length > 1 && (
            <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={clearHistory} disabled={isStreaming}>
              <Trash2 className="h-3.5 w-3.5" /> {t("clearHistory")}
            </Button>
          )
        ) : (
          <Link href={loginHref} className="text-primary hover:underline">
            {t("signInToSave")}
          </Link>
        )}
      </div>
      <div ref={scrollRef} className="mb-4 flex-1 space-y-4 overflow-y-auto pe-2" aria-live="polite">
        <AnimatePresence initial={false}>
          {messages.map((message) => (
            <motion.div
              key={message.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25 }}
              className={`flex gap-3 ${message.role === "user" ? "justify-end" : "justify-start"}`}
            >
              {message.role === "assistant" && (
                <Avatar className="h-8 w-8 shrink-0">
                  <AvatarFallback className="bg-primary text-primary-foreground">
                    <Bot className="h-4 w-4" />
                  </AvatarFallback>
                </Avatar>
              )}
              <div
                className={`max-w-[80%] whitespace-pre-wrap rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                  message.role === "user" ? "rounded-ee-md bg-primary text-primary-foreground" : "rounded-es-md bg-muted"
                }`}
                dir="auto"
              >
                {message.content ? (
                  <span className={isStreaming && message === last && message.role === "assistant" ? "streaming-cursor" : ""}>{message.content}</span>
                ) : (
                  <span className="thinking-dots" aria-label={t("thinking")}>
                    <span />
                    <span />
                    <span />
                  </span>
                )}
              </div>
              {message.role === "user" && (
                <Avatar className="h-8 w-8 shrink-0">
                  <AvatarFallback className="bg-secondary">
                    <User className="h-4 w-4" />
                  </AvatarFallback>
                </Avatar>
              )}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {messages.length === 1 && (
        <div className="mb-4 flex flex-wrap gap-2">
          {suggestions.map((s) => (
            <Button key={s} variant="outline" size="sm" className="h-auto whitespace-normal py-1.5 text-start text-xs" onClick={() => send(s)}>
              {s}
            </Button>
          ))}
        </div>
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          void send(input);
        }}
        className="flex gap-2"
      >
        <Input
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={t("placeholder")}
          disabled={isStreaming}
          maxLength={4000}
          className="flex-1"
          aria-label={t("placeholder")}
          dir="auto"
        />
        <Button type="submit" size="icon" disabled={isStreaming || !input.trim()} aria-label={t("send")}>
          <Send className="h-4 w-4 rtl:-scale-x-100" />
        </Button>
      </form>
    </div>
  );
}
