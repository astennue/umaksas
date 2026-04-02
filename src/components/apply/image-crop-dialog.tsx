"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Crop, ZoomIn, ZoomOut, RotateCcw } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";

interface ImageCropDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  imageSrc: string;
  onCrop: (croppedImage: string) => void;
  title?: string;
}

const OUTPUT_SIZE = 400; // 2x2 at 200dpi

export function ImageCropDialog({
  open,
  onOpenChange,
  imageSrc,
  onCrop,
  title = "Crop 2x2 Photo",
}: ImageCropDialogProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const previewCanvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  const [cropSize, setCropSize] = useState(OUTPUT_SIZE);

  // Calculate crop display size
  useEffect(() => {
    if (containerRef.current) {
      const containerWidth = containerRef.current.clientWidth - 48;
      const size = Math.min(containerWidth, 300);
      setCropSize(size);
    }
  }, [open]);

  // Draw preview whenever zoom or offset changes
  const drawPreview = useCallback(() => {
    const previewCanvas = previewCanvasRef.current;
    const img = imageRef.current;
    if (!previewCanvas || !img) return;

    const ctx = previewCanvas.getContext("2d");
    if (!ctx) return;

    const size = cropSize;
    previewCanvas.width = size;
    previewCanvas.height = size;

    ctx.clearRect(0, 0, size, size);

    // Fill background
    ctx.fillStyle = "#f1f5f9";
    ctx.fillRect(0, 0, size, size);

    // Calculate dimensions
    const baseScale = size / Math.min(img.naturalWidth, img.naturalHeight);
    const scale = baseScale * zoom;
    const scaledWidth = img.naturalWidth * scale;
    const scaledHeight = img.naturalHeight * scale;

    const x = (size - scaledWidth) / 2 + offset.x;
    const y = (size - scaledHeight) / 2 + offset.y;

    ctx.drawImage(img, x, y, scaledWidth, scaledHeight);

    // Draw rule of thirds grid
    ctx.strokeStyle = "rgba(255, 255, 255, 0.4)";
    ctx.lineWidth = 0.5;

    for (let i = 1; i <= 2; i++) {
      // Horizontal lines
      ctx.beginPath();
      ctx.moveTo(0, (size * i) / 3);
      ctx.lineTo(size, (size * i) / 3);
      ctx.stroke();

      // Vertical lines
      ctx.beginPath();
      ctx.moveTo((size * i) / 3, 0);
      ctx.lineTo((size * i) / 3, size);
      ctx.stroke();
    }

    // Draw border
    ctx.strokeStyle = "rgba(30, 58, 138, 0.8)";
    ctx.lineWidth = 2;
    ctx.strokeRect(1, 1, size - 2, size - 2);
  }, [zoom, offset, cropSize]);

  useEffect(() => {
    drawPreview();
  }, [drawPreview]);

  // Load image
  useEffect(() => {
    if (!imageSrc) return;
    const img = new Image();
    img.onload = () => {
      imageRef.current = img;
      setZoom(1);
      setOffset({ x: 0, y: 0 });
    };
    img.src = imageSrc;
  }, [imageSrc]);

  // Mouse handlers for drag
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - offset.x, y: e.clientY - offset.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setOffset({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    });
  };

  const handleMouseUp = () => setIsDragging(false);

  // Touch handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    setIsDragging(true);
    setDragStart({ x: touch.clientX - offset.x, y: touch.clientY - offset.y });
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging) return;
    e.preventDefault();
    const touch = e.touches[0];
    setOffset({
      x: touch.clientX - dragStart.x,
      y: touch.clientY - dragStart.y,
    });
  };

  const handleTouchEnd = () => setIsDragging(false);

  // Crop and output
  const handleCrop = () => {
    const canvas = canvasRef.current;
    const img = imageRef.current;
    if (!canvas || !img) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = OUTPUT_SIZE;
    canvas.height = OUTPUT_SIZE;

    const baseScale = OUTPUT_SIZE / Math.min(img.naturalWidth, img.naturalHeight);
    const scale = baseScale * zoom;
    const scaledWidth = img.naturalWidth * scale;
    const scaledHeight = img.naturalHeight * scale;

    const x = (OUTPUT_SIZE - scaledWidth) / 2 + offset.x;
    const y = (OUTPUT_SIZE - scaledHeight) / 2 + offset.y;

    ctx.drawImage(img, x, y, scaledWidth, scaledHeight);

    const croppedImage = canvas.toDataURL("image/jpeg", 0.9);
    onCrop(croppedImage);
    onOpenChange(false);
  };

  const handleReset = () => {
    setZoom(1);
    setOffset({ x: 0, y: 0 });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Crop className="h-5 w-5 text-[#1e3a8a]" />
            {title}
          </DialogTitle>
        </DialogHeader>

        <div ref={containerRef} className="flex flex-col items-center gap-4">
          {/* Preview canvas */}
          <div
            className="relative cursor-move overflow-hidden rounded-lg border"
            style={{ width: cropSize, height: cropSize }}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
          >
            <canvas
              ref={previewCanvasRef}
              style={{ width: cropSize, height: cropSize }}
            />
          </div>

          {/* Zoom control */}
          <div className="flex w-full items-center gap-3 px-2">
            <ZoomOut className="h-4 w-4 shrink-0 text-muted-foreground" />
            <Slider
              value={[zoom]}
              min={0.5}
              max={3}
              step={0.1}
              onValueChange={([val]) => setZoom(val)}
              className="flex-1"
            />
            <ZoomIn className="h-4 w-4 shrink-0 text-muted-foreground" />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={handleReset}
            >
              <RotateCcw className="h-4 w-4" />
            </Button>
          </div>

          <p className="text-center text-xs text-muted-foreground">
            Drag to reposition. The image will be cropped to a 2x2 square.
          </p>
        </div>

        <DialogFooter className="flex gap-2 sm:justify-between">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleCrop}
            className="bg-[#1e3a8a] text-white hover:bg-[#1e3a8a]/90"
          >
            <Crop className="mr-2 h-4 w-4" />
            Crop & Use
          </Button>
        </DialogFooter>

        {/* Hidden output canvas */}
        <canvas ref={canvasRef} className="hidden" />
      </DialogContent>
    </Dialog>
  );
}
