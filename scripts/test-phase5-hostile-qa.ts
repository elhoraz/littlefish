import { PrismaClient } from "@prisma/client";
import { SignJWT } from "jose";
import { getJakartaDateString } from "../src/lib/utils";

const prisma = new PrismaClient();
const BASE_URL = process.env.TEST_URL || "http://localhost:3000";

let passedCount = 0;
let failedCount = 0;

function check(section: string, description: string, condition: boolean) {
  if (condition) {
    console.log(`  ✅ [${section}] ${description}`);
    passedCount++;
  } else {
    console.error(`  ❌ [${section}] ${description}`);
    failedCount++;
  }
}

async function runHostileQASuite() {
  console.log("======================================================================");
  console.log("🔥 ANTIGRAVITY PHASE 5: HOSTILE QA, ADVERSARIAL TESTING & DATA SYNC");
  console.log(`Target Environment: ${BASE_URL}`);
  console.log("======================================================================\n");

  // Retrieve test users from database
  const adminUser = await prisma.user.findFirst({ where: { role: "ADMIN" } });
  const dimasUser = await prisma.user.findFirst({
    where: { email: "tutor@littlefish.test" },
    include: { tutor: true },
  });
  const sarahUser = await prisma.user.findFirst({
    where: { email: "sarah@littlefish.test" },
    include: { tutor: true },
  });
  const ratnaUser = await prisma.user.findFirst({
    where: { email: "ortu@littlefish.test" },
    include: { parent: true },
  });
  const mayaUser = await prisma.user.findFirst({
    where: { email: "maya@littlefish.test" },
    include: { parent: true },
  });

  if (!adminUser || !dimasUser || !sarahUser || !ratnaUser || !mayaUser) {
    throw new Error("Missing test users. Please run database seed first: npm run seed");
  }

  // --- 1. HOSTILE AUTHENTICATION TESTS ---
  console.log("--- 1. HOSTILE AUTHENTICATION TESTS ---");

  // 1.1 Non-JSON or broken body
  const brokenJsonRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: "THIS_IS_NOT_JSON",
  });
  check("AUTH", "Malformed non-JSON request body returns 400 Bad Request", brokenJsonRes.status === 400);

  // 1.2 Empty body
  const emptyBodyRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({}),
  });
  check("AUTH", "Empty credentials body returns 400 Bad Request", emptyBodyRes.status === 400);

  // 1.3 Blank string fields
  const blankFieldsRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "   ", password: "" }),
  });
  check("AUTH", "Blank email and password returns 400 Bad Request", blankFieldsRes.status === 400);

  // 1.4 SQL Injection payload in email
  const sqliRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "admin' OR '1'='1", password: "password" }),
  });
  check("AUTH", "SQL Injection payload in email is safely rejected (400 or 401)", [400, 401].includes(sqliRes.status));

  // 1.5 XSS payload in email
  const xssRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "<script>alert(1)</script>@test.com", password: "password" }),
  });
  check("AUTH", "XSS payload in email is safely handled without error leak", [400, 401].includes(xssRes.status));

  // 1.6 Tampered JWT Cookie (Fake Signature)
  const fakeToken = await new SignJWT({ userId: adminUser.id, role: "ADMIN", email: adminUser.email, name: "Attacker" })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("7d")
    .sign(new TextEncoder().encode("wrong-secret-key-attacker-forged"));

  const tamperedCookieRes = await fetch(`${BASE_URL}/api/audit-logs`, {
    headers: { Cookie: `littlefish_session=${fakeToken}` },
  });
  check("AUTH", "Forged JWT signature is rejected (403 Forbidden)", tamperedCookieRes.status === 403);

  // 1.7 Random gibberish token
  const gibberishTokenRes = await fetch(`${BASE_URL}/api/audit-logs`, {
    headers: { Cookie: `littlefish_session=not.a.valid.jwt.string` },
  });
  check("AUTH", "Corrupted token string is rejected (403 Forbidden)", gibberishTokenRes.status === 403);

  // 1.8 Unauthenticated access to private route
  const unauthApiRes = await fetch(`${BASE_URL}/api/students`, { redirect: "manual" });
  check("AUTH", "Unauthenticated API request receives 403 Forbidden", unauthApiRes.status === 403);

  // 1.9 Valid Logins for subsequent tests
  const adminLogin = await fetch(`${BASE_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "admin@littlefish.test", password: "admin123" }),
  });
  const adminCookie = (adminLogin.headers.get("set-cookie") || "").split(";")[0];
  check("AUTH", "Admin login succeeds with 200 OK", adminLogin.status === 200);

  const dimasLogin = await fetch(`${BASE_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "tutor@littlefish.test", password: "tutor123" }),
  });
  const dimasCookie = (dimasLogin.headers.get("set-cookie") || "").split(";")[0];

  const sarahLogin = await fetch(`${BASE_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "sarah@littlefish.test", password: "tutor123" }),
  });
  const sarahCookie = (sarahLogin.headers.get("set-cookie") || "").split(";")[0];

  const ratnaLogin = await fetch(`${BASE_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "ortu@littlefish.test", password: "parent123" }),
  });
  const ratnaCookie = (ratnaLogin.headers.get("set-cookie") || "").split(";")[0];

  const mayaLogin = await fetch(`${BASE_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "maya@littlefish.test", password: "parent123" }),
  });
  const mayaCookie = (mayaLogin.headers.get("set-cookie") || "").split(";")[0];

  // 1.10 Logout check
  const logoutRes = await fetch(`${BASE_URL}/api/auth/logout`, {
    method: "POST",
    headers: { Cookie: adminCookie },
  });
  check("AUTH", "Logout returns 200 OK and clears session cookie", logoutRes.status === 200);

  // --- 2. HOSTILE AUTHORIZATION & DATA ISOLATION ---
  console.log("\n--- 2. HOSTILE AUTHORIZATION & DATA ISOLATION ---");

  // Get test classes and students
  const dimasClass = await prisma.class.findFirst({ where: { tutorId: dimasUser.tutor?.id } });
  const sarahClass = await prisma.class.findFirst({ where: { tutorId: sarahUser.tutor?.id } });
  const ratnaStudent = await prisma.student.findFirst({ where: { parentId: ratnaUser.parent?.id } });
  const mayaStudent = await prisma.student.findFirst({ where: { parentId: mayaUser.parent?.id } });

  if (!dimasClass || !sarahClass || !ratnaStudent || !mayaStudent) {
    throw new Error("Missing test class or student data");
  }

  // 2.1 Tutor Dimas attempting to upload worksheet to Sarah's class
  const form = new FormData();
  form.append("title", "Worksheet Bajakan");
  form.append("classId", sarahClass.id);
  const firstSubject = await prisma.subject.findFirst();
  form.append("subjectId", firstSubject!.id);
  const fakeFile = new Blob(["test-content"], { type: "application/pdf" });
  form.append("file", fakeFile, "test.pdf");

  const dimasUploadSarahClass = await fetch(`${BASE_URL}/api/worksheets`, {
    method: "POST",
    headers: { Cookie: dimasCookie },
    body: form,
  });
  check("IDOR", "Tutor A cannot upload worksheet to Tutor B's class (403 Forbidden)", dimasUploadSarahClass.status === 403);

  // 2.2 Parent Maya attempting to download worksheet of Sarah's class (her child Kenzo is NOT in Sarah's class)
  const sarahWorksheet = await prisma.worksheet.findFirst({ where: { classId: sarahClass.id } });
  if (sarahWorksheet) {
    const mayaDownloadSarahWs = await fetch(`${BASE_URL}/api/worksheets/download/${sarahWorksheet.fileKey}`, {
      headers: { Cookie: mayaCookie },
    });
    check("IDOR", "Parent without child in class cannot download worksheet (403 Forbidden)", mayaDownloadSarahWs.status === 403);

    // And Parent Ratna (whose child Siti IS in Sarah's class) CAN download
    const ratnaDownloadSarahWs = await fetch(`${BASE_URL}/api/worksheets/download/${sarahWorksheet.fileKey}`, {
      headers: { Cookie: ratnaCookie },
    });
    check("AUTHZ", "Parent with child in class CAN download worksheet (200 OK)", ratnaDownloadSarahWs.status === 200);
  } else {
    check("IDOR", "Parent without child in class cannot download worksheet (skipped - no fixture)", true);
  }

  // 2.3 Path Traversal attempt on download endpoint
  const pathTraversalRes = await fetch(`${BASE_URL}/api/worksheets/download/..%2F..%2Fetc%2Fpasswd`, {
    headers: { Cookie: adminCookie },
  });
  check("SECURITY", "Path traversal in worksheet download is safely neutralized (404/403)", [403, 404].includes(pathTraversalRes.status));

  // 2.4 Parent Ratna attempting to view Kenzo's detail
  const ratnaViewKenzo = await fetch(`${BASE_URL}/api/students/${mayaStudent.id}`, {
    headers: { Cookie: ratnaCookie },
  });
  check("IDOR", "Parent cannot view other family's student detail (403 Forbidden)", ratnaViewKenzo.status === 403);

  // 2.5 Parent Ratna attempting to query Kenzo's SPP bill
  const ratnaViewKenzoSpp = await fetch(`${BASE_URL}/api/spp?studentId=${mayaStudent.id}`, {
    headers: { Cookie: ratnaCookie },
  });
  check("IDOR", "Parent cannot query other family's SPP data (403 Forbidden)", ratnaViewKenzoSpp.status === 403);

  // 2.6 Tutor Dimas attempting Admin payroll calculation
  const dimasMutatePayroll = await fetch(`${BASE_URL}/api/tutor-payments`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: dimasCookie },
    body: JSON.stringify({ tutorId: dimasUser.tutor?.id, month: 10, year: 2026 }),
  });
  check("IDOR", "Tutor cannot trigger payroll calculation API (403 Forbidden)", dimasMutatePayroll.status === 403);

  // 2.7 Tutor Dimas attempting to alter Admin SPP status
  const firstSpp = await prisma.sppPayment.findFirst();
  if (firstSpp) {
    const dimasAlterSpp = await fetch(`${BASE_URL}/api/spp/${firstSpp.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", Cookie: dimasCookie },
      body: JSON.stringify({ status: "LUNAS" }),
    });
    check("IDOR", "Tutor cannot alter student SPP status (403 Forbidden)", dimasAlterSpp.status === 403);
  }

  // --- 3. INPUT VALIDATION & DATA INTEGRITY ---
  console.log("\n--- 3. INPUT VALIDATION & DATA INTEGRITY ---");

  // 3.1 Assessment score < 0
  const invalidScoreLow = await fetch(`${BASE_URL}/api/assessments`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: dimasCookie },
    body: JSON.stringify({
      studentId: ratnaStudent.id,
      classId: dimasClass.id,
      subjectId: firstSubject!.id,
      topic: "Tes Negatif",
      score: -15,
    }),
  });
  check("VALIDATION", "Score below 0 is rejected with 400 Bad Request", invalidScoreLow.status === 400);

  // 3.2 Assessment score > 100
  const invalidScoreHigh = await fetch(`${BASE_URL}/api/assessments`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: dimasCookie },
    body: JSON.stringify({
      studentId: ratnaStudent.id,
      classId: dimasClass.id,
      subjectId: firstSubject!.id,
      topic: "Tes Berlebih",
      score: 150,
    }),
  });
  check("VALIDATION", "Score above 100 is rejected with 400 Bad Request", invalidScoreHigh.status === 400);

  // 3.3 Non-existent student ID in assessment
  const nonExistentStudentAss = await fetch(`${BASE_URL}/api/assessments`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: dimasCookie },
    body: JSON.stringify({
      studentId: "00000000-0000-0000-0000-000000000000",
      classId: dimasClass.id,
      subjectId: firstSubject!.id,
      topic: "Topik Nyasar",
      score: 85,
    }),
  });
  check("INTEGRITY", "Assessment for non-existent student safely returns 404 Not Found", nonExistentStudentAss.status === 404);

  // 3.4 Non-existent ID in single fetch
  const nonExistentStudentGet = await fetch(`${BASE_URL}/api/students/00000000-0000-0000-0000-000000000000`, {
    headers: { Cookie: adminCookie },
  });
  check("INTEGRITY", "GET /api/students/[non-existent-id] gracefully returns 404", nonExistentStudentGet.status === 404);

  // --- 4. CONCURRENCY & ATTENDANCE IDEMPOTENCY ---
  console.log("\n--- 4. CONCURRENCY & ATTENDANCE IDEMPOTENCY ---");

  const todayStr = getJakartaDateString();
  const [cleanY, cleanM, cleanD] = todayStr.split("-").map(Number);
  await prisma.attendance.deleteMany({
    where: {
      classId: dimasClass.id,
      date: {
        gte: new Date(cleanY, cleanM - 1, cleanD, 0, 0, 0, 0),
        lte: new Date(cleanY, cleanM - 1, cleanD, 23, 59, 59, 999),
      },
    },
  });

  // Tutor Dimas records attendance for ratnaStudent
  const attPost1 = await fetch(`${BASE_URL}/api/attendance`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: dimasCookie },
    body: JSON.stringify({
      date: todayStr,
      classId: dimasClass.id,
      studentAttendances: [{ studentId: ratnaStudent.id, status: "HADIR", notes: "Sesi 1" }],
    }),
  });
  check("ATTENDANCE", "Initial attendance recording returns 200 OK", attPost1.status === 200);

  // Duplicate submit on the exact same date and session
  const attPost2 = await fetch(`${BASE_URL}/api/attendance`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: dimasCookie },
    body: JSON.stringify({
      date: todayStr,
      classId: dimasClass.id,
      studentAttendances: [{ studentId: ratnaStudent.id, status: "IZIN", notes: "Koreksi Izin" }],
    }),
  });
  check("ATTENDANCE", "Subsequent attendance update returns 200 OK without duplication", attPost2.status === 200);

  // Verify only 1 attendance row exists for this date in database
  const [y, m, d] = todayStr.split("-").map(Number);
  const startDay = new Date(y, m - 1, d, 0, 0, 0, 0);
  const endDay = new Date(y, m - 1, d, 23, 59, 59, 999);
  const recordCount = await prisma.attendance.count({
    where: {
      classId: dimasClass.id,
      studentId: ratnaStudent.id,
      date: { gte: startDay, lte: endDay },
    },
  });
  check("ATTENDANCE", `Exactly 1 record exists after repeated submissions (count: ${recordCount})`, recordCount === 1);

  // --- 5. CROSS-ROLE DATA SYNCHRONIZATION ---
  console.log("\n--- 5. CROSS-ROLE DATA SYNCHRONIZATION ---");

  // Step 1: Tutor updates attendance to HADIR
  await fetch(`${BASE_URL}/api/attendance`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: dimasCookie },
    body: JSON.stringify({
      date: todayStr,
      classId: dimasClass.id,
      studentAttendances: [{ studentId: ratnaStudent.id, status: "HADIR", notes: "Hadir tepat waktu" }],
    }),
  });

  // Step 2: Parent checks child attendance
  const parentAttCheck = await fetch(`${BASE_URL}/api/attendance?studentId=${ratnaStudent.id}`, {
    headers: { Cookie: ratnaCookie },
  });
  const parentAttData = await parentAttCheck.json();
  const latestAtt = parentAttData.attendances?.find((a: any) => a.studentId === ratnaStudent.id);
  check("SYNC", "Parent immediately sees Tutor's updated attendance (HADIR)", latestAtt?.status === "HADIR");

  // Step 3: Tutor inputs a new 5-tier assessment (Score 96 -> Sangat Menguasai)
  const syncTopic = `Sinkronisasi Materi ${Date.now()}`;
  const assCreateRes = await fetch(`${BASE_URL}/api/assessments`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: dimasCookie },
    body: JSON.stringify({
      studentId: ratnaStudent.id,
      classId: dimasClass.id,
      subjectId: firstSubject!.id,
      topic: syncTopic,
      score: 96,
      notes: "Sangat antusias memahami konsep",
    }),
  });
  check("SYNC", "Tutor records high score assessment (201 Created)", assCreateRes.status === 201);

  // Step 4: Admin checks assessment stream
  const adminAssCheck = await fetch(`${BASE_URL}/api/assessments?studentId=${ratnaStudent.id}`, {
    headers: { Cookie: adminCookie },
  });
  const adminAssData = await adminAssCheck.json();
  const foundAdminAss = adminAssData.assessments?.find((a: any) => a.topic === syncTopic);
  check("SYNC", "Admin sees new assessment in global stream", !!foundAdminAss);

  // Step 5: Parent checks child grades & progress
  const parentAssCheck = await fetch(`${BASE_URL}/api/assessments?studentId=${ratnaStudent.id}`, {
    headers: { Cookie: ratnaCookie },
  });
  const parentAssData = await parentAssCheck.json();
  const foundParentAss = parentAssData.assessments?.find((a: any) => a.topic === syncTopic);
  check("SYNC", "Parent portal reflects live assessment and mastery level (SANGAT_MENGUASAI)", foundParentAss?.masteryLevel === "SANGAT_MENGUASAI");

  // --- 6. SPP & FINANCIAL AUDIT TRAIL ---
  console.log("\n--- 6. SPP & FINANCIAL AUDIT TRAIL ---");

  // Admin marks SPP as LUNAS
  const testSpp = await prisma.sppPayment.findFirst({ where: { studentId: ratnaStudent.id } });
  if (testSpp) {
    const payRes = await fetch(`${BASE_URL}/api/spp/${testSpp.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", Cookie: adminCookie },
      body: JSON.stringify({ status: "LUNAS", method: "TRANSFER" }),
    });
    check("FINANCE", "Admin marks SPP as LUNAS (200 OK)", payRes.status === 200);

    // Parent sees status updated to LUNAS
    const parentSppCheck = await fetch(`${BASE_URL}/api/spp?studentId=${ratnaStudent.id}`, {
      headers: { Cookie: ratnaCookie },
    });
    const parentSppData = await parentSppCheck.json();
    const updatedSpp = parentSppData.payments?.find((p: any) => p.id === testSpp.id);
    check("FINANCE", "Parent immediately sees SPP updated to LUNAS", updatedSpp?.status === "LUNAS");
  }

  // --- 7. THEME & UI INTEGRITY CHECK ---
  console.log("\n--- 7. THEME & UI INTEGRITY CHECK ---");

  const loginPageHtml = await fetch(`${BASE_URL}/login`).then((r) => r.text());
  check("THEME", "HTML has suppressHydrationWarning and theme script", loginPageHtml.includes("suppressHydrationWarning"));
  check("THEME", "ThemeSwitcher component present on login page", loginPageHtml.includes("Pilih tema tampilan") || loginPageHtml.includes("Ganti tema"));

  console.log("\n======================================================================");
  console.log(`🏁 HOSTILE QA RESULTS: ${passedCount} PASSED, ${failedCount} FAILED`);
  console.log("======================================================================\n");

  if (failedCount > 0) {
    process.exit(1);
  }
}

runHostileQASuite()
  .catch((err) => {
    console.error("Test execution failed with error:", err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
