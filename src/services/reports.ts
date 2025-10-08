// Reports service - not fully implemented

export const listReports = async (_projectId?: string): Promise<any[]> => {
  console.warn('Reports service not implemented');
  return [];
};

export const getReport = async (_id: string): Promise<any> => {
  console.warn('Reports service not implemented');
  return null;
};

export const createReport = async (_input: any): Promise<any> => {
  console.warn('Reports service not implemented');
  return {};
};

export const updateReport = async (_id: string, _patch: any): Promise<any> => {
  console.warn('Reports service not implemented');
  return {};
};

export const deleteReport = async (_id: string): Promise<void> => {
  console.warn('Reports service not implemented');
};

export const executeReport = async (_id: string, _params: any): Promise<any> => {
  console.warn('Reports service not implemented');
  return { rows: [], columns: [] };
};

export const runReport = async (_reportId: string, _filters?: any): Promise<any> => {
  console.warn('Reports service not implemented');
  return { rows: [], columns: [] };
};
