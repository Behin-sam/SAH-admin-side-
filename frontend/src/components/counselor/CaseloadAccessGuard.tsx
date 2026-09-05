import React from 'react';
import { Lock, ShieldAlert, ArrowLeft, Users } from 'lucide-react';
import { useApp } from '../../context/AppContext';

interface Props {
  children: React.ReactNode;
}

export const CaseloadAccessGuard: React.FC<Props> = ({ children }) => {
  const { currentRole, assignedVeterans, activeVeteranId, setActiveScreen, setActiveVeteranId } = useApp();

  if (currentRole !== 'counselor') {
    return <>{children}</>;
  }

  const isAssigned = assignedVeterans.some(v => v.user.id === activeVeteranId);

  if (assignedVeterans.length === 0) {
    return (
      <div className="max-w-2xl mx-auto py-16 px-4 animate-fadeIn text-center space-y-6">
        <div className="w-16 h-16 rounded-3xl bg-[#FDF2E9] border border-[#F7DFCC] text-[#8C4A1E] flex items-center justify-center mx-auto shadow-warm">
          <Lock className="w-8 h-8" />
        </div>
        <div className="space-y-2">
          <span className="label-overline text-[10px] text-[#8C4A1E] font-bold">
            CLIENT CONFIDENTIALITY PROTECTION ACTIVE
          </span>
          <h1 className="font-heading text-2xl sm:text-3xl font-extrabold text-[#1C1917]">
            No Assigned Clients in Caseload
          </h1>
          <p className="text-xs text-[#786F68] max-w-md mx-auto leading-relaxed">
            You do not currently have any veterans assigned to your care. To preserve clinical privacy, psychological dossiers, task engines, and longitudinal biometrics are strictly isolated to each client's designated counselor.
          </p>
        </div>

        <div className="pt-2 flex items-center justify-center gap-3">
          <button
            onClick={() => setActiveScreen('dashboard-overview')}
            className="px-5 py-2.5 rounded-xl bg-[#1C1917] hover:bg-black text-white text-xs font-bold font-heading tracking-wider flex items-center gap-2 shadow-warm transition-all"
          >
            <ArrowLeft className="w-4 h-4" /> Caseload Overview
          </button>
          <button
            onClick={() => setActiveScreen('veteran-list')}
            className="px-5 py-2.5 rounded-xl bg-[#D96B27] hover:bg-[#C55A1A] text-white text-xs font-bold font-heading tracking-wider flex items-center gap-2 shadow-rust transition-all"
          >
            <Users className="w-4 h-4" /> View My Directory
          </button>
        </div>
      </div>
    );
  }

  if (!isAssigned) {
    return (
      <div className="max-w-2xl mx-auto py-16 px-4 animate-fadeIn text-center space-y-6">
        <div className="w-16 h-16 rounded-3xl bg-rose-100 border border-rose-200 text-rose-700 flex items-center justify-center mx-auto shadow-warm">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <div className="space-y-2">
          <span className="label-overline text-[10px] text-rose-700 font-bold">
            CONFIDENTIALITY ACCESS RESTRICTION
          </span>
          <h1 className="font-heading text-2xl sm:text-3xl font-extrabold text-[#1C1917]">
            Client Record Protected
          </h1>
          <p className="text-xs text-[#786F68] max-w-md mx-auto leading-relaxed">
            Strict confidentiality controls are enforced. This client has not designated you as their primary specialist. Access to their longitudinal records, daily adherence metrics, and check-in history is restricted exclusively to their assigned specialist.
          </p>
        </div>

        <div className="pt-2 flex items-center justify-center gap-3">
          <button
            onClick={() => {
              if (assignedVeterans.length > 0) {
                setActiveVeteranId(assignedVeterans[0].user.id);
              }
              setActiveScreen('dashboard-overview');
            }}
            className="px-5 py-2.5 rounded-xl bg-[#1C1917] hover:bg-black text-white text-xs font-bold font-heading tracking-wider flex items-center gap-2 shadow-warm transition-all"
          >
            <ArrowLeft className="w-4 h-4" /> Return to My Assigned Caseload
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};
