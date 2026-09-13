// frontend/src/components/common/PageHero.jsx
/**
 * Reusable page hero — used at the top of every admin/provider/customer page.
 *
 * Props:
 *   badge    : small label above the title (e.g. "🛡️ Admin")
 *   title    : main heading
 *   subtitle : optional secondary line
 *   actions  : array of { label, icon, onClick, variant } — variant: "primary" | "ghost" | "warn" | "danger"
 */
export default function PageHero({ badge, title, subtitle, actions = [] }) {
  return (
    <div className="page-hero">
      <div className="page-hero-inner">
        {badge && <div className="page-hero-badge">{badge}</div>}
        <h1 className="page-hero-title">{title}</h1>
        {subtitle && <p className="page-hero-sub">{subtitle}</p>}

        {actions.length > 0 && (
          <div className="page-hero-actions">
            {actions.map((a, i) => (
              <button
                key={i}
                className={`page-hero-btn ${a.variant || "ghost"}`}
                onClick={a.onClick}
              >
                {a.icon && <span>{a.icon}</span>}
                <span>{a.label}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
