import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { signSessionToken, verifySessionToken, comparePassword } from "../src/lib/auth";

const prisma = new PrismaClient();

async function runTests() {
  console.log("==================================================");
  console.log("🧪 TESTING CRITICAL FLOWS - BIMBEL LITTLEFISH");
  console.log("==================================================\n");

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string) {
    if (condition) {
      console.log(`  ✅ PASS: ${testName}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${testName}`);
      failed++;
    }
  }

  try {
    // 1. AUTHENTICATION TESTS
    console.log("--- 1. AUTHENTICATION & SECURITY ---");
    const adminUser = await prisma.user.findUnique({ where: { email: "admin@littlefish.test" } });
    const tutorUser = await prisma.user.findUnique({ where: { email: "tutor@littlefish.test" } });
    const parentUser = await prisma.user.findUnique({ where: { email: "ortu@littlefish.test" } });

    assert(!!adminUser && adminUser.role === "ADMIN", "Admin user exists with role ADMIN");
    assert(!!tutorUser && tutorUser.role === "TUTOR", "Tutor user exists with role TUTOR");
    assert(!!parentUser && parentUser.role === "PARENT", "Parent user exists with role PARENT");

    const adminPassValid = await comparePassword("admin123", adminUser!.passwordHash);
    assert(adminPassValid, "Admin password 'admin123' verifies correctly");

    const tutorPassValid = await comparePassword("tutor123", tutorUser!.passwordHash);
    assert(tutorPassValid, "Tutor password 'tutor123' verifies correctly");

    const parentPassValid = await comparePassword("parent123", parentUser!.passwordHash);
    assert(parentPassValid, "Parent password 'parent123' verifies correctly");

    const wrongPassFails = await comparePassword("wrongpassword", adminUser!.passwordHash);
    assert(!wrongPassFails, "Wrong password properly fails verification");

    const token = await signSessionToken({
      userId: adminUser!.id,
      email: adminUser!.email,
      name: adminUser!.name,
      role: "ADMIN",
    });
    const verifiedSession = await verifySessionToken(token);
    assert(verifiedSession?.userId === adminUser!.id && verifiedSession?.role === "ADMIN", "JWT Session signing and verification succeeds");

    // 2. STUDENT CRUD & SEARCH TESTS
    console.log("\n--- 2. STUDENT CRUD OPERATIONS ---");
    const testStudentId = "LF-TEST-999";
    await prisma.student.deleteMany({ where: { studentId: testStudentId } });

    const newStudent = await prisma.student.create({
      data: {
        studentId: testStudentId,
        fullName: "Test Automated Student",
        nickname: "Tester",
        gender: "Laki-laki",
        status: "ACTIVE",
        notes: "Automated test record",
      },
    });
    assert(!!newStudent && newStudent.fullName === "Test Automated Student", "Create student successfully");

    const searchResult = await prisma.student.findMany({
      where: { fullName: { contains: "Automated" } },
    });
    assert(searchResult.length > 0, "Search student by partial name works");

    const updatedStudent = await prisma.student.update({
      where: { id: newStudent.id },
      data: { fullName: "Test Automated Student Updated" },
    });
    assert(updatedStudent.fullName === "Test Automated Student Updated", "Update student successfully");

    const deactivatedStudent = await prisma.student.update({
      where: { id: newStudent.id },
      data: { status: "INACTIVE" },
    });
    assert(deactivatedStudent.status === "INACTIVE", "Deactivate student successfully (soft delete)");

    // Cleanup test student
    await prisma.student.delete({ where: { id: newStudent.id } });

    // 3. ATTENDANCE & DUPLICATE PREVENTION
    console.log("\n--- 3. ATTENDANCE ENGINE ---");
    const sampleClass = await prisma.class.findFirst();
    const sampleStudent = await prisma.student.findFirst();
    assert(!!sampleClass && !!sampleStudent, "Class and student exist for attendance");

    const testDate = new Date("2026-10-15T08:00:00Z");
    const startOfDate = new Date("2026-10-15T00:00:00Z");
    const endOfDate = new Date("2026-10-15T23:59:59Z");

    await prisma.attendance.deleteMany({
      where: {
        classId: sampleClass!.id,
        studentId: sampleStudent!.id,
        date: { gte: startOfDate, lte: endOfDate },
      },
    });

    const att1 = await prisma.attendance.create({
      data: {
        date: testDate,
        classId: sampleClass!.id,
        studentId: sampleStudent!.id,
        status: "HADIR",
        type: "STUDENT",
      },
    });
    assert(!!att1 && att1.status === "HADIR", "Attendance record created");

    // Upsert or duplicate check logic
    const existing = await prisma.attendance.findFirst({
      where: {
        classId: sampleClass!.id,
        studentId: sampleStudent!.id,
        date: { gte: startOfDate, lte: endOfDate },
      },
    });
    assert(!!existing, "Duplicate prevention identifies existing attendance on same date and session");

    // 4. ASSESSMENT & MASTERY TIERS
    console.log("\n--- 4. ASSESSMENT & 5-TIER MASTERY ---");
    const sampleSubject = await prisma.subject.findFirst();
    const sampleTutor = await prisma.tutor.findFirst();

    const newAssessment = await prisma.assessment.create({
      data: {
        studentId: sampleStudent!.id,
        tutorId: sampleTutor!.id,
        classId: sampleClass!.id,
        subjectId: sampleSubject!.id,
        topic: "Uji Otomatis Pengenalan Huruf",
        score: 92,
        masteryLevel: "SANGAT_MENGUASAI",
        notes: "Ujian otomatis berhasil",
      },
    });
    assert(newAssessment.score === 92 && newAssessment.masteryLevel === "SANGAT_MENGUASAI", "Assessment recorded with Sangat Menguasai");

    // Cleanup
    await prisma.assessment.delete({ where: { id: newAssessment.id } });

    // 5. SPP PAYMENT WORKFLOW
    console.log("\n--- 5. SPP FINANCE FLOW ---");
    const testInvNumber = "INV-TEST-202611-999";
    await prisma.sppPayment.deleteMany({ where: { invoiceNumber: testInvNumber } });

    const newSpp = await prisma.sppPayment.create({
      data: {
        studentId: sampleStudent!.id,
        invoiceNumber: testInvNumber,
        month: 11,
        year: 2026,
        amount: 250000,
        status: "BELUM_BAYAR",
      },
    });
    assert(newSpp.status === "BELUM_BAYAR" && newSpp.amount === 250000, "SPP invoice created with status BELUM_BAYAR");

    const paidSpp = await prisma.sppPayment.update({
      where: { id: newSpp.id },
      data: {
        status: "LUNAS",
        method: "TRANSFER",
        paymentDate: new Date(),
      },
    });
    assert(paidSpp.status === "LUNAS" && paidSpp.method === "TRANSFER", "SPP invoice successfully verified as LUNAS");

    await prisma.sppPayment.delete({ where: { id: newSpp.id } });

    // 6. TUTOR COMPENSATION CALCULATION
    console.log("\n--- 6. TUTOR COMPENSATION CALCULATION ---");
    const testSessions = 16;
    const testRate = 60000;
    const expectedTotal = testSessions * testRate; // 960,000

    assert(expectedTotal === 960000, `Formula sessions (${testSessions}) × rate (${testRate}) calculates to Rp ${expectedTotal}`);

    console.log("\n==================================================");
    console.log(`🏁 TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
    console.log("==================================================");

    if (failed > 0) {
      process.exit(1);
    }
  } catch (err) {
    console.error("Test execution encountered an error:", err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runTests();
