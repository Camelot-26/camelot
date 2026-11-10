type FeaturePageProps = {
  eyebrow: string;
  title: string;
  description: string;
  detail: string;
};

export function FeaturePage({
  eyebrow,
  title,
  description,
  detail,
}: FeaturePageProps) {
  return (
    <section className="feature-page page-width">
      <p className="eyebrow">{eyebrow}</p>
      <h1>{title}</h1>
      <p className="feature-description">{description}</p>
      <div className="feature-notice">
        <span className="notice-dot" aria-hidden="true" />
        <p>{detail}</p>
      </div>
    </section>
  );
}
