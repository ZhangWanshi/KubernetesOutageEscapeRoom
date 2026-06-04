/* RearrangeChallenge.jsx — Rooms 4 & 6: drag list cards into the correct order. */
function RearrangeChallenge({ c, onReady }, ref) {
  const { steps, intro } = c;

  // Initial order: rotated by ceil(n/2) so it's never pre-sorted
  const [order, setOrder] = React.useState(() => {
    const n = steps.length;
    const shift = Math.ceil(n / 2);
    return Array.from({ length: n }, (_, i) => (i + shift) % n);
  });
  const [dragSrc, setDragSrc] = React.useState(null);

  // Always ready to submit (user can submit in any order)
  React.useEffect(() => { onReady(true); }, []);

  React.useImperativeHandle(ref, () => ({
    getResult: () => ({
      isCorrect: order.every((stepIdx, pos) => stepIdx === pos),
    }),
  }));

  const handleDragStart = (e, pos) => {
    setDragSrc(pos);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e, targetPos) => {
    e.preventDefault();
    if (dragSrc === null || dragSrc === targetPos) return;
    setOrder(prev => {
      const n = [...prev];
      const [item] = n.splice(dragSrc, 1);
      n.splice(targetPos, 0, item);
      return n;
    });
    setDragSrc(targetPos);
  };

  const handleDragEnd = () => setDragSrc(null);

  return (
    <div className="challenge challenge-seq">
      <p className="ch-intro">{intro}</p>
      <div className="seq-list">
        {order.map((stepIdx, pos) => (
          <div key={stepIdx}
            className={'seq-card' + (dragSrc === pos ? ' seq-dragging' : '')}
            draggable
            onDragStart={e => handleDragStart(e, pos)}
            onDragOver={e => handleDragOver(e, pos)}
            onDragEnd={handleDragEnd}>
            <span className="seq-n">{pos + 1}</span>
            <span className="seq-grip">⠿</span>
            <span className="seq-text">{steps[stepIdx]}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
window.RearrangeChallenge = React.forwardRef(RearrangeChallenge);
