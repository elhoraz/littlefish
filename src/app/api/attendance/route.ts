import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { getJakartaDateString, getDaysDifference } from "@/lib/utils";

export const dynamic = "force-dynamic";

const recordAttendanceSchema = z.object({
  date: z.string().min(1, "Tanggal wajib diisi"),
  classId: z.string().min(1, "Kelas wajib dipilih"),
  studentAttendances: z.array(
    z.object({
      studentId: z.string(),
      status: z.enum(["HADIR", "IZIN", "SAKIT", "ALPA"]),
      notes: z.string().optional().nullable(),
    })
  ).optional(),
  tutorAttendance: z.object({
    tutorId: z.string(),
    status: z.enum(["HADIR", "IZIN", "SAKIT", "ALPA"]),
    notes: z.string().optional().nullable(),
  }).optional(),
});

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth(["ADMIN", "TUTOR", "PARENT"]);
    const { searchParams } = new URL(request.url);
    const dateStr = searchParams.get("date");
    const classId = searchParams.get("classId");
    const studentId = searchParams.get("studentId");
    const tutorId = searchParams.get("tutorId");

    const where: any = {};
    let dateOnly = "";

    if (dateStr) {
      dateOnly = dateStr.includes("T") ? dateStr.split("T")[0] : dateStr;
      const [year, month, day] = dateOnly.split("-").map(Number);
      if (year && month && day) {
        const startOfDay = new Date(year, month - 1, day, 0, 0, 0, 0);
        const endOfDay = new Date(year, month - 1, day, 23, 59, 59, 999);
        where.date = { gte: startOfDay, lte: endOfDay };
      }
    }

    if (classId) where.classId = classId;
    if (studentId) where.studentId = studentId;
    if (tutorId) where.tutorId = tutorId;

    // Parent security filter
    if (user.role === "PARENT") {
      const parentStudents = await prisma.student.findMany({
        where: { parentId: user.parentId },
        select: { id: true },
      });
      const allowedStudentIds = parentStudents.map((s) => s.id);
      if (studentId) {
        if (!allowedStudentIds.includes(studentId)) {
          return NextResponse.json(
            { error: "Akses ditolak: Anda tidak memiliki akses ke data presensi siswa ini" },
            { status: 403 }
          );
        }
        where.studentId = studentId;
      } else {
        where.studentId = { in: allowedStudentIds };
      }
      where.type = "STUDENT";
    }

    // Tutor security filter
    if (user.role === "TUTOR" && user.tutorId) {
      if (!classId) {
        where.class = { tutorId: user.tutorId };
      }
    }

    const attendances = await prisma.attendance.findMany({
      where,
      include: {
        class: { select: { id: true, name: true, level: true, tutorId: true } },
        student: { select: { id: true, studentId: true, fullName: true } },
        tutor: { include: { user: { select: { name: true } } } },
      },
      orderBy: { date: "desc" },
    });

    // Provide sessionInfo metadata if classId and date are specified
    let sessionInfo: any = null;
    if (classId && dateOnly) {
      const cls = await prisma.class.findUnique({
        where: { id: classId },
        include: {
          students: { where: { status: "ACTIVE" }, select: { id: true } },
          tutor: { include: { user: { select: { name: true } } } },
        },
      });

      if (cls) {
        const studentAtts = attendances.filter((a) => a.type === "STUDENT");
        const tutorAtt = attendances.find((a) => a.type === "TUTOR");

        const hadirCount = studentAtts.filter((a) => a.status === "HADIR").length;
        const izinCount = studentAtts.filter((a) => a.status === "IZIN").length;
        const sakitCount = studentAtts.filter((a) => a.status === "SAKIT").length;
        const alpaCount = studentAtts.filter((a) => a.status === "ALPA").length;

        // Check last recorded info
        let lastRecordedBy: any = null;
        if (attendances.length > 0) {
          const sortedByUpdate = [...attendances].sort(
            (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
          );
          const newest = sortedByUpdate[0];
          if (newest.recordedById) {
            const recorder = await prisma.user.findUnique({
              where: { id: newest.recordedById },
              select: { id: true, name: true, role: true },
            });
            if (recorder) {
              lastRecordedBy = {
                id: recorder.id,
                name: recorder.name,
                role: recorder.role,
                updatedAt: newest.updatedAt,
              };
            }
          }
        }

        // Check lock & operational limits
        const todayJakarta = getJakartaDateString();
        const dayDiff = getDaysDifference(dateOnly, todayJakarta);
        const [y, m] = dateOnly.split("-").map(Number);

        let isLocked = false;
        let lockReason: string | null = null;
        let canEdit = true;

        // Financial lock: Check if TutorPayment is PAID
        if (cls.tutorId) {
          const paidPayment = await prisma.tutorPayment.findFirst({
            where: {
              tutorId: cls.tutorId,
              month: m,
              year: y,
              status: "PAID",
            },
          });
          if (paidPayment) {
            if (user.role === "TUTOR") {
              isLocked = true;
              canEdit = false;
              lockReason = `Periode honor bulan ${m}/${y} telah difinalisasi dan berstatus LUNAS (PAID). Hubungi Admin untuk penyesuaian.`;
            } else {
              lockReason = `Perhatian: Periode honor bulan ${m}/${y} sudah berstatus LUNAS (PAID). Perubahan presensi akan dicatat sebagai Admin Override.`;
            }
          }
        }

        // Tutor operational limits
        if (user.role === "TUTOR") {
          if (dayDiff > 0) {
            isLocked = true;
            canEdit = false;
            lockReason = "Tanggal sesi belum berlangsung (masa depan).";
          } else if (dayDiff < -7) {
            isLocked = true;
            canEdit = false;
            lockReason = "Batas waktu pengisian mandiri oleh Tutor telah lewat (maksimal 7 hari). Hubungi Admin untuk override.";
          }
        }

        sessionInfo = {
          classId: cls.id,
          className: cls.name,
          date: dateOnly,
          totalStudents: cls.students.length,
          recordedStudentsCount: studentAtts.length,
          isFullyRecorded: cls.students.length > 0 && studentAtts.length >= cls.students.length,
          hadirCount,
          izinCount,
          sakitCount,
          alpaCount,
          tutorStatus: tutorAtt?.status || null,
          lastRecordedBy,
          isLocked,
          lockReason,
          canEdit,
        };
      }
    }

    return NextResponse.json({ attendances, sessionInfo });
  } catch (error: any) {
    if (error.message === "UNAUTHORIZED" || error.message === "FORBIDDEN") {
      return NextResponse.json({ error: "Akses ditolak" }, { status: 403 });
    }
    console.error("GET /api/attendance error:", error);
    return NextResponse.json({ error: "Gagal memuat presensi" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth(["ADMIN", "TUTOR"]);
    const body = await request.json();
    const parsed = recordAttendanceSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Data presensi tidak valid" },
        { status: 400 }
      );
    }

    const { date, classId, studentAttendances, tutorAttendance } = parsed.data;
    const dateOnly = date.includes("T") ? date.split("T")[0] : date;
    const [year, month, day] = dateOnly.split("-").map(Number);
    const startOfDay = new Date(year, month - 1, day, 0, 0, 0, 0);
    const endOfDay = new Date(year, month - 1, day, 23, 59, 59, 999);
    const sessionDate = new Date(year, month - 1, day, 12, 0, 0, 0);

    // Verify class exists
    const cls = await prisma.class.findUnique({
      where: { id: classId },
      include: {
        tutor: { include: { user: { select: { id: true, name: true } } } },
        students: { select: { id: true, fullName: true } },
      },
    });

    if (!cls) {
      return NextResponse.json({ error: "Kelas tidak ditemukan" }, { status: 404 });
    }

    // Tutor authorization check: is tutor assigned to this class?
    if (user.role === "TUTOR" && user.tutorId) {
      if (cls.tutorId !== user.tutorId) {
        return NextResponse.json(
          { error: "Anda tidak memiliki wewenang untuk mengisi presensi kelas ini" },
          { status: 403 }
        );
      }
    }

    // Operational date rules using Asia/Jakarta
    const todayJakarta = getJakartaDateString();
    const dayDiff = getDaysDifference(dateOnly, todayJakarta);

    if (user.role === "TUTOR") {
      if (dayDiff > 0) {
        return NextResponse.json(
          { error: "Presensi tidak dapat diisi untuk tanggal yang belum berlangsung (masa depan)" },
          { status: 400 }
        );
      }
      if (dayDiff < -7) {
        return NextResponse.json(
          { error: "Batas waktu pengisian/revisi presensi untuk Tutor adalah 7 hari. Silakan hubungi Admin untuk override." },
          { status: 403 }
        );
      }
    }

    // Financial protection check: is TutorPayment already PAID for this month?
    let isPaidPeriodOverride = false;
    if (cls.tutorId) {
      const paidPayment = await prisma.tutorPayment.findFirst({
        where: {
          tutorId: cls.tutorId,
          month,
          year,
          status: "PAID",
        },
      });

      if (paidPayment) {
        if (user.role === "TUTOR") {
          return NextResponse.json(
            { error: `Presensi tidak dapat diubah karena periode honor bulan ${month}/${year} telah difinalisasi dan dibayarkan (LUNAS). Silakan hubungi Admin.` },
            { status: 403 }
          );
        }
        isPaidPeriodOverride = true;
      }
    }

    // Determine target tutor and status
    let targetTutorId: string | null = cls.tutorId || null;
    let targetTutorStatus: "HADIR" | "IZIN" | "SAKIT" | "ALPA" = "HADIR";
    let targetTutorNotes: string | null = null;

    if (user.role === "TUTOR") {
      targetTutorId = user.tutorId || null;
      targetTutorStatus = "HADIR";
      targetTutorNotes = "Kehadiran mengajar otomatis tercatat oleh sistem";
    } else if (user.role === "ADMIN") {
      if (tutorAttendance) {
        targetTutorId = tutorAttendance.tutorId;
        targetTutorStatus = tutorAttendance.status;
        targetTutorNotes = tutorAttendance.notes || null;
      } else if (cls.tutorId) {
        targetTutorId = cls.tutorId;
        targetTutorStatus = "HADIR";
      }
    }

    // Execute atomic transaction with diff auditing
    const auditPayload = await prisma.$transaction(async (tx) => {
      // 1. Fetch existing attendance records for this date & class
      const existingStudents = await tx.attendance.findMany({
        where: {
          classId,
          type: "STUDENT",
          date: { gte: startOfDay, lte: endOfDay },
        },
        include: { student: { select: { fullName: true } } },
      });

      const existingTutor = targetTutorId
        ? await tx.attendance.findFirst({
            where: {
              classId,
              tutorId: targetTutorId,
              type: "TUTOR",
              date: { gte: startOfDay, lte: endOfDay },
            },
          })
        : null;

      let createdCount = 0;
      let updatedCount = 0;
      const changeDetails: string[] = [];

      // 2. Process student attendances
      if (studentAttendances && studentAttendances.length > 0) {
        for (const item of studentAttendances) {
          const match = existingStudents.find((e) => e.studentId === item.studentId);

          if (match) {
            const statusChanged = match.status !== item.status;
            const notesChanged = (match.notes || "") !== (item.notes || "");

            if (statusChanged || notesChanged) {
              await tx.attendance.update({
                where: { id: match.id },
                data: {
                  status: item.status,
                  notes: item.notes || null,
                  recordedById: user.id,
                },
              });
              updatedCount++;
              changeDetails.push(
                `${match.student?.fullName || item.studentId}: ${match.status} -> ${item.status}`
              );
            }
          } else {
            const studentObj = cls.students.find((s) => s.id === item.studentId);
            await tx.attendance.create({
              data: {
                date: sessionDate,
                classId,
                studentId: item.studentId,
                type: "STUDENT",
                status: item.status,
                notes: item.notes || null,
                recordedById: user.id,
              },
            });
            createdCount++;
            changeDetails.push(`+${studentObj?.fullName || item.studentId} (${item.status})`);
          }
        }
      }

      // 3. Process tutor attendance
      let tutorCreated = false;
      let tutorUpdated = false;

      if (targetTutorId) {
        if (existingTutor) {
          const statusChanged = existingTutor.status !== targetTutorStatus;
          const notesChanged = (existingTutor.notes || "") !== (targetTutorNotes || "");

          if (statusChanged || notesChanged) {
            await tx.attendance.update({
              where: { id: existingTutor.id },
              data: {
                status: targetTutorStatus,
                notes: targetTutorNotes,
                recordedById: user.id,
              },
            });
            tutorUpdated = true;
            changeDetails.push(`Tutor: ${existingTutor.status} -> ${targetTutorStatus}`);
          }
        } else {
          await tx.attendance.create({
            data: {
              date: sessionDate,
              classId,
              tutorId: targetTutorId,
              type: "TUTOR",
              status: targetTutorStatus,
              notes: targetTutorNotes,
              recordedById: user.id,
            },
          });
          tutorCreated = true;
          changeDetails.push(`+Tutor (${targetTutorStatus})`);
        }
      }

      const hasChanges = createdCount > 0 || updatedCount > 0 || tutorCreated || tutorUpdated;

      return {
        hasChanges,
        createdCount,
        updatedCount,
        tutorCreated,
        tutorUpdated,
        changeDetails,
      };
    });

    // 4. Log audit only if real data changes occurred
    if (auditPayload.hasChanges) {
      const isRevision = auditPayload.updatedCount > 0 || auditPayload.tutorUpdated;
      const action = isRevision ? "UPDATE" : "CREATE";

      let prefix = "";
      if (isPaidPeriodOverride) {
        prefix = "[ADMIN OVERRIDE - PERIODE HONOR PAID] ";
      } else if (user.role === "ADMIN") {
        prefix = "[ADMIN OVERRIDE] ";
      }

      const details =
        action === "CREATE"
          ? `${prefix}Pencatatan presensi baru kelas ${cls.name} tanggal ${dateOnly} (${auditPayload.createdCount} siswa).`
          : `${prefix}Revisi presensi kelas ${cls.name} tanggal ${dateOnly}. Perubahan: ${auditPayload.changeDetails.join("; ")}.`;

      await logAudit({
        actorId: user.id,
        actorName: user.name,
        actorRole: user.role,
        action,
        entity: "Attendance",
        entityId: classId,
        details,
      });
    }

    return NextResponse.json({
      success: true,
      hasChanges: auditPayload.hasChanges,
      summary: {
        createdCount: auditPayload.createdCount,
        updatedCount: auditPayload.updatedCount,
        tutorRecorded: auditPayload.tutorCreated || auditPayload.tutorUpdated,
      },
    });
  } catch (error: any) {
    if (error.message === "UNAUTHORIZED" || error.message === "FORBIDDEN") {
      return NextResponse.json({ error: "Akses ditolak" }, { status: 403 });
    }
    console.error("POST /api/attendance error:", error);
    return NextResponse.json({ error: "Gagal menyimpan presensi" }, { status: 500 });
  }
}
