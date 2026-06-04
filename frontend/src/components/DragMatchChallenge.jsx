/* DragMatchChallenge.jsx — Room 3 challenge: drag K8s terms onto definition slots. */
function DragMatchChallenge({ c, onReady }, ref) {
  const { pairs, intro } = c;
  // slots[defIdx] = termIdx matched to that definition, or null
  const [slots, setSlots] = React.useState(() => pairs.map(() => null));
  const [dragging, setDragging] = React.useState(null); // termIdx currently being dragged
  const [dragOver, setDragOver] = React.useState(null); // defIdx being hovered

  const usedTerms = new Set(slots.filter(s => s !== null));
  const allMatched = slots.every(s => s !== null);

  // Display terms in a rotated order so they're not pre-sorted
  const termDisplay = React.useMemo(() => {
    const n = pairs.length;
    const shift = Math.ceil(n / 2);
    return Array.from({ length: n }, (_, i) => (i + shift) % n);
  }, [pairs.length]);

  React.useEffect(() => { onReady(allMatched); }, [allMatched]);

  React.useImperativeHandle(ref, () => ({
    getResult: () => ({
      isCorrect: slots.every((termIdx, defIdx) => termIdx === defIdx),
    }),
  }));

  const handleDrop = (defIdx) => {
    if (dragging === null) return;
    setSlots(prev => {
      const n = [...prev];
      // Remove this term from wherever it already is
      for (let i = 0; i < n.length; i++) if (n[i] === dragging) n[i] = null;
      n[defIdx] = dragging;
      return n;
    });
    setDragging(null);
    setDragOver(null);
  };

  const removeMatch = (defIdx) =>
    setSlots(prev => { const n = [...prev]; n[defIdx] = null; return n; });

  return (
    <div className="challenge challenge-match">
      <p className="ch-intro">{intro}</p>

      <div className="dm-bank">
        <span className="dm-bank-label">Drag a term onto its definition:</span>
        <div className="dm-chips">
          {termDisplay.map(termIdx =>
            usedTerms.has(termIdx) ? null : (
              <div key={termIdx} className="dm-chip"
                draggable
                onDragStart={() => setDragging(termIdx)}
                onDragEnd={() => { setDragging(null); setDragOver(null); }}>
                {pairs[termIdx].term}
              </div>
            )
          )}
          {usedTerms.size === pairs.length && (
            <span className="dm-all-done">All matched ✓</span>
          )}
        </div>
      </div>

      <div className="dm-slots">
        {pairs.map((pair, defIdx) => (
          <div key={defIdx}
            className={
              'dm-slot' +
              (slots[defIdx] !== null ? ' filled' : '') +
              (dragOver === defIdx ? ' hover' : '') +
              (dragging !== null ? ' accepting' : '')
            }
            onDragOver={e => { e.preventDefault(); setDragOver(defIdx); }}
            onDragLeave={() => setDragOver(null)}
            onDrop={() => handleDrop(defIdx)}>
            <span className="dm-def-text">{pair.definition}</span>
            <div className="dm-term-zone">
              {slots[defIdx] !== null ? (
                <span className="dm-chip placed" onClick={() => removeMatch(defIdx)}>
                  {pairs[slots[defIdx]].term}
                  <span className="dm-remove"> ✕</span>
                </span>
              ) : (
                <span className="dm-empty-hint">drop here</span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
window.DragMatchChallenge = React.forwardRef(DragMatchChallenge);
