"use client";

import { useEffect, useRef, useCallback } from "react";

interface UseKeyboardShortcutsOptions {
  /** Whether shortcuts are active (default: true) */
  enabled?: boolean;
}

/**
 * Parses a key-combo string like "ctrl+s", "shift+n", "mod+k" into its
 * modifier flags and the key value.
 */
function parseCombo(combo: string): {
  key: string;
  ctrl: boolean;
  shift: boolean;
  alt: boolean;
  meta: boolean;
} {
  const parts = combo.toLowerCase().split("+");
  const key = parts[parts.length - 1];

  let ctrl = false;
  let shift = false;
  let alt = false;
  let meta = false;

  for (let i = 0; i < parts.length - 1; i++) {
    switch (parts[i]) {
      case "ctrl":
      case "control":
        ctrl = true;
        break;
      case "shift":
        shift = true;
        break;
      case "alt":
        alt = true;
        break;
      case "mod":
      case "meta":
      case "cmd":
      case "command":
        // "mod" is cross-platform: Meta on Mac, Ctrl on others
        if (typeof navigator !== "undefined" && /Mac|iPod|iPhone|iPad/.test(navigator.userAgent)) {
          meta = true;
        } else {
          ctrl = true;
        }
        break;
    }
  }

  return { key, ctrl, shift, alt, meta };
}

/** Input elements where shortcuts should be suppressed. */
const INPUT_TAG_NAMES = new Set(["INPUT", "TEXTAREA", "SELECT"]);

/**
 * Returns true when the event target is an editable input element or a
 * contentEditable node, meaning keyboard shortcuts should be ignored.
 */
function isEditableTarget(e: KeyboardEvent): boolean {
  const target = e.target as HTMLElement | null;
  if (!target) return false;
  if (INPUT_TAG_NAMES.has(target.tagName)) return true;
  if (target.isContentEditable) return true;
  return false;
}

export function useKeyboardShortcuts(
  shortcuts: Record<string, () => void>,
  options?: UseKeyboardShortcutsOptions,
) {
  const { enabled = true } = options ?? {};
  const shortcutsRef = useRef(shortcuts);

  // Keep the ref current without re-registering the listener on every render
  useEffect(() => {
    shortcutsRef.current = shortcuts;
  }, [shortcuts]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!enabled) return;

      // Ignore when user is typing in an input field
      if (isEditableTarget(e)) return;

      const entries = Object.entries(shortcutsRef.current);
      for (const [combo, handler] of entries) {
        const { key, ctrl, shift, alt, meta } = parseCombo(combo);

        const keyMatch = e.key.toLowerCase() === key;
        const ctrlMatch = e.ctrlKey === ctrl;
        const shiftMatch = e.shiftKey === shift;
        const altMatch = e.altKey === alt;
        const metaMatch = e.metaKey === meta;

        if (keyMatch && ctrlMatch && shiftMatch && altMatch && metaMatch) {
          e.preventDefault();
          handler();
          return; // first match wins
        }
      }
    },
    [enabled],
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);
}
