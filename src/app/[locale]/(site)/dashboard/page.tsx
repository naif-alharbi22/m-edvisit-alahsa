"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AnimatedPage } from "@/components/ui/animated-page";
import { FadeIn } from "@/components/ui/fade-in";
import { StaggerContainer, StaggerItem } from "@/components/ui/stagger-container";
import { CountUp } from "@/components/ui/count-up";
import {
  FileText,
  Calendar,
  MessageSquare,
  ArrowRight,
  Stethoscope,
  Clock,
  CheckCircle2,
  AlertTriangle,
  User,
} from "lucide-react";
import { motion } from "framer-motion";

interface DemoReport {
  id: string;
  fileName: string;
  specialty: string;
  status: string;
  date: string;
  summary: string;
  urgency: string;
}

interface DemoAppointment {
  id: string;
  doctorName: string;
  facilityName: string;
  specialty: string;
  date: string;
  status: string;
  notes: string;
}

export default function DashboardPage() {
  const t = useTranslations("dashboard");

  const demoReports: DemoReport[] = [
    {
      id: "1",
      fileName: "blood-test-results.pdf",
      specialty: "Cardiology",
      status: "analyzed",
      date: "Apr 20, 2026",
      summary: "Elevated cholesterol levels and borderline hypertension. Cardiology consultation recommended.",
      urgency: "moderate",
    },
  ];

  const demoAppointments: DemoAppointment[] = [
    {
      id: "1",
      doctorName: "Dr. Ahmed Al-Qahtani",
      facilityName: "Al-Moosa Specialist Hospital",
      specialty: "Cardiology",
      date: "May 4, 2026",
      status: "confirmed",
      notes: "Initial consultation for cholesterol management",
    },
  ];

  const statusColors: Record<string, string> = {
    analyzed: "bg-green-100 text-green-800",
    pending: "bg-yellow-100 text-yellow-800",
    confirmed: "bg-blue-100 text-blue-800",
  };

  const urgencyColors: Record<string, string> = {
    low: "bg-green-100 text-green-800",
    moderate: "bg-yellow-100 text-yellow-800",
    high: "bg-orange-100 text-orange-800",
  };

  const stats = [
    { label: t("reports"), count: demoReports.length, icon: FileText },
    { label: t("appointments"), count: demoAppointments.length, icon: Calendar },
    { label: t("recentChat"), count: 1, icon: MessageSquare },
  ];

  return (
    <AnimatedPage>
      <div className="container mx-auto px-4 py-8 max-w-5xl">
        <FadeIn>
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-2">
              <User className="h-6 w-6 text-primary" />
              <h1 className="text-2xl font-bold">{t("title")}</h1>
            </div>
            <p className="text-muted-foreground">{t("welcome")}, Ahmed</p>
          </div>
        </FadeIn>

        <StaggerContainer className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8" staggerDelay={0.1}>
          {stats.map((stat, i) => (
            <StaggerItem key={stat.label}>
              <Card className="hover:shadow-md transition-shadow cursor-pointer">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-2xl font-bold">
                        <CountUp target={stat.count} delay={0.2 + i * 0.15} />
                      </p>
                      <p className="text-sm text-muted-foreground">{stat.label}</p>
                    </div>
                    <motion.div
                      animate={{ y: [0, -4, 0] }}
                      transition={{ duration: 3, repeat: Infinity, ease: "easeInOut", delay: i * 0.5 }}
                    >
                      <stat.icon className="h-8 w-8 text-primary/60" />
                    </motion.div>
                  </div>
                </CardContent>
              </Card>
            </StaggerItem>
          ))}
        </StaggerContainer>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <FadeIn delay={0.3}>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2">
                  <FileText className="h-5 w-5" /> {t("reports")}
                </CardTitle>
                <Link href="/triage">
                  <Button variant="ghost" size="sm" className="gap-1">
                    New <ArrowRight className="h-3 w-3" />
                  </Button>
                </Link>
              </CardHeader>
              <CardContent className="space-y-3">
                {demoReports.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-6">{t("noReports")}</p>
                ) : (
                  demoReports.map((report, i) => (
                    <motion.div
                      key={report.id}
                      initial={{ opacity: 0, x: -12 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.4 + i * 0.1 }}
                      className="rounded-lg border p-3 space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4 text-primary" />
                          <span className="text-sm font-medium">{report.fileName}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge className={urgencyColors[report.urgency] || ""} variant="secondary">
                            {report.urgency === "moderate" ? <AlertTriangle className="mr-1 h-3 w-3" /> : <CheckCircle2 className="mr-1 h-3 w-3" />}
                            {report.urgency}
                          </Badge>
                          <Badge className={statusColors[report.status] || ""} variant="secondary">{report.status}</Badge>
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground">{report.summary}</p>
                      <div className="flex items-center justify-between">
                        <Badge variant="outline">{report.specialty}</Badge>
                        <span className="text-xs text-muted-foreground">{report.date}</span>
                      </div>
                    </motion.div>
                  ))
                )}
              </CardContent>
            </Card>
          </FadeIn>

          <FadeIn delay={0.4}>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Calendar className="h-5 w-5" /> {t("appointments")}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {demoAppointments.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-6">{t("noAppointments")}</p>
                ) : (
                  demoAppointments.map((appt, i) => (
                    <motion.div
                      key={appt.id}
                      initial={{ opacity: 0, x: -12 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.5 + i * 0.1 }}
                      className="rounded-lg border p-3 space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Stethoscope className="h-4 w-4 text-primary" />
                          <span className="text-sm font-medium">{appt.doctorName}</span>
                        </div>
                        <Badge className={statusColors[appt.status] || ""} variant="secondary">{appt.status}</Badge>
                      </div>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span>{appt.facilityName}</span>
                        <Badge variant="outline">{appt.specialty}</Badge>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground flex items-center gap-1">
                          <Clock className="h-3 w-3" /> {appt.date}
                        </span>
                        <span className="text-muted-foreground">{appt.notes}</span>
                      </div>
                    </motion.div>
                  ))
                )}
              </CardContent>
            </Card>
          </FadeIn>

          <FadeIn delay={0.5} className="lg:col-span-2">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2">
                  <MessageSquare className="h-5 w-5" /> {t("recentChat")}
                </CardTitle>
                <Link href="/chat">
                  <Button variant="ghost" size="sm" className="gap-1">
                    Open <ArrowRight className="h-3 w-3" />
                  </Button>
                </Link>
              </CardHeader>
              <CardContent>
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.6 }}
                  className="rounded-lg border p-3 flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <MessageSquare className="h-4 w-4 text-primary" />
                    <div>
                      <p className="text-sm line-clamp-1">I recommend Al-Moosa Specialist Hospital or Saad Specialist Hospital for cardiology.</p>
                      <p className="text-xs text-muted-foreground">Apr 20, 2026</p>
                    </div>
                  </div>
                  <Link href="/chat">
                    <Button variant="ghost" size="sm">Continue</Button>
                  </Link>
                </motion.div>
              </CardContent>
            </Card>
          </FadeIn>
        </div>
      </div>
    </AnimatedPage>
  );
}
