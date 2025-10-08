// Search service - not fully implemented

export const globalSearch = async (_query: string | any): Promise<any[]> => {
  console.warn('Search service not fully implemented');
  return [];
};

export const searchAll = async (_query: string | any): Promise<any> => {
  console.warn('Search service not fully implemented');
  return { tasks: [], projects: [], people: [] };
};

export const searchSuggest = async (_query: string | any): Promise<any[]> => {
  console.warn('Search service not fully implemented');
  return [];
};

export const searchTasks = async (_projectId: string, _query?: string): Promise<any[]> => {
  console.warn('Search service not fully implemented');
  return [];
};

export const searchProjects = async (_query: string | any): Promise<any[]> => {
  console.warn('Search service not fully implemented');
  return [];
};
