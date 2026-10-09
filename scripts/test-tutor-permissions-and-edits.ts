import { PrismaClient } from "@prisma/client";
import { signSessionToken } from "../src/lib/auth";

const prisma = new PrismaClient();
const BASE_URL = process.env.TEST_URL || "http://localhost:3000";

let passed = 0;
let failed = 0;

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function safeFetch(url: string, init?: RequestInit): Promise<Response> {
  await delay(80);
  return fetch(url, init);
}

function assert(condition: boolean, testName: string, detail?: string) {
  if (condition) {
    console.log(`  ✅ PASS: ${testName}`);
    passed++;
  } else {
    console.error(`  ❌ FAIL: ${testName} ${detail ? `(${detail})` : ""}`);
    failed++;
  }
}

async function runTests() {
  console.log("======================================================================");
  console.log("🧪 TESTING TUTOR PERMISSIONS, EDIT FLOWS & DATA INTEGRITY");
  console.log(`Target: ${BASE_URL}`);
  console.log("======================================================================\n");

  // 1. Fetch test users
  const adminUser = await prisma.user.findFirst({ where: { role: "ADMIN" } });
  const tutorDimas = await prisma.user.findFirst({
    where: { email: "tutor@littlefish.test" },
    include: { tutor: { include: { classes: true } } },
  });
  const tutorSarah = await prisma.user.findFirst({
    where: { email: "sarah@littlefish.test" },
    include: { tutor: { include: { classes: true } } },
  });
  const parentRatna = await prisma.user.findFirst({
    where: { email: "ortu@littlefish.test" },
    include: { parent: { include: { students: true } } },
  });

  if (!adminUser || !tutorDimas || !tutorSarah || !parentRatna) {
    throw new Error("Missing test users. Seed must be active.");
  }

  // Generate tokens
  const adminToken = await signSessionToken({
    userId: adminUser.id,
    email: adminUser.email,
    name: adminUser.name,
    role: "ADMIN",
  });
  const dimasToken = await signSessionToken({
    userId: tutorDimas.id,
    email: tutorDimas.email,
    name: tutorDimas.name,
    role: "TUTOR",
    tutorId: tutorDimas.tutor?.id,
  });
  const sarahToken = await signSessionToken({
    userId: tutorSarah.id,
    email: tutorSarah.email,
    name: tutorSarah.name,
    role: "TUTOR",
    tutorId: tutorSarah.tutor?.id,
  });
  const ratnaToken = await signSessionToken({
    userId: parentRatna.id,
    email: parentRatna.email,
    name: parentRatna.name,
    role: "PARENT",
    parentId: parentRatna.parent?.id,
  });

  const adminHeaders = { "Content-Type": "application/json", Cookie: `littlefish_session=${adminToken}` };
  const dimasHeaders = { "Content-Type": "application/json", Cookie: `littlefish_session=${dimasToken}` };
  const sarahHeaders = { "Content-Type": "application/json", Cookie: `littlefish_session=${sarahToken}` };
  const ratnaHeaders = { "Content-Type": "application/json", Cookie: `littlefish_session=${ratnaToken}` };

  // Identify students in Dimas's class vs outside
  const dimasClassId = tutorDimas.tutor?.classes[0]?.id;
  const dimasStudent = await prisma.student.findFirst({
    where: { classId: dimasClassId },
  });
  const otherStudent = await prisma.student.findFirst({
    where: { classId: { not: dimasClassId } },
  });

  // -------------------------------------------------------------
  // TEST SECTION 1: MASTER DATA EDIT PROTECTION (STUDENT & CLASS)
  // -------------------------------------------------------------
  console.log("--- 1. MASTER DATA AUTHORIZATION PROTECTION ---");

  // 1.1 Tutor cannot update student master data
  if (dimasStudent) {
    const tutorUpdateStudent = await safeFetch(`${BASE_URL}/api/students/${dimasStudent.id}`, {
      method: "PUT",
      headers: dimasHeaders,
      body: JSON.stringify({
        fullName: "Hacked Student Name",
        gender: "Laki-laki",
        status: "ACTIVE",
      }),
    });
    assert(
      tutorUpdateStudent.status === 403,
      "Tutor is FORBIDDEN (403) from updating student master data via PUT /api/students/[id]",
      `Status: ${tutorUpdateStudent.status}`
    );
  }

  // 1.2 Tutor cannot update class configuration
  if (dimasClassId) {
    const tutorUpdateClass = await safeFetch(`${BASE_URL}/api/classes/${dimasClassId}`, {
      method: "PUT",
      headers: dimasHeaders,
      body: JSON.stringify({
        name: "Hacked Class Name",
        level: "TK",
        capacity: 50,
        status: "ACTIVE",
      }),
    });
    assert(
      tutorUpdateClass.status === 403,
      "Tutor is FORBIDDEN (403) from updating class master data via PUT /api/classes/[id]",
      `Status: ${tutorUpdateClass.status}`
    );
  }

  // 1.3 Tutor cannot access financial endpoints
  const tutorSppAccess = await safeFetch(`${BASE_URL}/api/spp`, { headers: dimasHeaders });
  assert(
    tutorSppAccess.status === 403,
    "Tutor is FORBIDDEN (403) from accessing SPP finance API",
    `Status: ${tutorSppAccess.status}`
  );

  const tutorPaymentAccess = await safeFetch(`${BASE_URL}/api/tutor-payments`, { headers: dimasHeaders });
  assert(
    tutorPaymentAccess.status === 403,
    "Tutor is FORBIDDEN (403) from accessing Tutor Payment approvals API",
    `Status: ${tutorPaymentAccess.status}`
  );

  // -------------------------------------------------------------
  // TEST SECTION 2: LEARNING NOTES SEPARATION
  // -------------------------------------------------------------
  console.log("\n--- 2. STUDENT LEARNING NOTES EDIT & ISOLATION ---");

  if (dimasStudent) {
    // 2.1 Tutor can update notes for student in their class
    const updateNotesRes = await safeFetch(`${BASE_URL}/api/students/${dimasStudent.id}`, {
      method: "PUT",
      headers: dimasHeaders,
      body: JSON.stringify({
        notes: "Catatan kemajuan belajar otomatis via QA test",
      }),
    });
    assert(
      updateNotesRes.status === 200,
      "Tutor can update learning notes for their assigned class student via PUT /api/students/[id]",
      `Status: ${updateNotesRes.status}`
    );
    const notesData = await updateNotesRes.json();
    assert(
      notesData.student?.notes === "Catatan kemajuan belajar otomatis via QA test",
      "Student learning notes updated accurately in database"
    );

    // 2.2 Identical notes update does not create false audit log
    const identicalNotesRes = await safeFetch(`${BASE_URL}/api/students/${dimasStudent.id}`, {
      method: "PUT",
      headers: dimasHeaders,
      body: JSON.stringify({
        notes: "Catatan kemajuan belajar otomatis via QA test",
      }),
    });
    const identicalNotesData = await identicalNotesRes.json();
    assert(
      identicalNotesRes.status === 200 && identicalNotesData.noChanges === true,
      "Identical notes save returns noChanges: true without false audit log"
    );
  }

  // 2.3 Tutor cannot update notes for a student in another tutor's class
  if (otherStudent) {
    const unauthorizedNotesRes = await safeFetch(`${BASE_URL}/api/students/${otherStudent.id}`, {
      method: "PUT",
      headers: dimasHeaders,
      body: JSON.stringify({
        notes: "Unauthorized note tampering",
      }),
    });
    assert(
      unauthorizedNotesRes.status === 403,
      "Tutor is FORBIDDEN (403) from editing learning notes of student outside their class",
      `Status: ${unauthorizedNotesRes.status}`
    );
  }

  // -------------------------------------------------------------
  // TEST SECTION 3: MODUL AJAR EDIT & OWNERSHIP
  // -------------------------------------------------------------
  console.log("\n--- 3. TEACHING MODULE EDIT & AUDITING ---");

  // Create a test module owned by Dimas
  const sampleSubject = await prisma.subject.findFirst();
  const testModule = await prisma.teachingModule.create({
    data: {
      month: 11,
      year: 2026,
      classId: dimasClassId!,
      tutorId: tutorDimas.tutor!.id,
      subjectId: sampleSubject!.id,
      topic: "Modul Uji QA Awal",
      objectives: "Tujuan awal pembelajaran",
      materials: "Buku latihan halaman 1-10",
      activities: "Aktivitas membaca dan menulis",
    },
  });

  // 3.1 Tutor Dimas can edit their own module
  const editModuleRes = await safeFetch(`${BASE_URL}/api/modules/${testModule.id}`, {
    method: "PUT",
    headers: dimasHeaders,
    body: JSON.stringify({
      month: 11,
      year: 2026,
      topic: "Modul Uji QA - Revisi Topik",
      objectives: "Tujuan yang disempurnakan",
      materials: "Buku latihan dan kartu suku kata",
      activities: "Aktivitas games fonik",
      notes: "Catatan revisi tutor",
    }),
  });
  assert(
    editModuleRes.status === 200,
    "Tutor can edit their own teaching module via PUT /api/modules/[id]",
    `Status: ${editModuleRes.status}`
  );
  const editModuleData = await editModuleRes.json();
  assert(
    editModuleData.module?.topic === "Modul Uji QA - Revisi Topik",
    "Module topic successfully updated"
  );

  // 3.2 Identical module update does not trigger false audit
  const identicalModuleRes = await safeFetch(`${BASE_URL}/api/modules/${testModule.id}`, {
    method: "PUT",
    headers: dimasHeaders,
    body: JSON.stringify({
      month: 11,
      year: 2026,
      topic: "Modul Uji QA - Revisi Topik",
      objectives: "Tujuan yang disempurnakan",
      materials: "Buku latihan dan kartu suku kata",
      activities: "Aktivitas games fonik",
      notes: "Catatan revisi tutor",
    }),
  });
  const identicalModuleData = await identicalModuleRes.json();
  assert(
    identicalModuleRes.status === 200 && identicalModuleData.noChanges === true,
    "Identical module save returns noChanges: true without false audit log"
  );

  // 3.3 Other tutor (Sarah) cannot edit Dimas's module
  const otherTutorModuleRes = await safeFetch(`${BASE_URL}/api/modules/${testModule.id}`, {
    method: "PUT",
    headers: sarahHeaders,
    body: JSON.stringify({
      month: 11,
      year: 2026,
      topic: "Unauthorized Hijack",
      objectives: "Tampering",
      materials: "None",
      activities: "None",
    }),
  });
  assert(
    otherTutorModuleRes.status === 403,
    "Other tutor is FORBIDDEN (403) from editing a module they do not teach",
    `Status: ${otherTutorModuleRes.status}`
  );

  // Cleanup test module
  await prisma.teachingModule.delete({ where: { id: testModule.id } });

  // -------------------------------------------------------------
  // TEST SECTION 4: PENILAIAN SISWA EDIT & MASTERY CALCULATION
  // -------------------------------------------------------------
  console.log("\n--- 4. STUDENT ASSESSMENT EDIT & MASTERY ---");

  // Create test assessment
  const testAssessment = await prisma.assessment.create({
    data: {
      studentId: dimasStudent!.id,
      classId: dimasClassId!,
      tutorId: tutorDimas.tutor!.id,
      subjectId: sampleSubject!.id,
      topic: "Kuis Berhitung Cepat",
      score: 75,
      masteryLevel: "CUKUP_MENGUASAI",
    },
  });

  // 4.1 Tutor can edit assessment (score 75 -> 95 auto-promotes to SANGAT_MENGUASAI)
  const editAssessmentRes = await safeFetch(`${BASE_URL}/api/assessments/${testAssessment.id}`, {
    method: "PUT",
    headers: dimasHeaders,
    body: JSON.stringify({
      topic: "Kuis Berhitung Cepat (Revisi Skor)",
      score: 95,
      notes: "Peningkatan pemahaman konsep perkalian dasar",
    }),
  });
  assert(
    editAssessmentRes.status === 200,
    "Tutor can edit student assessment via PUT /api/assessments/[id]",
    `Status: ${editAssessmentRes.status}`
  );
  const editAssessmentData = await editAssessmentRes.json();
  assert(
    editAssessmentData.assessment?.score === 95 &&
    editAssessmentData.assessment?.masteryLevel === "SANGAT_MENGUASAI",
    "Assessment score 95 automatically recalculates mastery to SANGAT_MENGUASAI"
  );

  // 4.2 Identical assessment update returns noChanges: true
  const identicalAssessmentRes = await safeFetch(`${BASE_URL}/api/assessments/${testAssessment.id}`, {
    method: "PUT",
    headers: dimasHeaders,
    body: JSON.stringify({
      topic: "Kuis Berhitung Cepat (Revisi Skor)",
      score: 95,
      notes: "Peningkatan pemahaman konsep perkalian dasar",
    }),
  });
  const identicalAssessmentData = await identicalAssessmentRes.json();
  assert(
    identicalAssessmentRes.status === 200 && identicalAssessmentData.noChanges === true,
    "Identical assessment save returns noChanges: true without false audit log"
  );

  // 4.3 Sarah cannot edit Dimas's assessment
  const otherTutorAssessmentRes = await safeFetch(`${BASE_URL}/api/assessments/${testAssessment.id}`, {
    method: "PUT",
    headers: sarahHeaders,
    body: JSON.stringify({
      topic: "Malicious Grade Alteration",
      score: 30,
    }),
  });
  assert(
    otherTutorAssessmentRes.status === 403,
    "Other tutor is FORBIDDEN (403) from altering assessment of another class/tutor",
    `Status: ${otherTutorAssessmentRes.status}`
  );

  // Cleanup test assessment
  await prisma.assessment.delete({ where: { id: testAssessment.id } });

  // -------------------------------------------------------------
  // TEST SECTION 5: LEMBAR KERJA EDIT
  // -------------------------------------------------------------
  console.log("\n--- 5. WORKSHEET METADATA EDIT ---");

  const testWorksheet = await prisma.worksheet.create({
    data: {
      title: "Latihan Awal QA",
      description: "Deskripsi awal",
      fileName: "test_worksheet.pdf",
      fileKey: "test_worksheet_key.pdf",
      fileUrl: "/api/worksheets/download/test_worksheet_key.pdf",
      fileType: "application/pdf",
      fileSize: 1024,
      classId: dimasClassId!,
      subjectId: sampleSubject!.id,
      uploadedById: tutorDimas.id,
    },
  });

  const editWorksheetRes = await safeFetch(`${BASE_URL}/api/worksheets/${testWorksheet.id}`, {
    method: "PUT",
    headers: dimasHeaders,
    body: JSON.stringify({
      title: "Latihan Revisi Soal Matematika",
      description: "Kerjakan 10 soal cerita nomor 1 sampai 10",
    }),
  });
  assert(
    editWorksheetRes.status === 200,
    "Tutor can edit worksheet title & description via PUT /api/worksheets/[id]",
    `Status: ${editWorksheetRes.status}`
  );
  const editWorksheetData = await editWorksheetRes.json();
  assert(
    editWorksheetData.worksheet?.title === "Latihan Revisi Soal Matematika",
    "Worksheet title successfully updated in database"
  );

  // Sarah cannot edit Dimas's worksheet
  const otherTutorWorksheetRes = await safeFetch(`${BASE_URL}/api/worksheets/${testWorksheet.id}`, {
    method: "PUT",
    headers: sarahHeaders,
    body: JSON.stringify({
      title: "Hijacked Worksheet",
    }),
  });
  assert(
    otherTutorWorksheetRes.status === 403,
    "Other tutor is FORBIDDEN (403) from updating worksheet of another tutor",
    `Status: ${otherTutorWorksheetRes.status}`
  );

  // Cleanup test worksheet
  await prisma.worksheet.delete({ where: { id: testWorksheet.id } });

  // -------------------------------------------------------------
  // TEST SECTION 6: TUTOR PROFILE MANAGEMENT & ISOLATION
  // -------------------------------------------------------------
  console.log("\n--- 6. TUTOR PROFILE VIEW & EDIT ISOLATION ---");

  // 6.1 Tutor can GET own profile
  const getProfileRes = await safeFetch(`${BASE_URL}/api/tutors/${tutorDimas.tutor!.id}`, { headers: dimasHeaders });
  assert(
    getProfileRes.status === 200,
    "Tutor can fetch their own profile via GET /api/tutors/[id]",
    `Status: ${getProfileRes.status}`
  );
  const profileData = await getProfileRes.json();
  assert(
    profileData.tutor?.user?.email === tutorDimas.email,
    "Profile returns logged in tutor email and personal details"
  );

  // 6.2 Tutor cannot GET another tutor's profile
  const getOtherProfileRes = await safeFetch(`${BASE_URL}/api/tutors/${tutorSarah.tutor!.id}`, { headers: dimasHeaders });
  assert(
    getOtherProfileRes.status === 403,
    "Tutor is FORBIDDEN (403) from viewing another tutor's detail",
    `Status: ${getOtherProfileRes.status}`
  );

  // 6.3 Tutor can update phone, address, and specialization for own profile
  const updateProfileRes = await safeFetch(`${BASE_URL}/api/tutors/${tutorDimas.tutor!.id}`, {
    method: "PUT",
    headers: dimasHeaders,
    body: JSON.stringify({
      phone: "081299988877",
      address: "Jl. Pendidikan No. 42, Jakarta",
      specialization: "Calistung & Matematika Cepat",
    }),
  });
  assert(
    updateProfileRes.status === 200,
    "Tutor can update allowed personal profile fields via PUT /api/tutors/[id]",
    `Status: ${updateProfileRes.status}`
  );
  const updatedProfileData = await updateProfileRes.json();
  assert(
    updatedProfileData.tutor?.user?.phone === "081299988877" &&
    updatedProfileData.tutor?.specialization === "Calistung & Matematika Cepat",
    "Allowed personal profile fields updated successfully"
  );

  // 6.4 Mass assignment protection: attempting to alter compensationRate or status is rejected with 403
  const hackRateRes = await safeFetch(`${BASE_URL}/api/tutors/${tutorDimas.tutor!.id}`, {
    method: "PUT",
    headers: dimasHeaders,
    body: JSON.stringify({
      compensationRate: 9999999,
      status: "INACTIVE",
    }),
  });
  assert(
    hackRateRes.status === 403,
    "Mass assignment protection: Altering compensationRate or status by Tutor is FORBIDDEN (403)",
    `Status: ${hackRateRes.status}`
  );

  // 6.5 Tutor cannot update another tutor's profile
  const hackOtherTutorRes = await safeFetch(`${BASE_URL}/api/tutors/${tutorSarah.tutor!.id}`, {
    method: "PUT",
    headers: dimasHeaders,
    body: JSON.stringify({
      phone: "081111111111",
    }),
  });
  assert(
    hackOtherTutorRes.status === 403,
    "Tutor is FORBIDDEN (403) from updating another tutor's profile",
    `Status: ${hackOtherTutorRes.status}`
  );

  // -------------------------------------------------------------
  // TEST SECTION 7: PARENT ROLE BOUNDARIES
  // -------------------------------------------------------------
  console.log("\n--- 7. PARENT ROLE BOUNDARY CHECKS ---");

  // Parent cannot modify modules
  const parentModuleRes = await safeFetch(`${BASE_URL}/api/modules`, {
    method: "POST",
    headers: ratnaHeaders,
    body: JSON.stringify({ topic: "Parent module attempt" }),
  });
  assert(
    parentModuleRes.status === 403,
    "Parent is FORBIDDEN (403) from creating modules",
    `Status: ${parentModuleRes.status}`
  );

  // Parent cannot modify assessments
  const parentAssessRes = await safeFetch(`${BASE_URL}/api/assessments`, {
    method: "POST",
    headers: ratnaHeaders,
    body: JSON.stringify({ score: 100 }),
  });
  assert(
    parentAssessRes.status === 403,
    "Parent is FORBIDDEN (403) from submitting assessments",
    `Status: ${parentAssessRes.status}`
  );

  // Parent cannot modify student notes or master data
  if (dimasStudent) {
    const parentNotesRes = await safeFetch(`${BASE_URL}/api/students/${dimasStudent.id}`, {
      method: "PUT",
      headers: ratnaHeaders,
      body: JSON.stringify({ notes: "Parent note attempt" }),
    });
    assert(
      parentNotesRes.status === 403,
      "Parent is FORBIDDEN (403) from editing student data",
      `Status: ${parentNotesRes.status}`
    );
  }

  // -------------------------------------------------------------
  // TEST SECTION 8: AUDIT LOG VERIFICATION
  // -------------------------------------------------------------
  console.log("\n--- 8. AUDIT LOG INTEGRITY CHECKS ---");

  const latestAuditLogs = await prisma.auditLog.findMany({
    orderBy: { timestamp: "desc" },
    take: 50,
  });

  const hasModuleAudit = latestAuditLogs.some(
    (l) => l.entity === "TeachingModule" && l.action === "UPDATE"
  );
  assert(hasModuleAudit, "AuditLog successfully recorded UPDATE for TeachingModule");

  const hasAssessmentAudit = latestAuditLogs.some(
    (l) => l.entity === "Assessment" && l.action === "UPDATE"
  );
  assert(hasAssessmentAudit, "AuditLog successfully recorded UPDATE for Assessment");

  const hasStudentNotesAudit = latestAuditLogs.some(
    (l) => l.entity === "StudentNotes" && l.action === "UPDATE"
  );
  assert(hasStudentNotesAudit, "AuditLog successfully recorded UPDATE for StudentNotes");

  const hasTutorProfileAudit = latestAuditLogs.some(
    (l) => l.entity === "TutorProfile" && l.action === "UPDATE"
  );
  assert(hasTutorProfileAudit, "AuditLog successfully recorded UPDATE for TutorProfile");

  console.log("\n======================================================================");
  console.log(`🏁 TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log("======================================================================");

  if (failed > 0) {
    process.exit(1);
  }
}

runTests()
  .catch((e) => {
    console.error("FATAL TEST ERROR:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
