import React, { useState } from 'react';
import { Shield, Mail, UserCheck, Stethoscope, ArrowRight, CheckCircle2, AlertCircle, RefreshCw, Lock } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { UserRole } from '../../types';

export const AuthView: React.FC = () => {
  const { loginWithCredentials, registerNewUser, verifyEmailCode, allVeterans } = useApp();

  const [authMode, setAuthMode] = useState<'login' | 'signup' | 'verify'>('login');
  const [role, setRole] = useState<UserRole>('veteran');

  // Form fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [rank, setRank] = useState('');
  const [unit, setUnit] = useState('');
  const [serviceBranch, setServiceBranch] = useState('Indian Army');

  // OTP Verification state
  const [pendingEmail, setPendingEmail] = useState('');
  const [otpCode, setOtpCode] = useState(['1', '2', '3', '4', '5', '6']);
  const [otpError, setOtpError] = useState('');
  const [isResending, setIsResending] = useState(false);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    loginWithCredentials(email, role);
  };

  const handleSignup = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password || !name) return;

    registerNewUser({
      name,
      rank: rank || (role === 'veteran' ? 'Veteran Soldier' : 'Clinical Officer'),
      unit: unit || 'Defense Medical Command',
      serviceBranch,
      email,
      role
    });

    setPendingEmail(email);
    setAuthMode('verify');
  };

  const handleVerifyOTP = (e: React.FormEvent) => {
    e.preventDefault();
    const fullCode = otpCode.join('');
    if (fullCode.length !== 6) {
      setOtpError('Please enter a 6-digit verification code.');
      return;
    }

    const success = verifyEmailCode(pendingEmail || email, fullCode);
    if (!success) {
      setOtpError('Invalid code. Please try 123456');
    }
  };

  const handleQuickDemoLogin = (vetId: string) => {
    const found = allVeterans.find(v => v.user.id === vetId);
    if (found) {
      loginWithCredentials(found.user.email, 'veteran');
    }
  };

  const handleCounselorDemoLogin = () => {
    loginWithCredentials('a.nair@amrita-health.org', 'counselor');
  };

  return (
    <div className="min-h-[calc(100vh-61px)] flex items-center justify-center p-4 relative overflow-hidden bg-[#FDF6EE]">
      {/* Background Nude Glow */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-[#F7DFCC]/60 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-md w-full glass-panel border border-[#E8DCCE] rounded-3xl p-6 sm:p-8 space-y-6 shadow-2xl z-10 relative bg-white">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-[#1C1917] flex items-center justify-center text-white mx-auto shadow-warm">
            <Shield className="w-7 h-7 stroke-[2.2] text-[#D96B27]" />
          </div>
          <h1 className="font-heading text-3xl font-extrabold text-[#1C1917] tracking-wider">VALOR PLATFORM</h1>
          <p className="text-xs text-[#786F68]">Secure Authentication & Clinical Access Control</p>
        </div>

        {/* Auth Mode Toggle (Login vs Register) */}
        {authMode !== 'verify' && (
          <div className="grid grid-cols-2 p-1 rounded-xl bg-[#FDF6EE] border border-[#E8DCCE] text-xs font-bold">
            <button
              onClick={() => setAuthMode('login')}
              className={`py-2 rounded-lg transition-all ${
                authMode === 'login' ? 'bg-[#1C1917] text-white shadow-warm' : 'text-[#786F68] hover:text-[#1C1917]'
              }`}
            >
              Sign In
            </button>
            <button
              onClick={() => setAuthMode('signup')}
              className={`py-2 rounded-lg transition-all ${
                authMode === 'signup' ? 'bg-[#1C1917] text-white shadow-warm' : 'text-[#786F68] hover:text-[#1C1917]'
              }`}
            >
              Register Account
            </button>
          </div>
        )}

        {/* ROLE SELECTION BAR */}
        {authMode !== 'verify' && (
          <div className="space-y-1.5">
            <label className="label-overline text-[10px] text-[#786F68] block">
              I am signing in as:
            </label>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <button
                type="button"
                onClick={() => setRole('veteran')}
                className={`p-3 rounded-xl border flex items-center justify-center gap-2 font-bold transition-all ${
                  role === 'veteran'
                    ? 'bg-[#F7DFCC] border-[#D96B27] text-[#8C4A1E] shadow-sm'
                    : 'bg-[#FDF6EE] border-[#E8DCCE] text-[#786F68]'
                }`}
              >
                <UserCheck className="w-4 h-4 text-[#D96B27]" /> Veteran
              </button>

              <button
                type="button"
                onClick={() => setRole('counselor')}
                className={`p-3 rounded-xl border flex items-center justify-center gap-2 font-bold transition-all ${
                  role === 'counselor'
                    ? 'bg-[#F7DFCC] border-[#D96B27] text-[#8C4A1E] shadow-sm'
                    : 'bg-[#FDF6EE] border-[#E8DCCE] text-[#786F68]'
                }`}
              >
                <Stethoscope className="w-4 h-4 text-[#D96B27]" /> Counselor
              </button>
            </div>
          </div>
        )}

        {/* 1. LOGIN FORM */}
        {authMode === 'login' && (
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-[#1C1917] block">Email Address</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-[#786F68] absolute left-3 top-3" />
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder={role === 'veteran' ? 'rajesh.sharma@veterans.org' : 'a.nair@amrita-health.org'}
                  className="w-full bg-[#FDF6EE] border border-[#E8DCCE] rounded-xl pl-9 pr-3 py-2.5 text-xs text-[#1C1917] focus:outline-none focus:border-[#D96B27]"
                  required
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-[#1C1917] block">Password</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-[#786F68] absolute left-3 top-3" />
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full bg-[#FDF6EE] border border-[#E8DCCE] rounded-xl pl-9 pr-3 py-2.5 text-xs text-[#1C1917] focus:outline-none focus:border-[#D96B27]"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-3.5 rounded-xl bg-[#D96B27] hover:bg-[#C55A1A] text-white font-extrabold text-xs shadow-rust flex items-center justify-center gap-2 transition-all font-heading tracking-wider"
            >
              <span>Authenticate & Sign In</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        )}

        {/* 2. REGISTRATION / SIGNUP FORM */}
        {authMode === 'signup' && (
          <form onSubmit={handleSignup} className="space-y-3">
            <div className="space-y-1">
              <label className="text-xs font-bold text-[#1C1917] block">Full Name</label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="e.g. Subedar Major Suresh Kumar"
                className="w-full bg-[#FDF6EE] border border-[#E8DCCE] rounded-xl p-2.5 text-xs text-[#1C1917] focus:outline-none focus:border-[#D96B27]"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <label className="text-xs font-bold text-[#1C1917] block">Rank / Designation</label>
                <input
                  type="text"
                  value={rank}
                  onChange={e => setRank(e.target.value)}
                  placeholder="e.g. Havildar"
                  className="w-full bg-[#FDF6EE] border border-[#E8DCCE] rounded-xl p-2.5 text-xs text-[#1C1917] focus:outline-none focus:border-[#D96B27]"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-[#1C1917] block">Branch</label>
                <select
                  value={serviceBranch}
                  onChange={e => setServiceBranch(e.target.value)}
                  className="w-full bg-[#FDF6EE] border border-[#E8DCCE] rounded-xl p-2.5 text-xs text-[#1C1917] focus:outline-none focus:border-[#D96B27]"
                >
                  <option value="Indian Army">Indian Army</option>
                  <option value="Indian Navy">Indian Navy</option>
                  <option value="Indian Air Force">Indian Air Force</option>
                  <option value="Paramilitary">Paramilitary</option>
                </select>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-[#1C1917] block">Email Address (For Verification)</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="veteran@domain.org"
                className="w-full bg-[#FDF6EE] border border-[#E8DCCE] rounded-xl p-2.5 text-xs text-[#1C1917] focus:outline-none focus:border-[#D96B27]"
                required
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-[#1C1917] block">Create Password</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Minimum 8 characters"
                className="w-full bg-[#FDF6EE] border border-[#E8DCCE] rounded-xl p-2.5 text-xs text-[#1C1917] focus:outline-none focus:border-[#D96B27]"
                required
              />
            </div>

            <button
              type="submit"
              className="w-full py-3.5 rounded-xl bg-[#D96B27] hover:bg-[#C55A1A] text-white font-extrabold text-xs shadow-rust flex items-center justify-center gap-2 transition-all font-heading tracking-wider mt-2"
            >
              <span>Send Email Verification Code</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        )}

        {/* 3. EMAIL VERIFICATION STEP */}
        {authMode === 'verify' && (
          <form onSubmit={handleVerifyOTP} className="space-y-5 animate-fadeIn">
            <div className="p-4 rounded-2xl bg-[#FDF2E9] border border-[#F7DFCC] text-center space-y-1">
              <Mail className="w-8 h-8 text-[#D96B27] mx-auto" />
              <h3 className="font-heading font-bold text-xl text-[#1C1917]">Verify Your Email Address</h3>
              <p className="text-xs text-[#786F68]">
                A 6-digit code was sent to: <strong className="text-[#8C4A1E] font-mono">{pendingEmail || email}</strong>
              </p>
            </div>

            {otpError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" /> {otpError}
              </div>
            )}

            <div className="space-y-2">
              <label className="text-xs font-bold text-[#1C1917] block text-center">
                Enter 6-Digit Code (Demo Code: 123456)
              </label>
              <div className="flex items-center justify-center gap-2">
                {otpCode.map((digit, index) => (
                  <input
                    key={index}
                    type="text"
                    maxLength={1}
                    value={digit}
                    onChange={e => {
                      const newCode = [...otpCode];
                      newCode[index] = e.target.value;
                      setOtpCode(newCode);
                    }}
                    className="w-10 h-12 rounded-xl bg-[#FDF6EE] border border-[#E8DCCE] text-center font-mono font-extrabold text-xl text-[#D96B27] focus:border-[#D96B27] focus:outline-none shadow-sm"
                  />
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between text-xs pt-1">
              <button
                type="button"
                onClick={() => setAuthMode('signup')}
                className="text-[#786F68] hover:underline"
              >
                ← Back to Edit Email
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsResending(true);
                  setTimeout(() => setIsResending(false), 1500);
                }}
                className="text-[#D96B27] font-bold hover:underline flex items-center gap-1"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isResending ? 'animate-spin' : ''}`} /> Resend Code
              </button>
            </div>

            <button
              type="submit"
              className="w-full py-3.5 rounded-xl bg-[#D96B27] hover:bg-[#C55A1A] text-white font-extrabold text-xs shadow-rust flex items-center justify-center gap-2 font-heading tracking-wider"
            >
              <CheckCircle2 className="w-5 h-5" /> Verify Email & Launch Profile
            </button>
          </form>
        )}

        {/* DEMO QUICK LOGIN SELECTOR FOR JUDGES */}
        <div className="pt-4 border-t border-[#E8DCCE] space-y-2">
          <div className="label-overline text-[10px] text-center">
            SIH 2026 Judge Quick Login
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
            <button
              onClick={() => handleQuickDemoLogin('vet-01')}
              className="p-2.5 rounded-xl bg-[#FDF6EE] hover:bg-white border border-[#E8DCCE] text-[#1C1917] text-left font-bold flex items-center justify-between shadow-sm"
            >
              <span>Col. Rajesh (Stable)</span>
              <span className="text-[9px] text-[#D96B27] font-mono">🟢 Veteran</span>
            </button>

            <button
              onClick={() => handleQuickDemoLogin('vet-03')}
              className="p-2.5 rounded-xl bg-[#FDF6EE] hover:bg-white border border-[#E8DCCE] text-[#1C1917] text-left font-bold flex items-center justify-between shadow-sm"
            >
              <span>WO Vikram (Urgent)</span>
              <span className="text-[9px] text-rose-600 font-mono">🔴 Veteran</span>
            </button>
          </div>

          <button
            onClick={handleCounselorDemoLogin}
            className="w-full p-2.5 rounded-xl bg-[#1C1917] hover:bg-black text-white text-center font-bold text-xs flex items-center justify-center gap-1.5 shadow-warm font-heading tracking-wider"
          >
            <Stethoscope className="w-4 h-4 text-[#D96B27]" /> Log In as Dr. Ananya Nair (Counselor)
          </button>
        </div>
      </div>
    </div>
  );
};
