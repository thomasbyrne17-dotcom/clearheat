export default function Logo({ className = "" }: { className?: string }) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <svg
        viewBox="0 0 40 40"
        className="h-8 w-8"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        {/* House outline */}
        <path
          d="M8 18 L20 8 L32 18"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinejoin="round"
        />
        <path
          d="M12 18 V32 H28 V18"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinejoin="round"
        />

        {/* Heat waves (simple, clean, not “steam emoji”) */}
        <path
          d="M16 28 C14 26, 14 24, 16 22 C18 20, 18 18, 16 16"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        />
        <path
          d="M20 28 C18 26, 18 24, 20 22 C22 20, 22 18, 20 16"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        />
        <path
          d="M24 28 C22 26, 22 24, 24 22 C26 20, 26 18, 24 16"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        />
      </svg>

      <span className="text-xl font-semibold tracking-tight leading-none">
        Clear<span className="font-bold">Heat</span>
      </span>
    </div>
  );
}
