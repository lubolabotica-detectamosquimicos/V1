import React, { useState, useMemo } from 'react';
import { Search, X, Filter, Sparkles, BookOpen, ShieldCheck, AlertTriangle, AlertOctagon } from 'lucide-react';
import { Ingredient, TrafficLight } from '../types';
import { searchIngredientsLocally } from '../services/ingredientMatcher';
import { TrafficLightBadge } from './TrafficLightBadge';

interface Props {
  ingredients: Ingredient[];
  onSelectIngredient?: (ing: Ingredient) => void;
}

export const ManualSearchView: React.FC<Props> = ({ ingredients }) => {
  const [query, setQuery] = useState<string>('');
  const [selectedFilter, setSelectedFilter] = useState<'all' | TrafficLight>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  // Distinct categories
  const categories = useMemo(() => {
    const set = new Set<string>();
    ingredients.forEach((i) => {
      if (i.category) set.add(i.category);
    });
    return Array.from(set).sort();
  }, [ingredients]);

  // Filtered ingredients
  const filteredList = useMemo(() => {
    let result = searchIngredientsLocally(query, ingredients);

    if (selectedFilter !== 'all') {
      result = result.filter((item) => item.trafficLight === selectedFilter);
    }

    if (selectedCategory !== 'all') {
      result = result.filter((item) => item.category === selectedCategory);
    }

    return result;
  }, [query, ingredients, selectedFilter, selectedCategory]);

  const counts = useMemo(() => {
    return {
      all: ingredients.length,
      green: ingredients.filter((i) => i.trafficLight === 'green').length,
      yellow: ingredients.filter((i) => i.trafficLight === 'yellow').length,
      red: ingredients.filter((i) => i.trafficLight === 'red').length,
    };
  }, [ingredients]);

  const quickExamples = ['Aloe Vera', 'Glicerina', 'Dimethicone', 'Parabenos', 'SLES', 'Salicylic Acid', 'Retinol', 'BHT'];

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-12">
      {/* Title & Description */}
      <div>
        <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2">
          <Search className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
          <span>Búsqueda Manual & Semáforo Lubo</span>
        </h2>
        <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-1">
          Escribe cualquier ingrediente por nombre común o nomenclatura INCI. La clasificación por semáforo se realiza
          al instante leyendo el archivo base local, garantizando privacidad y velocidad sin conexión.
        </p>
      </div>

      {/* Main Search Input */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 shadow-sm space-y-3">
        <div className="relative">
          <Search className="w-5 h-5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Escribe un ingrediente (ej. Glicerina, Parabenos, SLES, Retinol, Dimethicone)..."
            className="w-full pl-11 pr-10 py-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Quick test buttons */}
        <div className="flex items-center gap-1.5 flex-wrap pt-1 text-xs">
          <span className="text-slate-500 text-[11px] font-medium mr-1">Pruebas rápidas:</span>
          {quickExamples.map((ex) => (
            <button
              key={ex}
              onClick={() => setQuery(ex)}
              className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-emerald-50 dark:hover:bg-emerald-950 hover:text-emerald-700 dark:hover:text-emerald-300 text-slate-700 dark:text-slate-300 font-medium transition-colors cursor-pointer text-[11px]"
            >
              {ex}
            </button>
          ))}
        </div>
      </div>

      {/* Filter Tabs & Selectors */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Traffic Light Filter */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
          <button
            onClick={() => setSelectedFilter('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap cursor-pointer transition-all ${
              selectedFilter === 'all'
                ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-xs'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            Todos ({counts.all})
          </button>
          <button
            onClick={() => setSelectedFilter('green')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap cursor-pointer transition-all flex items-center gap-1.5 ${
              selectedFilter === 'green'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800/60'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span>Verdes ({counts.green})</span>
          </button>
          <button
            onClick={() => setSelectedFilter('yellow')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap cursor-pointer transition-all flex items-center gap-1.5 ${
              selectedFilter === 'yellow'
                ? 'bg-amber-500 text-white shadow-xs'
                : 'bg-amber-50 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200/60 dark:border-amber-800/60'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-amber-500" />
            <span>Amarillos ({counts.yellow})</span>
          </button>
          <button
            onClick={() => setSelectedFilter('red')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap cursor-pointer transition-all flex items-center gap-1.5 ${
              selectedFilter === 'red'
                ? 'bg-rose-600 text-white shadow-xs'
                : 'bg-rose-50 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200/60 dark:border-rose-800/60'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-rose-500" />
            <span>Rojos ({counts.red})</span>
          </button>
        </div>

        {/* Category dropdown */}
        <div className="flex items-center gap-2">
          <Filter className="w-3.5 h-3.5 text-slate-400" />
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="text-xs py-1.5 px-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none cursor-pointer"
          >
            <option value="all">Todas las categorías</option>
            {categories.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Results Count Info */}
      <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center justify-between">
        <span>Mostrando {filteredList.length} ingredientes en la base interna Lubo</span>
        {query && <span>Filtrado por: "{query}"</span>}
      </div>

      {/* Ingredient Cards Grid */}
      <div className="grid grid-cols-1 gap-3.5">
        {filteredList.map((ing) => (
          <div
            key={ing.id}
            className={`p-5 rounded-2xl border transition-all ${
              ing.trafficLight === 'green'
                ? 'bg-white dark:bg-slate-900 border-emerald-200 dark:border-emerald-900/60 hover:border-emerald-400'
                : ing.trafficLight === 'yellow'
                ? 'bg-white dark:bg-slate-900 border-amber-200 dark:border-amber-900/60 hover:border-amber-400'
                : 'bg-white dark:bg-slate-900 border-rose-200 dark:border-rose-900/60 hover:border-rose-400'
            }`}
          >
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2.5 flex-wrap">
                  <TrafficLightBadge status={ing.trafficLight || (ing.tier === 'optimal' || ing.tier === 'healthy' ? 'green' : ing.tier === 'caution' ? 'yellow' : 'red')} size="md" />
                  <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                    {ing.name}
                  </h3>
                  <span className="text-xs font-mono text-slate-500 dark:text-slate-400">
                    INCI: {ing.inciName || ing.name}
                  </span>
                </div>

                <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                  <span className="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                    {ing.category}
                  </span>
                  <span className="text-[11px] px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-500 capitalize">
                    Origen: {ing.origin}
                  </span>
                  {(ing.synonyms || []).length > 0 && (
                    <span className="text-[11px] text-slate-400 truncate max-w-xs">
                      Sinónimos: {(ing.synonyms || []).join(', ')}
                    </span>
                  )}
                </div>
              </div>

              {/* Lubo Score Badge */}
              <div
                className={`self-start sm:self-auto px-3 py-1.5 rounded-xl border text-center shrink-0 ${
                  ing.trafficLight === 'green'
                    ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300'
                    : ing.trafficLight === 'yellow'
                    ? 'bg-amber-50 dark:bg-amber-950/60 border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300'
                    : 'bg-rose-50 dark:bg-rose-950/60 border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300'
                }`}
              >
                <div className="text-[10px] font-bold uppercase tracking-wider">Score Lubo</div>
                <div className="text-base font-extrabold">{ing.score} / 10</div>
              </div>
            </div>

            {/* Description */}
            <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 mt-3 leading-relaxed">
              {ing.description}
            </p>

            {/* Risks & Alternative */}
            <div className="mt-3.5 pt-3 border-t border-slate-100 dark:border-slate-800 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              <div className="bg-slate-50 dark:bg-slate-950/60 p-2.5 rounded-xl border border-slate-200/50 dark:border-slate-800">
                <span className="font-bold text-slate-800 dark:text-slate-200 block mb-0.5">
                  Riesgos y Sensibilidad:
                </span>
                <span className="text-slate-600 dark:text-slate-400">{ing.risks || ing.riskNote || 'Sin riesgos reportados.'}</span>
              </div>

              <div className="bg-emerald-50/50 dark:bg-emerald-950/30 p-2.5 rounded-xl border border-emerald-200/60 dark:border-emerald-800/40">
                <span className="font-bold text-emerald-800 dark:text-emerald-300 block mb-0.5 flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5" />
                  Alternativa Limpia Lubo:
                </span>
                <span className="text-emerald-700 dark:text-emerald-400">
                  {ing.recommendedAlternative || 'Ingrediente natural de referencia.'}
                </span>
              </div>
            </div>
          </div>
        ))}

        {filteredList.length === 0 && (
          <div className="text-center py-12 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-8">
            <BookOpen className="w-10 h-10 text-slate-400 mx-auto mb-3" />
            <h4 className="text-sm font-bold text-slate-900 dark:text-white">
              No se encontró "{query}" en la base interna
            </h4>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              Puedes agregar este ingrediente en el <strong>Panel Admin</strong> o importarlo desde tu archivo CSV de
              OneDrive.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
