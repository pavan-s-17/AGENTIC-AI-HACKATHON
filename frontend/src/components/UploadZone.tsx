import React, { useState, useRef } from 'react';
import { UploadCloud, FileText, CheckCircle2, AlertCircle, Loader2, Sparkles, BrainCircuit } from 'lucide-react';

interface UploadZoneProps {
  onUploadSuccess: (newInvoice: any) => void;
  isProcessing: boolean;
  setIsProcessing: (val: boolean) => void;
}

export const UploadZone: React.FC<UploadZoneProps> = ({
  onUploadSuccess,
  isProcessing,
  setIsProcessing
}) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const [activeStepText, setActiveStepText] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const simulateAgentSteps = () => {
    const steps = [
      'Scanning PDF visual layers & multimodal schema extraction...',
      'Auditing invoice arithmetic & Indian GSTIN master records...',
      'Cross-referencing Purchase Order line items & unit prices...',
      'Auditing Warehouse Dock receiving slip (GRN short-delivery rule)...',
      'Synthesizing AP match decision & drafting dispute log...'
    ];
    let idx = 0;
    setActiveStepText(steps[0]);
    const interval = setInterval(() => {
      idx++;
      if (idx < steps.length) {
        setActiveStepText(steps[idx]);
      }
    }, 700);
    return interval;
  };

  const handleFileUpload = async (file: File) => {
    if (!file) return;
    setErrorMsg(null);
    setIsProcessing(true);
    const interval = simulateAgentSteps();

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/invoices/process', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.detail || 'Failed to process invoice file');
      }

      const data = await response.json();
      clearInterval(interval);
      setIsProcessing(false);
      onUploadSuccess(data);
    } catch (err: any) {
      clearInterval(interval);
      setIsProcessing(false);
      setErrorMsg(err.message || 'Error occurred while running AP agent pipeline');
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  return (
    <div className="relative rounded-2xl bg-slate-800/60 border border-slate-700/80 p-6 backdrop-blur-xl shadow-xl">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-blue-500/10 border border-blue-500/30 text-blue-400">
            <BrainCircuit className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              AP Agent Ingestion Pipeline
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/40">
                Gemini 2.5 Flash
              </span>
            </h3>
            <p className="text-xs text-slate-400">
              Upload vendor PDF, PNG, or JPG invoices for automated 3-way reconciliation
            </p>
          </div>
        </div>
      </div>

      <div
        onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={handleDrop}
        onClick={() => !isProcessing && fileInputRef.current?.click()}
        className={`relative flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-8 transition-all duration-200 cursor-pointer text-center ${
          isDragOver
            ? 'border-blue-400 bg-blue-500/10 scale-[1.01]'
            : 'border-slate-600/80 hover:border-slate-500 bg-slate-900/40 hover:bg-slate-900/60'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.png,.jpg,.jpeg"
          className="hidden"
          onChange={(e) => {
            if (e.target.files && e.target.files[0]) {
              handleFileUpload(e.target.files[0]);
            }
          }}
          disabled={isProcessing}
        />

        {isProcessing ? (
          <div className="flex flex-col items-center gap-3 py-4">
            <div className="relative">
              <div className="w-14 h-14 rounded-full border-4 border-blue-500/20 border-t-blue-500 animate-spin flex items-center justify-center">
              </div>
              <Sparkles className="w-6 h-6 text-blue-400 absolute inset-0 m-auto animate-pulse" />
            </div>
            <div className="space-y-1 text-center">
              <p className="text-sm font-semibold text-white">AP Agent Reasoning in Progress...</p>
              <p className="text-xs font-mono text-blue-300 animate-pulse max-w-md">
                {activeStepText}
              </p>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <div className="p-3 rounded-full bg-slate-800 border border-slate-700 text-blue-400">
              <UploadCloud className="w-7 h-7" />
            </div>
            <p className="text-sm font-medium text-slate-200">
              <span className="text-blue-400 font-semibold underline underline-offset-4">Click to upload</span> or drag and drop invoice
            </p>
            <p className="text-xs text-slate-400">
              Supports Tax Invoices (PDF, PNG, JPEG up to 10MB)
            </p>
          </div>
        )}
      </div>

      {errorMsg && (
        <div className="mt-3 flex items-center gap-2 p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}
    </div>
  );
};
