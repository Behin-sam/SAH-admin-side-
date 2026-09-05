import React, { useState } from 'react';
import { Users, Search, Filter, ArrowRight, Activity, Heart, ShieldCheck, Lock } from 'lucide-react';
import { useApp } from '../../context/AppContext';

export const VeteranListView: React.FC = () => {
  const { assignedVeterans, setActiveVeteranId, setActiveScreen, currentUser } = useApp();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterRisk, setFilterRisk] = useState<string>('ALL');

  const filtered = assignedVeterans.filter(v => {
    const matchesSearch = v.user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          v.user.rank?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRisk = filterRisk === 'ALL' || v.profile.currentRiskLevel === filterRisk;
    return matchesSearch && matchesRisk;
  });

  return (
    <div className="max-w-6xl mx-auto space-y-6 py-4 animate-fadeIn">
      {/* Header & Privacy Notice */}
      <div className="p-6 rounded-2xl glass-panel border border-[#E8DCCE] flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-warm">
        <div>
          <div className="flex items-center gap-2">
            <span className="label-overline text-[10px] text-[#8C4A1E]">Confidential Caseload Directory</span>
            <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-[10px] font-bold flex items-center gap-1 font-mono">
              <Lock className="w-2.5 h-2.5" /> Client-Isolated Access
            </span>
          </div>
          <h1 className="font-heading text-2xl sm:text-3xl font-extrabold text-[#1C1917] mt-1">
            MY ASSIGNED VETERANS ({assignedVeterans.length})
          </h1>
          <p className="text-xs text-[#786F68] mt-1">
            Strict confidentiality enabled: You only have access to clients who specifically designated {currentUser?.name || 'you'} as their primary specialist.
          </p>
        </div>
        <div className="w-12 h-12 rounded-2xl bg-[#F7DFCC] text-[#8C4A1E] flex items-center justify-center font-bold shrink-0">
          <Users className="w-6 h-6" />
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="p-4 rounded-2xl glass-panel border border-[#E8DCCE] flex flex-col sm:flex-row items-center justify-between gap-4 shadow-warm">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-[#786F68] absolute left-3 top-3" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search by veteran name, rank, or unit..."
            className="w-full bg-[#FDF6EE] border border-[#E8DCCE] rounded-xl pl-9 pr-4 py-2 text-xs text-[#1C1917] focus:outline-none focus:border-[#D96B27]"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0 text-xs">
          <Filter className="w-4 h-4 text-[#786F68] shrink-0" />
          {['ALL', 'NORMAL', 'MONITOR', 'ATTENTION', 'URGENT REVIEW'].map(risk => (
            <button
              key={risk}
              onClick={() => setFilterRisk(risk)}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all shrink-0 font-mono text-[11px] ${
                filterRisk === risk
                  ? 'bg-[#1C1917] text-white shadow-warm'
                  : 'bg-[#FDF6EE] text-[#786F68] border border-[#E8DCCE]'
              }`}
            >
              {risk}
            </button>
          ))}
        </div>
      </div>

      {/* Directory Table */}
      <div className="p-6 rounded-2xl glass-panel border border-[#E8DCCE] space-y-4 shadow-warm">
        {filtered.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <div className="w-14 h-14 rounded-2xl bg-[#FDF2E9] border border-[#F7DFCC] text-[#8C4A1E] flex items-center justify-center mx-auto shadow-sm">
              <ShieldCheck className="w-7 h-7" />
            </div>
            <h3 className="font-heading font-extrabold text-lg text-[#1C1917]">No Assigned Veterans in Caseload</h3>
            <p className="text-xs text-[#786F68] max-w-md mx-auto">
              Under clinical privacy standards, specialists only view clients who specifically chose them. When veterans designate you as their specialist in the Specialist Hub, their records will appear here automatically.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-[#1C1917]">
              <thead className="bg-[#FDF6EE] text-[#786F68] label-overline text-[10px] border-b border-[#E8DCCE]">
                <tr>
                  <th className="p-3">Veteran Identifier</th>
                  <th className="p-3">Status Flag</th>
                  <th className="p-3">AI Credibility</th>
                  <th className="p-3">Physical Drill</th>
                  <th className="p-3">Mental Drill</th>
                  <th className="p-3">AI Indicator Rationale</th>
                  <th className="p-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E8DCCE]/80">
                {filtered.map(v => {
                  const cred = v.profile.credibilityScore ?? (v.profile.currentRiskLevel === 'URGENT REVIEW' ? 38 : v.profile.currentRiskLevel === 'MONITOR' ? 62 : 88);
                  return (
                    <tr key={v.user.id} className="hover:bg-[#FDF6EE]/60 transition-colors">
                      <td className="p-3">
                        <div className="flex items-center gap-3">
                          <img
                            src={v.user.avatarUrl}
                            alt={v.user.name}
                            className="w-9 h-9 rounded-full object-cover border border-[#E8DCCE]"
                          />
                          <div>
                            <div className="font-heading font-bold text-[#1C1917] text-sm">{v.user.name}</div>
                            <div className="text-[10px] text-[#786F68]">{v.user.rank} • {v.user.serviceBranch}</div>
                          </div>
                        </div>
                      </td>
                      <td className="p-3">
                        <span
                          className={`font-mono font-bold px-2.5 py-1 rounded text-[10px] uppercase ${
                            v.profile.currentRiskLevel === 'NORMAL'
                              ? 'bg-[#F7DFCC] text-[#8C4A1E]'
                              : v.profile.currentRiskLevel === 'MONITOR'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-rose-100 text-rose-800'
                          }`}
                        >
                          {v.profile.currentRiskLevel}
                        </span>
                      </td>
                      <td className="p-3">
                        <div className="flex items-center gap-1.5 font-mono font-bold text-xs">
                          <span
                            className={`w-2 h-2 rounded-full ${
                              cred >= 70 ? 'bg-emerald-500' : cred >= 50 ? 'bg-amber-500' : 'bg-rose-500 animate-pulse'
                            }`}
                          />
                          <span className={cred < 50 ? 'text-rose-700 font-extrabold' : 'text-[#1C1917]'}>
                            {cred}/100
                          </span>
                        </div>
                      </td>
                      <td className="p-3 font-semibold text-[#D96B27]">
                        <div className="flex items-center gap-1">
                          <Activity className="w-3.5 h-3.5" /> Stable (82%)
                        </div>
                      </td>
                      <td className="p-3 font-semibold text-[#1C1917]">
                        <div className="flex items-center gap-1">
                          <Heart className="w-3.5 h-3.5 text-[#D96B27]" />
                          {v.profile.currentRiskLevel === 'URGENT REVIEW' ? 'Needs Attention' : 'Steady'}
                        </div>
                      </td>
                      <td className="p-3 text-[#786F68] text-[11px]">
                        {cred < 50 ? (
                          <span className="text-rose-700 font-bold">⚠ Credibility dropped below threshold</span>
                        ) : v.profile.currentRiskLevel === 'MONITOR' ? (
                          <span className="text-amber-700 font-bold">Social adherence down 40%</span>
                        ) : (
                          <span className="text-[#8C4A1E]">Consistent recovery adherence</span>
                        )}
                      </td>
                      <td className="p-3 text-right">
                        <button
                          onClick={() => {
                            setActiveVeteranId(v.user.id);
                            setActiveScreen('veteran-detail');
                          }}
                          className="px-3 py-1.5 rounded-lg bg-[#D96B27] hover:bg-[#C55A1A] text-white font-bold text-[11px] inline-flex items-center gap-1 transition-colors shadow-rust"
                        >
                          <span>View Dossier</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
