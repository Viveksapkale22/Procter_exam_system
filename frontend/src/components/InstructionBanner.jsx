export default function InstructionBanner({ onDismiss }) {
  return (
    <aside className="mb-5 flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50/90 p-4 text-emerald-950 shadow-sm backdrop-blur">
      <span aria-hidden="true" className="mt-0.5 text-lg">✓</span>
      <div className="flex-1">
        <p className="text-sm font-bold">Exam Instructions</p>
        <p className="mt-1 text-xs leading-5 text-emerald-800">
          <h1>Dear IKS–TE–B Students,</h1>
          <h1>Please re-register and log in using your correct roll number. Use the whole number only (e.g., 12, 64). Do not use 004 or 00064. Enter accurate details and complete the test as soon as possible.</h1>
          <h1>.</h1><h1>Vaishanavi Patil: Your registration and exam(viva) data is safe. Please use your existing details to log in.</h1>
          
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
