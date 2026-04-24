import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, verifyStudioAccess, apiSuccess, apiError } from "@/lib/api-helpers";
import { z } from "zod";

const createScheduleSchema = z.object({
  studioId: z.string().min(1),
  lessonId: z.string().min(1),
  studentId: z.string().min(1),
  startAt: z.string().datetime(),
  endAt: z.string().datetime(),
  memo: z.string().optional(),
});

// GET /api/admin/schedules?studioId=xxx&from=2024-01-01&to=2024-01-31
export async function GET(req: NextRequest) {
  const { error, session } = await requireAdmin();
  if (error) return error;

  const { searchParams } = new URL(req.url);
  const studioId = searchParams.get("studioId");
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  if (!studioId) return apiError("studioId is required");

  const hasAccess = await verifyStudioAccess(session!.user.id, studioId);
  if (!hasAccess) return apiError("Forbidden", 403);

  const schedules = await prisma.lessonSchedule.findMany({
    where: {
      lesson: { studioId },
      ...(from && to && {
        startAt: { gte: new Date(from), lte: new Date(to) },
      }),
    },
    include: {
      lesson: { select: { id: true, title: true, color: true } },
      student: {
        include: {
          user: { select: { id: true, name: true } },
        },
      },
    },
    orderBy: { startAt: "asc" },
  });

  const events = schedules.map((s) => ({
    id: s.id,
    title: `${s.student.user.name} - ${s.lesson.title}`,
    start: s.startAt,
    end: s.endAt,
    backgroundColor: s.lesson.color ?? "#4F46E5",
    borderColor: s.lesson.color ?? "#4F46E5",
    extendedProps: {
      lessonId: s.lessonId,
      studentId: s.studentId,
      studentName: s.student.user.name,
      status: s.status,
      memo: s.memo,
    },
  }));

  return apiSuccess(events);
}

// POST /api/admin/schedules
export async function POST(req: NextRequest) {
  const { error, session } = await requireAdmin();
  if (error) return error;

  const body = await req.json();
  const parsed = createScheduleSchema.safeParse(body);
  if (!parsed.success) return apiError("Validation failed", 400, parsed.error.flatten());

  const { studioId, lessonId, studentId, startAt, endAt, memo } = parsed.data;
  const start = new Date(startAt);
  const end = new Date(endAt);

  if (end <= start) return apiError("endAt must be after startAt", 400);

  const hasAccess = await verifyStudioAccess(session!.user.id, studioId);
  if (!hasAccess) return apiError("Forbidden", 403);

  const [lesson, student] = await Promise.all([
    prisma.lesson.findFirst({ where: { id: lessonId, studioId } }),
    prisma.student.findFirst({ where: { id: studentId, studioId, isActive: true } }),
  ]);

  if (!lesson) return apiError("해당 학원의 레슨이 아닙니다.", 400);
  if (!student) return apiError("해당 학원의 원생이 아닙니다.", 400);

  const overlap = await prisma.lessonSchedule.findFirst({
    where: {
      studentId,
      status: { not: "CANCELLED" },
      startAt: { lt: end },
      endAt: { gt: start },
    },
    select: { id: true },
  });

  if (overlap) return apiError("해당 시간에 이미 등록된 원생 일정이 있습니다.", 409);

  const schedule = await prisma.lessonSchedule.create({
    data: {
      lessonId,
      studentId,
      startAt: start,
      endAt: end,
      memo,
    },
    include: {
      lesson: { select: { title: true, color: true } },
      student: { include: { user: { select: { name: true } } } },
    },
  });

  return apiSuccess(schedule, 201);
}
