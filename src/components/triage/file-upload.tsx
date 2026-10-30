"use client";

import { useCallback, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { FileText, Loader2, Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const ACCEPTED = ["application/pdf", "image/jpeg", "image/png", "image/webp"];

interface FileUploadProps {
  onFileSelect: (file: File) => void;
  isAnalyzing: boolean;
  maxMb: number;
  onError: (message: string) => void;
}

export function FileUpload({ onFileSelect, isAnalyzing, maxMb, onError }: FileUploadProps) {
  const t = useTranslations("triage");
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const accept = useCallback(
    (file: File | undefined) => {
      if (!file) return;
      if (file.type && !ACCEPTED.includes(file.type)) {
        onError(t("errors.unsupportedType"));
        return;
      }
      if (file.size > maxMb * 1024 * 1024) {
        onError(t("errors.fileTooLarge", { size: maxMb }));
        return;
      }
      setSelectedFile(file);
    },
    [maxMb, onError, t]
  );

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(e.type === "dragenter" || e.type === "dragover");
  };

  return (
    <div className="space-y-4">
      <Card
        className={cn(
          "relative border-2 border-dashed transition-all duration-200",
          dragActive ? "scale-[1.01] border-primary bg-primary/5 shadow-md" : "border-muted-foreground/25"
        )}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={(e) => {
          handleDrag(e);
          setDragActive(false);
          accept(e.dataTransfer.files?.[0]);
        }}
      >
        <div className="p-8 text-center">
          {selectedFile ? (
            <div className="flex items-center justify-center gap-3">
              <FileText className="h-8 w-8 text-primary" />
              <div className="text-start">
                <p className="text-sm font-medium">{selectedFile.name}</p>
                <p className="text-xs text-muted-foreground">{(selectedFile.size / 1024).toFixed(1)} KB</p>
              </div>
              {!isAnalyzing && (
                <Button variant="ghost" size="icon" onClick={() => setSelectedFile(null)} className="h-8 w-8" aria-label={t("removeFile")}>
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          ) : (
            <div>
              <Upload className="mx-auto mb-3 h-10 w-10 text-muted-foreground" aria-hidden />
              <p className="text-sm text-muted-foreground">{t("uploadHint")}</p>
              <p className="mt-1 text-xs text-muted-foreground/80">{t("maxSize", { size: maxMb })}</p>
              <Button type="button" variant="link" className="mt-2" onClick={() => inputRef.current?.click()}>
                {t("browse")}
              </Button>
              <input
                ref={inputRef}
                type="file"
                className="sr-only"
                accept=".pdf,.png,.jpg,.jpeg,.webp,application/pdf,image/png,image/jpeg,image/webp"
                aria-label={t("upload")}
                onChange={(e) => {
                  accept(e.target.files?.[0]);
                  e.target.value = "";
                }}
              />
            </div>
          )}
        </div>
      </Card>

      {selectedFile && (
        <Button onClick={() => onFileSelect(selectedFile)} className="w-full" disabled={isAnalyzing} size="lg">
          {isAnalyzing ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
          {isAnalyzing ? t("analyzing") : t("analyze")}
        </Button>
      )}
    </div>
  );
}
