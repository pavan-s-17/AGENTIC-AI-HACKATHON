import React, { useState, useEffect } from 'react';
import { 
  FileCheck2, 
  RotateCcw, 
  Database, 
  LayoutDashboard, 
  Radio,
  Sparkles, 
  CheckCircle2, 
  AlertCircle,
  HelpCircle,
  ArrowRight
} from 'lucide-react';
import { KPICards } from './components/KPICards';
import { UploadZone } from './components/UploadZone';
import { SampleInvoicesBar } from './components/SampleInvoicesBar';
import { InvoiceTable } from './components/InvoiceTable';
import { InvoiceDetailModal } from './components/InvoiceDetailModal';
import { MockERPViewer } from './components/MockERPViewer';
import { IntegrationsHub } from './components/IntegrationsHub';
import { InvoiceListItem, DashboardKPIs } from './types';

export const App: React.FC = () => {
  const [invoices, setInvoices] = useState<InvoiceListItem[]>([]);
  const [kpis, setKpis] = useState<DashboardKPIs>({
    total_processed: 0,
    queued_for_payment: 0,
    exceptions_on_hold: 0,
    duplicates_blocked: 0,
    approved_for_payment: 0
  });
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<number | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentView, setCurrentView] = useState<'dashboard' | 'erp' | 'integrations'>('dashboard');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const fetchInvoices = async () => {
    try {
      const res = await fetch('/api/invoices');
      if (res.ok) {
        const data = await res.json();
        setInvoices(data.invoices || []);
        setKpis(data.kpis || {
          total_processed: 0,
          queued_for_payment: 0,
          exceptions_on_hold: 0,
          duplicates_blocked: 0,
          approved_for_payment: 0
        });
      }
    } catch (err) {
      console.error('Failed to fetch invoices:', err);
    }
  };

  useEffect(() => {
    fetchInvoices();
  }, []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleResetDemo = async () => {
    if (!window.confirm('Reset demo invoices queue to start a fresh test run?')) return;
    try {
      const res = await fetch('/api/demo/reset', { method: 'POST' });
      if (res.ok) {
        await fetchInvoices();
        setSelectedInvoiceId(null);
        showToast('Demo environment reset successfully.');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleInvoiceProcessed = (result: any) => {
    fetchInvoices();
    if (result && result.id) {
      setSelectedInvoiceId(result.id);
      showToast(`Processed Invoice #${result.invoice_number} -> ${result.status}`);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Top Navbar */}
      <header className="sticky top-0 z-40 bg-slate-950/80 backdrop-blur-xl border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 shadow-lg shadow-blue-500/20 text-white">
              <FileCheck2 className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-lg font-black tracking-tight text-white">InvoiceFlow</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/40">
                  AP 3-Way Match Agent
                </span>
              </div>
              <p className="text-[11px] text-slate-400 hidden sm:block">
                Multimodal Ingestion • GSTIN Master Validation • Automated Reconciliation
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* View Switcher */}
            <div className="flex rounded-xl bg-slate-900 border border-slate-800 p-1">
              <button
                onClick={() => setCurrentView('dashboard')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  currentView === 'dashboard'
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <LayoutDashboard className="w-3.5 h-3.5" />
                <span>AP Dashboard</span>
              </button>
              <button
                onClick={() => setCurrentView('erp')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  currentView === 'erp'
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Database className="w-3.5 h-3.5" />
                <span>Mock ERP</span>
              </button>
              <button
                onClick={() => setCurrentView('integrations')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  currentView === 'integrations'
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Radio className="w-3.5 h-3.5" />
                <span>Integrations & Webhooks</span>
              </button>
            </div>

            {/* Reset Button */}
            <button
              onClick={handleResetDemo}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors"
              title="Reset processed invoices queue"
            >
              <RotateCcw className="w-3.5 h-3.5 text-slate-400" />
              <span className="hidden md:inline">Reset Queue</span>
            </button>
          </div>
        </div>
      </header>

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-3 rounded-xl bg-slate-800 border border-slate-700 text-white shadow-2xl text-xs font-medium animate-bounce">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-1 w-full space-y-8">
        {currentView === 'dashboard' && (
          <>
            {/* Top KPIs */}
            <KPICards kpis={kpis} />

            {/* 1-Click Benchmark Scenarios Bar */}
            <SampleInvoicesBar
              onSampleProcessed={handleInvoiceProcessed}
              isProcessing={isProcessing}
            />

            {/* Upload Zone */}
            <UploadZone
              onUploadSuccess={handleInvoiceProcessed}
              isProcessing={isProcessing}
              setIsProcessing={setIsProcessing}
            />

            {/* Invoice Queue Table */}
            <InvoiceTable
              invoices={invoices}
              onSelectInvoice={(id) => setSelectedInvoiceId(id)}
              selectedId={selectedInvoiceId}
            />
          </>
        )}

        {currentView === 'erp' && (
          /* Mock ERP Viewer Tab */
          <MockERPViewer />
        )}

        {currentView === 'integrations' && (
          /* Enterprise Integrations & Webhook Hub */
          <IntegrationsHub />
        )}
      </main>

      {/* Modal for Invoice Detail Inspection */}
      {selectedInvoiceId !== null && (
        <InvoiceDetailModal
          invoiceId={selectedInvoiceId}
          onClose={() => setSelectedInvoiceId(null)}
          onStatusChanged={fetchInvoices}
        />
      )}

      {/* Footer */}
      <footer className="border-t border-slate-800/80 bg-slate-950 py-6 mt-auto text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>InvoiceFlow — Autonomous Accounts Payable Agent for Indian B2B ERPs</span>
          <span className="font-mono text-slate-400">Gemini 2.5 Flash • SQLite • FastAPI • React</span>
        </div>
      </footer>
    </div>
  );
};

export default App;
