/* FillBlankChallenge.jsx — Room 2 challenge: fill in missing YAML values. */
function FillBlankChallenge({ c, onReady }, ref) {
  const [values, setValues] = React.useState(() => c.blanks.map(() => ''));

  React.useEffect(() => {
    onReady(values.every(v => v.trim() !== ''));
  }, [values]);

  React.useImperativeHandle(ref, () => ({
    getResult: () => ({
      isCorrect: c.blanks.every((b, i) =>
        values[i].trim().toLowerCase() === b.answer.toLowerCase()
      ),
    }),
  }));

  const update = (i, v) =>
    setValues(prev => { const n = [...prev]; n[i] = v; return n; });

  const renderLine = (line) => {
    const parts = line.split(/(\[blank \d+\])/g);
    return parts.map((part, j) =>
      /^\[blank \d+\]$/.test(part)
        ? <span key={j} className="fill-marker">{part}</span>
        : <span key={j}>{part}</span>
    );
  };

  return (
    <div className="challenge challenge-fill">
      <p className="ch-intro">{c.intro}</p>
      <div className="ch-code-block">
        {c.template.map((line, i) => (
          <div key={i} className="ch-code-line">{renderLine(line)}</div>
        ))}
      </div>
      <div className="ch-inputs">
        {c.blanks.map((b, i) => (
          <label key={i} className="ch-field">
            <span className="ch-label">{b.label}</span>
            <input
              className="ch-input"
              value={values[i]}
              onChange={e => update(i, e.target.value)}
              placeholder={b.placeholder}
              autoComplete="off"
              spellCheck={false}
            />
          </label>
        ))}
      </div>
    </div>
  );
}
window.FillBlankChallenge = React.forwardRef(FillBlankChallenge);
