export default function LocaleLoading() {
  return (
    <div className="mx-auto flex min-h-[50vh] max-w-7xl items-center justify-center px-4">
      <div className="flex flex-col items-center gap-3">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-green-700 border-t-transparent" />
        <p className="text-sm font-semibold text-slate-500">Загрузка…</p>
      </div>
    </div>
  );
}
