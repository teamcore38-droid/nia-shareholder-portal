import React, { useState } from 'react';
import { Eye, EyeOff, Lock } from 'lucide-react';

export default function PasswordInput({
  value,
  onChange,
  placeholder = '••••••••••••',
  required = false,
  minLength,
  name,
  id,
  autoComplete = 'current-password',
  showLockIcon = false,
  showStrength = false,
  className = '',
  inputClassName = ''
}) {
  const [visible, setVisible] = useState(false);

  const getStrength = (pwd = '') => {
    if (!pwd) return { score: 0, label: '', color: 'bg-slate-200' };
    let score = 0;
    if (pwd.length >= 8) score += 1;
    if (/[A-Z]/.test(pwd) && /[a-z]/.test(pwd)) score += 1;
    if (/\d/.test(pwd)) score += 1;
    if (/[^A-Za-z0-9]/.test(pwd)) score += 1;

    if (score <= 1) return { score: 1, label: 'Weak', color: 'bg-red-500', textColor: 'text-red-600' };
    if (score === 2) return { score: 2, label: 'Fair', color: 'bg-amber-500', textColor: 'text-amber-600' };
    if (score === 3) return { score: 3, label: 'Good', color: 'bg-blue-500', textColor: 'text-blue-600' };
    return { score: 4, label: 'Strong', color: 'bg-emerald-500', textColor: 'text-emerald-600' };
  };

  const strength = showStrength ? getStrength(value) : null;

  return (
    <div className={className}>
      <div className="relative">
        {showLockIcon && (
          <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
        )}
        <input
          id={id}
          name={name}
          type={visible ? 'text' : 'password'}
          required={required}
          minLength={minLength}
          autoComplete={autoComplete}
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          className={`w-full ${showLockIcon ? 'pl-10' : 'pl-3.5'} pr-10 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#7C3AED] transition-shadow ${inputClassName}`}
        />
        <button
          type="button"
          onClick={() => setVisible((prev) => !prev)}
          aria-label={visible ? 'Hide password' : 'Show password'}
          title={visible ? 'Hide password' : 'Show password'}
          className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
        >
          {visible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
        </button>
      </div>

      {showStrength && value && (
        <div className="mt-1.5 flex items-center justify-between gap-2">
          <div className="flex-1 flex items-center gap-1 h-1">
            {[1, 2, 3, 4].map((lvl) => (
              <div
                key={lvl}
                className={`h-full flex-1 rounded-full transition-colors ${
                  lvl <= strength.score ? strength.color : 'bg-slate-200'
                }`}
              />
            ))}
          </div>
          <span className={`text-[10px] font-bold ${strength.textColor}`}>
            {strength.label}
          </span>
        </div>
      )}
    </div>
  );
}
