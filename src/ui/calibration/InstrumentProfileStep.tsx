export function InstrumentProfileStep({ onNext }: { onNext: () => void }) {
  return (
    <div>
      <p>Coming in the chord-detection update.</p>
      <button className="btn big" onClick={onNext}>
        Next
      </button>
    </div>
  );
}
