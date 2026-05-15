import { useState, useEffect, useRef } from 'react';

export function useTypewriter(text: string, speed = 18) {
  const [displayed, setDisplayed] = useState('');
  const indexRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!text) { setDisplayed(''); indexRef.current = 0; return; }

    // If text grew (streaming), continue from where we left off
    if (text.startsWith(displayed) && displayed.length < text.length) {
      timerRef.current = setInterval(() => {
        indexRef.current++;
        setDisplayed(text.slice(0, indexRef.current));
        if (indexRef.current >= text.length) {
          clearInterval(timerRef.current!);
        }
      }, speed);
    } else if (text !== displayed) {
      // Reset for new text
      indexRef.current = 0;
      setDisplayed('');
      timerRef.current = setInterval(() => {
        indexRef.current++;
        setDisplayed(text.slice(0, indexRef.current));
        if (indexRef.current >= text.length) {
          clearInterval(timerRef.current!);
        }
      }, speed);
    }

    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [text]);

  return displayed;
}
