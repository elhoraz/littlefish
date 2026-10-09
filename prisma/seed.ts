import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Starting database seeding for Bimbel Littlefish...");

  // 1. Clean existing records safely
  await prisma.auditLog.deleteMany();
  await prisma.sppPayment.deleteMany();
  await prisma.tutorPayment.deleteMany();
  await prisma.assessment.deleteMany();
  await prisma.worksheet.deleteMany();
  await prisma.teachingModule.deleteMany();
  await prisma.attendance.deleteMany();
  await prisma.student.deleteMany();
  await prisma.class.deleteMany();
  await prisma.subject.deleteMany();
  await prisma.parent.deleteMany();
  await prisma.tutor.deleteMany();
  await prisma.user.deleteMany();

  const passwordAdmin = await bcrypt.hash("admin123", 10);
  const passwordTutor = await bcrypt.hash("tutor123", 10);
  const passwordParent = await bcrypt.hash("parent123", 10);

  // 2. Create Users
  // Admin / Owner
  const adminUser = await prisma.user.create({
    data: {
      name: "Bunda Rina (Admin Littlefish)",
      email: "admin@littlefish.test",
      passwordHash: passwordAdmin,
      role: "ADMIN",
      phone: "081234567890",
      status: "ACTIVE",
    },
  });

  // Tutor 1 (Primary)
  const tutor1User = await prisma.user.create({
    data: {
      name: "Kak Dimas Setiawan, S.Pd",
      email: "tutor@littlefish.test",
      passwordHash: passwordTutor,
      role: "TUTOR",
      phone: "081298765432",
      status: "ACTIVE",
    },
  });
  const tutor1 = await prisma.tutor.create({
    data: {
      userId: tutor1User.id,
      specialization: "Calistung & Bahasa Inggris Kids",
      address: "Jl. Melati No. 14, Jakarta Selatan",
      compensationRate: 60000,
      status: "ACTIVE",
    },
  });

  // Tutor 2
  const tutor2User = await prisma.user.create({
    data: {
      name: "Kak Sarah Nurul, S.Si",
      email: "sarah@littlefish.test",
      passwordHash: passwordTutor,
      role: "TUTOR",
      phone: "081311223344",
      status: "ACTIVE",
    },
  });
  const tutor2 = await prisma.tutor.create({
    data: {
      userId: tutor2User.id,
      specialization: "Matematika & IPA Terpadu SD",
      address: "Jl. Anggrek No. 8, Tangerang Selatan",
      compensationRate: 65000,
      status: "ACTIVE",
    },
  });

  // Parent 1 (Parent of 2 children)
  const parent1User = await prisma.user.create({
    data: {
      name: "Ibu Ratna Dewi",
      email: "ortu@littlefish.test",
      passwordHash: passwordParent,
      role: "PARENT",
      phone: "081555667788",
      status: "ACTIVE",
    },
  });
  const parent1 = await prisma.parent.create({
    data: {
      userId: parent1User.id,
      occupation: "Wiraswasta",
      address: "Jl. Cendrawasih No. 25, Bintaro",
      emergencyContact: "081555667799 (Bpk. Hendra)",
    },
  });

  // Parent 2
  const parent2User = await prisma.user.create({
    data: {
      name: "Ibu Maya Safitri",
      email: "maya@littlefish.test",
      passwordHash: passwordParent,
      role: "PARENT",
      phone: "081677889900",
      status: "ACTIVE",
    },
  });
  const parent2 = await prisma.parent.create({
    data: {
      userId: parent2User.id,
      occupation: "Pegawai Swasta",
      address: "Komplek Taman Asri Blok B3, Jakarta",
      emergencyContact: "081677889911 (Bpk. Farhan)",
    },
  });

  // 3. Subjects
  const subjCalistung = await prisma.subject.create({
    data: {
      code: "CAL-TK",
      name: "Calistung & Fonik Cepat",
      description: "Membaca fonik, menulis rapi, dan berhitung angka dasar untuk anak usia dini (4-6 tahun).",
    },
  });

  const subjMatSD = await prisma.subject.create({
    data: {
      code: "MAT-SD",
      name: "Matematika Ceria SD",
      description: "Operasi hitung dasar, pemecahan masalah logika, dan geometri aplikatif.",
    },
  });

  const subjEng = await prisma.subject.create({
    data: {
      code: "ENG-KIDS",
      name: "English for Little Stars",
      description: "Pengenalan vocabulary harian, phonics reading, dan percakapan interaktif.",
    },
  });

  // 4. Classes
  const classBintang = await prisma.class.create({
    data: {
      name: "Bintang Kecil A (Calistung)",
      level: "TK / Prasekolah",
      room: "Ruang Nemo (Lantai 1)",
      tutorId: tutor1.id,
      dayOfWeek: "Senin & Rabu",
      timeSlot: "14:00 - 15:30",
      capacity: 8,
      status: "ACTIVE",
    },
  });

  const classCendekia = await prisma.class.create({
    data: {
      name: "Cendekia 1 (Matematika SD)",
      level: "SD Kelas 1-3",
      room: "Ruang Lumba (Lantai 1)",
      tutorId: tutor2.id,
      dayOfWeek: "Selasa & Kamis",
      timeSlot: "15:45 - 17:15",
      capacity: 10,
      status: "ACTIVE",
    },
  });

  const classExplorer = await prisma.class.create({
    data: {
      name: "Little Explorer (English Kids)",
      level: "SD Kelas 1-4",
      room: "Ruang Paus (Lantai 2)",
      tutorId: tutor1.id,
      dayOfWeek: "Jumat & Sabtu",
      timeSlot: "14:00 - 15:30",
      capacity: 8,
      status: "ACTIVE",
    },
  });

  // 5. Students
  const studentBudi = await prisma.student.create({
    data: {
      studentId: "LF-2026-001",
      fullName: "Budi Santoso",
      nickname: "Budi",
      birthDate: new Date("2020-05-14"),
      gender: "Laki-laki",
      address: "Jl. Cendrawasih No. 25, Bintaro",
      phone: "081555667788",
      parentId: parent1.id,
      classId: classBintang.id,
      status: "ACTIVE",
      notes: "Sangat antusias belajar mewarnai dan menyusun balok kata.",
    },
  });

  const studentSiti = await prisma.student.create({
    data: {
      studentId: "LF-2026-002",
      fullName: "Siti Rahmawati",
      nickname: "Siti",
      birthDate: new Date("2018-09-22"),
      gender: "Perempuan",
      address: "Jl. Cendrawasih No. 25, Bintaro",
      phone: "081555667788",
      parentId: parent1.id,
      classId: classCendekia.id,
      status: "ACTIVE",
      notes: "Cepat memahami penjumlahan, perlu bimbingan di soal cerita panjang.",
    },
  });

  const studentKenzo = await prisma.student.create({
    data: {
      studentId: "LF-2026-003",
      fullName: "Kenzo Alvaro",
      nickname: "Kenzo",
      birthDate: new Date("2020-11-03"),
      gender: "Laki-laki",
      address: "Komplek Taman Asri Blok B3, Jakarta",
      phone: "081677889900",
      parentId: parent2.id,
      classId: classBintang.id,
      status: "ACTIVE",
      notes: "Aktif bertanya dan mudah bergaul.",
    },
  });

  const studentNaura = await prisma.student.create({
    data: {
      studentId: "LF-2026-004",
      fullName: "Naura Putri",
      nickname: "Naura",
      birthDate: new Date("2019-02-17"),
      gender: "Perempuan",
      address: "Jl. Pesanggrahan No. 12",
      classId: classExplorer.id,
      status: "ACTIVE",
    },
  });

  const studentArka = await prisma.student.create({
    data: {
      studentId: "LF-2026-005",
      fullName: "Arka Pratama",
      nickname: "Arka",
      birthDate: new Date("2018-08-30"),
      gender: "Laki-laki",
      address: "Jl. Veteran Raya No. 4",
      classId: classCendekia.id,
      status: "ACTIVE",
    },
  });

  // 6. Attendance Records
  const today = new Date();
  const d1 = new Date(today);
  d1.setDate(today.getDate() - 2);
  const d2 = new Date(today);
  d2.setDate(today.getDate() - 4);
  const d3 = new Date(today);
  d3.setDate(today.getDate() - 7);

  // Class Bintang Attendance
  await prisma.attendance.createMany({
    data: [
      {
        date: d1,
        classId: classBintang.id,
        studentId: studentBudi.id,
        type: "STUDENT",
        status: "HADIR",
        recordedById: tutor1User.id,
      },
      {
        date: d1,
        classId: classBintang.id,
        studentId: studentKenzo.id,
        type: "STUDENT",
        status: "HADIR",
        recordedById: tutor1User.id,
      },
      {
        date: d1,
        classId: classBintang.id,
        tutorId: tutor1.id,
        type: "TUTOR",
        status: "HADIR",
        recordedById: adminUser.id,
      },
      {
        date: d2,
        classId: classBintang.id,
        studentId: studentBudi.id,
        type: "STUDENT",
        status: "HADIR",
        recordedById: tutor1User.id,
      },
      {
        date: d2,
        classId: classBintang.id,
        studentId: studentKenzo.id,
        type: "STUDENT",
        status: "IZIN",
        notes: "Ada acara keluarga di luar kota",
        recordedById: tutor1User.id,
      },
      {
        date: d3,
        classId: classBintang.id,
        studentId: studentBudi.id,
        type: "STUDENT",
        status: "SAKIT",
        notes: "Demam, surat dokter terlampir via WA",
        recordedById: tutor1User.id,
      },
    ],
  });

  // Class Cendekia Attendance
  await prisma.attendance.createMany({
    data: [
      {
        date: d1,
        classId: classCendekia.id,
        studentId: studentSiti.id,
        type: "STUDENT",
        status: "HADIR",
        recordedById: tutor2User.id,
      },
      {
        date: d1,
        classId: classCendekia.id,
        studentId: studentArka.id,
        type: "STUDENT",
        status: "HADIR",
        recordedById: tutor2User.id,
      },
      {
        date: d2,
        classId: classCendekia.id,
        studentId: studentSiti.id,
        type: "STUDENT",
        status: "HADIR",
        recordedById: tutor2User.id,
      },
    ],
  });

  // 7. Teaching Modules (Monthly)
  await prisma.teachingModule.create({
    data: {
      month: 10,
      year: 2026,
      classId: classBintang.id,
      tutorId: tutor1.id,
      subjectId: subjCalistung.id,
      topic: "Mengenal Vokal A-I-U-E-O & Menggabungkan Suku Kata Sederhana",
      objectives: "1. Anak mampu melafalkan 5 huruf vokal dengan jelas.\n2. Anak dapat merangkai 2 suku kata terbuka (ba, bi, bu, be, bo).",
      materials: "Flashcard Littlefish Phonics, Buku Aktivitas Membaca Seri 1, Balok Huruf Kayu.",
      activities: "Ice breaking lagu vokal (15m), Tebak huruf flashcard berhadiah stiker (30m), Latihan menulis lembar kerja (30m), Review penutup (15m).",
      notes: "Fokus stimulasi anak yang belum percaya diri membaca nyaring.",
    },
  });

  await prisma.teachingModule.create({
    data: {
      month: 10,
      year: 2026,
      classId: classCendekia.id,
      tutorId: tutor2.id,
      subjectId: subjMatSD.id,
      topic: "Penjumlahan & Pengurangan Bersusun dengan Teknik Menyimpan",
      objectives: "1. Siswa memahami nilai tempat puluhan dan satuan.\n2. Mampu menyelesaikan 10 soal hitung bersusun tanpa kesalahan konsep.",
      materials: "Papan hitung biji sempoa, Lembar Soal Cendekia Mandiri.",
      activities: "Demonstrasi manipulatif (20m), Kerja kelompok berpasangan (35m), Quiz kecepatan (25m), Pembahasan (10m).",
      notes: "Berikan tantangan soal bonus untuk siswa yang selesai lebih cepat.",
    },
  });

  // 8. Worksheets (Sample repository files)
  await prisma.worksheet.createMany({
    data: [
      {
        title: "Lembar Kerja Fonik Vokal - Pekan 1",
        description: "Menebalkan garis huruf dan mencocokkan gambar dengan awalan huruf vokal.",
        fileName: "LK_Fonik_Vokal_Pekan1.pdf",
        fileKey: "worksheet_sample_1.pdf",
        fileUrl: "/api/worksheets/download/sample-1",
        fileType: "application/pdf",
        fileSize: 485200,
        classId: classBintang.id,
        subjectId: subjCalistung.id,
        uploadedById: tutor1User.id,
      },
      {
        title: "Latihan Penjumlahan Ceria Tingkat 1",
        description: "20 soal latihan penjumlahan bersusun 2 angka tanpa menyimpan.",
        fileName: "Math_Latihan_Penjumlahan_1.pdf",
        fileKey: "worksheet_sample_2.pdf",
        fileUrl: "/api/worksheets/download/sample-2",
        fileType: "application/pdf",
        fileSize: 312400,
        classId: classCendekia.id,
        subjectId: subjMatSD.id,
        uploadedById: tutor2User.id,
      },
    ],
  });

  // 9. Assessments
  await prisma.assessment.createMany({
    data: [
      // Budi Assessments
      {
        date: d2,
        studentId: studentBudi.id,
        tutorId: tutor1.id,
        classId: classBintang.id,
        subjectId: subjCalistung.id,
        topic: "Pengenalan Huruf Vokal A-I-U-E-O",
        score: 95,
        masteryLevel: "SANGAT_MENGUASAI",
        notes: "Mampu membaca dan melafalkan kelima huruf secara lancar dan mandiri.",
      },
      {
        date: d1,
        studentId: studentBudi.id,
        tutorId: tutor1.id,
        classId: classBintang.id,
        subjectId: subjCalistung.id,
        topic: "Menggabungkan Suku Kata BA-CA-DA",
        score: 86,
        masteryLevel: "MENGUASAI",
        notes: "Sudah lancar membaca kata 2 suku kata, sesekali butuh petunjuk untuk huruf C.",
      },
      // Siti Assessments
      {
        date: d2,
        studentId: studentSiti.id,
        tutorId: tutor2.id,
        classId: classCendekia.id,
        subjectId: subjMatSD.id,
        topic: "Penjumlahan Bersusun 2 Angka",
        score: 90,
        masteryLevel: "SANGAT_MENGUASAI",
        notes: "Perhitungan cepat dan teliti, langkah pengerjaan sangat rapi.",
      },
      {
        date: d1,
        studentId: studentSiti.id,
        tutorId: tutor2.id,
        classId: classCendekia.id,
        subjectId: subjMatSD.id,
        topic: "Pengurangan dengan Meminjam",
        score: 75,
        masteryLevel: "CUKUP_MENGUASAI",
        notes: "Konsep dasar sudah paham, perlu latihan tambahan pada pengurangan dengan angka 0 di tengah.",
      },
      // Kenzo Assessment
      {
        date: d1,
        studentId: studentKenzo.id,
        tutorId: tutor1.id,
        classId: classBintang.id,
        subjectId: subjCalistung.id,
        topic: "Pengenalan Huruf Vokal & Garis Lurus",
        score: 68,
        masteryLevel: "CUKUP_MENGUASAI",
        notes: "Cepat mengenali huruf A dan O, huruf I dan U masih sesekali tertukar.",
      },
    ],
  });

  // 10. SPP Payments
  // Budi: Paid for Oktober 2026, Paid for September 2026
  await prisma.sppPayment.create({
    data: {
      studentId: studentBudi.id,
      invoiceNumber: "INV-202610-001",
      month: 10,
      year: 2026,
      amount: 250000,
      status: "LUNAS",
      paymentDate: new Date("2026-10-02"),
      method: "TRANSFER",
      notes: "Pembayaran via Transfer BCA an Ratna Dewi",
      recordedById: adminUser.id,
    },
  });

  await prisma.sppPayment.create({
    data: {
      studentId: studentBudi.id,
      invoiceNumber: "INV-202609-001",
      month: 9,
      year: 2026,
      amount: 250000,
      status: "LUNAS",
      paymentDate: new Date("2026-09-05"),
      method: "TRANSFER",
      notes: "Lunas tepat waktu",
      recordedById: adminUser.id,
    },
  });

  // Siti: Menunggu Konfirmasi for Oktober 2026
  await prisma.sppPayment.create({
    data: {
      studentId: studentSiti.id,
      invoiceNumber: "INV-202610-002",
      month: 10,
      year: 2026,
      amount: 250000,
      status: "MENUNGGU",
      paymentDate: new Date("2026-10-06"),
      method: "QRIS",
      notes: "Bukti transfer QRIS diunggah orang tua, menunggu cek rekening koran",
      recordedById: adminUser.id,
    },
  });

  // Kenzo: Belum Bayar for Oktober 2026
  await prisma.sppPayment.create({
    data: {
      studentId: studentKenzo.id,
      invoiceNumber: "INV-202610-003",
      month: 10,
      year: 2026,
      amount: 250000,
      status: "BELUM_BAYAR",
      method: null,
      notes: "Tagihan diterbitkan tanggal 1 Oktober",
      recordedById: adminUser.id,
    },
  });

  // 11. Tutor Payments
  // Kak Dimas: September 2026 (PAID) - Riwayat Bulan Lalu
  await prisma.tutorPayment.create({
    data: {
      tutorId: tutor1.id,
      month: 9,
      year: 2026,
      sessions: 14,
      rate: 60000,
      total: 840000,
      status: "PAID",
      paidAt: new Date("2026-09-30"),
      notes: "Honor bulan September lunas ditransfer",
    },
  });

  // Kak Dimas: Oktober 2026 (PENDING) - Bulan Berjalan
  await prisma.tutorPayment.create({
    data: {
      tutorId: tutor1.id,
      month: 10,
      year: 2026,
      sessions: 12,
      rate: 60000,
      total: 720000,
      status: "PENDING",
      notes: "Rekap sesi berjalan Oktober",
    },
  });

  // Kak Sarah: 12 sessions in Oktober 2026 (PENDING)
  await prisma.tutorPayment.create({
    data: {
      tutorId: tutor2.id,
      month: 10,
      year: 2026,
      sessions: 12,
      rate: 65000,
      total: 780000,
      status: "PENDING",
      notes: "Rekap sesi siap verifikasi bendahara",
    },
  });

  // 12. Audit Logs
  await prisma.auditLog.createMany({
    data: [
      {
        actorId: adminUser.id,
        actorName: "Bunda Rina (Admin Littlefish)",
        actorRole: "ADMIN",
        action: "CREATE",
        entity: "System",
        details: "Inisialisasi konfigurasi sistem pembelajaran Littlefish 2026.",
      },
      {
        actorId: tutor1User.id,
        actorName: "Kak Dimas Setiawan, S.Pd",
        actorRole: "TUTOR",
        action: "CREATE",
        entity: "TeachingModule",
        details: "Membuat modul ajar Oktober 2026 untuk Kelas Bintang Kecil.",
      },
      {
        actorId: adminUser.id,
        actorName: "Bunda Rina (Admin Littlefish)",
        actorRole: "ADMIN",
        action: "PAYMENT_RECORD",
        entity: "SppPayment",
        details: "Memverifikasi pelunasan SPP Budi Santoso (INV-202610-001).",
      },
    ],
  });

  console.log("✅ Database seeding completed successfully!");
}

main()
  .catch((e) => {
    console.error("❌ Seeding error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
