import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';

export  function RoleBasedRedirect() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const hasRedirected = useRef(false);

  useEffect(() => {
    if (!user || hasRedirected.current) {
      return;
    }

    hasRedirected.current = true;
    
    switch (user.role?.toLowerCase()) {
      case 'warehouse':
      case 'wh':
        navigate('/my-orders');
        break;
      case 'orders_closer':
        navigate('/close-orders');
        break;
      default:
        navigate('/unauthorized');
    }
  }, [user?.role, navigate]);

  return null; // Nessun contenuto, solo redirect
}
