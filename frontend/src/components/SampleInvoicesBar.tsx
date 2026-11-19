import React, { useState, useEffect } from 'react';
import { Play, FileText, Image as ImageIcon, CheckCircle2, AlertTriangle, ShieldAlert, Sparkles, ExternalLink, Loader2 } from 'lucide-react';
import { SampleInvoiceMeta } from '../types';

interface SampleInvoicesBarProps {
  onSampleProcessed: (result: any) => void;
  isProcessing: boolean;
}

export const SampleInvoicesBar: React.FC<SampleInvoicesBarProps> = ({
  onSampleProcessed,
  isProcessing,
}) => {
  const [samples, setSamples] = useState<SampleInvoiceMeta[]>([]);
  const [loadingSample, setLoadingSample] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/sample_invoices')
      .then((res) => res.json())
      .then((data) => setSamples(data))
      .catch((err) => console.error('Failed to load samples:', err));
  }, []);

  const handleProcessSample = async (sample: SampleInvoiceMeta) => {
    if (isProcessing || loadingSample) return;
    setLoadingSample(sample.file_name);

    try {
      const res = await fetch(`/api/sample_invoices/process/${sample.file_name}`, {
        method: 'POST',
      });
      if (!res.ok) throw new Error('Failed to process sample');
      const data = await res.json();
      onSampleProcessed(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingSample(null);
    }
  };

  const getBadgeStyle = (outcome: string) => {
    switch (outcome) {
      case 'QUEUED_FOR_PAYMENT':
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
      case 'EXCEPTION_HOLD':
        return 'bg-rose-500/10 text-rose-400 border-rose-500/30';
      case 'DUPLICATE_BLOCKED':
        return 'bg-purple-500/10 text-purple-400 border-purple-500/30';
      default:
        return 'bg-slate-500/10 text-slate-400 border-slate-500/30';
    }
  };

  const getOutcomeIcon = (outcome: string) => {
    switch (outcome) {
      case 'QUEUED_FOR_PAYMENT':
        return <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />;
      case 'EXCEPTION_HOLD':
        return <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />;
      case 'DUPLICATE_BLOCKED':
        return <ShieldAlert className="w-3.5 h-3.5 text-purple-400" />;
      default:
        return null;
    }
  };

  return (
    <div className="rounded-2xl bg-slate-800/60 border border-slate-700/80 p-5 backdrop-blur-xl shadow-xl">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-amber-400" />
          <h3 className="text-sm font-bold text-white uppercase tracking-wider">
            1-Click Benchmark Scenarios ({samples.length})
          </h3>
        </div>
        <span className="text-xs text-slate-400">
          Clean Matches, Tolerances, Short Deliveries, Price Escalations, Duplicates & Split-GRN Messy Scans
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
        {samples.map((sample) => {
          const isLoadingThis = loadingSample === sample.file_name;
          const isImageFile = sample.file_name.endsWith('.jpg') || sample.file_name.endsWith('.png');

          return (
            <div
              key={sample.id}
              className="flex flex-col justify-between rounded-xl bg-slate-900/70 border border-slate-700/60 p-3.5 transition-all hover:border-slate-500 hover:bg-slate-900/90 group"
            >
              <div>
                <div className="flex items-center justify-between gap-1 mb-2">
                  <span
                    className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border ${getBadgeStyle(
                      sample.expected_outcome
                    )}`}
                  >
                    {getOutcomeIcon(sample.expected_outcome)}
                    {sample.expected_outcome.replace(/_/g, ' ')}
                  </span>
                  <a
                    href={`/api/sample_invoices/download/${sample.file_name}`}
                    target="_blank"
                    rel="noreferrer"
                    title={isImageFile ? "View Warehouse Invoice Image" : "View Original Generated PDF Invoice"}
                    className="text-slate-400 hover:text-blue-400 p-1 rounded hover:bg-slate-800 transition-colors"
                  >
                    {isImageFile ? (
                      <ImageIcon className="w-3.5 h-3.5 text-cyan-400" />
                    ) : (
                      <ExternalLink className="w-3.5 h-3.5" />
                    )}
                  </a>
                </div>

                <h4 className="text-xs font-bold text-slate-100 group-hover:text-blue-300 transition-colors line-clamp-1">
                  {sample.title}
                </h4>
                <p className="text-[11px] font-mono text-slate-400 mt-0.5">
                  {sample.vendor.split(' ')[0]} • {sample.po_number}
                </p>
                <p className="text-[11px] text-slate-400 mt-2 line-clamp-2 leading-relaxed">
                  {sample.description}
                </p>
              </div>

              <div className="mt-3 pt-2 border-t border-slate-800">
                <button
                  onClick={() => handleProcessSample(sample)}
                  disabled={isProcessing || !!loadingSample}
                  className="w-full flex items-center justify-center gap-1.5 py-1.5 px-2.5 rounded-lg text-xs font-semibold bg-blue-600/20 hover:bg-blue-600/40 text-blue-300 border border-blue-500/30 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none"
                >
                  {isLoadingThis ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      Auditing...
                    </>
                  ) : (
                    <>
                      <Play className="w-3 h-3 fill-current" />
                      Run AP Audit
                    </>
                  )}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
