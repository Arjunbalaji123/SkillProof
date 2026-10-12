import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { ProtectedRoute } from './ProtectedRoute';
import { LandingPage } from '../pages/LandingPage';
import { LoginPage } from '../pages/LoginPage';
import { RegisterPage } from '../pages/RegisterPage';
import { DeveloperDashboard } from '../pages/DeveloperDashboard';
import { RecruiterDashboard } from '../pages/RecruiterDashboard';
import { AdminDashboard } from '../pages/AdminDashboard';
import { EditProfilePage } from '../pages/EditProfilePage';
import { SkillsManagerPage } from '../pages/SkillsManagerPage';
import { ProjectsPage } from '../pages/ProjectsPage';
import { AssessmentsListPage } from '../pages/AssessmentsListPage';
import { AssessmentPlayerPage } from '../pages/AssessmentPlayerPage';
import { VerificationsPage } from '../pages/VerificationsPage';
import { PublicPortfolioPage } from '../pages/PublicPortfolioPage';
import { BookmarksPage } from '../pages/BookmarksPage';

export const AppRoutes: React.FC = () => {
  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/developer/:username" element={<PublicPortfolioPage />} />
      <Route path="/recruiters/developers" element={<RecruiterDashboard />} />

      {/* Developer Routes */}
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute allowedRoles={['DEVELOPER', 'ADMIN']}>
            <DeveloperDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/profile"
        element={
          <ProtectedRoute>
            <EditProfilePage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/skills"
        element={
          <ProtectedRoute allowedRoles={['DEVELOPER', 'ADMIN']}>
            <SkillsManagerPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/projects"
        element={
          <ProtectedRoute allowedRoles={['DEVELOPER', 'ADMIN']}>
            <ProjectsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/assessments"
        element={
          <ProtectedRoute allowedRoles={['DEVELOPER', 'ADMIN']}>
            <AssessmentsListPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/assessments/:id/play"
        element={
          <ProtectedRoute allowedRoles={['DEVELOPER', 'ADMIN']}>
            <AssessmentPlayerPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/verifications"
        element={
          <ProtectedRoute allowedRoles={['DEVELOPER', 'ADMIN']}>
            <VerificationsPage />
          </ProtectedRoute>
        }
      />

      {/* Recruiter Routes */}
      <Route
        path="/recruiters/bookmarks"
        element={
          <ProtectedRoute allowedRoles={['RECRUITER', 'ADMIN']}>
            <BookmarksPage />
          </ProtectedRoute>
        }
      />

      {/* Admin Routes */}
      <Route
        path="/admin"
        element={
          <ProtectedRoute allowedRoles={['ADMIN']}>
            <AdminDashboard />
          </ProtectedRoute>
        }
      />

      {/* Catch-all Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

