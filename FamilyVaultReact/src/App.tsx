import React from 'react';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import Home from './components/Home';
import Login from './components/Login';
import UploadPhoto from './components/UploadPhoto';
import ProtectedRoute from './components/ProtectedRoute'; // Ensure this is correctly imported

const router = createBrowserRouter([
  {
    path: "/",
    element: <ProtectedRoute />,
    children: [
      { path: "/", element: <Home /> },
      { path: "upload-photo", element: <UploadPhoto /> }
    ]
  },
  {
    path: "/login",
    element: <Login />
  }
]);

const App: React.FC = () => {
  return (
    <RouterProvider router={router} />
  );
};

export default App;
