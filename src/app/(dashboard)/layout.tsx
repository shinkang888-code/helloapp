import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Sidebar } from "@/components/layout/Sidebar";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(79,70,229,0.12),_transparent_34%),linear-gradient(135deg,_#f8fafc_0%,_#eef2ff_48%,_#f8fafc_100%)] text-slate-950">
      <Sidebar
        user={{
          name: session.user.name ?? null,
          email: session.user.email ?? "",
          image: session.user.image ?? null,
          role: session.user.role ?? "STUDENT",
        }}
      />
      <main className="min-h-screen lg:ml-72">
        <div className="mx-auto max-w-7xl px-4 py-5 sm:px-6 lg:px-8">
          <div className="mb-6 rounded-[2rem] border border-white/70 bg-white/80 px-5 py-4 shadow-xl shadow-slate-200/70 backdrop-blur">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-indigo-500">
                  Piano Academy Manager
                </p>
                <h2 className="mt-1 text-xl font-bold tracking-tight text-slate-950">
                  오늘의 학원 운영 현황
                </h2>
              </div>
              <div className="rounded-full border border-indigo-100 bg-indigo-50 px-4 py-2 text-sm font-medium text-indigo-700">
                {session.user.role === "ADMIN"
                  ? "관리자 모드"
                  : session.user.role === "TEACHER"
                    ? "선생님 모드"
                    : "원생 모드"}
              </div>
            </div>
          </div>
          {children}
        </div>
      </main>
    </div>
  );
}
