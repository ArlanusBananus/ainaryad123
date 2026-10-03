import React, { useState, useEffect } from 'react';
import { 
  Sparkles, 
  AlertTriangle, 
  TrendingUp, 
  CheckCircle, 
  Flame, 
  Wrench, 
  Award, 
  BarChart3,
  Lightbulb,
  FileSpreadsheet
} from 'lucide-react';
import { fetchAnomalies, fetchWorkersRating, fetchShiftAnalytics } from '../services/api';

export default function AnalyticsView() {
  const [shiftData, setShiftData] = useState(null);
  const [anomalies, setAnomalies] = useState([]);
  const [workersRating, setWorkersRating] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetchShiftAnalytics(),
      fetchAnomalies(),
      fetchWorkersRating()
    ])
      .then(([shift, anom, rating]) => {
        setShiftData(shift);
        setAnomalies(anom);
        setWorkersRating(rating);
      })
      .catch((err) => console.error('Analytics load error:', err))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="py-12 flex flex-col items-center justify-center text-slate-400">
        <Sparkles className="w-8 h-8 text-amber-400 animate-spin mb-2" />
        <span className="text-sm font-semibold">ИИ анализирует историю нарядов и оборудование...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 1. Shift AI Summary Banner (Section 7 MVP) */}
      {shiftData && (
        <div className="p-4 rounded-2xl bg-gradient-to-r from-blue-950/60 via-indigo-950/40 to-slate-900 border border-blue-500/30 shadow-xl">
          <div className="flex items-start gap-3">
            <div className="p-2.5 rounded-xl bg-blue-500/20 text-blue-400 border border-blue-500/30 shrink-0">
              <Sparkles className="w-6 h-6 text-amber-400" />
            </div>
            <div>
              <h3 className="font-extrabold text-base text-white flex items-center gap-2">
                Сводка ИИ «Цифровой контролёр смены»
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300">
                  Раздел 6.5
                </span>
              </h3>
              <p className="text-sm text-slate-300 mt-1 leading-relaxed">
                {shiftData.ai_summary_text}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 2. AI Anomalies and Equipment Failure Patterns (Section 6.5 & Section 8 demo points) */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-extrabold text-sm uppercase tracking-wider text-slate-300 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-400" />
            Выявленные аномалии оборудования и рекомендации ИИ (история за 3 месяца)
          </h3>
          <span className="text-xs text-amber-400 font-bold">
            Закономерности подтверждены ИИ
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {anomalies.map((anom) => (
            <div
              key={anom.id}
              className={`p-4 rounded-2xl border shadow-lg ${
                anom.severity === 'CRITICAL' ? 'bg-rose-950/20 border-rose-500/40' :
                anom.severity === 'HIGH' ? 'bg-amber-950/20 border-amber-500/40' :
                'bg-slate-800/60 border-slate-700/60'
              }`}
            >
              <div className="flex items-start justify-between gap-2 mb-2">
                <div>
                  <h4 className="font-extrabold text-sm text-white">{anom.title}</h4>
                  <span className="text-xs text-slate-400 font-medium">{anom.equipment} • {anom.location}</span>
                </div>
                <span className={`px-2 py-0.5 rounded text-[10px] font-black shrink-0 ${
                  anom.severity === 'CRITICAL' ? 'bg-rose-600 text-white' :
                  anom.severity === 'HIGH' ? 'bg-amber-500 text-slate-950' :
                  'bg-blue-600 text-white'
                }`}>
                  {anom.severity}
                </span>
              </div>

              {/* Metric */}
              <div className="px-2.5 py-1.5 rounded-lg bg-black/30 border border-white/5 text-xs text-amber-300 font-mono font-bold mb-2.5">
                Статистика: {anom.metric}
              </div>

              {/* AI Recommendation */}
              <div className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800 text-xs text-slate-300 flex items-start gap-2">
                <Lightbulb className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <p className="leading-relaxed">
                  <span className="font-bold text-amber-300">Рекомендация ИИ: </span>
                  {anom.ai_recommendation}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 3. Worker Rankings and Quality Ratings (Section 6.6 MVP) */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-extrabold text-sm uppercase tracking-wider text-slate-300 flex items-center gap-2">
            <Award className="w-4 h-4 text-amber-400" />
            Рейтинг исполнителей смены и оценка качества (Раздел 6.6)
          </h3>
          <span className="text-xs text-slate-400">Формула: Качество ИИ + Сроки + Доработки</span>
        </div>

        <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-900 shadow-xl">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-800/80 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">Сотрудник</th>
                <th className="py-3 px-3">Специальность</th>
                <th className="py-3 px-3">Бригада</th>
                <th className="py-3 px-3 text-center">Общий балл</th>
                <th className="py-3 px-3 text-center">В срок %</th>
                <th className="py-3 px-3 text-center">Качество ИИ</th>
                <th className="py-3 px-3 text-center">Доработки</th>
                <th className="py-3 px-4">Пояснение ИИ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-medium">
              {workersRating.map((w, index) => (
                <tr key={w.user_id} className="hover:bg-slate-850 transition">
                  <td className="py-3 px-4 flex items-center gap-2 font-bold text-white">
                    <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black ${
                      index === 0 ? 'bg-amber-400 text-slate-950' :
                      index === 1 ? 'bg-slate-300 text-slate-950' :
                      index === 2 ? 'bg-amber-700 text-white' : 'bg-slate-800 text-slate-400'
                    }`}>
                      {index + 1}
                    </span>
                    <span>{w.full_name}</span>
                  </td>
                  <td className="py-3 px-3 text-slate-300">{w.specialty}</td>
                  <td className="py-3 px-3 text-slate-400">{w.brigade}</td>
                  <td className="py-3 px-3 text-center">
                    <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-black text-xs">
                      {w.overall_score}%
                    </span>
                  </td>
                  <td className="py-3 px-3 text-center font-bold text-slate-200">
                    {w.on_time_pct}%
                  </td>
                  <td className="py-3 px-3 text-center font-bold text-amber-400">
                    {w.quality_score}/100
                  </td>
                  <td className="py-3 px-3 text-center">
                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                      w.rework_rate_pct > 10 ? 'bg-rose-500/20 text-rose-300' : 'text-slate-400'
                    }`}>
                      {w.rework_rate_pct}%
                    </span>
                  </td>
                  <td className="py-3 px-4 text-slate-400 text-[11px] max-w-xs">
                    {w.ai_feedback}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
