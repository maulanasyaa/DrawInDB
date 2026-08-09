import React, { useEffect } from 'react';
import { HashRouter, Routes, Route, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import Home from './pages/Home';
import Editor from './pages/Editor';
import ToastContainer from './components/Toast';
import { useVaultStore } from './store/vaultStore';
import { useEditorStore } from './store/editorStore';
import { useThemeStore } from './store/themeStore';
import { FiSun, FiMoon } from 'react-icons/fi';

function WindowTitleManager() {
  const location = useLocation();
  const currentVault = useVaultStore(state => state.currentVault);
  const diagramMeta = useEditorStore(state => state.diagramMeta);
  const isDirty = useEditorStore(state => state.isDirty);

  useEffect(() => {
    let title = 'DrawInDB';
    if (location.pathname === '/') {
      if (currentVault) {
        title = `DrawInDB — ${currentVault.name}`;
      }
    } else if (location.pathname.startsWith('/editor/')) {
      if (diagramMeta) {
        title = `${isDirty ? '• ' : ''}${diagramMeta.name} — DrawInDB`;
      }
    }
    
    if (window.api && window.api.setWindowTitle) {
      window.api.setWindowTitle(title);
    }
    document.title = title;
  }, [location, currentVault, diagramMeta, isDirty]);

  return null;
}

function GlobalUI() {
  const { theme, toggleTheme } = useThemeStore();
  
  return (
    <div className="fixed bottom-8 right-8 z-[1000] pointer-events-none">
      <button 
        onClick={toggleTheme}
        className="pointer-events-auto w-10 h-10 flex items-center justify-center text-muted hover:text-primary bg-surface border border-theme rounded-full shadow-lg transition-all active:scale-90 hover:border-focus hover:shadow-xl group"
        title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
      >
        <div className="transition-transform duration-300 group-hover:rotate-12">
          {theme === 'dark' ? <FiSun /> : <FiMoon />}
        </div>
      </button>
    </div>
  );
}

function AnimatedRoutes() {
  const location = useLocation();
  
  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="/" element={
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            style={{ translateZ: 0, willChange: 'opacity, transform' }}
            className="h-screen w-full"
          >
            <Home />
          </motion.div>
        } />
        <Route path="/editor/:filename" element={
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            style={{ translateZ: 0, willChange: 'opacity' }}
            className="h-screen w-full"
          >
            <Editor />
          </motion.div>
        } />
      </Routes>
    </AnimatePresence>
  );
}

function App() {
  return (
    <HashRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <WindowTitleManager />
      <GlobalUI />
      <div className="min-h-screen bg-base text-primary font-sans overflow-hidden">
        <AnimatedRoutes />
      </div>
      <ToastContainer />
    </HashRouter>
  );
}

export default App;
