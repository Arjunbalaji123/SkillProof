import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthLayout } from '../layouts/AuthLayout';
import { PublicLayout } from '../layouts/PublicLayout';
import { AppLayout } from '../layouts/AppLayout';
import { ProtectedRoute } from './ProtectedRoute';
import { RoleRoute } from './RoleRoute';
import { GuestOnlyRoute } from './GuestOnlyRoute';

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
import { PublicPortfolioPage } from '../pages/PublicPortfolioPage';
import { LeaderboardPage } from '../pages/LeaderboardPage';
import { BookmarksPage } from '../pages/BookmarksPage';
import { NotFoundPage } from '../pages/NotFoundPage';
import { UnauthorizedPage, ForbiddenPage, InternalServerErrorPage } from '../pages/ErrorPages';

export const AppRoutes: React.FC = () => {
  return (
    <Routes>
      {/* 1. Auth Layout with GuestOnlyRoute Guards */}
      <Route element={<AuthLayout />}>
        <Route
          path="/login"
          element={
            <GuestOnlyRoute>
              <LoginPage />
            </GuestOnlyRoute>
          }
        />
        <Route
          path="/register"
          element={
            <GuestOnlyRoute>
              <RegisterPage />
            </GuestOnlyRoute>
          }
        />
      </Route>

      {/* 2. Public Layout Routes with Navbar & Footer */}
      <Route element={<PublicLayout />}>
        <Route path="/" element={<LandingPage />} />
        <Route path="/leaderboard" element={<LeaderboardPage />} />
        <Route path="/developer/:username" element={<PublicPortfolioPage />} />
        <Route path="/u/:username" element={<PublicPortfolioPage />} />
        <Route path="/portfolio/:username" element={<PublicPortfolioPage />} />
        <Route path="/recruiters/developers" element={<RecruiterDashboard />} />
      </Route>

      {/* 3. Authenticated App Layout Routes with ProtectedRoute & RoleRoute Guards */}
      <Route
        element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }
      >
        {/* Developer Dashboard & Capabilities */}
        <Route
          path="/dashboard"
          element={
            <RoleRoute allowedRoles={['DEVELOPER', 'ADMIN']}>
              <DeveloperDashboard />
            </RoleRoute>
          }
        />
        <Route path="/profile" element={<EditProfilePage />} />
        <Route
          path="/skills"
          element={
            <RoleRoute allowedRoles={['DEVELOPER', 'ADMIN']}>
              <SkillsManagerPage />
            </RoleRoute>
          }
        />
        <Route
          path="/projects"
          element={
            <RoleRoute allowedRoles={['DEVELOPER', 'ADMIN']}>
              <ProjectsPage />
            </RoleRoute>
          }
        />
        <Route
          path="/assessments"
          element={
            <RoleRoute allowedRoles={['DEVELOPER', 'ADMIN']}>
              <AssessmentsListPage />
            </RoleRoute>
          }
        />
        <Route
          path="/assessments/:id/take"
          element={
            <RoleRoute allowedRoles={['DEVELOPER', 'ADMIN']}>
              <AssessmentPlayerPage />
            </RoleRoute>
          }
        />
        <Route
          path="/assessments/:id/play"
          element={
            <RoleRoute allowedRoles={['DEVELOPER', 'ADMIN']}>
              <AssessmentPlayerPage />
            </RoleRoute>
          }
        />

        {/* Recruiter Routes */}
        <Route
          path="/recruiters/bookmarks"
          element={
            <RoleRoute allowedRoles={['RECRUITER', 'ADMIN']}>
              <BookmarksPage />
            </RoleRoute>
          }
        />

        {/* Admin Console Route */}
        <Route
          path="/admin"
          element={
            <RoleRoute allowedRoles={['ADMIN']}>
              <AdminDashboard />
            </RoleRoute>
          }
        />
      </Route>

      {/* Legacy v1 /verifications Redirect to /skills */}
      <Route path="/verifications" element={<Navigate to="/skills" replace />} />

      {/* Error Pages */}
      <Route path="/401" element={<UnauthorizedPage />} />
      <Route path="/403" element={<ForbiddenPage />} />
      <Route path="/500" element={<InternalServerErrorPage />} />

      {/* Catch-all Fallback */}
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
};

export { AuthLayout, PublicLayout, AppLayout, GuestOnlyRoute, ProtectedRoute, RoleRoute };
export default AppRoutes;
