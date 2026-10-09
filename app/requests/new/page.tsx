import { requireRole } from "@/lib/auth";
import LaunchForm from "@/components/LaunchForm";
import { createLaunch } from "../../actions";

export default async function NewRequest() {
  await requireRole();
  return (
    <>
      <h1>New request</h1>
      <p className="sub">
        Commercial: one request per new or reactivated brand, seller or subcategory. Marketing will confirm the go-live
        date and book the placements.
      </p>
      <div className="card">
        <LaunchForm action={createLaunch} submitLabel="Submit request" />
      </div>
    </>
  );
}
