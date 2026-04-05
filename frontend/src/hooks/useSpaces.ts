import {
  useQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import {
  listSpaces,
  listAllSpaces,
  getSpace,
  getSpaceTree,
  createSpace,
  updateSpace,
  deleteSpace,
} from "@/lib/api/spaces";
import type { CreateSpaceInput, UpdateSpaceInput } from "@/types/space";

export function useSpaces() {
  return useQuery({
    queryKey: ["spaces"],
    queryFn: listSpaces,
  });
}

export function useAllSpaces() {
  return useQuery({
    queryKey: ["spaces", "all"],
    queryFn: listAllSpaces,
  });
}

export function useSpace(id: string) {
  return useQuery({
    queryKey: ["spaces", id],
    queryFn: () => getSpace(id),
    enabled: !!id,
  });
}

export function useSpaceTree(id: string) {
  return useQuery({
    queryKey: ["spaces", id, "tree"],
    queryFn: () => getSpaceTree(id),
    enabled: !!id,
  });
}

export function useCreateSpace() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateSpaceInput) => createSpace(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["spaces"] });
    },
  });
}

export function useUpdateSpace(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateSpaceInput) => updateSpace(id, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["spaces"] });
    },
  });
}

export function useDeleteSpace() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteSpace(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["spaces"] });
    },
  });
}
