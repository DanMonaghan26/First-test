import { requireUser } from "@/lib/auth";
import { getFamilyMembers } from "@/lib/family-events";
import { ImportEventsForm } from "@/components/import/ImportEventsForm";

export default async function ImportPage() {
  const user = await requireUser();
  const members = await getFamilyMembers();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">
          Import events from text
        </h1>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          For dates that aren&apos;t in a proper calendar feed — a newsletter, a letter, a school
          webpage — paste the text (or a link to it) and Claude will pull out the events for you
          to review before adding.
        </p>
      </div>

      <ImportEventsForm
        currentUserId={user.id}
        isAdmin={user.role === "ADMIN"}
        members={members}
      />
    </div>
  );
}
