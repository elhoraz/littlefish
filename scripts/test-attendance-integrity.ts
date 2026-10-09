import { prisma } from "../src/lib/prisma";
import { getJakartaDateString } from "../src/lib/utils";

const BASE_URL = "http://localhost:3000";

interface TestItem {
  id: string;
  name: string;
  scenarioNum: number;
  status: "PASS" | "FAIL";
  details?: string;
}

const results: TestItem[] = [];

function check(scenarioNum: number, name: string, condition: boolean, details?: string) {
  const status = condition ? "PASS" : "FAIL";
  results.push({ id: `ATT-${results.length + 1}`, name, scenarioNum, status, details });
  if (condition) {
    console.log(`  ✅ [Skenario ${scenarioNum}] ${name}`);
  } else {
    console.error(`  ❌ [Skenario ${scenarioNum}] ${name} - ${details || "Assertion failed"}`);
  }
}

async function loginUser(email: string, pass: string): Promise<string> {
  const res = await fetch(`${BASE_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password: pass }),
  });
  if (!res.ok) throw new Error(`Login failed for ${email}`);
  const cookieHeader = res.headers.get("set-cookie") || "";
  return cookieHeader.split(";")[0];
}

async function runAttendanceIntegrityTests() {
  console.log("======================================================================");
  console.log("📋 ANTIGRAVITY ATTENDANCE INTEGRITY, AUDIT & PAYROLL REGRESSION SUITE");
  console.log(`Target: ${BASE_URL}`);
  console.log("======================================================================\n");

  // Fetch accounts
  const adminUser = await prisma.user.findUnique({ where: { email: "admin@littlefish.test" } });
  const tutorDimas = await prisma.user.findUnique({ where: { email: "tutor@littlefish.test" }, include: { tutor: true } });
  const tutorSarah = await prisma.user.findUnique({ where: { email: "sarah@littlefish.test" }, include: { tutor: true } });
  const parentRatna = await prisma.user.findUnique({ where: { email: "ortu@littlefish.test" }, include: { parent: true } });
  const parentMaya = await prisma.user.findUnique({ where: { email: "maya@littlefish.test" }, include: { parent: true } });

  const classBintang = await prisma.class.findFirst({
    where: { name: { contains: "Calistung" } },
    include: { students: true, tutor: true },
  });

  if (!adminUser || !tutorDimas || !parentRatna || !parentMaya || !classBintang) {
    console.error("Required seed accounts or class not found. Run `npm run seed` first.");
    process.exit(1);
  }

  const adminCookie = await loginUser("admin@littlefish.test", "admin123");
  const dimasCookie = await loginUser("tutor@littlefish.test", "tutor123");
  const ratnaCookie = await loginUser("ortu@littlefish.test", "parent123");
  const mayaCookie = await loginUser("maya@littlefish.test", "parent123");

  const todayStr = getJakartaDateString();
  const students = classBintang.students;
  const budi = students.find((s) => s.fullName.includes("Budi")) || students[0];
  const kenzo = students.find((s) => s.fullName.includes("Kenzo")) || students[1];

  // Clean any existing attendance on todayStr for testing
  const todayStart = new Date(todayStr + "T00:00:00Z");
  const todayEnd = new Date(todayStr + "T23:59:59Z");
  await prisma.attendance.deleteMany({
    where: {
      classId: classBintang.id,
      date: { gte: todayStart, lte: todayEnd },
    },
  });

  // ====================================================================
  // SKENARIO 1: Presensi baru berhasil dibuat
  // ====================================================================
  console.log("\n--- SKENARIO 1: PEMBUATAN PRESENSI BARU ---");
  const createRes = await fetch(`${BASE_URL}/api/attendance`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: dimasCookie },
    body: JSON.stringify({
      date: todayStr,
      classId: classBintang.id,
      studentAttendances: [
        { studentId: budi.id, status: "HADIR", notes: "Datang tepat waktu" },
        { studentId: kenzo.id, status: "HADIR", notes: null },
      ],
    }),
  });
  check(1, "Presensi baru berhasil dibuat oleh Tutor (HTTP 200)", createRes.status === 200);

  // ====================================================================
  // SKENARIO 2: Presensi tersimpan dibuka dalam mode baca saja
  // ====================================================================
  console.log("\n--- SKENARIO 2: MODE BACA SAJA (READ-ONLY) UNTUK PRESENSI TERSIMPAN ---");
  const getSessionRes = await fetch(
    `${BASE_URL}/api/attendance?classId=${classBintang.id}&date=${todayStr}`,
    { headers: { Cookie: dimasCookie } }
  );
  check(2, "Fetch sesi presensi berhasil (HTTP 200)", getSessionRes.status === 200);
  const sessionData = await getSessionRes.json();
  const sessionInfo = sessionData.sessionInfo;
  check(
    2,
    "Metadata sessionInfo menunjukkan status tersimpan dan recorder",
    sessionInfo &&
      sessionInfo.recordedStudentsCount === 2 &&
      sessionInfo.isFullyRecorded === true &&
      sessionInfo.lastRecordedBy &&
      sessionInfo.lastRecordedBy.name.includes("Dimas")
  );

  // ====================================================================
  // SKENARIO 3: Tutor merevisi presensi pada periode yang diizinkan
  // ====================================================================
  console.log("\n--- SKENARIO 3: TUTOR MEREVISI PRESENSI PADA PERIODE DIIZINKAN ---");
  const reviseRes = await fetch(`${BASE_URL}/api/attendance`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: dimasCookie },
    body: JSON.stringify({
      date: todayStr,
      classId: classBintang.id,
      studentAttendances: [
        { studentId: budi.id, status: "IZIN", notes: "Izin ada acara keluarga" },
        { studentId: kenzo.id, status: "HADIR", notes: null },
      ],
    }),
  });
  check(3, "Tutor merevisi presensi hari ini berhasil (HTTP 200)", reviseRes.status === 200);
  const updatedBudiAtt = await prisma.attendance.findFirst({
    where: { studentId: budi.id, classId: classBintang.id, date: { gte: todayStart, lte: todayEnd } },
  });
  check(3, "Status siswa di database terupdate menjadi IZIN", updatedBudiAtt?.status === "IZIN");

  // ====================================================================
  // SKENARIO 4: Tutor mencoba merevisi tanggal yang dilarang dan ditolak server
  // ====================================================================
  console.log("\n--- SKENARIO 4: PENOLAKAN TANGGAL TIDAK SAH UNTUK TUTOR ---");
  // 4a: Future date
  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + 5);
  const futureDateStr = futureDate.toISOString().split("T")[0];
  const futureRes = await fetch(`${BASE_URL}/api/attendance`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: dimasCookie },
    body: JSON.stringify({
      date: futureDateStr,
      classId: classBintang.id,
      studentAttendances: [{ studentId: budi.id, status: "HADIR" }],
    }),
  });
  check(4, "Tutor mengisi tanggal masa depan ditolak (HTTP 400)", futureRes.status === 400);

  // 4b: Past date > 7 days
  const oldDate = new Date();
  oldDate.setDate(oldDate.getDate() - 14);
  const oldDateStr = oldDate.toISOString().split("T")[0];
  const oldRes = await fetch(`${BASE_URL}/api/attendance`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: dimasCookie },
    body: JSON.stringify({
      date: oldDateStr,
      classId: classBintang.id,
      studentAttendances: [{ studentId: budi.id, status: "HADIR" }],
    }),
  });
  check(4, "Tutor merevisi tanggal lampau > 7 hari ditolak (HTTP 403)", oldRes.status === 403);

  // 4c: Month with PAID payment (September 2026)
  const paidMonthRes = await fetch(`${BASE_URL}/api/attendance`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: dimasCookie },
    body: JSON.stringify({
      date: "2026-09-15",
      classId: classBintang.id,
      studentAttendances: [{ studentId: budi.id, status: "HADIR" }],
    }),
  });
  check(4, "Tutor merevisi periode honor yang sudah PAID ditolak (HTTP 403)", paidMonthRes.status === 403);

  // ====================================================================
  // SKENARIO 5: Admin merevisi presensi dan audit log mencatat perubahan
  // ====================================================================
  console.log("\n--- SKENARIO 5: ADMIN REVISI PRESENSI & AUDIT LOGGING ---");
  const initialAuditCount = await prisma.auditLog.count({ where: { entity: "Attendance" } });
  const adminOverrideRes = await fetch(`${BASE_URL}/api/attendance`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: adminCookie },
    body: JSON.stringify({
      date: todayStr,
      classId: classBintang.id,
      studentAttendances: [
        { studentId: budi.id, status: "SAKIT", notes: "Keterangan sakit dikonfirmasi ortu ke admin" },
        { studentId: kenzo.id, status: "HADIR", notes: null },
      ],
    }),
  });
  check(5, "Admin override presensi berhasil (HTTP 200)", adminOverrideRes.status === 200);

  const latestAudit = await prisma.auditLog.findFirst({
    where: { entity: "Attendance" },
    orderBy: { timestamp: "desc" },
  });
  check(
    5,
    "Audit log mencatat action UPDATE dengan flag [ADMIN OVERRIDE]",
    latestAudit?.action === "UPDATE" &&
      latestAudit?.actorRole === "ADMIN" &&
      (latestAudit?.details || "").includes("ADMIN OVERRIDE")
  );

  // ====================================================================
  // SKENARIO 6: Request duplikat tidak membuat record presensi ganda
  // ====================================================================
  console.log("\n--- SKENARIO 6: IDEMPOTENSI & PENCEGAHAN FAKE AUDIT LOG ---");
  const auditBeforeDuplicate = await prisma.auditLog.count({ where: { entity: "Attendance" } });
  // Send identical request again
  const duplicateRes = await fetch(`${BASE_URL}/api/attendance`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: adminCookie },
    body: JSON.stringify({
      date: todayStr,
      classId: classBintang.id,
      studentAttendances: [
        { studentId: budi.id, status: "SAKIT", notes: "Keterangan sakit dikonfirmasi ortu ke admin" },
        { studentId: kenzo.id, status: "HADIR", notes: null },
      ],
    }),
  });
  check(6, "Request duplikat tetap mengembalikan status sukses (HTTP 200)", duplicateRes.status === 200);

  const budiRecordsCount = await prisma.attendance.count({
    where: { studentId: budi.id, classId: classBintang.id, date: { gte: todayStart, lte: todayEnd } },
  });
  check(6, "Record di database tepat 1, tidak terjadi duplikasi", budiRecordsCount === 1);

  const auditAfterDuplicate = await prisma.auditLog.count({ where: { entity: "Attendance" } });
  check(
    6,
    "Data identik tidak menciptakan entri audit log palsu baru",
    auditAfterDuplicate === auditBeforeDuplicate
  );

  // ====================================================================
  // SKENARIO 7: Kehadiran Tutor tercatat sesuai aturan bisnis
  // ====================================================================
  console.log("\n--- SKENARIO 7: KEHADIRAN TUTOR TERCATAT OTOMATIS & ATOMIK ---");
  const tutorAttRecord = await prisma.attendance.findFirst({
    where: {
      classId: classBintang.id,
      tutorId: tutorDimas.tutor?.id,
      type: "TUTOR",
      date: { gte: todayStart, lte: todayEnd },
    },
  });
  check(
    7,
    "Record kehadiran Tutor tercatat dengan status HADIR dan type TUTOR",
    tutorAttRecord !== null && tutorAttRecord.type === "TUTOR" && tutorAttRecord.status === "HADIR"
  );

  // ====================================================================
  // SKENARIO 8: Honor tidak menghitung satu sesi dua kali
  // ====================================================================
  console.log("\n--- SKENARIO 8: DEDUKASI PERHITUNGAN SESI HONOR TUTOR ---");
  const [currYear, currMonth] = todayStr.split("-").map(Number);
  const payrollCalcRes = await fetch(`${BASE_URL}/api/tutor-payments`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: adminCookie },
    body: JSON.stringify({
      tutorId: tutorDimas.tutor?.id,
      month: currMonth,
      year: currYear,
      status: "PENDING",
      notes: "Audit deduplikasi sesi honor",
    }),
  });
  check(8, "Kalkulasi honor tutor dari database berjalan sukses (HTTP 200)", payrollCalcRes.status === 200);
  const payrollData = await payrollCalcRes.json();
  // Ensure sessions count is positive and not inflated by number of students
  check(
    8,
    "Sesi honor terhitung berdasarkan sesi kelas unik (bukan dikali jumlah siswa)",
    payrollData.payment && payrollData.payment.sessions > 0 && payrollData.payment.sessions < 35
  );

  // ====================================================================
  // SKENARIO 9: Perlindungan pembayaran yang sudah final (PAID)
  // ====================================================================
  console.log("\n--- SKENARIO 9: FINANCIAL PROTECTION PADA RECORD HONOR PAID ---");
  // Kak Dimas has a seeded payment for Oktober 2026 with status PAID
  // Try to modify through API
  const downgradeRes = await fetch(`${BASE_URL}/api/tutor-payments`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: adminCookie },
    body: JSON.stringify({
      tutorId: tutorDimas.tutor?.id,
      month: 9,
      year: 2026,
      status: "PENDING", // illegal downgrade
    }),
  });
  check(9, "Downgrade status honor dari PAID ke PENDING ditolak (HTTP 400)", downgradeRes.status === 400);

  // ====================================================================
  // SKENARIO 10: Parent hanya membaca presensi anak yang terhubung
  // ====================================================================
  console.log("\n--- SKENARIO 10: ISOLASI AKSES PORTAL ORANG TUA ---");
  // Ibu Maya (parent of Kenzo) tries to access Budi's attendance
  const unauthorizedParentRes = await fetch(
    `${BASE_URL}/api/attendance?studentId=${budi.id}`,
    { headers: { Cookie: mayaCookie } }
  );
  check(10, "Parent ditolak saat mengakses presensi anak orang tua lain (HTTP 403)", unauthorizedParentRes.status === 403);

  // Ibu Ratna (parent of Budi) accesses Budi's attendance
  const authorizedParentRes = await fetch(
    `${BASE_URL}/api/attendance?studentId=${budi.id}`,
    { headers: { Cookie: ratnaCookie } }
  );
  check(10, "Parent berhasil membaca presensi anak kandung (HTTP 200)", authorizedParentRes.status === 200);

  // ====================================================================
  // SKENARIO 11: Data terbaru konsisten lintas role
  // ====================================================================
  console.log("\n--- SKENARIO 11: KONSISTENSI DATA LINTAS ROLE ---");
  // 1. Tutor marks Budi as HADIR
  await fetch(`${BASE_URL}/api/attendance`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: dimasCookie },
    body: JSON.stringify({
      date: todayStr,
      classId: classBintang.id,
      studentAttendances: [{ studentId: budi.id, status: "HADIR", notes: "Konsistensi role check" }],
    }),
  });

  // 2. Admin reads
  const adminCheck = await fetch(
    `${BASE_URL}/api/attendance?classId=${classBintang.id}&date=${todayStr}`,
    { headers: { Cookie: adminCookie } }
  );
  const adminCheckData = await adminCheck.json();
  const adminBudiStatus = adminCheckData.attendances.find((a: any) => a.studentId === budi.id)?.status;

  // 3. Parent reads
  const parentCheck = await fetch(
    `${BASE_URL}/api/attendance?studentId=${budi.id}&date=${todayStr}`,
    { headers: { Cookie: ratnaCookie } }
  );
  const parentCheckData = await parentCheck.json();
  const parentBudiStatus = parentCheckData.attendances.find((a: any) => a.studentId === budi.id)?.status;

  check(
    11,
    "Status presensi identik dan konsisten terbaca oleh Tutor, Admin, dan Parent",
    adminBudiStatus === "HADIR" && parentBudiStatus === "HADIR"
  );

  // ====================================================================
  // SKENARIO 12: Request gagal tidak meninggalkan data parsial
  // ====================================================================
  console.log("\n--- SKENARIO 12: INTEGRITAS TRANSAKSI & ZERO PARTIAL DATA ---");
  const countBeforeFail = await prisma.attendance.count({
    where: { classId: classBintang.id, date: { gte: todayStart, lte: todayEnd } },
  });

  // Submit with invalid classId
  const failedSubmitRes = await fetch(`${BASE_URL}/api/attendance`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: dimasCookie },
    body: JSON.stringify({
      date: todayStr,
      classId: "invalid-non-existent-class-id",
      studentAttendances: [{ studentId: budi.id, status: "HADIR" }],
    }),
  });
  check(12, "Request dengan kelas tidak valid ditolak (HTTP 404/403)", failedSubmitRes.status >= 400);

  const countAfterFail = await prisma.attendance.count({
    where: { classId: classBintang.id, date: { gte: todayStart, lte: todayEnd } },
  });
  check(12, "Jumlah data tetap tidak berubah (Zero partial data)", countBeforeFail === countAfterFail);

  // ====================================================================
  // SUMMARY
  // ====================================================================
  console.log("\n======================================================================");
  const failed = results.filter((r) => r.status === "FAIL");
  const passed = results.filter((r) => r.status === "PASS");
  console.log(`🏁 ATTENDANCE INTEGRITY RESULTS: ${passed.length} PASSED, ${failed.length} FAILED`);
  console.log("======================================================================");

  if (failed.length > 0) {
    process.exit(1);
  }
}

runAttendanceIntegrityTests().catch((e) => {
  console.error("Test execution failed:", e);
  process.exit(1);
});
