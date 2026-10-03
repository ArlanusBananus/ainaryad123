import React, { useState } from 'react';
import { 
  X, 
  CheckCircle, 
  Camera, 
  Plus, 
  Trash2, 
  Sparkles, 
  AlertCircle,
  FileCheck2,
  Clock
} from 'lucide-react';
import { uploadPhoto } from '../services/api';

export default function CloseWorkOrderModal({
  isOpen,
  onClose,
  workOrder,
  malfunctionCodes,
  materialsCatalog,
  onSubmitClose
}) {
  const [completionNotes, setCompletionNotes] = useState('');
  const [selectedMalfunctionCodeId, setSelectedMalfunctionCodeId] = useState('');
  const [selectedMaterials, setSelectedMaterials] = useState([]);
  const [materialSelectId, setMaterialSelectId] = useState('');
  const [materialQty, setMaterialQty] = useState(1);
  const [photoUrl, setPhotoUrl] = useState('');
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [actualMinutes, setActualMinutes] = useState(60);
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen || !workOrder) return null;

  const isEmergency = workOrder.order_type === 'EMERGENCY' || workOrder.priority === 'EMERGENCY';

  const handleAddMaterial = () => {
    if (!materialSelectId) return;
    const item = materialsCatalog.find((m) => m.id === Number(materialSelectId));
    if (!item) return;

    setSelectedMaterials([
      ...selectedMaterials,
      {
        material_id: item.id,
        material_name: item.name,
        quantity: Number(materialQty),
        unit: item.unit
      }
    ]);
    setMaterialSelectId('');
    setMaterialQty(1);
  };

  const handleRemoveMaterial = (index) => {
    setSelectedMaterials(selectedMaterials.filter((_, i) => i !== index));
  };

  const handlePhotoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploadingPhoto(true);
    try {
      const res = await uploadPhoto(file);
      setPhotoUrl(res.photo_url);
    } catch (err) {
      alert('Ошибка при загрузке фото');
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!completionNotes.trim()) {
      alert('Пожалуйста, опишите выполненные работы');
      return;
    }

    setSubmitting(true);
    try {
      await onSubmitClose(workOrder.id, {
        completion_notes: completionNotes.trim(),
        malfunction_code_id: selectedMalfunctionCodeId ? Number(selectedMalfunctionCodeId) : null,
        materials: selectedMaterials,
        photo_url: photoUrl || null,
        actual_duration_minutes: Number(actualMinutes),
        user_id: workOrder.executor_id
      });
      onClose();
    } catch (err) {
      alert(err.message || 'Ошибка отправки отчета');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/80 backdrop-blur-sm overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden my-auto">
        {/* Header */}
        <div className="px-5 py-4 bg-emerald-950/40 border-b border-emerald-800/40 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              <FileCheck2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-extrabold text-lg text-white">
                Форма закрытия наряда <span className="text-emerald-400">{workOrder.number}</span>
              </h2>
              <p className="text-xs text-slate-400">
                {workOrder.equipment_name} • {workOrder.location_name}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4 max-h-[80vh] overflow-y-auto">
          {/* Emergency Warning */}
          {isEmergency && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-start gap-2.5 text-xs text-rose-300">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold">Внимание: для внепланового наряда фото «ПОСЛЕ» обязательно!</span>
                <p className="text-rose-400/80 text-[11px] mt-0.5">
                  ИИ-контролёр автоматически вернёт наряд на доработку, если фотоотчёт не будет прикреплён.
                </p>
              </div>
            </div>
          )}

          {/* 1. Completed Works Description */}
          <div>
            <label className="text-xs font-bold text-slate-300 mb-1 block">
              Выполненные работы (подробно) *
            </label>
            <textarea
              rows={3}
              required
              value={completionNotes}
              onChange={(e) => setCompletionNotes(e.target.value)}
              placeholder="Опишите, какие действия проведены: демонтаж, замена сальника, промывка, центровка, контрольный пуск..."
              className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
            />
          </div>

          {/* 2. Malfunction Code & Actual Time */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-slate-300 mb-1 block">
                Шифр неисправности (справочник) *
              </label>
              <select
                value={selectedMalfunctionCodeId}
                onChange={(e) => setSelectedMalfunctionCodeId(e.target.value)}
                required
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-emerald-500"
              >
                <option value="">Выберите шифр...</option>
                {malfunctionCodes.map((code) => (
                  <option key={code.id} value={code.id}>
                    {code.code}: {code.description} ({code.category})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-300 mb-1 block flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-emerald-400" />
                Фактическое время (минут) *
              </label>
              <input
                type="number"
                min="5"
                max="720"
                value={actualMinutes}
                onChange={(e) => setActualMinutes(Number(e.target.value))}
                required
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          {/* 3. Materials & Spare Parts */}
          <div className="bg-slate-800/40 border border-slate-700 rounded-xl p-3 space-y-2">
            <label className="text-xs font-bold text-slate-300 block">
              Списание материалов и запчастей (ТМЦ)
            </label>

            <div className="flex gap-2">
              <select
                value={materialSelectId}
                onChange={(e) => setMaterialSelectId(e.target.value)}
                className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none"
              >
                <option value="">Выбрать материал из каталога...</option>
                {materialsCatalog.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name} ({m.unit}) • {m.category}
                  </option>
                ))}
              </select>

              <input
                type="number"
                min="0.1"
                step="0.5"
                value={materialQty}
                onChange={(e) => setMaterialQty(e.target.value)}
                className="w-16 bg-slate-800 border border-slate-700 rounded-lg px-2 py-1.5 text-xs text-center text-white focus:outline-none"
              />

              <button
                type="button"
                onClick={handleAddMaterial}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold flex items-center gap-1 transition"
              >
                <Plus className="w-3.5 h-3.5" /> Добавить
              </button>
            </div>

            {/* Added Materials List */}
            {selectedMaterials.length > 0 && (
              <div className="space-y-1.5 pt-1">
                {selectedMaterials.map((item, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between px-2.5 py-1.5 bg-slate-800 rounded-lg text-xs border border-slate-700"
                  >
                    <span className="text-slate-200 font-medium">
                      {item.material_name}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-bold">
                        {item.quantity} {item.unit}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleRemoveMaterial(idx)}
                        className="text-slate-400 hover:text-rose-400 p-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 4. Photo "AFTER" */}
          <div className="border border-dashed border-slate-700 rounded-xl p-3 bg-slate-800/40">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Camera className="w-4 h-4 text-emerald-400" />
                <div>
                  <span className="text-xs font-semibold text-slate-200 block">
                    Фото выполненного ремонта «ПОСЛЕ» {isEmergency && <span className="text-rose-400">*</span>}
                  </span>
                  <span className="text-[10px] text-slate-400">
                    Мультимодальный анализ устранения неисправности
                  </span>
                </div>
              </div>

              <label className="cursor-pointer px-3 py-1.5 bg-emerald-700 hover:bg-emerald-600 rounded-lg text-xs font-semibold text-white transition">
                {isUploadingPhoto ? 'Загрузка...' : photoUrl ? '✓ Фото загружено' : 'Сделать снимок'}
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={handlePhotoUpload}
                  className="hidden"
                />
              </label>
            </div>

            {photoUrl && (
              <div className="mt-2.5 flex items-center gap-2">
                <img src={photoUrl} alt="After" className="w-16 h-16 object-cover rounded-xl border border-emerald-500" />
                <span className="text-xs text-emerald-400 font-semibold">
                  Фото готово к сверке с фото «ДО»
                </span>
              </div>
            )}
          </div>

          {/* Submit */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={submitting}
              className="touch-btn-lg w-full bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 hover:from-emerald-500 text-white font-black text-base shadow-xl shadow-emerald-600/30"
            >
              <Sparkles className="w-5 h-5 text-amber-300" />
              <span>{submitting ? 'Проверка ИИ...' : 'ОТПРАВИТЬ НА ПРОВЕРКУ ИИ'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
