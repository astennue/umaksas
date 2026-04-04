"use client";

import {
  useState,
  useCallback,
  useRef,
  createElement,
} from "react";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";

export interface ConfirmOptions {
  title: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  variant?: "default" | "destructive";
}

interface ConfirmState extends Required<ConfirmOptions> {
  open: boolean;
}

export function useConfirm() {
  const [state, setState] = useState<ConfirmState>({
    open: false,
    title: "",
    description: "",
    confirmText: "Confirm",
    cancelText: "Cancel",
    variant: "default",
  });

  const resolveRef = useRef<(value: boolean) => void>(() => {});

  const confirm = useCallback((options: ConfirmOptions): Promise<boolean> => {
    return new Promise<boolean>((resolve) => {
      resolveRef.current = resolve;
      setState({
        open: true,
        title: options.title,
        description: options.description,
        confirmText: options.confirmText ?? "Confirm",
        cancelText: options.cancelText ?? "Cancel",
        variant: options.variant ?? "default",
      });
    });
  }, []);

  const handleOpenChange = useCallback((open: boolean) => {
    if (!open) {
      resolveRef.current(false);
      setState((prev) => ({ ...prev, open: false }));
    }
  }, []);

  const handleConfirm = useCallback(() => {
    resolveRef.current(true);
    setState((prev) => ({ ...prev, open: false }));
  }, []);

  const handleCancel = useCallback(() => {
    resolveRef.current(false);
    setState((prev) => ({ ...prev, open: false }));
  }, []);

  function ConfirmDialog() {
    if (!state.open) return null;

    return createElement(
      AlertDialog,
      { open: true, onOpenChange: handleOpenChange },
      createElement(
        AlertDialogContent,
        null,
        createElement(
          AlertDialogHeader,
          null,
          createElement(AlertDialogTitle, null, state.title),
          createElement(AlertDialogDescription, null, state.description),
        ),
        createElement(
          AlertDialogFooter,
          null,
          createElement(AlertDialogCancel, { onClick: handleCancel }, state.cancelText),
          createElement(
            AlertDialogAction,
            {
              onClick: handleConfirm,
              className:
                state.variant === "destructive"
                  ? "bg-destructive text-white hover:bg-destructive/90"
                  : undefined,
            },
            state.confirmText,
          ),
        ),
      ),
    );
  };

  return { confirm, ConfirmDialog };
}
