"use client";

import { useRef, useState } from "react";
import { flushSync } from "react-dom";
import { useReactToPrint } from "react-to-print";

/** Impression navigateur avec choix « avec / sans entête ». */
export function useImpression() {
  const ref = useRef<HTMLDivElement>(null);
  const [avecEntete, setAvecEntete] = useState(true);
  const print = useReactToPrint({ contentRef: ref });

  const imprimer = (avec: boolean) => {
    flushSync(() => setAvecEntete(avec));
    print();
  };

  return { ref, avecEntete, setAvecEntete, imprimer };
}
