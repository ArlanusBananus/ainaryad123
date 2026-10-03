import React from 'react';
import { 
  Flame, 
  Clock, 
  AlertCircle, 
  CheckCircle2, 
  Sparkles, 
  UserCheck, 
  Wrench,
  ChevronRight,
  RotateCcw
} from 'lucide-react';

const COLUMNS = [
  { id: 'issued', title: 'Выданы', statuses: ['ISSUED'], color: 'border-blue-500/40 text-blue-400 bg-blue-500/5' },
  { id: 'accepted_queue', title: 'Приняты / В очереди', statuses: ['ACCEPTED', 'QUEUED'], color: 'border-teal-500/40 text-teal-400 bg-teal-500/5' },
  { id: 'in_progress', title: 'В работе / Пауза', statuses: ['IN_PROGRESS', 'SUSPENDED'], color: 'border-amber-500/40 text-amber-400 bg-amber-500/5' },
  { id: 'ai_check', title: 'Проверка ИИ / Доработка', statuses: ['AI_CHECK', 'REWORK'], color: 'border-purple-500/40 text-purple-400 bg-purple-500/5' },
  { id: 'done', title: 'Выполнены / Закрыты', statuses: ['EXECUTED', 'CLOSED'], color: 'border-emerald-500/40 text-emerald-400 bg-emerald-500/5' },
];

export default function KanbanBoard({ workOrders, onSelectOrder }) {
  const getOrdersForColumn = (statuses) => {
    return workOrders.filter((o) => statuses.includes(o.status));
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-3.5 overflow-x-auto pb-4">
      {COLUMNS.map((col) => {
        const orders = getOrdersForColumn(col.statuses);
        return (
          <div
            key={col.id}
            className="flex flex-col bg-slate-900/70 border border-slate-800 rounded-2xl min-w-[260px] overflow-hidden"
          >
            {/* Column Header */}
            <div className={`px-3.5 py-2.5 border-b flex items-center justify-between ${col.color}`}>
              <span className="font-extrabold text-xs uppercase tracking-wider">
                {col.title}
              </span>
              <span className="w-5 h-5 rounded-full bg-slate-800 text-slate-200 text-xs font-bold flex items-center justify-center">
                {orders.length}
              </span>
            </div>

            {/* Orders Stack */}
            <div className="p-2 space-y-2.5 flex-1 min-h-[350px] overflow-y-auto">
              {orders.length === 0 ? (
                <div className="h-28 flex items-center justify-center text-xs text-slate-600 border border-dashed border-slate-800/80 rounded-xl">
                  Нет нарядов
                </div>
              ) : (
                orders.map((order) => {
                  const isEmergency = order.priority === 'EMERGENCY' || order.order_type === 'EMERGENCY';
                  return (
                    <div
                      key={order.id}
                      onClick={() => onSelectOrder(order)}
                      className={`p-3 rounded-xl bg-slate-800/90 hover:bg-slate-750 border transition-all cursor-pointer shadow-md hover:shadow-lg relative group ${
                        isEmergency && order.status !== 'CLOSED'
                          ? 'border-rose-500/80 bg-rose-950/20 emergency-glow'
                          : 'border-slate-700/80 hover:border-slate-600'
                      }`}
                    >
                      {/* Top Badges */}
                      <div className="flex items-center justify-between gap-1.5 mb-2">
                        <span className="font-mono text-xs font-black text-white">
                          {order.number}
                        </span>
                        <div className="flex items-center gap-1">
                          {isEmergency && (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-black bg-rose-600 text-white flex items-center gap-0.5 animate-pulse">
                              <Flame className="w-3 h-3" /> АВАРИЙНЫЙ
                            </span>
                          )}
                          {order.is_overdue && (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40">
                              ПРОСРОЧЕН
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Equipment */}
                      <div className="text-xs font-bold text-slate-100 truncate">
                        {order.equipment_name}
                      </div>
                      <div className="text-[11px] text-slate-400 truncate mb-2">
                        {order.location_name}
                      </div>

                      {/* Description preview */}
                      <p className="text-[11px] text-slate-300 line-clamp-2 mb-2.5">
                        {order.description}
                      </p>

                      {/* Footer: Executor & AI badge */}
                      <div className="pt-2 border-t border-slate-700/60 flex items-center justify-between text-[11px]">
                        <div className="flex items-center gap-1 text-slate-300">
                          <UserCheck className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                          <span className="truncate max-w-[110px] font-medium">
                            {order.executor_name?.split(' ')[0]} {order.executor_name?.split(' ')[1]}
                          </span>
                        </div>

                        {order.ai_score ? (
                          <span className={`px-1.5 py-0.5 rounded font-bold text-[10px] flex items-center gap-0.5 ${
                            order.ai_verdict === 'APPROVED' ? 'bg-emerald-500/20 text-emerald-300' :
                            order.ai_verdict === 'REWORK_REQUIRED' ? 'bg-rose-500/20 text-rose-300' :
                            'bg-amber-500/20 text-amber-300'
                          }`}>
                            <Sparkles className="w-2.5 h-2.5" /> {order.ai_score}
                          </span>
                        ) : (
                          <span className="text-[10px] text-slate-400 flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {new Date(order.deadline).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        )}
                      </div>

                      {/* Hover Arrow */}
                      <div className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition text-blue-400">
                        <ChevronRight className="w-4 h-4" />
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
