"use client";

import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Eraser, Undo2, PenLine } from "lucide-react";

// ─── Types ─────────────────────────────────────────────
export interface SignaturePadRef {
  getSignatureData: () => string | null;
  isSigned: boolean;
  clearSignature: () => void;
  undoStroke: () => void;
}

interface Point {
  x: number;
  y: number;
}

type Stroke = Point[];

interface SignaturePadProps {
  /** Pen stroke colour – defaults to #1a1a2e (dark) */
  penColor?: string;
  /** Pen line width in px – defaults to 2.5 */
  lineWidth?: number;
  /** Canvas height in px – defaults to 200 */
  height?: number;
  /** Additional class names for the wrapper div */
  className?: string;
  /** Called whenever the signed state changes */
  onSignedChange?: (signed: boolean) => void;
}

// ─── Component ─────────────────────────────────────────
const SignaturePad = forwardRef<SignaturePadRef, SignaturePadProps>(
  (
    {
      penColor = "#1a1a2e",
      lineWidth = 2.5,
      height = 200,
      className,
      onSignedChange,
    },
    ref
  ) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const strokesRef = useRef<Stroke[]>([]);
    const currentStrokeRef = useRef<Stroke>([]);
    const isDrawingRef = useRef(false);
    const [isSigned, setIsSigned] = useState(false);
    const [strokeCount, setStrokeCount] = useState(0);

    // ── Drawing helper: redraw all strokes onto canvas ──
    const redrawCanvas = useCallback(() => {
      const canvas = canvasRef.current;
      const container = containerRef.current;
      if (!canvas || !container) return;

      const rect = container.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      const w = rect.width;
      const h = height;

      // Reset canvas dimensions
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;

      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      // White background
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, w, h);

      // Draw completed strokes
      const allStrokes = [...strokesRef.current];
      if (currentStrokeRef.current.length >= 2) {
        allStrokes.push(currentStrokeRef.current);
      }

      for (const stroke of allStrokes) {
        if (stroke.length < 2) continue;

        ctx.beginPath();
        ctx.strokeStyle = penColor;
        ctx.lineWidth = lineWidth;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";

        ctx.moveTo(stroke[0].x, stroke[0].y);

        // Smooth line using quadratic curves through midpoints
        for (let i = 1; i < stroke.length - 1; i++) {
          const midX = (stroke[i].x + stroke[i + 1].x) / 2;
          const midY = (stroke[i].y + stroke[i + 1].y) / 2;
          ctx.quadraticCurveTo(stroke[i].x, stroke[i].y, midX, midY);
        }

        // Last point
        const last = stroke[stroke.length - 1];
        ctx.lineTo(last.x, last.y);
        ctx.stroke();
      }
    }, [height, penColor, lineWidth]);

    // ── Canvas sizing (called on mount and resize) ──────
    const resizeCanvas = useCallback(() => {
      redrawCanvas();
    }, [redrawCanvas]);

    // ── Get pointer position relative to canvas ─────────
    const getPoint = useCallback(
      (e: React.PointerEvent): Point => {
        const canvas = canvasRef.current;
        if (!canvas) return { x: 0, y: 0 };
        const rect = canvas.getBoundingClientRect();
        return {
          x: e.clientX - rect.left,
          y: e.clientY - rect.top,
        };
      },
      []
    );

    // ── Pointer event handlers ─────────────────────────
    const handlePointerDown = useCallback(
      (e: React.PointerEvent<HTMLCanvasElement>) => {
        e.preventDefault();
        (e.target as HTMLElement).setPointerCapture(e.pointerId);
        isDrawingRef.current = true;
        currentStrokeRef.current = [getPoint(e)];
      },
      [getPoint]
    );

    const handlePointerMove = useCallback(
      (e: React.PointerEvent<HTMLCanvasElement>) => {
        if (!isDrawingRef.current) return;
        e.preventDefault();
        const point = getPoint(e);
        currentStrokeRef.current.push(point);
        redrawCanvas();
      },
      [getPoint, redrawCanvas]
    );

    const handlePointerUp = useCallback(
      (e: React.PointerEvent<HTMLCanvasElement>) => {
        if (!isDrawingRef.current) return;
        isDrawingRef.current = false;

        const stroke = currentStrokeRef.current;
        if (stroke.length >= 2) {
          strokesRef.current.push([...stroke]);
          setStrokeCount((c) => c + 1);
          if (!isSigned) {
            setIsSigned(true);
            onSignedChange?.(true);
          }
        }
        currentStrokeRef.current = [];
        redrawCanvas();
      },
      [isSigned, onSignedChange, redrawCanvas]
    );

    const handlePointerLeave = useCallback(
      (e: React.PointerEvent<HTMLCanvasElement>) => {
        if (isDrawingRef.current) {
          handlePointerUp(e);
        }
      },
      [handlePointerUp]
    );

    // ── Public API via ref ─────────────────────────────
    const getSignatureData = useCallback((): string | null => {
      const canvas = canvasRef.current;
      if (!canvas || strokesRef.current.length === 0) return null;
      return canvas.toDataURL("image/png");
    }, []);

    const clearSignature = useCallback(() => {
      strokesRef.current = [];
      currentStrokeRef.current = [];
      setIsSigned(false);
      setStrokeCount(0);
      onSignedChange?.(false);
      redrawCanvas();
    }, [onSignedChange, redrawCanvas]);

    const undoStroke = useCallback(() => {
      if (strokesRef.current.length === 0) return;
      strokesRef.current.pop();
      setStrokeCount((c) => Math.max(0, c - 1));
      if (strokesRef.current.length === 0) {
        setIsSigned(false);
        onSignedChange?.(false);
      }
      redrawCanvas();
    }, [onSignedChange, redrawCanvas]);

    useImperativeHandle(
      ref,
      () => ({
        getSignatureData,
        isSigned,
        clearSignature,
        undoStroke,
      }),
      [getSignatureData, isSigned, clearSignature, undoStroke]
    );

    // ── Resize observer ────────────────────────────────
    useEffect(() => {
      const container = containerRef.current;
      if (!container) return;

      resizeCanvas();
      const observer = new ResizeObserver(() => resizeCanvas());
      observer.observe(container);
      return () => observer.disconnect();
    }, [resizeCanvas]);

    return (
      <div className={cn("w-full", className)}>
        {/* Canvas container */}
        <div
          ref={containerRef}
          className={cn(
            "relative w-full overflow-hidden rounded-lg border-2 border-dashed",
            "bg-white transition-colors",
            isSigned
              ? "border-emerald-400 dark:border-emerald-600"
              : "border-gray-300 dark:border-gray-600"
          )}
          style={{ height }}
        >
          <canvas
            ref={canvasRef}
            className="absolute inset-0 cursor-crosshair touch-none"
            style={{ touchAction: "none" }}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerLeave={handlePointerLeave}
          />

          {/* Placeholder when empty */}
          {!isSigned && (
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
              {/* Guide line */}
              <div className="absolute bottom-12 left-8 right-8 border-t border-dashed border-gray-300 dark:border-gray-500" />
              <div className="flex flex-col items-center gap-1 text-gray-500 dark:text-gray-400 mb-8">
                <PenLine className="h-7 w-7 opacity-40" />
                <span className="text-sm font-medium opacity-60">
                  Sign above this line
                </span>
                <span className="text-xs opacity-40">
                  Draw your signature using your finger or mouse
                </span>
              </div>
            </div>
          )}

          {/* Signed indicator badge */}
          {isSigned && (
            <div className="pointer-events-none absolute top-2 right-2">
              <div className="flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 dark:bg-emerald-900/40">
                <div className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                <span className="text-[10px] font-medium text-emerald-700 dark:text-emerald-400">
                  Signed
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Controls */}
        <div className="mt-2 flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={undoStroke}
            disabled={strokeCount === 0}
            className="gap-1.5 text-xs"
          >
            <Undo2 className="h-3.5 w-3.5" />
            Undo
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={clearSignature}
            disabled={!isSigned}
            className="gap-1.5 text-xs text-destructive hover:text-destructive"
          >
            <Eraser className="h-3.5 w-3.5" />
            Clear
          </Button>
        </div>
      </div>
    );
  }
);

SignaturePad.displayName = "SignaturePad";

export { SignaturePad };
