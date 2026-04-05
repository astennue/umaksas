"use client";

import { useState, useEffect, useMemo } from "react";

// Global cache so all components share the same photoUrl
let cachedPhotoUrl: string | null | undefined = undefined;
let cachedUserId: string | null = null;
const listeners = new Set<(photoUrl: string | null) => void>();

function notifyListeners(photoUrl: string | null) {
  listeners.forEach((fn) => fn(photoUrl));
}

/**
 * Hook to get the current user's profile photo URL.
 * Uses a global cache so the photo is only fetched once per session.
 * When the photo is updated (e.g., after upload/delete), call refreshUserPhoto()
 * to update all components using this hook.
 */
export function useUserPhoto() {
  const [photoUrl, setPhotoUrl] = useState<string | null>(
    cachedPhotoUrl === undefined ? null : cachedPhotoUrl
  );

  useEffect(() => {
    listeners.add(setPhotoUrl);
    return () => {
      listeners.delete(setPhotoUrl);
    };
  }, []);

  useEffect(() => {
    if (cachedPhotoUrl !== undefined) {
      return;
    }

    let cancelled = false;
    fetch("/api/user/profile")
      .then((res) => {
        if (!res.ok) {
          cachedPhotoUrl = null;
          if (!cancelled) setPhotoUrl(null);
          return null;
        }
        return res.json();
      })
      .then((data) => {
        if (!data || cancelled) return;
        const url: string | null = data.user?.photoUrl || null;
        cachedPhotoUrl = url;
        cachedUserId = data.user?.id || null;
        setPhotoUrl(url);
      })
      .catch(() => {
        cachedPhotoUrl = null;
        if (!cancelled) setPhotoUrl(null);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return photoUrl;
}

/**
 * Call this after uploading or deleting a profile photo
 * to refresh the photo in all components that use useUserPhoto.
 */
export function refreshUserPhoto(newPhotoUrl?: string | null) {
  if (newPhotoUrl === undefined) {
    // Re-fetch from server
    cachedPhotoUrl = undefined;
    fetch("/api/user/profile")
      .then((res) => res.json())
      .then((data) => {
        const url: string | null = data.user?.photoUrl || null;
        cachedPhotoUrl = url;
        notifyListeners(url);
      })
      .catch(() => {
        cachedPhotoUrl = null;
        notifyListeners(null);
      });
  } else {
    cachedPhotoUrl = newPhotoUrl;
    notifyListeners(newPhotoUrl);
  }
}
