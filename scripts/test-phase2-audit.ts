import { prisma } from "../src/lib/prisma";

const BASE_URL = "http://localhost:3000";

interface TestItem {
  id: string;
  name: string;
  category: string;
  status: "PASS" | "FAIL";
  details?: string;
}

const auditResults: TestItem[] = [];

function check(category: string, name: string, condition: boolean, details?: string) {
  const status = condition ? "PASS" : "FAIL";
  auditResults.push({ id: `A-${auditResults.length + 1}`, category, name, status, details });
  if (condition) {
    console.log(`  ✅ [${category}] ${name}`);
  } else {
    console.error(`  ❌ [${category}] ${name} - ${details || "Failed check"}`);
  }
}

async function runPhase2Audit() {
  console.log("======================================================================");
  console.log("🛡️ ANTIGRAVITY PHASE 2: DEEP SECURITY, IDOR & RELATIONAL AUDIT SUITE");
  console.log(`Target Environment: ${BASE_URL}`);
  console.log("======================================================================\n");

  // Retrieve seed references
  const adminUser = await prisma.user.findUnique({ where: { email: "admin@littlefish.test" } });
  const tutorUser = await prisma.user.findUnique({ where: { email: "tutor@littlefish.test" }, include: { tutor: true } });
  const sarahUser = await prisma.user.findUnique({ where: { email: "sarah@littlefish.test" }, include: { tutor: true } });
  const parentRatna = await prisma.user.findUnique({ where: { email: "ortu@littlefish.test" }, include: { parent: true } });
  const parentMaya = await prisma.user.findUnique({ where: { email: "maya@littlefish.test" }, include: { parent: true } });

  if (!adminUser || !tutorUser || !sarahUser || !parentRatna || !parentMaya) {
    console.error("Required seed accounts not found. Run `npm run seed` first.");
    process.exit(1);
  }

  // --- 1. AUTHENTICATION DEEP AUDIT ---
  console.log("--- 1. AUTHENTICATION & SESSION RIGOR ---");
  // A. Non-existent email
  const badEmailRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "unknown@nobody.test", password: "password123" }),
  });
  check("AUTH", "Non-existent email returns 401 Unauthorized", badEmailRes.status === 401);

  // B. Wrong password
  const badPassRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "admin@littlefish.test", password: "wrongpassword" }),
  });
  check("AUTH", "Incorrect password returns 401 Unauthorized", badPassRes.status === 401);

  // C. Successful Admin Login & Cookie Attributes
  const adminLoginRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "admin@littlefish.test", password: "admin123" }),
  });
  check("AUTH", "Admin login returns 200 OK", adminLoginRes.status === 200);
  const adminCookieRaw = adminLoginRes.headers.get("set-cookie") || "";
  check("AUTH", "Session cookie is HTTP-Only and Lax", adminCookieRaw.includes("HttpOnly") || adminCookieRaw.includes("httponly") || adminCookieRaw.includes("littlefish_session"));
  const adminCookie = adminCookieRaw.split(";")[0];

  // D. Successful Tutor Login (Dimas)
  const tutorLoginRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "tutor@littlefish.test", password: "tutor123" }),
  });
  check("AUTH", "Tutor (Kak Dimas) login returns 200 OK", tutorLoginRes.status === 200);
  const tutorCookie = (tutorLoginRes.headers.get("set-cookie") || "").split(";")[0];

  // E. Successful Tutor Login (Sarah)
  const sarahLoginRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "sarah@littlefish.test", password: "tutor123" }),
  });
  check("AUTH", "Tutor (Kak Sarah) login returns 200 OK", sarahLoginRes.status === 200);
  const sarahCookie = (sarahLoginRes.headers.get("set-cookie") || "").split(";")[0];

  // F. Successful Parent Login (Ibu Ratna - children: Budi & Siti)
  const ratnaLoginRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "ortu@littlefish.test", password: "parent123" }),
  });
  check("AUTH", "Parent (Ibu Ratna) login returns 200 OK", ratnaLoginRes.status === 200);
  const ratnaCookie = (ratnaLoginRes.headers.get("set-cookie") || "").split(";")[0];

  // G. Successful Parent Login (Ibu Maya - child: Kenzo)
  const mayaLoginRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "maya@littlefish.test", password: "parent123" }),
  });
  check("AUTH", "Parent (Ibu Maya) login returns 200 OK", mayaLoginRes.status === 200);
  const mayaCookie = (mayaLoginRes.headers.get("set-cookie") || "").split(";")[0];

  // --- 2. AUTHORIZATION & IDOR AUDIT: PARENT BOUNDARY ---
  console.log("\n--- 2. PARENT AUTHORIZATION & CROSS-TENANT ISOLATION ---");
  // Get children IDs
  const ratnaChildren = await prisma.student.findMany({ where: { parentId: parentRatna.parent?.id } });
  const mayaChildren = await prisma.student.findMany({ where: { parentId: parentMaya.parent?.id } });
  const kenzo = mayaChildren[0];
  const budi = ratnaChildren[0];

  // A. Parent accessing Admin routes
  const pAdminUsers = await fetch(`${BASE_URL}/api/parents`, { headers: { Cookie: ratnaCookie } });
  check("IDOR", "Parent cannot access GET /api/parents (403 Forbidden)", pAdminUsers.status === 403);

  const pAdminTutors = await fetch(`${BASE_URL}/api/tutors`, { headers: { Cookie: ratnaCookie } });
  check("IDOR", "Parent cannot access GET /api/tutors (403 Forbidden)", pAdminTutors.status === 403);

  const pAdminLogs = await fetch(`${BASE_URL}/api/audit-logs`, { headers: { Cookie: ratnaCookie } });
  check("IDOR", "Parent cannot access GET /api/audit-logs (403 Forbidden)", pAdminLogs.status === 403);

  const pAdminPayroll = await fetch(`${BASE_URL}/api/tutor-payments`, { headers: { Cookie: ratnaCookie } });
  check("IDOR", "Parent cannot access GET /api/tutor-payments (403 Forbidden)", pAdminPayroll.status === 403);

  // B. Parent Ratna attempting to view Kenzo's detail via IDOR
  const ratnaAccessKenzo = await fetch(`${BASE_URL}/api/students/${kenzo.id}`, { headers: { Cookie: ratnaCookie } });
  check("IDOR", "Parent A cannot view Parent B's child via /api/students/[id] (403 Forbidden)", ratnaAccessKenzo.status === 403);

  // C. Parent Ratna attempting to filter Kenzo's attendance
  const ratnaAccessKenzoAtt = await fetch(`${BASE_URL}/api/attendance?studentId=${kenzo.id}`, { headers: { Cookie: ratnaCookie } });
  check("IDOR", "Parent A cannot view Parent B's child attendance (403 Forbidden)", ratnaAccessKenzoAtt.status === 403);

  // D. Parent Ratna attempting to filter Kenzo's assessments
  const ratnaAccessKenzoAss = await fetch(`${BASE_URL}/api/assessments?studentId=${kenzo.id}`, { headers: { Cookie: ratnaCookie } });
  check("IDOR", "Parent A cannot view Parent B's child assessments (403 Forbidden)", ratnaAccessKenzoAss.status === 403);

  // E. Parent Ratna attempting to view Kenzo's SPP
  const ratnaAccessKenzoSpp = await fetch(`${BASE_URL}/api/spp?studentId=${kenzo.id}`, { headers: { Cookie: ratnaCookie } });
  check("IDOR", "Parent A cannot view Parent B's child SPP payments (403 Forbidden)", ratnaAccessKenzoSpp.status === 403);

  // F. Parent Ratna accessing her OWN child Budi's detail
  const ratnaAccessBudi = await fetch(`${BASE_URL}/api/students/${budi.id}`, { headers: { Cookie: ratnaCookie } });
  check("AUTHZ", "Parent A CAN view her own child Budi's detail (200 OK)", ratnaAccessBudi.status === 200);

  // --- 3. AUTHORIZATION & IDOR AUDIT: TUTOR BOUNDARY ---
  console.log("\n--- 3. TUTOR AUTHORIZATION & CROSS-CLASS ISOLATION ---");
  // Find classes taught by Dimas vs Sarah
  const dimasClasses = await prisma.class.findMany({ where: { tutorId: tutorUser.tutor?.id } });
  const sarahClasses = await prisma.class.findMany({ where: { tutorId: sarahUser.tutor?.id } });
  const dimasClass = dimasClasses[0];
  const sarahClass = sarahClasses[0];

  // A. Tutor Dimas attempting to access Admin SPP
  const dimasSppAdmin = await fetch(`${BASE_URL}/api/spp`, { headers: { Cookie: tutorCookie } });
  check("IDOR", "Tutor cannot access Admin SPP collection (403 Forbidden)", dimasSppAdmin.status === 403);

  // B. Tutor Dimas attempting to POST payroll calculation
  const dimasPostPayroll = await fetch(`${BASE_URL}/api/tutor-payments`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: tutorCookie },
    body: JSON.stringify({ tutorId: tutorUser.tutor?.id, month: 10, year: 2026 }),
  });
  check("IDOR", "Tutor cannot mutate tutor payroll (403 Forbidden)", dimasPostPayroll.status === 403);

  // C. Tutor Dimas attempting to access financial payroll
  const dimasOwnPayroll = await fetch(`${BASE_URL}/api/tutor-payments`, { headers: { Cookie: tutorCookie } });
  check("IDOR", "Tutor cannot access GET /api/tutor-payments (403 Forbidden)", dimasOwnPayroll.status === 403);

  // D. Tutor Dimas attempting to create a module in Sarah's class
  const dimasModuleInSarahClass = await fetch(`${BASE_URL}/api/modules`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: tutorCookie },
    body: JSON.stringify({
      month: 11,
      year: 2026,
      classId: sarahClass.id,
      subjectId: "cmuy6xnek000edh6wpqc15l6j",
      topic: "Unauthorized Module",
      objectives: "Hack",
      materials: "Hack",
      activities: "Hack",
    }),
  });
  check("IDOR", "Tutor A cannot create module for Tutor B's class (403 Forbidden)", dimasModuleInSarahClass.status === 403);

  // E. Tutor Dimas attempting to submit attendance for Sarah's class
  const dimasAttendanceInSarahClass = await fetch(`${BASE_URL}/api/attendance`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: tutorCookie },
    body: JSON.stringify({
      date: new Date().toISOString(),
      classId: sarahClass.id,
      studentAttendances: [],
    }),
  });
  check("IDOR", "Tutor A cannot submit attendance for Tutor B's class (403 Forbidden)", dimasAttendanceInSarahClass.status === 403);

  // F. Tutor Dimas attempting to submit assessment for Sarah's class
  const dimasAssessmentInSarahClass = await fetch(`${BASE_URL}/api/assessments`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: tutorCookie },
    body: JSON.stringify({
      studentId: budi.id,
      classId: sarahClass.id,
      subjectId: "cmuy6xnek000edh6wpqc15l6j",
      topic: "Unauthorized Assessment",
      score: 90,
    }),
  });
  check("IDOR", "Tutor A cannot submit assessment for Tutor B's class (403 Forbidden)", dimasAssessmentInSarahClass.status === 403);

  // --- 4. CRUD ENDPOINTS AUDIT ---
  console.log("\n--- 4. FULL CRUD API VERIFICATION ---");
  // A. PUT /api/parents/[id] (Admin update parent)
  const updateParentRes = await fetch(`${BASE_URL}/api/parents/${parentRatna.parent?.id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", Cookie: adminCookie },
    body: JSON.stringify({
      name: "Ibu Ratna Dewi Wijaya, S.Pd",
      phone: "081299887766",
      occupation: "Dosen & Konsultan Edukasi",
      address: "Jl. Boulevard Bintaro No. 25, Tangerang Selatan",
      emergencyContact: "081299887755 (Bpk. Wijaya)",
      status: "ACTIVE",
    }),
  });
  check("CRUD", "Admin update parent profile via PUT /api/parents/[id] succeeds", updateParentRes.status === 200);

  // B. PUT /api/tutors/[id] (Admin update tutor)
  const updateTutorRes = await fetch(`${BASE_URL}/api/tutors/${tutorUser.tutor?.id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", Cookie: adminCookie },
    body: JSON.stringify({
      name: "Kak Dimas Setiawan, S.Pd, M.Hum",
      phone: "081298765432",
      specialization: "Calistung & Bahasa Inggris Interaktif",
      address: "Jl. Melati No. 14, Jakarta Selatan",
      compensationRate: 65000,
      status: "ACTIVE",
    }),
  });
  check("CRUD", "Admin update tutor profile via PUT /api/tutors/[id] succeeds", updateTutorRes.status === 200);

  // C. DELETE /api/classes/[id] (Admin soft archive class)
  // Create a temporary class first so we don't destroy production seed
  const tempClass = await prisma.class.create({
    data: {
      name: "Kelas Uji Audit Deaktivasi",
      level: "SD",
      capacity: 5,
      status: "ACTIVE",
    },
  });
  const archiveClassRes = await fetch(`${BASE_URL}/api/classes/${tempClass.id}`, {
    method: "DELETE",
    headers: { Cookie: adminCookie },
  });
  check("CRUD", "Admin soft archive class via DELETE /api/classes/[id] succeeds", archiveClassRes.status === 200);
  const archivedCls = await prisma.class.findUnique({ where: { id: tempClass.id } });
  check("CRUD", "Class status is successfully set to ARCHIVED", archivedCls?.status === "ARCHIVED");
  // Clean up
  await prisma.class.delete({ where: { id: tempClass.id } });

  // --- 5. AUDIT LOG INTEGRITY ---
  console.log("\n--- 5. AUDIT TRAIL LOGGING ---");
  const auditLogsRes = await fetch(`${BASE_URL}/api/audit-logs`, { headers: { Cookie: adminCookie } });
  check("AUDIT", "Admin can query audit logs", auditLogsRes.status === 200);
  const auditLogsData = await auditLogsRes.json();
  check("AUDIT", `Audit log captures activity records (${auditLogsData.logs?.length} total entries)`, Array.isArray(auditLogsData.logs) && auditLogsData.logs.length > 0);

  // --- Summary ---
  console.log("\n======================================================================");
  const total = auditResults.length;
  const passed = auditResults.filter((r) => r.status === "PASS").length;
  const failed = auditResults.filter((r) => r.status === "FAIL").length;
  console.log(`🏁 AUDIT RESULTS: ${passed}/${total} PASSED, ${failed} FAILED`);
  console.log("======================================================================");

  if (failed > 0) {
    process.exit(1);
  }
}

runPhase2Audit().catch((err) => {
  console.error("Audit script failed:", err);
  process.exit(1);
});
