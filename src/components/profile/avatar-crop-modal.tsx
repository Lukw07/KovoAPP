"use client";

import { useState, useRef, useCallback } from "react";
import ReactCrop, {
  type Crop,
  centerCrop,
  makeAspectCrop,
} from "react-image-crop";
import "react-image-crop/dist/ReactCrop.css";
import { X, Check, Loader2, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";

interface AvatarCropModalProps {
  file: File;
  onCropped: (croppedBlob: Blob) => void;
  onCancel: () => void;
}

function centerAspectCrop(
  mediaWidth: number,
  mediaHeight: number,
) {
  return centerCrop(
    makeAspectCrop(
      { unit: "%", width: 80 },
      1,
      mediaWidth,
      mediaHeight,
    ),
    mediaWidth,
    mediaHeight,
  );
}

export function AvatarCropModal({
  file,
  onCropped,
  onCancel,
}: AvatarCropModalProps) {
  const [crop, setCrop] = useState<Crop>();
  const [completedCrop, setCompletedCrop] = useState<Crop>();
  const [processing, setProcessing] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);
  const [imgSrc] = useState(() => URL.createObjectURL(file));

  const onImageLoad = useCallback(
    (e: React.SyntheticEvent<HTMLImageElement>) => {
      const { naturalWidth, naturalHeight } = e.currentTarget;
      const initialCrop = centerAspectCrop(naturalWidth, naturalHeight);
      setCrop(initialCrop);
      setCompletedCrop(initialCrop);
    },
    [],
  );

  const handleReset = () => {
    if (!imgRef.current) return;
    const { naturalWidth, naturalHeight } = imgRef.current;
    const resetCrop = centerAspectCrop(naturalWidth, naturalHeight);
    setCrop(resetCrop);
    setCompletedCrop(resetCrop);
  };

  const handleConfirm = async () => {
    const image = imgRef.current;
    if (!image || !completedCrop) return;

    setProcessing(true);

    try {
      const canvas = document.createElement("canvas");
      const scaleX = image.naturalWidth / image.width;
      const scaleY = image.naturalHeight / image.height;

      const cropX = (completedCrop.x ?? 0) * scaleX;
      const cropY = (completedCrop.y ?? 0) * scaleY;
      const cropWidth = (completedCrop.width ?? 0) * scaleX;
      const cropHeight = (completedCrop.height ?? 0) * scaleY;

      // Output 512×512 for avatar
      const outputSize = 512;
      canvas.width = outputSize;
      canvas.height = outputSize;

      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Canvas context failed");

      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";

      ctx.drawImage(
        image,
        cropX,
        cropY,
        cropWidth,
        cropHeight,
        0,
        0,
        outputSize,
        outputSize,
      );

      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob(
          (b) => (b ? resolve(b) : reject(new Error("Canvas toBlob failed"))),
          "image/webp",
          0.9,
        );
      });

      onCropped(blob);
    } catch {
      setProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fadeInUp">
      <div className="w-full max-w-sm rounded-2xl bg-card border border-border shadow-xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <h3 className="text-sm font-bold text-foreground">
            Oříznout avatar
          </h3>
          <button
            onClick={onCancel}
            className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-background-secondary transition-colors"
          >
            <X className="h-4 w-4 text-foreground-secondary" />
          </button>
        </div>

        {/* Crop area */}
        <div className="flex items-center justify-center p-4 bg-black/5 dark:bg-black/20 min-h-[280px]">
          <ReactCrop
            crop={crop}
            onChange={(c) => setCrop(c)}
            onComplete={(c) => setCompletedCrop(c)}
            aspect={1}
            circularCrop
            className="max-h-[60vh]"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              ref={imgRef}
              src={imgSrc}
              alt="Náhled"
              onLoad={onImageLoad}
              className="max-h-[60vh] max-w-full object-contain"
              crossOrigin="anonymous"
            />
          </ReactCrop>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 px-4 py-3 border-t border-border">
          <button
            onClick={handleReset}
            disabled={processing}
            className="flex h-9 w-9 items-center justify-center rounded-xl bg-background-secondary text-foreground-secondary hover:text-foreground transition-colors disabled:opacity-50"
            title="Resetovat výřez"
          >
            <RotateCcw className="h-4 w-4" />
          </button>

          <div className="flex-1" />

          <button
            onClick={onCancel}
            disabled={processing}
            className="px-4 py-2 text-sm font-medium text-foreground-secondary hover:text-foreground rounded-xl transition-colors disabled:opacity-50"
          >
            Zrušit
          </button>

          <button
            onClick={handleConfirm}
            disabled={processing || !completedCrop}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold",
              "bg-accent text-white hover:bg-accent-hover transition-all",
              "disabled:opacity-50 disabled:cursor-not-allowed",
            )}
          >
            {processing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Check className="h-4 w-4" />
            )}
            Použít
          </button>
        </div>
      </div>
    </div>
  );
}
