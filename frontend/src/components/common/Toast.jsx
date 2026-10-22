import React, { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

const ToastContext = createContext(null);

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((message, type = 'success', duration = 3500) => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, message, type }]);

    if (duration > 0) {
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, duration);
    }
  }, []);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ addToast, toast: addToast }}>
      {children}
      <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 max-w-md pointer-events-none">
        {toasts.map((item) => (
          <div
            key={item.id}
            className={`pointer-events-auto flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium shadow-popover animate-toast-enter ${
              item.type === 'error'
                ? 'bg-danger-50 text-danger-700'
                : item.type === 'info'
                ? 'bg-sky-50 text-sky-700'
                : 'bg-success-50 text-success-700'
            }`}
          >
            {item.type === 'error' ? (
              <AlertCircle className="w-5 h-5 text-danger-600 flex-shrink-0" />
            ) : item.type === 'info' ? (
              <Info className="w-5 h-5 text-sky-600 flex-shrink-0" />
            ) : (
              <CheckCircle2 className="w-5 h-5 text-success-600 flex-shrink-0" />
            )}
            <p className="flex-1 text-xs sm:text-sm">{item.message}</p>
            <button
              onClick={() => removeToast(item.id)}
              className="p-1 rounded hover:bg-black/5 text-slate-500 hover:text-slate-800"
              aria-label="Dismiss toast"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

export default ToastProvider;
