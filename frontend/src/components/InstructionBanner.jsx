export default function InstructionBanner({ onDismiss }) {
  return (
    <aside className="mb-5 flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50/90 p-4 text-emerald-950 shadow-sm backdrop-blur">
      <span aria-hidden="true" className="mt-0.5 text-lg">✓</span>
      <div className="flex-1">
        <p className="text-sm font-bold">Exam Instructions</p>
        <p className="mt-1 text-xs leading-5 text-emerald-800">
          <h1>Dear IKS–TE–B Students,</h1>
          <h1>Thank you all for participating in the examination and for your valuable cooperation and support. I truly enjoyed this journey with you all and will always cherish these memories. I sincerely wish you great success and happiness in your future. </h1>
          <h1></h1>
           Kindly take a moment to fill out the feedback form above and share your valuable suggestions and areas for improvement. Your honest feedback will help me grow and improve, and I am looking forward to hearing from you all.
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
