import { useEffect, useState } from "react";

export function useScrolled(threshold = 24) {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    // The portfolio scrolls inside #app-scroll (not the window), so listen there
    // and fall back to the window (e.g. admin route / prerender).
    const el = document.getElementById("app-scroll");
    const target = el || window;
    const on = () => setScrolled((el ? el.scrollTop : window.scrollY) > threshold);
    on();
    target.addEventListener("scroll", on, { passive: true });
    return () => target.removeEventListener("scroll", on);
  }, [threshold]);
  return scrolled;
}
