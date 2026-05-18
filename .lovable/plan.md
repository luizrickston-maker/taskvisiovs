I will optimize the application performance by implementing the following improvements:

### 1. Route Optimization
*   Update `src/App.tsx` to use `prefetch` patterns for core routes.
*   Optimize `Suspense` fallbacks to be more lightweight.

### 2. Data Loading Optimization
*   Refactor `src/hooks/useInitializeData.ts` to:
    *   Prioritize only the absolute minimum data needed for the current route.
    *   Implement smarter caching using `localStorage` for semi-static data (like categories).
    *   Parallelize secondary data loading more aggressively.
*   Optimize `src/hooks/useRealtimeSync.ts` to use a single channel with multiple listeners (already mostly done, but can be refined).

### 3. Component Performance
*   Implement `React.memo` on heavy list components (Tasks, Projects).
*   Add virtualization for long lists if detected.
*   Optimize image loading using modern formats and lazy attributes.

### 4. Bundle Size
*   Identify and extract large dependencies into separate chunks.
*   Clean up unused imports and consolidate utility functions.

### Technical Details:
- **Prioritized Loading**: Only fetch data for the active dashboard immediately.
- **Cache Strategy**: Use `stale-while-revalidate` pattern for the global store.
- **Vite Tuning**: Adjust build options for better chunking.
