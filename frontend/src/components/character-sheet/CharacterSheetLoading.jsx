function Skeleton({ className }) {
  return <div className={`animate-pulse rounded-md bg-white/[.07] ${className}`} />;
}

export default function CharacterSheetLoading() {
  return (
    <main className="min-h-[calc(100vh-64px)] overflow-hidden bg-[#050506] pb-24" aria-label="Carregando ficha" aria-busy="true">
      <section className="lg:hidden">
        <div className="border-b border-white/10 bg-[#080709] p-3">
          <div className="flex items-center gap-3"><Skeleton className="h-14 w-14 shrink-0" /><div className="flex-1 space-y-2"><Skeleton className="h-5 w-36" /><Skeleton className="h-3 w-52 max-w-full" /></div><Skeleton className="h-11 w-11" /></div>
        </div>
        <div className="grid grid-cols-4 gap-1 p-2">{Array.from({ length: 7 }, (_, index) => <Skeleton key={index} className="h-11" />)}</div>
        <div className="grid gap-2 px-2 py-3">{Array.from({ length: 3 }, (_, index) => <Skeleton key={index} className="h-28" />)}<div className="grid grid-cols-3 gap-2"><Skeleton className="h-16" /><Skeleton className="h-16" /><Skeleton className="h-16" /></div><Skeleton className="h-20" /></div>
      </section>
      <section className="mx-auto hidden max-w-[1480px] gap-4 p-5 lg:grid lg:grid-cols-[minmax(360px,.9fr)_minmax(520px,1.3fr)]">
        <div className="grid content-start gap-3"><Skeleton className="h-24" /><Skeleton className="h-36" />{Array.from({ length: 3 }, (_, index) => <Skeleton key={index} className="h-32" />)}</div>
        <div className="grid content-start gap-3"><Skeleton className="h-20" /><Skeleton className="h-72" /><Skeleton className="h-96" /></div>
      </section>
      <span className="sr-only">Carregando ficha...</span>
    </main>
  );
}
