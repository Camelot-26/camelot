import Link from "next/link";

const navigation = [
  { href: "/about", label: "Our story" },
  { href: "/experiences", label: "Experiences" },
  { href: "/contact", label: "Contact" },
];

export function SiteHeader() {
  return (
    <header className="site-header">
      <Link className="brand" href="/" aria-label="Camelot home">
        CAMELOT<span>.</span>
      </Link>
      <nav aria-label="Main navigation" className="site-nav">
        {navigation.map((item) => (
          <Link href={item.href} key={item.href}>
            {item.label}
          </Link>
        ))}
      </nav>
      <Link className="header-login" href="/login">
        Account <span aria-hidden="true">↗</span>
      </Link>
    </header>
  );
}
