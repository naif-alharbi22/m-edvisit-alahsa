"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { FacilityCard } from "@/components/facilities/facility-card";
import { FacilityDetailDialog } from "@/components/facilities/facility-detail-dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AnimatedPage } from "@/components/ui/animated-page";
import { FadeIn } from "@/components/ui/fade-in";
import { StaggerContainer, StaggerItem } from "@/components/ui/stagger-container";
import { Search, Building2, Loader2 } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";

interface Doctor {
  id: string;
  name: string;
  nameAr: string | null;
  specialty: string;
  rating: number;
  yearsExp: number;
  languages: string[];
  bio: string | null;
  bioAr: string | null;
  image: string | null;
}

interface TreatmentPackage {
  id: string;
  name: string;
  nameAr: string | null;
  description: string | null;
  descriptionAr: string | null;
  specialty: string;
  price: number;
  currency: string;
  duration: string | null;
  includes: string[];
}

interface Facility {
  id: string;
  name: string;
  nameAr: string | null;
  description: string | null;
  descriptionAr: string | null;
  city: string;
  address: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  rating: number;
  specialties: string[];
  doctors: Doctor[];
  treatmentPackages: TreatmentPackage[];
}

export default function FacilitiesPage() {
  const t = useTranslations("facilities");
  const searchParams = useSearchParams();
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [specialties, setSpecialties] = useState<string[]>([]);
  const [selectedSpecialty, setSelectedSpecialty] = useState(searchParams.get("specialty") || "All Specialties");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [selectedFacility, setSelectedFacility] = useState<Facility | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    const sp = searchParams.get("specialty");
    if (sp) setSelectedSpecialty(sp);
  }, [searchParams]);

  useEffect(() => {
    fetchFacilities();
  }, [selectedSpecialty, search]);

  const fetchFacilities = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedSpecialty && selectedSpecialty !== "All Specialties") {
        params.set("specialty", selectedSpecialty);
      }
      if (search) params.set("search", search);

      const res = await fetch(`/api/facilities?${params}`);
      const data = await res.json();
      setFacilities(data.facilities || []);
      if (data.specialties) setSpecialties(data.specialties);
    } catch (error) {
      console.error("Failed to fetch facilities:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetails = (id: string) => {
    const facility = facilities.find((f) => f.id === id);
    if (facility) {
      setSelectedFacility(facility);
      setDialogOpen(true);
    }
  };

  return (
    <AnimatedPage>
      <div className="container mx-auto px-4 py-8">
        <FadeIn>
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-2">
              <Building2 className="h-6 w-6 text-primary" />
              <h1 className="text-2xl font-bold">{t("title")}</h1>
            </div>
            <p className="text-muted-foreground">{t("subtitle")}</p>
          </div>
        </FadeIn>

        <FadeIn delay={0.1}>
          <div className="flex flex-col sm:flex-row gap-3 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t("searchPlaceholder")}
                className="pl-9"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Select value={selectedSpecialty} onValueChange={setSelectedSpecialty}>
              <SelectTrigger className="w-full sm:w-[200px]">
                <SelectValue placeholder={t("filterSpecialty")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="All Specialties">{t("allSpecialties")}</SelectItem>
                {specialties.map((s) => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </FadeIn>

        <AnimatePresence mode="wait">
          {loading ? (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex items-center justify-center py-20"
            >
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </motion.div>
          ) : facilities.length === 0 ? (
            <motion.div
              key="empty"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="text-center py-20"
            >
              <Building2 className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">{t("noResults")}</p>
            </motion.div>
          ) : (
            <motion.div
              key="results"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3 }}
            >
              <StaggerContainer className="grid grid-cols-1 md:grid-cols-2 gap-6" staggerDelay={0.08}>
                {facilities.map((facility) => (
                  <StaggerItem key={facility.id}>
                    <FacilityCard
                      facility={facility}
                      onViewDetails={handleViewDetails}
                    />
                  </StaggerItem>
                ))}
              </StaggerContainer>
            </motion.div>
          )}
        </AnimatePresence>

        <FacilityDetailDialog
          facility={selectedFacility}
          open={dialogOpen}
          onOpenChange={setDialogOpen}
        />
      </div>
    </AnimatedPage>
  );
}
