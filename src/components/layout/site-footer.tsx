import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <Link className="brand brand-footer" href="/">
        CAMELOT<span>.</span>
      </Link>
      <p>A welcoming place to stay, gather, and eat well.</p>
      <div className="footer-links">
        <Link href="/contact">Contact</Link>
        <Link href="/login">Account</Link>
      </div>
      <small>© Camelot</small>
    </footer>
  );
}
