export function ShortcutsHelp({ onClose, virtual }: { onClose: () => void; virtual: boolean }) {
  const rows: [string, string][] = [
    ['Space', 'Start / stop'],
    ['← / →', 'Previous / next bar'],
    ['+ / −', 'Tempo up / down 5%'],
    [virtual ? 'Shift + L' : 'L', 'Loop the current bars / clear the loop'],
    [virtual ? 'Shift + H' : 'H', 'Switch hands (right → left → both)'],
    ['Enter', 'Wait mode: skip the current note'],
    ['?', 'This help'],
  ];
  return (
    <div className="modal-back" role="dialog" aria-modal="true" aria-label="Keyboard shortcuts" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 520 }} onClick={(e) => e.stopPropagation()}>
        <h2>Keyboard shortcuts</h2>
        <table className="table">
          <tbody>
            {rows.map(([k, v]) => (
              <tr key={k}>
                <td>
                  <kbd>{k}</kbd>
                </td>
                <td>{v}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {virtual && <p className="small muted">With the computer keyboard as your instrument, letter keys play notes, so letter shortcuts need Shift.</p>}
        <button className="btn primary" onClick={onClose} autoFocus>
          Close
        </button>
      </div>
    </div>
  );
}
