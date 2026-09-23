export default function InstructionBanner({ onDismiss }) {
  return (
    <aside className="mb-5 flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50/90 p-4 text-emerald-950 shadow-sm backdrop-blur">
      <span aria-hidden="true" className="mt-0.5 text-lg">✓</span>
      <div className="flex-1">
        <p className="text-sm font-bold">Instructions</p>
        <p className="mt-1 text-xs leading-5 text-emerald-800">
          <h1>Welcome Dear FE A & B students</h1>
          <p> - name : Enter your first name only </p> 
          <p> - roll number : Enter your roll number like A__ (for FE - A) or B__ (for FE - B) , for example A01 ,B45</p>
          <p> - password : Enter a strong password </p>
        </p>
      </div>
      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss instructions"
          className="rounded-lg bg-transparent px-2 py-1 text-lg leading-none text-emerald-700 hover:bg-emerald-100 hover:text-emerald-950"
        >
          ×
        </button>
      )}
    </aside>
  );
}
