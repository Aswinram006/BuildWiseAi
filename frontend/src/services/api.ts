// API Client Service for BuildWise AI

const API_BASE = '/api/v1';

// Get token from localStorage
export const getAuthToken = (): string | null => {
  return localStorage.getItem('token');
};

// Set token in localStorage
export const setAuthToken = (token: string) => {
  localStorage.setItem('token', token);
};

// Clear authentication state
export const logoutUser = () => {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
};

// Fetch helper with auth header
async function request<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getAuthToken();
  const headers = new Headers(options.headers || {});
  
  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  // Set default Content-Type if not sending FormData
  if (!(options.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    if (response.status === 401 && !endpoint.includes('/auth/login')) {
      logoutUser();
      window.location.href = '/login';
    }
    let errorMsg = 'An unexpected error occurred';
    try {
      const errorData = await response.json();
      errorMsg = errorData.detail || errorMsg;
    } catch (_) {}
    throw new Error(errorMsg);
  }

  // Check 204 status (no content)
  if (response.status === 204) {
    return {} as T;
  }

  return response.json();
}

// --- Interfaces & Types ---
export interface User {
  id: number;
  email: string;
  full_name: string;
  role: string;
  is_active: boolean;
  is_verified: boolean;
  company_id: number | null;
  created_at: string;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  user: User;
}

export interface Project {
  id: number;
  name: string;
  description: string;
  start_date: string;
  end_date: string;
  budget: number;
  status: 'active' | 'delayed' | 'completed';
  company_id: number;
  created_at: string;
  client_name?: string;
  location?: string;
  building_type?: string;
  floors?: number;
  material_quality?: string;
  blueprint_path?: string;
  assigned_pm_id?: number | null;
  assigned_engineer_id?: number | null;
}

export interface Task {
  id: number;
  name: string;
  description: string;
  start_date: string;
  end_date: string;
  status: 'pending' | 'in_progress' | 'completed';
  priority: 'low' | 'medium' | 'high';
  project_id: number;
  assigned_to: number | null;
  assignee?: { id: number; full_name: string; email: string; role: string } | null;
  created_at: string;
}

export interface Milestone {
  id: number;
  name: string;
  description: string;
  due_date: string;
  status: 'pending' | 'achieved';
  project_id: number;
  created_at: string;
}

export interface Budget {
  id: number;
  project_id: number;
  category: 'material' | 'labor' | 'equipment' | 'permits' | 'overhead';
  allocated: number;
  spent: number;
  created_at: string;
}

export interface Supplier {
  id: number;
  name: string;
  contact_name: string;
  email: string;
  phone: string;
  created_at: string;
}

export interface Material {
  id: number;
  name: string;
  category: string;
  unit: string;
  unit_price: number;
  supplier_id: number | null;
  supplier?: Supplier | null;
  created_at: string;
}

export interface Inventory {
  id: number;
  project_id: number;
  material_id: number;
  quantity_available: number;
  quantity_reserved: number;
  min_required: number;
  created_at: string;
  material?: Material | null;
}

export interface Worker {
  id: number;
  name: string;
  role: string;
  hourly_rate: number;
  project_id: number | null;
  status: 'active' | 'inactive';
  created_at: string;
}

export interface Equipment {
  id: number;
  name: string;
  type: string;
  daily_rate: number;
  status: 'available' | 'in_use' | 'maintenance';
  project_id: number | null;
  created_at: string;
}

export interface CostEstimateInput {
  project_id: number;
  building_area_sqft: number;
  standard_of_finish: 'economy' | 'standard' | 'luxury';
  local_labor_index: number;
}

export interface CostEstimateResponse {
  project_id: number;
  material_estimate: number;
  labor_estimate: number;
  equipment_estimate: number;
  permits_and_overhead: number;
  total_estimated_cost: number;
  recommendations: string[];
}

export interface RiskPredictionResponse {
  project_id: number;
  overall_risk_score: number;
  risk_level: 'Low' | 'Medium' | 'High';
  breakdown: {
    schedule_delay_risk: number;
    budget_overrun_risk: number;
    material_shortage_risk: number;
    equipment_failure_risk: number;
  };
  confidence: number;
  recommendations: string[];
}

export interface BlueprintAnalysisResponse {
  image_url: string;
  dimensions: string;
  rooms: Array<{ name: string; x: number; y: number; w: number; h: number; area_sqft: number }>;
  doors: Array<{ id: number; x: number; y: number; w: number; h: number }>;
  windows: Array<{ id: number; x: number; y: number; w: number; h: number }>;
  walls_detected: number;
  measurements: Array<{ label: string; value: string }>;
}

export interface SiteInspectionResponse {
  image_url: string;
  findings: Array<{ type: 'compliance' | 'hazard'; label: string; status: string }>;
  safety_score: number;
  inspection_summary: string;
}

export interface DocumentResponse {
  id: number;
  name: string;
  file_path: string;
  file_type: 'contract' | 'invoice' | 'report' | 'drawing';
  ocr_text: string;
  summary: string;
  extraction_results: Record<string, any>;
  project_id: number;
  uploaded_by: number;
  created_at: string;
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface ChatResponse {
  response: string;
}

export interface ReportResponse {
  id: number;
  project_id: number;
  report_type: 'daily' | 'weekly' | 'monthly' | 'safety' | 'budget' | 'blueprint';
  content: string;
  created_at: string;
  generated_by: number | null;
}

export interface PDFReportResponse {
  report_id: number;
  report_type: string;
  pdf_url: string;
  summary: string;
}

// --- API Service Object ---
export const api = {
  auth: {
    login: (body: Record<string, any>) =>
      request<AuthResponse>('/auth/login', {
        method: 'POST',
        body: JSON.stringify(body),
      }),
    register: (body: Record<string, any>) =>
      request<User>('/auth/register', {
        method: 'POST',
        body: JSON.stringify(body),
      }),
    getMe: () => request<User>('/auth/me'),
    listUsers: () => request<User[]>('/auth/users'),
    updateMe: (body: Record<string, any>) =>
      request<User>('/auth/me', {
        method: 'PUT',
        body: JSON.stringify(body),
      }),
    forgotPassword: (email: string) =>
      request<{ message: string }>('/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify({ email }),
      }),
  },
  
  projects: {
    list: (params: { status?: string; search?: string } = {}) => {
      const q = new URLSearchParams(params as Record<string, string>).toString();
      return request<Project[]>(`/projects/?${q}`);
    },
    create: (body: Partial<Project>) =>
      request<Project>('/projects/', {
        method: 'POST',
        body: JSON.stringify(body),
      }),
    createWithBlueprint: (formData: FormData) =>
      request<{ project: Project; blueprint_analysis: any }>('/projects/create-with-blueprint/upload', {
        method: 'POST',
        body: formData,
      }),
    getBlueprintAnalysis: (projectId: number) =>
      request<any>(`/projects/${projectId}/blueprint-analysis`),
    uploadBlueprint: (projectId: number, formData: FormData) =>
      request<{ project: Project; blueprint_analysis: any }>(`/projects/${projectId}/blueprint-analysis/upload`, {
        method: 'POST',
        body: formData,
      }),
    reanalyzeBlueprint: (projectId: number) =>
      request<any>(`/projects/${projectId}/blueprint-analysis/reanalyze`, {
        method: 'POST',
      }),
    get: (id: number) => request<Project>(`/projects/${id}`),
    update: (id: number, body: Partial<Project>) =>
      request<Project>(`/projects/${id}`, {
        method: 'PUT',
        body: JSON.stringify(body),
      }),
    delete: (id: number) =>
      request<void>(`/projects/${id}`, {
        method: 'DELETE',
      }),
    
    // Tasks
    listTasks: (projectId: number, params: { status?: string } = {}) => {
      const q = new URLSearchParams(params as Record<string, string>).toString();
      return request<Task[]>(`/projects/${projectId}/tasks?${q}`);
    },
    createTask: (projectId: number, body: Partial<Task>) =>
      request<Task>(`/projects/${projectId}/tasks`, {
        method: 'POST',
        body: JSON.stringify(body),
      }),
    updateTask: (taskId: number, body: Partial<Task>) =>
      request<Task>(`/projects/tasks/${taskId}`, {
        method: 'PUT',
        body: JSON.stringify(body),
      }),
      
    // Milestones
    listMilestones: (projectId: number) =>
      request<Milestone[]>(`/projects/${projectId}/milestones`),
    createMilestone: (projectId: number, body: Partial<Milestone>) =>
      request<Milestone>(`/projects/${projectId}/milestones`, {
        method: 'POST',
        body: JSON.stringify(body),
      }),
    updateMilestone: (milestoneId: number, body: Partial<Milestone>) =>
      request<Milestone>(`/projects/milestones/${milestoneId}`, {
        method: 'PUT',
        body: JSON.stringify(body),
      }),

    // Budgets
    listBudgets: (projectId: number) =>
      request<Budget[]>(`/projects/${projectId}/budgets`),
    createBudget: (projectId: number, body: Partial<Budget>) =>
      request<Budget>(`/projects/${projectId}/budgets`, {
        method: 'POST',
        body: JSON.stringify(body),
      }),
    updateBudget: (budgetId: number, body: Partial<Budget>) =>
      request<Budget>(`/projects/budgets/${budgetId}`, {
        method: 'PUT',
        body: JSON.stringify(body),
      }),
  },

  resources: {
    // Inventory
    listInventory: (projectId: number) =>
      request<Inventory[]>(`/resources/projects/${projectId}/inventory`),
    updateInventory: (id: number, body: Partial<Inventory>) =>
      request<Inventory>(`/resources/inventory/${id}`, {
        method: 'PUT',
        body: JSON.stringify(body),
      }),
    addInventory: (body: Partial<Inventory>) =>
      request<Inventory>('/resources/inventory', {
        method: 'POST',
        body: JSON.stringify(body),
      }),
      
    // Materials & Suppliers
    listMaterials: () => request<Material[]>('/resources/materials'),
    listSuppliers: () => request<Supplier[]>('/resources/suppliers'),
    
    // Workers
    listWorkers: (projectId: number) =>
      request<Worker[]>(`/resources/projects/${projectId}/workers`),
    createWorker: (body: Partial<Worker>) =>
      request<Worker>('/resources/workers', {
        method: 'POST',
        body: JSON.stringify(body),
      }),
    updateWorker: (id: number, body: Partial<Worker>) =>
      request<Worker>(`/resources/workers/${id}`, {
        method: 'PUT',
        body: JSON.stringify(body),
      }),

    // Equipment
    listEquipment: (projectId: number) =>
      request<Equipment[]>(`/resources/projects/${projectId}/equipment`),
    createEquipment: (body: Partial<Equipment>) =>
      request<Equipment>('/resources/equipment', {
        method: 'POST',
        body: JSON.stringify(body),
      }),
    updateEquipment: (id: number, body: Partial<Equipment>) =>
      request<Equipment>(`/resources/equipment/${id}`, {
        method: 'PUT',
        body: JSON.stringify(body),
      }),
  },

  ai: {
    costEstimate: (body: CostEstimateInput) =>
      request<CostEstimateResponse>('/ai/cost-estimate', {
        method: 'POST',
        body: JSON.stringify(body),
      }),
    getCostEstimate: (projectId: number) =>
      request<CostEstimateResponse>(`/ai/cost-estimate/${projectId}`),
    riskPredict: (projectId: number) =>
      request<RiskPredictionResponse>(`/ai/risk-prediction/${projectId}`),
    chat: (projectId: number, message: string, history: ChatMessage[] = []) =>
      request<ChatResponse>('/ai/chat', {
        method: 'POST',
        body: JSON.stringify({ project_id: projectId, message, history }),
      }),
  },

  vision: {
    analyzeBlueprint: (formData: FormData) =>
      request<BlueprintAnalysisResponse>('/vision/blueprint', {
        method: 'POST',
        body: formData,
      }),
    inspectSite: (formData: FormData) =>
      request<SiteInspectionResponse>('/vision/inspect', {
        method: 'POST',
        body: formData,
      }),
  },

  documents: {
    upload: (formData: FormData) =>
      request<DocumentResponse>('/documents/upload', {
        method: 'POST',
        body: formData,
      }),
    list: (projectId: number, fileType?: string) => {
      const q = fileType ? `?file_type=${fileType}` : '';
      return request<DocumentResponse[]>(`/documents/${q}${fileType ? '&' : '?'}project_id=${projectId}`);
    },
    search: (projectId: number, query: string) =>
      request<DocumentResponse[]>(`/documents/search?project_id=${projectId}&q=${encodeURIComponent(query)}`),
  },

  reports: {
    list: (projectId: number) =>
      request<ReportResponse[]>(`/reports/?project_id=${projectId}`),
    generate: (projectId: number, reportType: string) =>
      request<PDFReportResponse>(`/reports/generate?project_id=${projectId}&report_type=${reportType}`, {
        method: 'POST',
      }),
    create: (projectId: number, reportType: string, content: string) =>
      request<ReportResponse>('/reports/', {
        method: 'POST',
        body: JSON.stringify({ project_id: projectId, report_type: reportType, content }),
      }),
    listNotifications: () =>
      request<any[]>('/reports/notifications'),
    markNotificationRead: (notificationId: number) =>
      request<any>(`/reports/notifications/${notificationId}/read`, {
        method: 'PUT',
      }),
  },
};
