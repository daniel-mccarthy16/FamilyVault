import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useGlobalContext } from '../context/authContext';

//TODO - maybe use the sdk instead to determine if the user is authenticated, it looks like the sdk is already storing tokens in local storage anyways..
const ProtectedRoute = () => {

  const { state } = useGlobalContext();
  const { idToken } = state.authState;

  if (!idToken) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
};

export default ProtectedRoute;
