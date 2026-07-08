export default function Modal({ open, title, children, onClose }) {
  if (!open) return null;

  return (
    <div className="modal-bg">
      <div className="modal-card">

        <div className="modal-header">

          <h2>{title}</h2>

          <button
            className="close-btn"
            onClick={onClose}
          >
            ✕
          </button>

        </div>

        {children}

      </div>
    </div>
  );
}