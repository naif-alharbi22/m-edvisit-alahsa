"use client";

import { useTranslations } from "next-intl";
import { ChatInterface } from "@/components/chat/chat-interface";
import { AnimatedPage } from "@/components/ui/animated-page";
import { FadeIn } from "@/components/ui/fade-in";
import { MessageSquare } from "lucide-react";

export default function ChatPage() {
  const t = useTranslations("chat");

  return (
    <AnimatedPage>
      <div className="container mx-auto px-4 py-8 max-w-3xl">
        <FadeIn>
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-2">
              <MessageSquare className="h-6 w-6 text-primary" />
              <h1 className="text-2xl font-bold">{t("title")}</h1>
            </div>
            <p className="text-muted-foreground">{t("subtitle")}</p>
          </div>
        </FadeIn>

        <ChatInterface />
      </div>
    </AnimatedPage>
  );
}
