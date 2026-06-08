import { useCallback, useEffect, useRef, useState } from "react";

/* eslint-disable @typescript-eslint/no-explicit-any */
type SR = any;

export type SpeechLang = "en-US" | "hi-IN";

export function useSpeechRecognition(opts: { lang: SpeechLang; onFinal: (text: string) => void }) {
  const { lang, onFinal } = opts;
  const [listening, setListening] = useState(false);
  const [interim, setInterim] = useState("");
  const [supported, setSupported] = useState(true);
  const recRef = useRef<SR | null>(null);
  const finalRef = useRef("");

  useEffect(() => {
    const Ctor: SR | undefined =
      (typeof window !== "undefined" && ((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition)) || undefined;
    if (!Ctor) {
      setSupported(false);
      return;
    }
    const rec: SR = new Ctor();
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = lang;
    rec.onresult = (e: any) => {
      let interimStr = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i];
        if (r.isFinal) finalRef.current += r[0].transcript;
        else interimStr += r[0].transcript;
      }
      setInterim(interimStr);
    };
    rec.onerror = () => setListening(false);
    rec.onend = () => {
      setListening(false);
      const text = (finalRef.current + " " + interim).trim();
      finalRef.current = "";
      setInterim("");
      if (text) onFinal(text);
    };
    recRef.current = rec;
    return () => {
      try {
        rec.stop();
      } catch {
        /* noop */
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lang]);

  const start = useCallback(() => {
    if (!recRef.current || listening) return;
    finalRef.current = "";
    setInterim("");
    try {
      recRef.current.start();
      setListening(true);
    } catch {
      /* already started */
    }
  }, [listening]);

  const stop = useCallback(() => {
    if (!recRef.current) return;
    try {
      recRef.current.stop();
    } catch {
      /* noop */
    }
  }, []);

  return { listening, interim, supported, start, stop };
}

export function speak(text: string, lang: SpeechLang = "en-US") {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
  try {
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = lang;
    u.rate = 1.0;
    u.pitch = 1.0;
    window.speechSynthesis.speak(u);
  } catch {
    /* noop */
  }
}
