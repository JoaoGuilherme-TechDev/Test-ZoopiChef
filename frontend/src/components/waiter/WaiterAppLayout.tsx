import { Outlet } from 'react-router-dom';

/**
 * Layout wrapper for the Waiter PWA app.
 * Security layer removed - no more PIN dialogs.
 */
export function WaiterAppLayout() {
  return <Outlet />;
}
