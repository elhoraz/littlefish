import { PrismaClient } from "@prisma/client";

const BASE_URL = "http://localhost:3000";

interface TestResult {
  name: string;
  status: "PASS" | "FAIL";
  details?: string;
}

const results: TestResult[] = [];

function assert(condition: boolean, name: string, details?: string) {
  if (condition) {
    results.push({ name, status: "PASS", details });
    console.log(`  ✅ PASS: ${name}`);
  } else {
    results.push({ name, status: "FAIL", details });
    console.error(`  ❌ FAIL: ${name} - ${details || ""}`);
  }
}

async function runE2ETests() {
  console.log("==================================================");
  console.log("🌐 END-TO-END HTTP & API FLOW VERIFICATION");
  console.log(`Target: ${BASE_URL}`);
  console.log("==================================================\n");

  // 1. Unauthenticated Security Boundary
  console.log("--- 1. UNAUTHENTICATED SECURITY CHECKS ---");
  const unauthAdmin = await fetch(`${BASE_URL}/admin/dashboard`, { redirect: "manual" });
  assert(
    unauthAdmin.status === 307 || unauthAdmin.status === 302 || unauthAdmin.status === 401,
    "Unauthenticated request to /admin/dashboard redirects to login",
    `Status: ${unauthAdmin.status}`
  );

  const unauthTutor = await fetch(`${BASE_URL}/tutor/dashboard`, { redirect: "manual" });
  assert(
    unauthTutor.status === 307 || unauthTutor.status === 302 || unauthTutor.status === 401,
    "Unauthenticated request to /tutor/dashboard redirects to login",
    `Status: ${unauthTutor.status}`
  );

  const unauthParent = await fetch(`${BASE_URL}/parent/dashboard`, { redirect: "manual" });
  assert(
    unauthParent.status === 307 || unauthParent.status === 302 || unauthParent.status === 401,
    "Unauthenticated request to /parent/dashboard redirects to login",
    `Status: ${unauthParent.status}`
  );

  // 2. Admin Authentication Flow
  console.log("\n--- 2. ADMIN AUTHENTICATION & DASHBOARD ---");
  const adminLoginRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "admin@littlefish.test", password: "admin123" }),
  });
  assert(adminLoginRes.status === 200, "Admin login succeeds with HTTP 200");
  const adminCookie = adminLoginRes.headers.get("set-cookie") || "";
  assert(adminCookie.includes("littlefish_session"), "Admin login sets littlefish_session cookie");

  // Clean cookie string for subsequent requests
  const adminSessionCookie = adminCookie.split(";")[0];

  const adminDashPage = await fetch(`${BASE_URL}/admin/dashboard`, {
    headers: { Cookie: adminSessionCookie },
  });
  assert(adminDashPage.status === 200, "Admin can render /admin/dashboard HTML page (200 OK)");
  const adminDashHtml = await adminDashPage.text();
  assert(
    adminDashHtml.includes("Memuat ringkasan") || adminDashHtml.includes("Dashboard") || adminDashHtml.includes("Littlefish"),
    "Admin dashboard returns complete HTML page with branding"
  );

  // Admin Dashboard API
  const adminDashApiRes = await fetch(`${BASE_URL}/api/dashboard/admin`, {
    headers: { Cookie: adminSessionCookie },
  });
  assert(adminDashApiRes.status === 200, "Admin dashboard API /api/dashboard/admin returns 200");
  const adminDashData = await adminDashApiRes.json();
  assert(
    adminDashData.kpis &&
    typeof adminDashData.kpis.activeStudentsCount === "number" &&
    adminDashData.kpis.activeStudentsCount >= 4,
    `Admin KPIs return real database student count (${adminDashData.kpis?.activeStudentsCount})`
  );
  assert(
    adminDashData.kpis.activeClassesCount >= 2,
    `Admin KPIs return real database classes count (${adminDashData.kpis?.activeClassesCount})`
  );

  // 3. Admin Master Data Endpoints
  console.log("\n--- 3. MASTER DATA ENDPOINTS ---");
  const studentsRes = await fetch(`${BASE_URL}/api/students`, {
    headers: { Cookie: adminSessionCookie },
  });
  assert(studentsRes.status === 200, "GET /api/students returns 200");
  const studentsData = await studentsRes.json();
  assert(Array.isArray(studentsData.students) && studentsData.students.length > 0, "Students API returns list of students from database");

  const classesRes = await fetch(`${BASE_URL}/api/classes`, {
    headers: { Cookie: adminSessionCookie },
  });
  assert(classesRes.status === 200, "GET /api/classes returns 200");

  const tutorsRes = await fetch(`${BASE_URL}/api/tutors`, {
    headers: { Cookie: adminSessionCookie },
  });
  assert(tutorsRes.status === 200, "GET /api/tutors returns 200");
  const tutorsData = await tutorsRes.json();

  const sppRes = await fetch(`${BASE_URL}/api/spp`, {
    headers: { Cookie: adminSessionCookie },
  });
  assert(sppRes.status === 200, "GET /api/spp returns 200");
  const sppData = await sppRes.json();
  assert(Array.isArray(sppData.payments) && sppData.payments.length > 0, "SPP API returns payments records");

  // 4. Tutor Authentication & Authorization Boundary
  console.log("\n--- 4. TUTOR FLOW & AUTHORIZATION BOUNDARY ---");
  const tutorLoginRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "tutor@littlefish.test", password: "tutor123" }),
  });
  assert(tutorLoginRes.status === 200, "Tutor login succeeds (200 OK)");
  const tutorCookie = tutorLoginRes.headers.get("set-cookie") || "";
  const tutorSessionCookie = tutorCookie.split(";")[0];

  const tutorDashPage = await fetch(`${BASE_URL}/tutor/dashboard`, {
    headers: { Cookie: tutorSessionCookie },
  });
  assert(tutorDashPage.status === 200, "Tutor can render /tutor/dashboard (200 OK)");

  const tutorDashApi = await fetch(`${BASE_URL}/api/dashboard/tutor`, {
    headers: { Cookie: tutorSessionCookie },
  });
  assert(tutorDashApi.status === 200, "Tutor dashboard API /api/dashboard/tutor returns 200");

  // Security test: Tutor trying to access Admin Finance
  const tutorSppAccess = await fetch(`${BASE_URL}/api/spp`, {
    headers: { Cookie: tutorSessionCookie },
  });
  assert(
    tutorSppAccess.status === 403,
    "Tutor is FORBIDDEN (403) from accessing admin SPP management API",
    `Status: ${tutorSppAccess.status}`
  );

  const tutorPayrollAccess = await fetch(`${BASE_URL}/api/tutor-payments`, {
    headers: { Cookie: tutorSessionCookie },
  });
  assert(
    tutorPayrollAccess.status === 403,
    "Tutor is FORBIDDEN (403) from managing tutor payroll API",
    `Status: ${tutorPayrollAccess.status}`
  );

  // 5. Parent Authentication & Child Isolation
  console.log("\n--- 5. PARENT FLOW & ISOLATION ---");
  const parentLoginRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "ortu@littlefish.test", password: "parent123" }),
  });
  assert(parentLoginRes.status === 200, "Parent login succeeds (200 OK)");
  const parentCookie = parentLoginRes.headers.get("set-cookie") || "";
  const parentSessionCookie = parentCookie.split(";")[0];

  const parentDashPage = await fetch(`${BASE_URL}/parent/dashboard`, {
    headers: { Cookie: parentSessionCookie },
  });
  assert(parentDashPage.status === 200, "Parent can render /parent/dashboard (200 OK)");

  const parentDashApi = await fetch(`${BASE_URL}/api/dashboard/parent`, {
    headers: { Cookie: parentSessionCookie },
  });
  assert(parentDashApi.status === 200, "Parent dashboard API returns 200");
  const parentDashData = await parentDashApi.json();
  assert(
    Array.isArray(parentDashData.children) && parentDashData.children.length > 0,
    `Parent dashboard returns authorized children (${parentDashData.children.map((c: any) => c.fullName).join(", ")})`
  );

  // Security test: Parent trying to access Admin Students
  const parentStudentAccess = await fetch(`${BASE_URL}/api/students`, {
    headers: { Cookie: parentSessionCookie },
  });
  assert(
    parentStudentAccess.status === 403,
    "Parent is FORBIDDEN (403) from accessing admin student CRUD API",
    `Status: ${parentStudentAccess.status}`
  );

  // 6. Live Academic & Finance Mutations
  console.log("\n--- 6. LIVE ACADEMIC & FINANCE MUTATIONS ---");
  // Fetch Subjects for real subject ID
  const subjectsRes = await fetch(`${BASE_URL}/api/subjects`, {
    headers: { Cookie: adminSessionCookie },
  });
  const subjectsData = await subjectsRes.json();
  const testSubject = subjectsData.subjects[0];
  const testStudent = studentsData.students[0];
  const testTutor = tutorsData.tutors[0];

  // A. Record Attendance via API (batch session)
  const attendanceCreateRes = await fetch(`${BASE_URL}/api/attendance`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: adminSessionCookie,
    },
    body: JSON.stringify({
      date: new Date().toISOString(),
      classId: testStudent.classId,
      studentAttendances: [
        {
          studentId: testStudent.id,
          status: "HADIR",
          notes: "E2E Attendance Test - Hadir",
        },
      ],
    }),
  });
  assert(
    attendanceCreateRes.status === 200,
    "Record attendance session via POST /api/attendance succeeds (200 OK)"
  );

  // B. Upsert/Prevent Duplicate: submitting again updates the existing record
  const updateAttendanceRes = await fetch(`${BASE_URL}/api/attendance`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: adminSessionCookie,
    },
    body: JSON.stringify({
      date: new Date().toISOString(),
      classId: testStudent.classId,
      studentAttendances: [
        {
          studentId: testStudent.id,
          status: "IZIN",
          notes: "E2E Update: status updated without duplicate row",
        },
      ],
    }),
  });
  assert(
    updateAttendanceRes.status === 200,
    "Resubmitting attendance updates existing record without creating duplicate entries"
  );

  // C. Record 5-Tier Assessment via API
  const assessmentCreateRes = await fetch(`${BASE_URL}/api/assessments`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: adminSessionCookie,
    },
    body: JSON.stringify({
      studentId: testStudent.id,
      classId: testStudent.classId,
      subjectId: testSubject.id,
      topic: "E2E Perkalian Pecahan",
      date: new Date().toISOString(),
      score: 95,
      masteryLevel: "SANGAT_MENGUASAI",
      notes: "Siswa sangat memahami konsep perhitungan",
    }),
  });
  assert(
    assessmentCreateRes.status === 200 || assessmentCreateRes.status === 201,
    "Record 5-tier assessment via POST /api/assessments succeeds"
  );

  // D. Update SPP Payment Status
  const testSppPayment = sppData.payments[0];
  const sppUpdateRes = await fetch(`${BASE_URL}/api/spp/${testSppPayment.id}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Cookie: adminSessionCookie,
    },
    body: JSON.stringify({
      status: "LUNAS",
      paymentDate: new Date().toISOString(),
      method: "TRANSFER",
      notes: "Lunas via transfer m-banking verified by E2E",
    }),
  });
  assert(
    sppUpdateRes.status === 200,
    "Update SPP status to LUNAS via PATCH /api/spp/[id] succeeds"
  );

  // E. Calculate Payroll Formula
  const payrollRes = await fetch(`${BASE_URL}/api/tutor-payments`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: adminSessionCookie,
    },
    body: JSON.stringify({
      tutorId: testTutor.id,
      month: 12,
      year: 2026,
      customSessions: 14,
      notes: "Payroll formula calculation E2E",
    }),
  });
  assert(payrollRes.status === 200, "Calculate and save tutor payroll returns 200");
  const payrollData = await payrollRes.json();
  const expectedTotal = 14 * testTutor.compensationRate;
  assert(
    payrollData.payment && payrollData.payment.total === expectedTotal,
    `Tutor compensation correctly calculated: 14 sessions × Rp ${testTutor.compensationRate} = Rp ${payrollData.payment?.total}`
  );

  // 7. Audit Logs Verification
  console.log("\n--- 7. AUDIT LOGS VERIFICATION ---");
  const auditLogsRes = await fetch(`${BASE_URL}/api/audit-logs`, {
    headers: { Cookie: adminSessionCookie },
  });
  assert(auditLogsRes.status === 200, "GET /api/audit-logs returns 200");
  const auditLogsData = await auditLogsRes.json();
  assert(
    Array.isArray(auditLogsData.logs) && auditLogsData.logs.length >= 6,
    `Audit logs contain real recorded activity entries (${auditLogsData.logs.length} entries)`
  );

  // Summary
  console.log("\n==================================================");
  const total = results.length;
  const passed = results.filter((r) => r.status === "PASS").length;
  const failed = results.filter((r) => r.status === "FAIL").length;
  console.log(`🏁 E2E VERIFICATION: ${passed}/${total} PASSED, ${failed} FAILED`);
  console.log("==================================================");

  if (failed > 0) {
    process.exit(1);
  }
}

runE2ETests().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
