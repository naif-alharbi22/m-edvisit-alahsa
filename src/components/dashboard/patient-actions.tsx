"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Star, XCircle } from "lucide-react";
import { useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Field } from "@/components/ui/form-field";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { StarInput } from "@/components/ui/star-rating";
import { apiFetch, ApiClientError } from "@/lib/api-client";

export function CancelButton({ kind, id, reference }: { kind: "appointment" | "booking"; id: string; reference: string }) {
  const t = useTranslations("dashboard");
  const tc = useTranslations("common");
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");

  return (
    <>
      <Button size="sm" variant="ghost" className="h-7 px-2 text-xs text-destructive" onClick={() => setOpen(true)}>
        <XCircle className="h-3.5 w-3.5" /> {t("cancel")}
      </Button>
      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        title={kind === "appointment" ? t("cancelAppointmentTitle", { reference }) : t("cancelBookingTitle", { reference })}
        confirmLabel={t("confirmCancel")}
        cancelLabel={t("keep")}
        destructive
        onConfirm={async () => {
          try {
            await apiFetch(`/api/me/${kind === "appointment" ? "appointments" : "bookings"}/${id}/cancel`, {
              method: "POST",
              body: { reason },
            });
            toast.success(t("cancelled"));
            setOpen(false);
            router.refresh();
          } catch (err) {
            toast.error(err instanceof ApiClientError ? err.message : tc("error"));
          }
        }}
      >
        <Field id={`reason-${id}`} label={t("cancelReason")}>
          <Textarea id={`reason-${id}`} value={reason} onChange={(e) => setReason(e.target.value)} maxLength={500} />
        </Field>
      </ConfirmDialog>
    </>
  );
}

export function ReviewButton({ target, name }: { target: { facilityId: string } | { hotelId: string }; name: string }) {
  const t = useTranslations("review");
  const td = useTranslations("dashboard");
  const tc = useTranslations("common");
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setBusy(true);
    try {
      await apiFetch("/api/me/reviews", { method: "POST", body: { ...target, rating, comment } });
      toast.success(t("thanks"));
      setOpen(false);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : tc("error"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => setOpen(true)}>
        <Star className="h-3.5 w-3.5" /> {td("review")}
      </Button>
      <Dialog open={open} onOpenChange={(o) => !busy && setOpen(o)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t("title", { name })}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <p className="text-sm font-medium">{t("rating")}</p>
              <StarInput value={rating} onChange={setRating} label={(n) => t("star", { count: n })} />
            </div>
            <Field id="review-comment" label={t("comment")} optional={tc("optional")}>
              <Textarea id="review-comment" value={comment} onChange={(e) => setComment(e.target.value)} placeholder={t("commentPlaceholder")} maxLength={1000} />
            </Field>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={busy}>
              {tc("cancel")}
            </Button>
            <Button onClick={submit} disabled={busy}>
              {t("submit")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
