import {
  useQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import {
  listCards,
  createCard,
  updateCard,
  moveCard,
  deleteCard,
} from "@/lib/api/cards";
import type { Card, Column, CreateCardInput, MoveCardInput } from "@/types/card";
import { COLUMNS } from "@/types/card";

export function useCards(spaceId: string) {
  return useQuery({
    queryKey: ["cards", spaceId],
    queryFn: () => listCards(spaceId),
    select: (data) => data.data,
    enabled: !!spaceId,
  });
}

export function useSpaceCardCounts(spaceIds: string[]) {
  return useQuery({
    queryKey: ["space-card-counts", ...spaceIds],
    queryFn: async () => {
      const results: Record<string, Card[]> = {};
      await Promise.all(
        spaceIds.map(async (id) => {
          const res = await listCards(id, { limit: 200 });
          results[id] = res.data;
        })
      );
      return results;
    },
    enabled: spaceIds.length > 0,
    staleTime: 60 * 1000,
  });
}

export function useUpdateCard(spaceId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ cardId, input }: { cardId: string; input: Partial<Card> }) =>
      updateCard(cardId, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cards", spaceId] });
    },
  });
}

export function useCreateCard(spaceId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateCardInput) => createCard(spaceId, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cards", spaceId] });
    },
  });
}

export function useMoveCard(spaceId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      cardId,
      input,
    }: {
      cardId: string;
      input: MoveCardInput;
    }) => moveCard(cardId, input),
    onMutate: async ({ cardId, input }) => {
      await queryClient.cancelQueries({ queryKey: ["cards", spaceId] });
      // Cache stores PaginatedResponse, not raw Card[]
      type CachedData = { data: Card[]; pagination: { next_cursor?: string; has_more: boolean } };
      const previous = queryClient.getQueryData<CachedData>(["cards", spaceId]);
      if (previous) {
        queryClient.setQueryData<CachedData>(["cards", spaceId], {
          ...previous,
          data: previous.data.map((card) =>
            card.id === cardId
              ? { ...card, column_name: input.column, position: input.position }
              : card
          ),
        });
      }
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(["cards", spaceId], context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["cards", spaceId] });
    },
  });
}

export function useDeleteCard(spaceId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (cardId: string) => deleteCard(cardId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cards", spaceId] });
    },
  });
}

export function cardsByColumn(cards: Card[]): Record<Column, Card[]> {
  const result = Object.fromEntries(
    COLUMNS.map(({ key }) => [key, [] as Card[]])
  ) as Record<Column, Card[]>;

  for (const card of cards) {
    if (result[card.column_name]) {
      result[card.column_name].push(card);
    }
  }

  for (const col of COLUMNS) {
    result[col.key].sort((a, b) => a.position - b.position);
  }

  return result;
}
