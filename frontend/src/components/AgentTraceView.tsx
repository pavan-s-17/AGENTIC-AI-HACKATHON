import React from 'react';
import { CheckCircle2, XCircle, AlertTriangle, Info, Clock, Terminal, Wrench, Cpu, Sparkles } from 'lucide-react';
import { AgentTraceStep } from '../types';

interface AgentTraceViewProps {
  trace: AgentTraceStep[];
}

export const AgentTraceView: React.FC<AgentTraceViewProps> = ({ trace }) => {
  const isToolCall = (stepName: string) => stepName.startsWith('Tool:');

  const getStatusIcon = (status: string, isTool: boolean) => {
    if (isTool) {
      return <Wrench className="w-4 h-4 text-cyan-400 shrink-0" />;
    }
    switch (status) {
      case 'PASS':
        return <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />;
      case 'FAIL':
        return <XCircle className="w-4 h-4 text-rose-400 shrink-0" />;
      case 'WARNING':
      case 'WARN':
        return <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />;
      default:
        return <Info className="w-4 h-4 text-blue-400 shrink-0" />;
    }
  };

  const getCardBg = (status: string, isTool: boolean) => {
    if (isTool) {
      return 'border-cyan-500/40 bg-gradient-to-r from-cyan-950/20 to-slate-900/60 shadow-md shadow-cyan-950/10';
    }
    switch (status) {
      case 'PASS':
        return 'border-emerald-500/30 bg-emerald-500/5';
      case 'FAIL':
        return 'border-rose-500/30 bg-rose-500/10';
      case 'WARNING':
      case 'WARN':
        return 'border-amber-500/30 bg-amber-500/5';
      default:
        return 'border-blue-500/30 bg-blue-500/5';
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between pb-2 border-b border-slate-700/60">
        <div className="flex items-center gap-2">
          <Cpu className="w-4 h-4 text-blue-400 animate-pulse" />
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-200">
            Autonomous ReAct Agent Reasoning Trace ({trace.length} Checkpoints)
          </h4>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-300 border border-cyan-500/30">
            <Sparkles className="w-3 h-3 text-cyan-400" />
            Function Calling Enabled
          </span>
          <span className="text-[11px] text-slate-400 font-mono hidden sm:inline">
            Deterministic ERP Tools
          </span>
        </div>
      </div>

      <div className="space-y-2.5">
        {trace.map((step, idx) => {
          const isTool = isToolCall(step.step);

          return (
            <div
              key={idx}
              className={`rounded-xl border p-3.5 transition-all ${getCardBg(step.status, isTool)}`}
            >
              <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
                <div className="flex items-center gap-2 flex-wrap">
                  {getStatusIcon(step.status, isTool)}
                  <span className="text-xs font-bold text-white">
                    {step.title}
                  </span>

                  {isTool ? (
                    <span className="inline-flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-bold">
                      <Cpu className="w-2.5 h-2.5" />
                      Autonomous Tool Call
                    </span>
                  ) : (
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">
                      {step.step}
                    </span>
                  )}
                </div>

                {step.timestamp && (
                  <div className="flex items-center gap-1 text-[10px] font-mono text-slate-400">
                    <Clock className="w-3 h-3" />
                    {step.timestamp}
                  </div>
                )}
              </div>

              <p className={`text-xs font-mono pl-6 leading-relaxed ${
                isTool ? 'text-cyan-200/90' : 'text-slate-300'
              }`}>
                {step.detail}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
};
