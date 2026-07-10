import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext';
import { AuthProvider } from './context/AuthContext';
import { ProjectProvider } from './context/ProjectContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Layout } from './components/Layout';

// Pages
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { Dashboard } from './pages/Dashboard';
import { Projects } from './pages/Projects';
import { Materials } from './pages/Materials';
import { CostEstimation } from './pages/CostEstimation';
import { RiskPrediction } from './pages/RiskPrediction';
import { BlueprintAnalysis } from './pages/BlueprintAnalysis';
import { SiteInspection } from './pages/SiteInspection';
import { DocumentIntelligence } from './pages/DocumentIntelligence';
import { AIAssistant } from './pages/AIAssistant';
import { Reports } from './pages/Reports';

function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          <ProjectProvider>
            <Routes>
              {/* Public Routes */}
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />

              {/* Protected Workspace Layout */}
              <Route 
                path="/" 
                element={
                  <ProtectedRoute>
                    <Layout />
                  </ProtectedRoute>
                }
              >
                {/* Child Modules */}
                <Route index element={<Dashboard />} />
                <Route path="projects" element={<Projects />} />
                <Route path="materials" element={<Materials />} />
                <Route path="cost-estimation" element={<CostEstimation />} />
                <Route path="risk-prediction" element={<RiskPrediction />} />
                <Route 
                  path="blueprint-analysis" 
                  element={
                    <ProtectedRoute allowedRoles={['Administrator', 'Company Owner', 'Project Manager', 'Site Engineer']}>
                      <BlueprintAnalysis />
                    </ProtectedRoute>
                  } 
                />
                <Route path="site-inspection" element={<SiteInspection />} />
                <Route path="document-intelligence" element={<DocumentIntelligence />} />
                <Route path="assistant" element={<AIAssistant />} />
                <Route path="reports" element={<Reports />} />
              </Route>

              {/* Redirect any other routes back to dashboard */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </ProjectProvider>
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}

export default App;
