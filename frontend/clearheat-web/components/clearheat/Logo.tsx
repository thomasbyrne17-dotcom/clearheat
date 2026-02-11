export default function Logo({ className = "" }: { className?: string }) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <svg
        viewBox="0 0 40 40"
        className="h-8 w-8"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Outer square */}
        <rect
          x="6"
          y="6"
          width="28"
          height="28"
          stroke="currentColor"
          strokeWidth="2"
        />

        {/* Rising line */}
        <path
          d="M12 24 L20 16 L28 20"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>

      <span className="text-xl font-semibold tracking-tight">
        Clear<span className="font-bold">Heat</span>
      </span>
    </div>
  );
}
