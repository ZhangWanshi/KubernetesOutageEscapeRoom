/* CommandChallenge.jsx — Room 5: drag kubectl command tokens into the correct slots. */
function CommandChallenge({ c, onReady }, ref) {
  const { parts, intro } = c;
  const n = parts.length;

  // slots[slotIdx] = partIdx placed there, or null
  const [slots, setSlots] = React.useState(() => Array(n).fill(null));

  // Tokens displayed in bank in a rotated order
  const bankOrder = React.useMemo(() => {
    const shift = Math.ceil(n / 2);
    return Array.from({ length: n }, (_, i) => (i + shift) % n);
  }, [n]);

  // drag: { src: 'bank'|'slot', partIdx, slotIdx? }
  const [drag, setDrag] = React.useState(null);
  const [dropTarget, setDropTarget] = React.useState(null);

  const placedSet = new Set(slots.filter(s => s !== null));
  const allFilled = slots.every(s => s !== null);

  React.useEffect(() => { onReady(allFilled); }, [allFilled]);

  React.useImperativeHandle(ref, () => ({
    getResult: () => ({
      isCorrect: slots.every((partIdx, i) => partIdx === i),
    }),
  }));

  const dropOnSlot = (targetIdx) => {
    if (!drag) return;
    setSlots(prev => {
      const next = [...prev];
      const partIdx = drag.src === 'slot' ? prev[drag.slotIdx] : drag.partIdx;
      if (drag.src === 'slot') next[drag.slotIdx] = null; // clear source slot
      // If target has something and source is bank, displace it back to bank
      // (just setting null first — it'll re-appear in bank)
      if (drag.src === 'bank') {
        const already = next.indexOf(drag.partIdx);
        if (already !== -1) next[already] = null;
      }
      next[targetIdx] = partIdx;
      return next;
    });
    setDrag(null);
    setDropTarget(null);
  };

  const dropOnBank = () => {
    if (!drag || drag.src !== 'slot') return;
    setSlots(prev => { const next = [...prev]; next[drag.slotIdx] = null; return next; });
    setDrag(null);
    setDropTarget(null);
  };

  return (
    <div className="challenge challenge-cmd">
      <p className="ch-intro">{intro}</p>

      {/* Token bank */}
      <div className="cmd-bank"
        onDragOver={e => e.preventDefault()}
        onDrop={dropOnBank}
        onDragLeave={() => setDropTarget(null)}>
        <span className="cmd-bank-label">Available tokens — drag into the command:</span>
        <div className="cmd-chips">
          {bankOrder.map(partIdx =>
            placedSet.has(partIdx) ? null : (
              <div key={partIdx} className="cmd-token"
                draggable
                onDragStart={() => setDrag({ src: 'bank', partIdx })}
                onDragEnd={() => { setDrag(null); setDropTarget(null); }}>
                {parts[partIdx]}
              </div>
            )
          )}
          {placedSet.size === n && (
            <span className="cmd-all-placed">All tokens placed</span>
          )}
        </div>
      </div>

      {/* Command builder row */}
      <div className="cmd-builder">
        <span className="cmd-prompt">$</span>
        <div className="cmd-slots">
          {slots.map((partIdx, slotIdx) => (
            <div key={slotIdx}
              className={
                'cmd-slot' +
                (partIdx !== null ? ' filled' : '') +
                (dropTarget === slotIdx ? ' hover' : '') +
                (drag ? ' accepting' : '')
              }
              onDragOver={e => { e.preventDefault(); setDropTarget(slotIdx); }}
              onDragLeave={() => setDropTarget(null)}
              onDrop={() => dropOnSlot(slotIdx)}
              draggable={partIdx !== null}
              onDragStart={() => partIdx !== null && setDrag({ src: 'slot', slotIdx, partIdx })}
              onDragEnd={() => { setDrag(null); setDropTarget(null); }}>
              {partIdx !== null
                ? <span className="cmd-slot-val">{parts[partIdx]}</span>
                : <span className="cmd-hole" />}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
window.CommandChallenge = React.forwardRef(CommandChallenge);
