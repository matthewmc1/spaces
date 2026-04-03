import {
  useQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import {
  listCards,
  createCard,
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
    }) => moveCard(spaceId, cardId, input),
    onMutate: async ({ cardId, input }) => {
      await queryClient.cancelQueries({ queryKey: ["cards", spaceId] });
      const previousCards = queryClient.getQueryData<Card[]>(["cards", spaceId]);
      queryClient.setQueryData<Card[]>(["cards", spaceId], (old) => {
        if (!old) return old;
        return old.map((card) =>
          card.id === cardId
            ? { ...card, column_name: input.column, position: input.position }
            : card
        );
      });
      return { previousCards };
    },
    onError: (_err, _vars, context) => {
      if (context?.previousCards) {
        queryClient.setQueryData(["cards", spaceId], context.previousCards);
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
    mutationFn: (cardId: string) => deleteCard(spaceId, cardId),
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
