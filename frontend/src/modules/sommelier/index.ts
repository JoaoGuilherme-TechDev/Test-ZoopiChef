// Sommelier (Enólogo Virtual) Module - Isolated Entry Point
// Following SRP: Each export has a single responsibility

// Types
export * from './types';

// Services (Business Logic Layer - SSOT)
export * from './services';

// Hooks (State Management Layer)
export * from './hooks';

// Components (UI Layer)
export * from './components';

// Pages
export { default as PublicSommelierPage } from './pages/PublicSommelierPage';
export { default as PublicSommelierTotemPage } from './pages/PublicSommelierTotemPage';
