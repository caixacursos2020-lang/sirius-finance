import { useMemo, useState, type ReactNode } from "react";

type Slide = {
  id: string;
  title: string;
  content: ReactNode;
};

export default function InsightCarousel({ slides }: { slides: Slide[] }) {
  const validSlides = useMemo(() => slides.filter(Boolean), [slides]);
  const [currentIndex, setCurrentIndex] = useState(0);

  if (!validSlides.length) return null;

  const goPrev = () => {
    setCurrentIndex((prev) => (prev === 0 ? validSlides.length - 1 : prev - 1));
  };

  const goNext = () => {
    setCurrentIndex((prev) => (prev === validSlides.length - 1 ? 0 : prev + 1));
  };

  const currentSlide = validSlides[currentIndex];

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900 p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-slate-500">Painel de insights</p>
          <h2 className="text-lg font-semibold">{currentSlide.title}</h2>
        </div>
        <div className="flex items-center gap-2">
          <button
            className="rounded-md border border-slate-700 px-2 py-1 text-sm hover:border-emerald-500"
            onClick={goPrev}
            aria-label="Slide anterior"
          >
            {"<"}
          </button>
          <button
            className="rounded-md border border-slate-700 px-2 py-1 text-sm hover:border-emerald-500"
            onClick={goNext}
            aria-label="Próximo slide"
          >
            {">"}
          </button>
        </div>
      </div>

      <div>{currentSlide.content}</div>

      <div className="flex items-center justify-center gap-2">
        {validSlides.map((slide, idx) => {
          const active = idx === currentIndex;
          return (
            <button
              key={slide.id}
              onClick={() => setCurrentIndex(idx)}
              className={`h-2.5 w-2.5 rounded-full border transition ${
                active
                  ? "border-emerald-400 bg-emerald-400"
                  : "border-slate-600 bg-slate-800 hover:border-emerald-400"
              }`}
              aria-label={`Ir para ${slide.title}`}
            />
          );
        })}
      </div>
    </div>
  );
}
