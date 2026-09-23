"use client";

import { useState, useEffect, useRef } from "react";
import { getDoc, getDocs, query, orderBy, onSnapshot } from "firebase/firestore";
import { configAppRef, eventRef, departmentsRef, categoriesRef, performancesRef } from "@/lib/firebase/paths";
import type { AppConfig, FestEvent, Department, Category, Performance } from "@/types/firestore";

// ── useAppConfig ──────────────────────────────────────────────────────────────

interface UseAppConfigResult {
  config: AppConfig | null;
  loading: boolean;
  error: string | null;
}

const configCache: { data: AppConfig | null; loaded: boolean } = {
  data: null,
  loaded: false,
};

export function useAppConfig(): UseAppConfigResult {
  const [config, setConfig] = useState<AppConfig | null>(configCache.data);
  const [loading, setLoading] = useState(!configCache.loaded);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const unsub = onSnapshot(
      configAppRef(),
      (snap) => {
        const data = snap.exists() ? snap.data() : null;
        configCache.data = data;
        configCache.loaded = true;
        setConfig(data);
        setLoading(false);
      },
      (err: Error) => {
        setError(err.message);
        setLoading(false);
      }
    );
    return () => unsub();
  }, []);

  return { config, loading, error };
}

// ── useActiveEvent ────────────────────────────────────────────────────────────

interface UseActiveEventResult {
  event: (FestEvent & { id: string }) | null;
  loading: boolean;
  error: string | null;
}

export function useActiveEvent(activeEventId: string | null | undefined): UseActiveEventResult {
  const [event, setEvent] = useState<(FestEvent & { id: string }) | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!activeEventId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    getDoc(eventRef(activeEventId))
      .then((snap) => {
        setEvent(snap.exists() ? { ...snap.data(), id: snap.id } : null);
      })
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, [activeEventId]);

  return { event, loading, error };
}

// ── useDepartments ────────────────────────────────────────────────────────────

interface UseDepartmentsResult {
  departments: Array<Department & { id: string }>;
  loading: boolean;
  error: string | null;
}

const deptCache: { data: Array<Department & { id: string }> | null } = { data: null };

export function useDepartments(): UseDepartmentsResult {
  const [departments, setDepartments] = useState<Array<Department & { id: string }>>(
    deptCache.data ?? []
  );
  const [loading, setLoading] = useState(!deptCache.data);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const unsub = onSnapshot(
      query(departmentsRef(), orderBy("order", "asc")),
      (snap) => {
        const data = snap.docs.map((d) => ({ ...d.data(), id: d.id }));
        deptCache.data = data;
        setDepartments(data);
        setLoading(false);
      },
      (err: Error) => {
        setError(err.message);
        setLoading(false);
      }
    );
    return () => unsub();
  }, []);

  return { departments, loading, error };
}

// ── useCategories ─────────────────────────────────────────────────────────────

interface UseCategoriesResult {
  categories: Array<Category & { id: string }>;
  loading: boolean;
  error: string | null;
}

const catCache: { data: Array<Category & { id: string }> | null } = { data: null };

export function useCategories(): UseCategoriesResult {
  const [categories, setCategories] = useState<Array<Category & { id: string }>>(
    catCache.data ?? []
  );
  const [loading, setLoading] = useState(!catCache.data);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (catCache.data) {
      setCategories(catCache.data);
      setLoading(false);
      return;
    }
    getDocs(query(categoriesRef(), orderBy("order", "asc")))
      .then((snap) => {
        const data = snap.docs.map((d) => ({ ...d.data(), id: d.id }));
        catCache.data = data;
        setCategories(data);
      })
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  return { categories, loading, error };
}

// ── usePerformances ───────────────────────────────────────────────────────────

interface UsePerformancesResult {
  performances: Array<Performance & { id: string }>;
  loading: boolean;
  error: string | null;
}

export function usePerformances(eventId: string | null | undefined): UsePerformancesResult {
  const [performances, setPerformances] = useState<Array<Performance & { id: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!eventId) {
      setLoading(false);
      setPerformances([]);
      return;
    }

    setLoading(true);
    const q = query(performancesRef(eventId), orderBy("order", "asc"));
    const unsub = onSnapshot(
      q,
      (snap) => {
        const data = snap.docs.map((d) => ({ ...d.data(), id: d.id }));
        setPerformances(data);
        setLoading(false);
      },
      (err: Error) => {
        setError(err.message);
        setLoading(false);
      }
    );
    return () => unsub();
  }, [eventId]);

  return { performances, loading, error };
}
