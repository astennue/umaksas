"use client";

import { useState, useCallback, useMemo } from "react";

/**
 * Tracks form dirty state by comparing current values against a baseline.
 *
 * ```ts
 * const { values, update, isDirty, reset, markClean } = useFormDirty({ name: "", email: "" });
 * ```
 */
export function useFormDirty<T extends Record<string, unknown>>(initialValues: T) {
  const [values, setValues] = useState<T>({ ...initialValues });
  const [baseline, setBaseline] = useState<string>(() => JSON.stringify(initialValues));

  const isDirty = useMemo(() => {
    return JSON.stringify(values) !== baseline;
  }, [values, baseline]);

  const update = useCallback(
    <K extends keyof T>(key: K, value: T[K]) => {
      setValues((prev) => ({ ...prev, [key]: value }));
    },
    [],
  );

  const reset = useCallback(() => {
    setValues({ ...initialValues });
    setBaseline(JSON.stringify(initialValues));
  }, [initialValues]);

  const markClean = useCallback(() => {
    setBaseline(JSON.stringify(values));
  }, [values]);

  return { values, update, isDirty, reset, markClean } as const;
}
