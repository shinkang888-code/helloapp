import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, verifyStudioAccess, apiSuccess, apiError } from "@/lib/api-helpers";
import { z } from "zod";

const createPaymentSchema = z.object({
  studentId: z.string().min(1),
  studioId: z.string().min(1),
  amount: z.number().int().positive(),
  billingMonth: z.string().regex(/^\d{4}-\d{2}$/),
  dueDate: z.string().datetime(),
  memo: z.string().optional(),
});

// GET /api/admin/payments?studioId=xxx&month=2024-01&status=PENDING
export async function GET(req: NextRequest) {
  const { error, session } = await requireAdmin();
  if (error) return error;

  const { searchParams } = new URL(req.url);
  const studioId = searchParams.get("studioId");
  const month = searchParams.get("month");
  const status = searchParams.get("status");

  if (!studioId) return apiError("studioId is required");

  const hasAccess = await verifyStudioAccess(session!.user.id, studioId);
  if (!hasAccess) return apiError("Forbidden", 403);

  const payments = await prisma.payment.findMany({
    where: {
      student: { studioId },
      ...(month && { billingMonth: month }),
      ...(status && { status: status as "PENDING" | "PAID" | "OVERDUE" | "CANCELLED" }),
    },
    include: {
      student: {
        include: {
          user: { select: { id: true, name: true, email: true } },
        },
      },
    },
    orderBy: [{ billingMonth: "desc" }, { dueDate: "asc" }],
  });

  const now = new Date();
  const normalizedPayments = payments.map((payment) => ({
    ...payment,
    computedStatus:
      payment.status === "PENDING" && payment.dueDate < now
        ? "OVERDUE"
        : payment.status,
  }));

  return apiSuccess(normalizedPayments);
}

// POST /api/admin/payments — 수강료 생성
export async function POST(req: NextRequest) {
  const { error, session } = await requireAdmin();
  if (error) return error;

  const body = await req.json();
  const parsed = createPaymentSchema.safeParse(body);
  if (!parsed.success) return apiError("Validation failed", 400, parsed.error.flatten());

  const { studioId, studentId, amount, billingMonth, dueDate, memo } = parsed.data;

  const hasAccess = await verifyStudioAccess(session!.user.id, studioId);
  if (!hasAccess) return apiError("Forbidden", 403);

  const student = await prisma.student.findFirst({
    where: { id: studentId, studioId, isActive: true },
    select: { id: true },
  });
  if (!student) return apiError("해당 학원의 원생이 아닙니다.", 400);

  const existing = await prisma.payment.findFirst({
    where: { studentId, billingMonth },
    select: { id: true },
  });
  if (existing) return apiError("이미 해당 월 수강료가 등록되어 있습니다.", 409);

  const payment = await prisma.payment.create({
    data: {
      studentId,
      amount,
      billingMonth,
      dueDate: new Date(dueDate),
      memo,
    },
    include: {
      student: { include: { user: { select: { name: true } } } },
    },
  });

  return apiSuccess(payment, 201);
}
