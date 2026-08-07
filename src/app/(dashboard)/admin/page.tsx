import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getBaseUrl } from "@/lib/url";
import { AddMemberForm } from "@/components/admin/AddMemberForm";
import { ManageAccessButton } from "@/components/admin/ManageAccessButton";
import { RemoveMemberButton } from "@/components/admin/RemoveMemberButton";
import { MemberOptionsButton } from "@/components/admin/MemberOptionsButton";
import { DeleteDisplayLinkButton } from "@/components/admin/DeleteDisplayLinkButton";
import { TvTextScaleSelect } from "@/components/admin/TvTextScaleSelect";
import { createDisplayLink } from "./actions";

export default async function AdminPage() {
  const admin = await requireAdmin();

  const [members, displayTokens, baseUrl] = await Promise.all([
    prisma.user.findMany({ orderBy: { createdAt: "asc" } }),
    prisma.displayToken.findMany({ orderBy: { createdAt: "asc" } }),
    getBaseUrl(),
  ]);

  const usedColors = members.map((m) => m.color);

  return (
    <div className="flex flex-col gap-10">
      <div>
        <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">
          Family members
        </h1>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          Admins can add events to anyone&apos;s calendar and manage the family.
        </p>

        <div className="mt-4 flex flex-col gap-3">
          {members.map((member) => (
            <div
              key={member.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-zinc-200 p-4 dark:border-zinc-800"
            >
              <div className="flex items-center gap-3">
                <MemberOptionsButton
                  userId={member.id}
                  userName={member.name}
                  color={member.color}
                  photoUrl={member.photoUrl}
                />
                <div>
                  <p className="font-medium text-zinc-900 dark:text-zinc-50">
                    {member.name}{" "}
                    {member.role === "ADMIN" && (
                      <span className="ml-1 rounded bg-indigo-100 px-1.5 py-0.5 text-xs font-semibold text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                        Admin
                      </span>
                    )}
                  </p>
                  <p className="text-sm text-zinc-500 dark:text-zinc-400">
                    {member.email ?? "No login access yet"}
                    {member.email && !member.passwordHash && (
                      <span className="ml-1.5 rounded bg-amber-100 px-1.5 py-0.5 text-xs font-medium text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                        Email-only sign-in
                      </span>
                    )}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <ManageAccessButton
                  userId={member.id}
                  userName={member.name}
                  currentEmail={member.email}
                  currentlyRequiresPassword={Boolean(member.passwordHash)}
                />
                {member.id !== admin.id && (
                  <RemoveMemberButton userId={member.id} userName={member.name} />
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-4">
          <AddMemberForm usedColors={usedColors} />
        </div>
      </div>

      <div>
        <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">
          Kitchen TV display
        </h1>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          Open this link once in the Samsung TV&apos;s web browser and leave it
          open — it shows everyone&apos;s week and refreshes automatically. No
          sign-in required, so only share it on your home network.
        </p>

        <div className="mt-4 flex flex-col gap-3">
          {displayTokens.map((dt) => (
            <div
              key={dt.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-zinc-200 p-4 dark:border-zinc-800"
            >
              <code className="break-all text-sm text-zinc-700 dark:text-zinc-300">
                {baseUrl}/tv/{dt.token}
              </code>
              <div className="flex items-center gap-4">
                <TvTextScaleSelect id={dt.id} textScale={dt.textScale} />
                <DeleteDisplayLinkButton id={dt.id} />
              </div>
            </div>
          ))}
          {displayTokens.length === 0 && (
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              No display link yet.
            </p>
          )}
        </div>

        <form action={createDisplayLink} className="mt-4">
          <button
            type="submit"
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white"
          >
            + Generate TV link
          </button>
        </form>
      </div>
    </div>
  );
}
