"use client";

import * as React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useApi } from "@/hooks/use-api";
import { useSound } from "@/hooks/use-sound";

/**
 * Ritual tracking hook — manages the 4-step daily ritual:
 * 1. Cleanse (frequency session)
 * 2. Manifest (goal confirmation)
 * 3. Ask the cards (tarot reading) — OPTIONAL
 * 4. Balance (frequency session after reading)
 *
 * Steps 1, 2, 4 are required for ritual completion.
 * Includes: ritual completion callback, streak freeze, transition sounds.
 */

export type RitualStep = 1 | 2 | 3 | 4;

export function useRitual() {
  const api = useApi();
  const qc = useQueryClient();
  const sound = useSound();
  const [completionCallback, setCompletionCallback] = React.useState<((streak: number) => void) | null>(null);

  const { data } = useQuery({
    queryKey: ["ritual"],
    queryFn: async () => (await api("/api/ritual")).json(),
    refetchOnWindowFocus: true,
    refetchInterval: 8000,
    staleTime: 5000,
  });

  const completeStep = useMutation({
    mutationFn: async (step: RitualStep) =>
      (await api("/api/ritual", { method: "POST", body: JSON.stringify({ step }) })).json(),
    onSuccess: (res: any) => {
      qc.invalidateQueries({ queryKey: ["ritual"] });
      if (res.justCompleted) {
        sound("chime");
        // Trigger the completion celebration callback
        if (completionCallback) {
          completionCallback(res.streak ?? 1);
        }
      } else {
        // Play a soft transition sound when a step is completed (but ritual not done yet)
        sound("tap");
      }
    },
  });

  const ritual: {
    step1Cleanse: boolean;
    step2Manifest: boolean;
    step3Tarot: boolean;
    step4Balance: boolean;
    completed: boolean;
  } = data?.today || { step1Cleanse: false, step2Manifest: false, step3Tarot: false, step4Balance: false, completed: false };

  const streak = data?.streak ?? 0;
  const freezesAvailable = data?.freezesAvailable ?? 1;

  // onRitualComplete must be stable (useCallback) to prevent infinite re-render
  // loops in the Page component's useEffect that depends on it.
  const onRitualComplete = React.useCallback((cb: (streak: number) => void) => {
    setCompletionCallback(() => cb);
  }, []);

  return {
    ritual,
    streak,
    freezesAvailable,
    markStep: (step: RitualStep) => {
      const fieldMap: Record<number, keyof typeof ritual> = {
        1: "step1Cleanse",
        2: "step2Manifest",
        3: "step3Tarot",
        4: "step4Balance",
      };
      if (!ritual[fieldMap[step]]) {
        completeStep.mutate(step);
      }
    },
    onRitualComplete,
  };
}
