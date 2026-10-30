import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// Persist ke localStorage supaya pilihan tema tidak kembali ke light tiap
// launch. Rehidrasi localStorage sinkron, jadi main.jsx tetap bisa membaca
// getState().theme saat boot.
export const useThemeStore = create(
  persist(
    (set) => ({
      theme: 'light',
      toggleTheme: () => set((state) => {
        const newTheme = state.theme === 'dark' ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', newTheme);
        return { theme: newTheme };
      }),
      setTheme: (theme) => {
        document.documentElement.setAttribute('data-theme', theme);
        set({ theme });
      }
    }),
    { name: 'drawindb-theme' }
  )
);
