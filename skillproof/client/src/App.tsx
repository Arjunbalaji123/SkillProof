import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { AppRoutes } from './routes/AppRoutes';
import { Navbar } from './components/Navbar';
import { ErrorBoundary } from './components/ErrorBoundary';

export const App: React.FC = () => {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <AuthProvider>
          <div className="flex flex-col min-h-screen bg-[#F8FAFC] text-[#0F172A] font-sans">
            <Navbar />
            <main className="flex-1">
              <AppRoutes />
            </main>
          </div>
        </AuthProvider>
      </BrowserRouter>
    </ErrorBoundary>
  );
};

export default App;
