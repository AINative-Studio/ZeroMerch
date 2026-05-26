export function SiteFooter() {
  return (
    <footer className="border-t border-border bg-background py-6">
      <div className="container mx-auto flex flex-col items-center justify-between gap-4 px-4 sm:flex-row">
        <p className="text-sm text-muted-foreground">
          &copy; {new Date().getFullYear()} ZeroMerch by AINative. All rights
          reserved.
        </p>
        <nav aria-label="Footer navigation">
          <ul className="flex gap-4">
            <li>
              <a
                href="/privacy"
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Privacy
              </a>
            </li>
            <li>
              <a
                href="/terms"
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Terms
              </a>
            </li>
          </ul>
        </nav>
      </div>
    </footer>
  );
}
