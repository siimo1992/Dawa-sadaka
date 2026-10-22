import React from 'react';

export type SearchActivityPhase =
  | 'searching'
  | 'reviewing'
  | 'answering'
  | 'search'
  | 'review'
  | 'verify'
  | 'answer'
  | string;

interface SearchActivityProps {
  active: boolean;
  phase?: SearchActivityPhase;
  label?: string;
  lang?: string;
  secondsElapsed?: number;
}

const labelsAr: Record<'searching' | 'reviewing' | 'answering', string> = {
  searching: "نبحث في المصادر",
  reviewing: "نراجع النتائج",
  answering: "نحضّر الإجابة"
};

const labelsFr: Record<'searching' | 'reviewing' | 'answering', string> = {
  searching: "Recherche dans les sources",
  reviewing: "Examen des résultats",
  answering: "Préparation de la réponse"
};

const labelsEn: Record<'searching' | 'reviewing' | 'answering', string> = {
  searching: "Searching sources",
  reviewing: "Reviewing results",
  answering: "Preparing answer"
};

export default function SearchActivity({
  active,
  phase = "searching",
  label,
  lang = "ar",
  secondsElapsed
}: SearchActivityProps) {
  if (!active) return null;

  const normalizedPhase: 'searching' | 'reviewing' | 'answering' =
    phase === 'search' || phase === 'searching'
      ? 'searching'
      : phase === 'answer' || phase === 'answering'
      ? 'answering'
      : 'reviewing';

  const currentLabels = lang === 'fr' ? labelsFr : lang === 'en' ? labelsEn : labelsAr;
  const labelText = label || currentLabels[normalizedPhase] || currentLabels.searching;

  return (
    <div className="td-search-activity" role="status" aria-live="polite">
      <span className="td-search-activity__icon" aria-hidden="true">
        <span className="td-search-activity__ring" />
        <img src="/icon.svg" alt="Tidikelt AI" />
      </span>

      <span className="td-search-activity__text">
        <span>{labelText}</span>
        <span className="td-search-activity__dots" aria-hidden="true">
          <i />
          <i />
          <i />
        </span>
      </span>
    </div>
  );
}
