import type { Launch } from "@/lib/plan";

const CATEGORIES = ["Fashion", "Beauty", "Phones & Tablets", "Electronics", "Computing", "Home", "Appliances",
  "Baby & Kids", "Sports", "Health", "Grocery", "Other"];

/** Commercial side of a request. Used for "new request" and for editing. */
export default function LaunchForm({
  action,
  launch,
  submitLabel,
}: {
  action: (f: FormData) => Promise<void>;
  launch?: Launch | null;
  submitLabel: string;
}) {
  const l = launch;
  return (
    <form action={action} className="grid">
      <div className="full">
        <label>Brand / seller / subcategory *</label>
        <input name="name" required defaultValue={l?.name ?? ""} placeholder="e.g. LC Waikiki" />
      </div>
      <div>
        <label>Level</label>
        <select name="level" defaultValue={l?.level ?? "Brand"}>
          <option>Brand</option><option>Seller</option><option>Subcategory</option>
        </select>
      </div>
      <div>
        <label>Onboarding or reactivation *</label>
        <select name="launch_type" required defaultValue={l?.launch_type ?? ""}>
          <option value="" disabled>Choose…</option>
          <option>Onboarding</option><option>Reactivation</option>
        </select>
      </div>
      <div>
        <label>Category</label>
        <select name="category" defaultValue={l?.category ?? ""}>
          <option value="">—</option>
          {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
        </select>
      </div>
      <div>
        <label>KAM</label>
        <input name="kam" defaultValue={l?.kam ?? ""} />
      </div>
      <div>
        <label>Requested go-live (stock 100% + live on site)</label>
        <input type="date" name="requested_go_live" defaultValue={l?.requested_go_live ?? ""} />
      </div>
      <div>
        <label>Stock fully available and live?</label>
        <select name="stock_ready" defaultValue={l?.stock_ready ? "yes" : "no"}>
          <option value="no">No, not yet</option><option value="yes">Yes</option>
        </select>
      </div>
      <div className="full">
        <label>Landing page link</label>
        <input name="landing_page" type="url" defaultValue={l?.landing_page ?? ""} placeholder="https://www.jumia.ma/…" />
      </div>
      <div>
        <label>Offer / CPR</label>
        <input name="offer" defaultValue={l?.offer ?? ""} />
      </div>
      <div className="full" style={{ gridColumn: "span 2" }}>
        <label>Hero SKUs</label>
        <input name="hero_skus" defaultValue={l?.hero_skus ?? ""} placeholder="SKU1, SKU2, …" />
      </div>
      <div className="full">
        <label>Commercial comments</label>
        <textarea name="commercial_comments" defaultValue={l?.commercial_comments ?? ""} />
      </div>
      <div className="full">
        <button className="btn">{submitLabel}</button>
      </div>
    </form>
  );
}
