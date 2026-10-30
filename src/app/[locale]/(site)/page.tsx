"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FadeIn } from "@/components/ui/fade-in";
import { StaggerContainer, StaggerItem } from "@/components/ui/stagger-container";
import { motion } from "framer-motion";
import {
  Stethoscope,
  DollarSign,
  Plane,
  MessageSquare,
  HeartPulse,
  ArrowRight,
  Shield,
  Globe,
  Zap,
} from "lucide-react";

const featureKeys = [
  { icon: Stethoscope, key: "triage", live: true, href: "/triage" },
  { icon: DollarSign, key: "pricing", live: true, href: "/facilities" },
  { icon: Plane, key: "travel", live: true, href: "/hotels" },
  { icon: MessageSquare, key: "chat", live: true, href: "/chat" },
  { icon: HeartPulse, key: "followup", live: false, href: null },
] as const;

const trustKeys = [
  { icon: Shield, key: "verified" },
  { icon: Globe, key: "serving" },
  { icon: Zap, key: "aiPowered" },
] as const;

export default function HomePage() {
  const t = useTranslations();

  return (
    <div className="flex flex-col">
      <section className="relative overflow-hidden py-20 md:py-32">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-primary/8 to-primary/10 animate-gradient" />
        <div className="container mx-auto px-4 relative">
          <div className="mx-auto max-w-3xl text-center">
            <FadeIn direction="down" delay={0}>
              <Badge variant="secondary" className="mb-4">
                {t("hero.badge")}
              </Badge>
            </FadeIn>
            <FadeIn direction="up" delay={0.1}>
              <h1 className="text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl">
                {t("hero.title")}{" "}
                <span className="text-primary">{t("hero.titleHighlight")}</span>
              </h1>
            </FadeIn>
            <FadeIn direction="up" delay={0.2}>
              <p className="mt-6 text-lg text-muted-foreground leading-relaxed">
                {t("hero.subtitle")}
              </p>
            </FadeIn>
            <FadeIn direction="up" delay={0.35}>
              <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
                <Button asChild size="lg" className="w-full sm:w-auto gap-2">
                  <Link href="/triage">
                    {t("hero.cta")} <ArrowRight className="h-4 w-4 rtl:rotate-180" />
                  </Link>
                </Button>
                <Button asChild size="lg" variant="outline" className="w-full sm:w-auto">
                  <Link href="/facilities">{t("hero.secondary")}</Link>
                </Button>
              </div>
            </FadeIn>
          </div>
        </div>
      </section>

      <section className="border-y bg-muted/30 py-6">
        <div className="container mx-auto px-4">
          <StaggerContainer className="flex flex-col sm:flex-row items-center justify-center gap-6 sm:gap-12" staggerDelay={0.12}>
            {trustKeys.map((point) => (
              <StaggerItem key={point.key}>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <point.icon className="h-4 w-4 text-primary" />
                  <span>{t(`trust.${point.key}`)}</span>
                </div>
              </StaggerItem>
            ))}
          </StaggerContainer>
        </div>
      </section>

      <section className="py-20">
        <div className="container mx-auto px-4">
          <FadeIn>
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold tracking-tight">{t("features.title")}</h2>
              <p className="mt-3 text-muted-foreground max-w-2xl mx-auto">
                {t("features.subtitle")}
              </p>
            </div>
          </FadeIn>
          <StaggerContainer className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" staggerDelay={0.1}>
            {featureKeys.map((feature) => (
              <StaggerItem key={feature.key}>
                <Card className="relative group hover:shadow-lg transition-shadow h-full">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                        <feature.icon className="h-5 w-5" />
                      </div>
                      <Badge variant={feature.live ? "default" : "secondary"} className="text-xs">
                        {feature.live ? t("features.badgeCore") : t("features.badgeSoon")}
                      </Badge>
                    </div>
                    <CardTitle className="mt-3">
                      {feature.href ? (
                        <Link href={feature.href} className="after:absolute after:inset-0 hover:text-primary">
                          {t(`features.${feature.key}.title`)}
                        </Link>
                      ) : (
                        t(`features.${feature.key}.title`)
                      )}
                    </CardTitle>
                    <CardDescription>{t(`features.${feature.key}.description`)}</CardDescription>
                  </CardHeader>
                </Card>
              </StaggerItem>
            ))}
          </StaggerContainer>
        </div>
      </section>

      <section className="py-20 bg-primary text-primary-foreground relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent animate-shimmer" />
        <div className="container mx-auto px-4 text-center relative">
            <h2 className="text-3xl font-bold">{t("cta.title")}</h2>
            <p className="mt-4 text-primary-foreground/80 max-w-xl mx-auto">
              {t("cta.subtitle")}
            </p>
            <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
              <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.98 }}>
                <Button asChild size="lg" variant="secondary" className="gap-2">
                  <Link href="/triage">
                    {t("cta.button")} <ArrowRight className="h-4 w-4 rtl:rotate-180" />
                  </Link>
                </Button>
              </motion.div>
            </div>
        </div>
      </section>
    </div>
  );
}
