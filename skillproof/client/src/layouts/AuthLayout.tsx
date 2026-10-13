import React from 'react';
import { Outlet } from 'react-router-dom';

export const AuthLayout: React.FC = () => {
  return (
    <div className="min-h-screen bg-[#0F172A] flex flex-col justify-center">
      <Outlet />
    </div>
  );
};

export default AuthLayout;

