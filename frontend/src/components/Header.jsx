import React from 'react';
import { 
  ShieldAlert, 
  Radio, 
  UserCheck, 
  Wrench, 
  Volume2, 
  VolumeX, 
  Flame, 
  Sparkles,
  RefreshCw
} from 'lucide-react';

export default function Header({
  activeMode,
  setActiveMode,
  users,
  selectedExecutorId,
  setSelectedExecutorId,
  isWsConnected,
  soundEnabled,
  setSoundEnabled,
  onCheckDeadlines,
  overdueCount
}) {
  const executors = users.filter((u) => u.role === 'EXECUTOR');
  const selectedExecutor = users.find((u) => u.id === selectedExecutorId);

  return (
    <header className="sticky top-0 z-40 bg-slate-900/95 backdrop-blur-md border-b border-slate-800 shadow-xl">
      <div className="max-w-7xl mx-auto px-4 py-2.5">
        {/* Top Brand Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-2.5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 to-yellow-300 flex items-center justify-center shadow-lg shadow-amber-500/20 text-slate-950 font-black text-xl tracking-tighter">
              KM
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-lg text-white tracking-wide">
                  Наряд<span className="text-amber-400">AI</span>
                </span>
                <span className="text-[10px] uppercase font-bold tracking-widest px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
                  MVP 2026
                </span>
              </div>
              <p className="text-xs text-slate-400 hidden sm:block">
                АО «Костанайские Минералы» • Интеллектуальный контроль
              </p>
            </div>
          </div>

          {/* Right Controls: WS Status, Sound, Deadline Check */}
          <div className="flex items-center gap-2">
            <button
              onClick={onCheckDeadlines}
              title="Проверить сроки (ИИ-контроль)"
              className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-medium flex items-center gap-1.5 transition border border-slate-700"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span className="hidden md:inline">ИИ-контроль</span>
            </button>

            <button
              onClick={() => setSoundEnabled(!soundEnabled)}
              title={soundEnabled ? "Звук тревоги включен" : "Звук тревоги выключен"}
              className={`p-2 rounded-lg transition border ${
                soundEnabled 
                  ? 'bg-amber-500/20 border-amber-500/40 text-amber-400' 
                  : 'bg-slate-800 border-slate-700 text-slate-500'
              }`}
            >
              {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </button>

            {/* WS Live Badge */}
            <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-800/80 border border-slate-700/80 text-xs">
              <span className={`w-2.5 h-2.5 rounded-full ${isWsConnected ? 'bg-emerald-400 animate-pulse' : 'bg-rose-500'}`} />
              <span className="text-slate-300 hidden sm:inline">
                {isWsConnected ? 'Онлайн (WS)' : 'Офлайн'}
              </span>
            </div>
          </div>
        </div>

        {/* Mode Switcher (Экран Мастера vs Экран Исполнителя) */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-1 border-t border-slate-800/60">
          <div className="grid grid-cols-2 p-1 bg-slate-950 rounded-xl border border-slate-800/80 max-w-md w-full">
            <button
              onClick={() => setActiveMode('master')}
              className={`touch-btn text-sm font-bold min-h-[44px] transition-all rounded-lg ${
                activeMode === 'master'
                  ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/20'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
              }`}
            >
              <ShieldAlert className="w-4 h-4" />
              <span>Экран Мастера</span>
            </button>
            <button
              onClick={() => setActiveMode('executor')}
              className={`touch-btn text-sm font-bold min-h-[44px] transition-all rounded-lg ${
                activeMode === 'executor'
                  ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md shadow-emerald-500/20'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
              }`}
            >
              <Wrench className="w-4 h-4" />
              <span>Экран Исполнителя</span>
            </button>
          </div>

          {/* If on executor mode, quick worker select for demo testing */}
          {activeMode === 'executor' && (
            <div className="flex items-center gap-2 bg-slate-800/70 px-3 py-1.5 rounded-xl border border-slate-700/70 text-xs">
              <UserCheck className="w-4 h-4 text-emerald-400 shrink-0" />
              <span className="text-slate-400 hidden lg:inline">Сотрудник:</span>
              <select
                value={selectedExecutorId}
                onChange={(e) => setSelectedExecutorId(Number(e.target.value))}
                className="bg-transparent text-emerald-300 font-semibold focus:outline-none cursor-pointer pr-2"
              >
                {executors.map((u) => (
                  <option key={u.id} value={u.id} className="bg-slate-900 text-white">
                    {u.full_name} ({u.specialty} • {u.brigade})
                  </option>
                ))}
              </select>
            </div>
          )}

          {activeMode === 'master' && overdueCount > 0 && (
            <div className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-xl bg-rose-500/20 border border-rose-500/40 text-rose-300">
              <Flame className="w-4 h-4 text-rose-400 animate-bounce" />
              <span>Просрочено: {overdueCount}</span>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
