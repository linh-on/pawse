import React, { createContext, useContext } from "react";
import { usePawseBox as usePawseBoxHook } from "../hooks/usePawseBox";

const PawseBoxContext = createContext(null);

export function PawseBoxProvider({ children }) {
  const box = usePawseBoxHook();
  return (
    <PawseBoxContext.Provider value={box}>{children}</PawseBoxContext.Provider>
  );
}

export function usePawseBox() {
  const ctx = useContext(PawseBoxContext);
  if (!ctx) {
    throw new Error("usePawseBox must be used within <PawseBoxProvider>");
  }
  return ctx;
}
