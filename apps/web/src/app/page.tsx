export default function HomePage() {
  return (
    <section className="container mx-auto flex flex-col items-center justify-center gap-6 py-24 text-center">
      <h1 className="text-4xl font-bold tracking-tight sm:text-6xl">
        ZeroMerch
      </h1>
      <p className="max-w-2xl text-lg text-muted-foreground">
        AI-native corporate merchandise management. Launch branded stores,
        automate gifting, and manage inventory with intelligent agents.
      </p>
      <div className="flex gap-4">
        <a
          href="/store"
          className="inline-flex items-center justify-center rounded-md bg-primary px-6 py-3 text-sm font-medium text-primary-foreground shadow hover:bg-primary/90 transition-colors"
        >
          Browse Store
        </a>
        <a
          href="/admin"
          className="inline-flex items-center justify-center rounded-md border border-input bg-background px-6 py-3 text-sm font-medium shadow-sm hover:bg-accent hover:text-accent-foreground transition-colors"
        >
          Admin Dashboard
        </a>
      </div>
    </section>
  );
}
