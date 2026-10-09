import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const BASE_URL = process.env.APP_URL || "http://localhost:3000";

interface TestResult {
  phase: string;
  scenario: string;
  status: "PASS" | "FAIL";
  details?: string;
}

const results: TestResult[] = [];

function assert(phase: string, condition: boolean, scenario: string, details?: string) {
  if (condition) {
    console.log(`  ✅ [${phase}] PASS: ${scenario}`);
    results.push({ phase, scenario, status: "PASS", details });
  } else {
    console.error(`  ❌ [${phase}] FAIL: ${scenario} - ${details || ""}`);
    results.push({ phase, scenario, status: "FAIL", details });
  }
}

async function loginUser(email: string, password: string): Promise<{ cookie: string; user: any; res: Response }> {
  const res = await fetch(`${BASE_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const data = await res.json();
  const setCookie = res.headers.get("set-cookie") || "";
  const match = setCookie.match(/littlefish_session=([^;]+)/);
  const cookie = match ? `littlefish_session=${match[1]}` : "";
  return { cookie, user: data.user, res };
}

async function runStagingUAT() {
  console.log("======================================================================");
  console.log("🚀 LITTLEFISH STAGING, UAT & PRODUCTION READINESS VERIFICATION SUITE");
  console.log(`Target: ${BASE_URL}`);
  console.log("======================================================================\n");

  // PHASE 5: AUTHENTICATION UAT
  console.log("--- PHASE 5: AUTHENTICATION UAT ---");
  const badLogin = await loginUser("admin@littlefish.test", "wrongpassword123");
  assert("AUTH", badLogin.res.status === 401, "Login dengan password salah ditolak (HTTP 401)");

  const adminLogin = await loginUser("admin@littlefish.test", "admin123");
  assert("AUTH", adminLogin.res.status === 200 && adminLogin.cookie.length > 0, "Admin login sukses dan menerima cookie littlefish_session");

  const tutorLogin = await loginUser("tutor@littlefish.test", "tutor123");
  assert("AUTH", tutorLogin.res.status === 200, "Tutor (Kak Dimas) login sukses");

  const parentLogin = await loginUser("ortu@littlefish.test", "parent123");
  assert("AUTH", parentLogin.res.status === 200, "Parent (Ibu Ratna) login sukses");

  const unauthRes = await fetch(`${BASE_URL}/admin/dashboard`, { redirect: "manual" });
  assert("AUTH", unauthRes.status === 307 || unauthRes.status === 302, "Akses rute /admin/dashboard tanpa sesi dialihkan ke /login");

  const tutorAdminRes = await fetch(`${BASE_URL}/admin/dashboard`, {
    headers: { Cookie: tutorLogin.cookie },
    redirect: "manual",
  });
  assert("AUTH", tutorAdminRes.status === 307 || tutorAdminRes.status === 302, "Tutor mengakses /admin/dashboard dialihkan ke rute yang berwenang");

  const logoutRes = await fetch(`${BASE_URL}/api/auth/logout`, {
    method: "POST",
    headers: { Cookie: adminLogin.cookie },
  });
  assert("AUTH", logoutRes.status === 200, "Logout API berhasil membersihkan sesi");

  const adminAuth = await loginUser("admin@littlefish.test", "admin123");

  // PHASE 6: ADMIN UAT
  console.log("\n--- PHASE 6: ADMIN UAT ---");
  const kpiRes = await fetch(`${BASE_URL}/api/dashboard/admin`, { headers: { Cookie: adminAuth.cookie } });
  assert("ADMIN", kpiRes.status === 200, "Admin dapat memuat dashboard KPI (HTTP 200)");
  const kpiData = await kpiRes.json();
  assert("ADMIN", kpiData.kpis && kpiData.kpis.activeStudentsCount > 0, `KPI siswa aktif membaca data nyata database (${kpiData.kpis?.activeStudentsCount} siswa)`);

  const studentsRes = await fetch(`${BASE_URL}/api/students`, { headers: { Cookie: adminAuth.cookie } });
  assert("ADMIN", studentsRes.status === 200, "Admin dapat memuat daftar master siswa");

  const tutorsRes = await fetch(`${BASE_URL}/api/tutors`, { headers: { Cookie: adminAuth.cookie } });
  assert("ADMIN", tutorsRes.status === 200, "Admin dapat memuat daftar master tutor");

  const classesRes = await fetch(`${BASE_URL}/api/classes`, { headers: { Cookie: adminAuth.cookie } });
  assert("ADMIN", classesRes.status === 200, "Admin dapat memuat daftar master kelas");

  // PHASE 7: TUTOR UAT
  console.log("\n--- PHASE 7: TUTOR UAT ---");
  const tutorAuth = await loginUser("tutor@littlefish.test", "tutor123");
  const tutorSppRes = await fetch(`${BASE_URL}/api/spp`, { headers: { Cookie: tutorAuth.cookie } });
  assert("TUTOR", tutorSppRes.status === 403, "Tutor dilarang mengakses API SPP keuangan (HTTP 403)");

  const tutorPayrollRes = await fetch(`${BASE_URL}/api/tutor-payments`, { headers: { Cookie: tutorAuth.cookie } });
  assert("TUTOR", tutorPayrollRes.status === 403, "Tutor dilarang memicu atau memuat API penggajian Admin (HTTP 403)");

  const studentsList = await (await fetch(`${BASE_URL}/api/students`, { headers: { Cookie: adminAuth.cookie } })).json();
  const testStudent = studentsList.students[0];
  const tutorEditStudentRes = await fetch(`${BASE_URL}/api/students/${testStudent.id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", Cookie: tutorAuth.cookie },
    body: JSON.stringify({ fullName: "Nama Siswa Palsu Dirubah Tutor" }),
  });
  assert("TUTOR", tutorEditStudentRes.status === 403, "Tutor dilarang mengubah data master siswa (HTTP 403)");

  // Tutor Kak Dimas teaches Bintang Kecil A (Calistung)
  const dimasClassStudents = studentsList.students.filter((s: any) => s.class?.name?.includes("Bintang"));
  if (dimasClassStudents.length > 0) {
    const studentInClass = dimasClassStudents[0];
    const tutorNotesRes = await fetch(`${BASE_URL}/api/students/${studentInClass.id}/notes`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Cookie: tutorAuth.cookie },
      body: JSON.stringify({ notes: "Siswa menunjukkan antusiasme belajar tinggi pada fonik calistung." }),
    });
    assert("TUTOR", tutorNotesRes.status === 200, "Tutor berhasil memperbarui catatan karakteristik belajar siswa binaannya");
  }

  // File upload validation test
  const calistungClass = await prisma.class.findFirst({ where: { tutor: { user: { email: "tutor@littlefish.test" } } } });
  const sampleSubject = await prisma.subject.findFirst();
  const invalidMimeForm = new FormData();
  invalidMimeForm.append("title", "File Bahaya");
  invalidMimeForm.append("classId", calistungClass?.id || "dummy");
  invalidMimeForm.append("subjectId", sampleSubject?.id || "dummy");
  const badBlob = new Blob(["malicious-script"], { type: "application/x-msdownload" });
  invalidMimeForm.append("file", badBlob, "danger.exe");
  const badUploadRes = await fetch(`${BASE_URL}/api/worksheets`, {
    method: "POST",
    headers: { Cookie: tutorAuth.cookie },
    body: invalidMimeForm,
  });
  assert("TUTOR", badUploadRes.status === 400, "Upload berkas berformat terlarang (.exe) ditolak aman dengan validasi MIME (HTTP 400)");

  // PHASE 8: PARENT UAT
  console.log("\n--- PHASE 8: PARENT UAT ---");
  const parentAuth = await loginUser("ortu@littlefish.test", "parent123");
  const parentDashRes = await fetch(`${BASE_URL}/api/dashboard/parent`, { headers: { Cookie: parentAuth.cookie } });
  assert("PARENT", parentDashRes.status === 200, "Parent dapat memuat dashboard portal orang tua");
  const parentDashData = await parentDashRes.json();
  const childNames = parentDashData.children?.map((c: any) => c.fullName) || [];
  assert("PARENT", childNames.includes("Budi Santoso") && childNames.includes("Siti Rahmawati"), "Portal orang tua hanya menampilkan anak kandung terdaftar (Budi & Siti)");

  const allStudents = await prisma.student.findMany();
  const kenzo = allStudents.find((s) => s.fullName.includes("Kenzo"));
  if (kenzo) {
    const idorStudentRes = await fetch(`${BASE_URL}/api/students/${kenzo.id}`, { headers: { Cookie: parentAuth.cookie } });
    assert("PARENT", idorStudentRes.status === 403, "Parent dilarang melihat data detail anak orang tua lain (HTTP 403)");

    const idorAttRes = await fetch(`${BASE_URL}/api/attendance?studentId=${kenzo.id}`, { headers: { Cookie: parentAuth.cookie } });
    assert("PARENT", idorAttRes.status === 403, "Parent dilarang melihat data presensi anak orang tua lain (HTTP 403)");

    const idorSppRes = await fetch(`${BASE_URL}/api/spp?studentId=${kenzo.id}`, { headers: { Cookie: parentAuth.cookie } });
    assert("PARENT", idorSppRes.status === 403, "Parent dilarang melihat tagihan SPP anak orang tua lain (HTTP 403)");
  }

  const budi = allStudents.find((s) => s.fullName.includes("Budi Santoso"));
  const budiSpp = await prisma.sppPayment.findFirst({ where: { studentId: budi?.id } });
  if (budiSpp) {
    const parentTamperSpp = await fetch(`${BASE_URL}/api/spp/${budiSpp.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", Cookie: parentAuth.cookie },
      body: JSON.stringify({ status: "LUNAS" }),
    });
    assert("PARENT", parentTamperSpp.status === 400 || parentTamperSpp.status === 403, "Parent dilarang mengubah status SPP menjadi LUNAS secara mandiri");
  }

  // PHASE 9: FINANCIAL UAT
  console.log("\n--- PHASE 9: FINANCIAL UAT ---");
  if (budi && budiSpp) {
    const duplicateSppRes = await fetch(`${BASE_URL}/api/spp`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: adminAuth.cookie },
      body: JSON.stringify({
        studentId: budi.id,
        month: budiSpp.month,
        year: budiSpp.year,
        amount: 250000,
      }),
    });
    assert("FINANCE", duplicateSppRes.status === 400, "Penerbitan tagihan SPP duplikat pada bulan/tahun yang sama ditolak (HTTP 400)");
  }

  const dimasTutor = await prisma.tutor.findFirst({ where: { user: { email: "tutor@littlefish.test" } } });
  if (dimasTutor) {
    const paidRecord = await prisma.tutorPayment.findFirst({
      where: { tutorId: dimasTutor.id, month: 9, year: 2026, status: "PAID" },
    });
    assert("FINANCE", !!paidRecord, "Data honor September 2026 terverifikasi berstatus PAID (Terkunci)");

    const dimasClass = await prisma.class.findFirst({ where: { tutorId: dimasTutor.id } });
    if (dimasClass) {
      const tamperPaidAttendanceRes = await fetch(`${BASE_URL}/api/attendance`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Cookie: tutorAuth.cookie },
        body: JSON.stringify({
          classId: dimasClass.id,
          date: "2026-09-15",
          studentAttendances: [],
        }),
      });
      assert("FINANCE", tamperPaidAttendanceRes.status === 403, "Tutor dilarang mengubah presensi pada bulan honor yang sudah PAID (HTTP 403)");
    }

    const downgradeRes = await fetch(`${BASE_URL}/api/tutor-payments`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: adminAuth.cookie },
      body: JSON.stringify({
        tutorId: dimasTutor.id,
        month: 9,
        year: 2026,
        status: "PENDING",
      }),
    });
    assert("FINANCE", downgradeRes.status === 400, "Penurunan status honor dari PAID ke PENDING ditolak (HTTP 400)");
  }

  // PHASE 10: AUDIT LOG UAT
  console.log("\n--- PHASE 10: AUDIT LOG UAT ---");
  const auditRes = await fetch(`${BASE_URL}/api/audit-logs`, { headers: { Cookie: adminAuth.cookie } });
  assert("AUDIT", auditRes.status === 200, "Admin dapat memuat catatan audit log");
  const auditData = await auditRes.json();
  const logActions = auditData.logs?.map((l: any) => l.action) || [];
  assert("AUDIT", logActions.includes("LOGIN"), "Audit log berhasil mencatat aksi LOGIN");
  assert("AUDIT", logActions.includes("UPDATE") || logActions.includes("CREATE"), "Audit log berhasil mencatat aksi mutasi data");

  // Identical save: Fetch student full data first, then re-save identical payload
  const fullStudentRes = await fetch(`${BASE_URL}/api/students/${testStudent.id}`, { headers: { Cookie: adminAuth.cookie } });
  const fullStudentData = await fullStudentRes.json();
  const st = fullStudentData.student;
  const initialLogCount = auditData.logs.length;
  const putIdenticalRes = await fetch(`${BASE_URL}/api/students/${st.id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", Cookie: adminAuth.cookie },
    body: JSON.stringify({
      fullName: st.fullName,
      nickname: st.nickname || null,
      birthDate: st.birthDate || null,
      gender: st.gender,
      address: st.address || null,
      phone: st.phone || null,
      parentId: st.parentId || null,
      classId: st.classId || null,
      notes: st.notes || null,
      status: st.status,
    }),
  });
  const putIdenticalData = await putIdenticalRes.json();
  assert("AUDIT", putIdenticalData.noChanges === true, "Penyimpanan data identik (no-op) terdeteksi noChanges: true");
  const afterAuditRes = await fetch(`${BASE_URL}/api/audit-logs`, { headers: { Cookie: adminAuth.cookie } });
  const afterAuditData = await afterAuditRes.json();
  assert("AUDIT", afterAuditData.logs.length === initialLogCount, "Penyimpanan data identik (no-op) tidak menciptakan log palsu");

  // PHASE 11: DATA CONSISTENCY TEST
  console.log("\n--- PHASE 11: DATA CONSISTENCY TEST ---");
  const studentCount = await prisma.student.count({ where: { status: "ACTIVE" } });
  const tutorCount = await prisma.tutor.count({ where: { status: "ACTIVE" } });
  const classCount = await prisma.class.count({ where: { status: "ACTIVE" } });
  const freshKpiRes = await fetch(`${BASE_URL}/api/dashboard/admin`, { headers: { Cookie: adminAuth.cookie } });
  const freshKpiData = await freshKpiRes.json();
  assert("CONSISTENCY", freshKpiData.kpis.activeStudentsCount === studentCount, `Jumlah siswa aktif di dashboard admin (${freshKpiData.kpis.activeStudentsCount}) sinkron dengan database (${studentCount})`);
  assert("CONSISTENCY", freshKpiData.kpis.activeTutorsCount === tutorCount, `Jumlah tutor aktif di dashboard admin (${freshKpiData.kpis.activeTutorsCount}) sinkron dengan database (${tutorCount})`);
  assert("CONSISTENCY", freshKpiData.kpis.activeClassesCount === classCount, `Jumlah kelas aktif di dashboard admin (${freshKpiData.kpis.activeClassesCount}) sinkron dengan database (${classCount})`);

  // PHASE 12: CONCURRENCY TEST
  console.log("\n--- PHASE 12: CONCURRENCY TEST ---");
  const activeClass = await prisma.class.findFirst({ where: { status: "ACTIVE" }, include: { students: true } });
  if (activeClass && activeClass.students.length > 0) {
    const stu = activeClass.students[0];
    const targetDate = "2026-10-08";
    const [req1, req2] = await Promise.all([
      fetch(`${BASE_URL}/api/attendance`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Cookie: adminAuth.cookie },
        body: JSON.stringify({
          classId: activeClass.id,
          date: targetDate,
          studentAttendances: [{ studentId: stu.id, status: "HADIR", notes: "Req 1" }],
        }),
      }),
      fetch(`${BASE_URL}/api/attendance`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Cookie: adminAuth.cookie },
        body: JSON.stringify({
          classId: activeClass.id,
          date: targetDate,
          studentAttendances: [{ studentId: stu.id, status: "HADIR", notes: "Req 2" }],
        }),
      }),
    ]);
    assert("CONCURRENCY", req1.status === 200 && req2.status === 200, "Request presensi serentak berhasil ditangani");

    const startOfDay = new Date(2026, 9, 8, 0, 0, 0);
    const endOfDay = new Date(2026, 9, 8, 23, 59, 59);
    const countStuAtt = await prisma.attendance.count({
      where: {
        studentId: stu.id,
        classId: activeClass.id,
        type: "STUDENT",
        date: { gte: startOfDay, lte: endOfDay },
      },
    });
    assert("CONCURRENCY", countStuAtt === 1, "Idempotensi database: tepat 1 baris presensi tercatat (0 duplikasi)");
  }

  // PHASE 15: ERROR & RECOVERY
  console.log("\n--- PHASE 15: ERROR & RECOVERY ---");
  const badBodyRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: "{ malformed json",
  });
  assert("ERROR", badBodyRes.status === 400, "Request body malformed menghasilkan HTTP 400 terstruktur");
  const badBodyData = await badBodyRes.json();
  assert("ERROR", !badBodyData.stack && !!badBodyData.error, "Pesan error terstruktur dalam Bahasa Indonesia tanpa membocorkan stack trace");

  // Summary
  console.log("\n======================================================================");
  const total = results.length;
  const passed = results.filter((r) => r.status === "PASS").length;
  const failed = results.filter((r) => r.status === "FAIL").length;
  console.log(`🏁 STAGING & UAT VERIFICATION SUMMARY: ${passed}/${total} PASSED, ${failed} FAILED`);
  console.log("======================================================================\n");

  await prisma.$disconnect();
  if (failed > 0) {
    process.exit(1);
  }
}

runStagingUAT().catch((err) => {
  console.error("UAT Fatal Error:", err);
  process.exit(1);
});
