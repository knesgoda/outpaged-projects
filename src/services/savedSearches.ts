// Saved searches service - not fully implemented

export type SavedSearch = {
  id: string;
  name: string;
  query: string;
  filters: Record<string, unknown>;
  created_at: string;
};

export const listSavedSearches = async (): Promise<SavedSearch[]> => {
  console.warn('Saved searches not implemented');
  return [];
};

export const createSavedSearch = async (_input: any): Promise<SavedSearch> => {
  console.warn('Saved searches not implemented');
  return {} as SavedSearch;
};

export const deleteSavedSearch = async (_id: string): Promise<void> => {
  console.warn('Saved searches not implemented');
};
