import type { Category } from "@/lib/api/contracts";

const baseCategory: Category = {
  id: "category-fixture-id",
  name: "Fixture Category",
};

export const buildCategory = (overrides: Partial<Category> = {}): Category => ({
  ...baseCategory,
  ...overrides,
});

// Hand-written deterministic list (small and fixed — no faker needed for 3 items).
export const buildCategoryList = (): Category[] => [
  buildCategory({ id: "category-fixture-id-1", name: "Music" }),
  buildCategory({ id: "category-fixture-id-2", name: "Gaming" }),
  buildCategory({ id: "category-fixture-id-3", name: "Education" }),
];
