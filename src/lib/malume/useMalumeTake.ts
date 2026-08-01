import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getMalumeTake } from "./ai.functions";

/**
 * Fetches Malume's take from the model, falling back to the locally written
 * line while it loads or if the model is unavailable.
 */
export function useMalumeTake(facts: string, fallback: string, enabled = true) {
  const call = useServerFn(getMalumeTake);
  const query = useQuery({
    queryKey: ["malume-take", facts],
    queryFn: () => call({ data: { facts, fallback } }),
    enabled: enabled && facts.length > 0,
    staleTime: 5 * 60 * 1000,
    retry: false,
  });

  return {
    text: query.data?.malume_take || fallback,
    source: query.data?.source ?? "local",
    isLoading: query.isFetching,
  };
}
