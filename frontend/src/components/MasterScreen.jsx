import React, { useState } from 'react';
import { 
  Plus, 
  Flame, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  Users, 
  BarChart2, 
  SlidersHorizontal, 
  Layers, 
  ShieldAlert,
  Search,
  Filter
} from 'lucide-react';
import KanbanBoard from './KanbanBoard';
import AnalyticsView from './AnalyticsView';

export default function MasterScreen({
  workOrders,
  users,
  locations,
  shiftAnalytics,
  onOpenCreateModal,
  onSelectOrder,
  onUpdateWorkerStatus
}) {
  const [activeTab, setActiveTab] = useState('kanban'); // 'kanban' or 'analytics'
  const [filterLocation, setFilterLocation] = useState('');
  const [filterPriority, setFilterPriority] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const executors = users.filter((u) => u.role === 'EXECUTOR');

  // Filter work orders
  const filteredOrders = workOrders.filter((order) => {
    if (filterLocation && order.location_id !== Number(filterLocation)) return false;
    if (filterPriority && order.priority !== filterPriority) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matchNum = order.number?.toLowerCase().includes(q);
      const matchEq = order.equipment_name?.toLowerCase().includes(q);
      const matchDesc = order.description?.toLowerCase().includes(q);
      const matchExec = order.executor_name?.toLowerCase().includes(q);
      if (!matchNum && !matchEq && !matchDesc && !matchExec) return false;
    }
    return true;
  });

  return (
    <div className="space-y-5">
      {/* 1. Shift KPI Counters (Section 5.2) */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800 shadow-md">
          <div className="flex items-center justify-between text-slate-400 text-xs font-bold mb-1">
            <span>Выдано всего</span>
            <Layers className="w-4 h-4 text-blue-400" />
          </div>
          <div className="text-2xl font-black text-white">
            {shiftAnalytics?.total_issued || workOrders.length}
          </div>
          <span className="text-[10px] text-slate-500">За текущую смену</span>
        </div>

        <div className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800 shadow-md">
          <div className="flex items-center justify-between text-slate-400 text-xs font-bold mb-1">
            <span>В работе</span>
            <Clock className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-black text-amber-400">
            {shiftAnalytics?.in_progress || workOrders.filter((o) => o.status === 'IN_PROGRESS').length}
          </div>
          <span className="text-[10px] text-slate-500">На линии ремонта</span>
        </div>

        <div className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800 shadow-md">
          <div className="flex items-center justify-between text-slate-400 text-xs font-bold mb-1">
            <span>Выполнено / Закрыто</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-black text-emerald-400">
            {(shiftAnalytics?.executed || 0) + (shiftAnalytics?.closed || 0)}
          </div>
          <span className="text-[10px] text-slate-500">Принято ИИ и мастером</span>
        </div>

        <div className={`p-3.5 rounded-2xl border shadow-md ${
          (shiftAnalytics?.overdue || 0) > 0 
            ? 'bg-rose-950/30 border-rose-500/50' 
            : 'bg-slate-900 border-slate-800'
        }`}>
          <div className="flex items-center justify-between text-xs font-bold mb-1">
            <span className={(shiftAnalytics?.overdue || 0) > 0 ? 'text-rose-300' : 'text-slate-400'}>
              Просрочено
            </span>
            <Flame className={`w-4 h-4 ${(shiftAnalytics?.overdue || 0) > 0 ? 'text-rose-400 animate-bounce' : 'text-slate-500'}`} />
          </div>
          <div className={`text-2xl font-black ${(shiftAnalytics?.overdue || 0) > 0 ? 'text-rose-400' : 'text-white'}`}>
            {shiftAnalytics?.overdue || 0}
          </div>
          <span className="text-[10px] text-slate-500">Требуют внимания</span>
        </div>

        <div className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800 shadow-md col-span-2 sm:col-span-1">
          <div className="flex items-center justify-between text-slate-400 text-xs font-bold mb-1">
            <span>Простой агрегатов</span>
            <AlertCircle className="w-4 h-4 text-orange-400" />
          </div>
          <div className="text-2xl font-black text-orange-400">
            {shiftAnalytics?.downtime_equipment_count || 2} ед.
          </div>
          <span className="text-[10px] text-slate-500">К-3, Насос 1ГрТ</span>
        </div>
      </div>

      {/* 2. Worker Status Strip (Section 5.2: зелёный — свободен, жёлтый — в работе, синий — есть очередь, серый — не на смене) */}
      <div className="p-3.5 bg-slate-900/80 rounded-2xl border border-slate-800 shadow-lg">
        <div className="flex items-center justify-between mb-2.5">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-amber-400" />
            <h3 className="font-extrabold text-xs uppercase tracking-wider text-slate-200">
              Статусы исполнителей смены (Раздел 5.2):
            </h3>
          </div>
          <div className="flex items-center gap-3 text-[11px] text-slate-400">
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> Свободен</span>
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-amber-500" /> В работе</span>
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-blue-500" /> Очередь</span>
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-slate-600" /> Не на смене</span>
          </div>
        </div>

        <div className="flex gap-2 overflow-x-auto pb-1.5 scrollbar-thin">
          {executors.map((worker) => {
            const statusConfig = {
              FREE: { color: 'border-emerald-500/60 bg-emerald-500/10 text-emerald-300', dot: 'bg-emerald-400' },
              BUSY: { color: 'border-amber-500/60 bg-amber-500/10 text-amber-300', dot: 'bg-amber-400' },
              HAS_QUEUE: { color: 'border-blue-500/60 bg-blue-500/10 text-blue-300', dot: 'bg-blue-400' },
              OFF_SHIFT: { color: 'border-slate-700 bg-slate-800/40 text-slate-500', dot: 'bg-slate-600' }
            }[worker.current_status] || { color: 'border-slate-700 text-slate-400', dot: 'bg-slate-500' };

            return (
              <div
                key={worker.id}
                className={`flex-shrink-0 px-3 py-2 rounded-xl border text-xs min-w-[170px] ${statusConfig.color}`}
              >
                <div className="flex items-center justify-between gap-1 mb-1">
                  <span className="font-bold text-white truncate">{worker.full_name.split(' ')[0]} {worker.full_name.split(' ')[1]}</span>
                  <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${statusConfig.dot}`} />
                </div>
                <div className="text-[11px] text-slate-400 truncate mb-1">
                  {worker.specialty} ({worker.rank} разр.)
                </div>
                {/* Status Switcher on click */}
                <select
                  value={worker.current_status}
                  onChange={(e) => onUpdateWorkerStatus(worker.id, e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded text-[10px] py-0.5 px-1 text-slate-200 focus:outline-none"
                >
                  <option value="FREE">Свободен</option>
                  <option value="BUSY">В работе</option>
                  <option value="HAS_QUEUE">Есть очередь</option>
                  <option value="OFF_SHIFT">Не на смене</option>
                </select>
              </div>
            );
          })}
        </div>
      </div>

      {/* 3. Action Bar: Create Order (1 minute / 6 clicks) + Filter Controls + View Toggle */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-slate-900/60 p-3 rounded-2xl border border-slate-800">
        {/* Create Order Button */}
        <button
          onClick={onOpenCreateModal}
          className="touch-btn bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-extrabold px-5 text-sm shadow-lg shadow-blue-500/25"
        >
          <Plus className="w-5 h-5 text-amber-300" />
          <span>ВЫДАТЬ НАРЯД (за 1 минуту / 6 кликов)</span>
        </button>

        {/* View Switcher: Kanban vs AI Analytics */}
        <div className="flex items-center gap-2">
          <div className="flex p-1 bg-slate-950 rounded-xl border border-slate-800">
            <button
              onClick={() => setActiveTab('kanban')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition ${
                activeTab === 'kanban' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Layers className="w-3.5 h-3.5" /> Канбан-доска
            </button>
            <button
              onClick={() => setActiveTab('analytics')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition ${
                activeTab === 'analytics' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              <BarChart2 className="w-3.5 h-3.5 text-amber-400" /> Аналитика ИИ
            </button>
          </div>
        </div>
      </div>

      {/* Filters Bar (Only on Kanban view) */}
      {activeTab === 'kanban' && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Поиск по номеру, оборудованию, исполнителю..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
            />
          </div>

          <select
            value={filterLocation}
            onChange={(e) => setFilterLocation(e.target.value)}
            className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-blue-500"
          >
            <option value="">Все участки</option>
            {locations.map((loc) => (
              <option key={loc.id} value={loc.id}>{loc.name}</option>
            ))}
          </select>

          <select
            value={filterPriority}
            onChange={(e) => setFilterPriority(e.target.value)}
            className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-blue-500"
          >
            <option value="">Все приоритеты</option>
            <option value="EMERGENCY">Аварийный</option>
            <option value="HIGH">Высокий</option>
            <option value="NORMAL">Обычный</option>
            <option value="PLANNED">Плановый</option>
          </select>
        </div>
      )}

      {/* Main Content Area */}
      {activeTab === 'kanban' ? (
        <KanbanBoard workOrders={filteredOrders} onSelectOrder={onSelectOrder} />
      ) : (
        <AnalyticsView />
      )}
    </div>
  );
}
