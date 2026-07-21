import { createBrowserRouter, Navigate } from 'react-router-dom';
import { RoleGate } from './RoleGate';
import { LoginScreen } from '@/features/shared/LoginScreen';
import { ParentApp } from '@/features/parent/ParentApp';
import { TeacherApp } from '@/features/teacher/TeacherApp';

// Route table (DEVELOPMENT.md §9). Parent/teacher sub-tabs are handled inside each app shell
// for P0; nested routes (/p/contact, /t/leaves, /join/:code, …) are added in P1+.
export const router = createBrowserRouter([
  { path: '/', element: <Navigate to="/login" replace /> },
  { path: '/login', element: <LoginScreen /> },
  {
    path: '/p/*',
    element: (
      <RoleGate allow="parent">
        <ParentApp />
      </RoleGate>
    ),
  },
  {
    path: '/t/*',
    element: (
      <RoleGate allow="teacher">
        <TeacherApp />
      </RoleGate>
    ),
  },
  { path: '*', element: <Navigate to="/login" replace /> },
]);
