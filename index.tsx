import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './global.css';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

// Simple Error Boundary Component
class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean, error: any }> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: any) {
    return { hasError: true, error };
  }

  componentDidCatch(error: any, errorInfo: any) {
    console.error("Uncaught error:", error, errorInfo);
  }

  handleReset = () => {
    // Clear all app data to recover from crash
    localStorage.clear();
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-[#0B0F19] text-white p-6 text-center">
          <div className="bg-red-900/20 border border-red-500/50 rounded-3xl p-8 max-w-md shadow-2xl">
            <h1 className="text-3xl font-black text-red-500 mb-4">Oops! Lỗi Ứng Dụng</h1>
            <p className="text-gray-300 mb-6 text-sm">
              Đã xảy ra lỗi nghiêm trọng khiến ứng dụng không thể hiển thị. 
              Thường do dữ liệu lưu trữ bị xung đột.
            </p>
            <div className="bg-black/40 p-3 rounded-lg text-xs font-mono text-red-300 mb-6 text-left overflow-auto max-h-32">
               {this.state.error?.toString() || "Unknown Error"}
            </div>
            <button 
              onClick={this.handleReset}
              className="w-full py-3 bg-red-600 hover:bg-red-500 text-white font-bold rounded-xl transition-all shadow-lg shadow-red-900/30 flex items-center justify-center gap-2"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 12"/></svg>
              Reset Dữ Liệu & Tải Lại
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
);