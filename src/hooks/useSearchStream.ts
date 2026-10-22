import { useRef, useState, useCallback } from "react";
import { readSSE } from "../services/sse-reader";

export type SearchPhase = "search" | "review" | "verify" | "answer" | "";

export interface SearchSource {
  title: string;
  url: string;
  snippet?: string;
}

export const phaseLabels: Record<string, string> = {
  search: "نبحث في المصادر",
  review: "نراجع النتائج",
  verify: "نتحقق من بيانات المصادر",
  answer: "نحضّر الإجابة"
};

export function useSearchStream() {
  const [phase, setPhase] = useState<SearchPhase>("");
  const [answer, setAnswer] = useState<string>("");
  const [sources, setSources] = useState<SearchSource[]>([]);
  const [busy, setBusy] = useState<boolean>(false);
  const [error, setError] = useState<string>("");
  const controllerRef = useRef<AbortController | null>(null);

  const search = useCallback(async (query: string) => {
    controllerRef.current?.abort();

    const controller = new AbortController();
    controllerRef.current = controller;

    setBusy(true);
    setPhase("search");
    setAnswer("");
    setSources([]);
    setError("");

    try {
      const response = await fetch("/api/search-stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query }),
        signal: controller.signal
      });

      await readSSE(response, (event, data) => {
        if (event === "phase") setPhase(data.phase);

        if (event === "token") {
          setAnswer((previous) => previous + (data.text || ""));
        }

        if (event === "sources") {
          setSources(data.sources || []);
        }

        if (event === "error") {
          setError(data.message || "حدث خطأ أثناء البحث.");
        }

        if (event === "done") {
          setPhase("");
        }
      });
    } catch (err: any) {
      if (err.name !== "AbortError") {
        setError(err.message || "تعذّر الاتصال بالخادم.");
      }
    } finally {
      setBusy(false);
      setPhase("");
    }
  }, []);

  const cancel = useCallback(() => {
    controllerRef.current?.abort();
    setBusy(false);
    setPhase("");
  }, []);

  return {
    search,
    cancel,
    busy,
    phase,
    phaseLabel: (phase ? phaseLabels[phase] : "") || "",
    answer,
    sources,
    error
  };
}

export default useSearchStream;
