// Stub: product listing will be wired to ZeroCommerce API in Batch B
export default function StorePage() {
  const products: unknown[] = []; // stub — data fetching wired in Batch B

  return (
    <section className="container mx-auto py-12">
      <h1 className="mb-8 text-3xl font-bold tracking-tight">Store</h1>
      {products.length === 0 ? (
        <p className="text-muted-foreground">
          No products available yet. Check back soon.
        </p>
      ) : null}
    </section>
  );
}
