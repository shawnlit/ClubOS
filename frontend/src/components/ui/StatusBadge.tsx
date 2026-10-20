const styles: Record<string, string> = {
  approved: 'bg-green-50 text-green-700 border-green-200',
  pending: 'bg-amber-50 text-amber-700 border-amber-200',
  rejected: 'bg-red-50 text-red-700 border-red-200',
};

export default function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={`inline-block px-2 py-0.5 rounded-md border text-xs font-medium capitalize ${
        styles[status] ?? 'bg-neutral-100 text-neutral-700 border-neutral-200'
      }`}
    >
      {status}
    </span>
  );
}
