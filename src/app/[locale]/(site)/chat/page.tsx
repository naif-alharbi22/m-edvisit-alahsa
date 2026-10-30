import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { MessageSquare } from "lucide-react";
import { ChatInterface } from "@/components/chat/chat-interface";
import { getCurrentUser } from "@/lib/session";
import { getChatHistory } from "@/server/services/chat";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("chat");
  return { title: t("title"), description: t("subtitle") };
}

export default async function ChatPage() {
  const [t, locale, user] = await Promise.all([getTranslations("chat"), getLocale(), getCurrentUser()]);
  const history = user ? await getChatHistory(user.id, 40) : [];
  return (
    <div className="container mx-auto max-w-3xl px-4 py-8">
      <div className="mb-6">
        <div className="mb-2 flex items-center gap-2">
          <MessageSquare className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold">{t("title")}</h1>
        </div>
        <p className="text-muted-foreground">{t("subtitle")}</p>
      </div>
      <ChatInterface
        isAuthenticated={Boolean(user)}
        loginHref={`/login?callbackUrl=${encodeURIComponent(`/${locale}/chat`)}`}
        initialMessages={history.map((m) => ({ id: m.id, role: m.role === "user" ? "user" : "assistant", content: m.content }))}
      />
    </div>
  );
}
