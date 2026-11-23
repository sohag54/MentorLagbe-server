import dotenv from 'dotenv';
import { connectDB, client } from '../config/db.js';

dotenv.config();

/**
 * Realistic Bangladesh-based demo tuition seed data.
 * All records are approved and active with comprehensive academic details.
 */
export const seedTuitionData = [
  {
    seedId: 'seed-tuition-01',
    isSeed: true,
    title: 'HSC Higher Mathematics & Calculus Mastery',
    subject: 'Higher Mathematics',
    classLevel: 'HSC 2nd Year',
    mode: 'Online',
    location: 'Dhanmondi, Dhaka',
    monthlyFee: 6000,
    daysPerWeek: 3,
    bannerImage: 'https://images.unsplash.com/photo-1635070041078-e363dbe005cb?w=800&auto=format&fit=crop&q=80',
    description: 'Comprehensive board-oriented preparation for HSC Higher Mathematics (Paper 1 & 2). In-depth coverage of differentiation, integration, vectors, and coordinate geometry with weekly problem-solving mock exams.',
    tutorName: 'Md. Tanvir Hasan',
    tutorEmail: 'tanvir.hasan@mentorlagbe.demo',
    approvalStatus: 'approved',
    isActive: true,
    createdAt: new Date('2026-11-01T10:00:00.000Z'),
  },
  {
    seedId: 'seed-tuition-02',
    isSeed: true,
    title: 'Class 10 SSC Physics Conceptual Batch',
    subject: 'Physics',
    classLevel: 'Class 10',
    mode: 'Offline',
    location: 'Uttara Sector 7, Dhaka',
    monthlyFee: 5500,
    daysPerWeek: 3,
    bannerImage: 'https://images.unsplash.com/photo-1532094349884-543bc11b234d?w=800&auto=format&fit=crop&q=80',
    description: 'Clear conceptual clarity on mechanics, electricity, waves, and optics. Special focus on mathematical problem solving, past board question analysis, and practical experimental demonstrations.',
    tutorName: 'Engr. Shahriar Nafis',
    tutorEmail: 'shahriar.nafis@mentorlagbe.demo',
    approvalStatus: 'approved',
    isActive: true,
    createdAt: new Date('2026-11-02T11:00:00.000Z'),
  },
  {
    seedId: 'seed-tuition-03',
    isSeed: true,
    title: 'HSC Chemistry Organic & Inorganic Intensive',
    subject: 'Chemistry',
    classLevel: 'HSC 1st Year',
    mode: 'Online',
    location: 'Mirpur 10, Dhaka',
    monthlyFee: 5000,
    daysPerWeek: 2,
    bannerImage: 'https://images.unsplash.com/photo-1603126857599-f6e157fa2fe6?w=800&auto=format&fit=crop&q=80',
    description: 'Mastering organic reaction mechanisms, stoichiometry, periodic trends, and thermochemistry. Includes animated lecture notes, chapter-wise MCQs, and creative question (CQ) practice.',
    tutorName: 'Nusrat Jahan Chowdhury',
    tutorEmail: 'nusrat.jahan@mentorlagbe.demo',
    approvalStatus: 'approved',
    isActive: true,
    createdAt: new Date('2026-11-03T09:30:00.000Z'),
  },
  {
    seedId: 'seed-tuition-04',
    isSeed: true,
    title: 'Class 9 General Science & Mathematics Foundation',
    subject: 'General Science',
    classLevel: 'Class 9',
    mode: 'Offline',
    location: 'Gulshan 2, Dhaka',
    monthlyFee: 7000,
    daysPerWeek: 4,
    bannerImage: 'https://images.unsplash.com/photo-1507668077129-56e32842fceb?w=800&auto=format&fit=crop&q=80',
    description: 'Strong foundation building for Class 9 students transitioning into the science group. Regular homework checking, dedicated doubt-clearing sessions, and interactive quizzes.',
    tutorName: 'Arafat Rahman',
    tutorEmail: 'arafat.rahman@mentorlagbe.demo',
    approvalStatus: 'approved',
    isActive: true,
    createdAt: new Date('2026-11-04T14:00:00.000Z'),
  },
  {
    seedId: 'seed-tuition-05',
    isSeed: true,
    title: 'HSC Biology Botany & Zoology Comprehensive',
    subject: 'Biology',
    classLevel: 'HSC 2nd Year',
    mode: 'Online',
    location: 'Chittagong',
    monthlyFee: 4500,
    daysPerWeek: 2,
    bannerImage: 'https://images.unsplash.com/photo-1530210124550-912dc1381cb8?w=800&auto=format&fit=crop&q=80',
    description: 'Detailed diagram-based study of cell genetics, physiology, plant reproduction, and animal ecology. Medical admission foundation concepts woven seamlessly into board syllabus.',
    tutorName: 'Dr. Farhana Ahmed',
    tutorEmail: 'farhana.ahmed@mentorlagbe.demo',
    approvalStatus: 'approved',
    isActive: true,
    createdAt: new Date('2026-11-05T16:00:00.000Z'),
  },
  {
    seedId: 'seed-tuition-06',
    isSeed: true,
    title: 'SSC English Grammar & Creative Writing Workshop',
    subject: 'English',
    classLevel: 'Class 10',
    mode: 'Online',
    location: 'Sylhet',
    monthlyFee: 4000,
    daysPerWeek: 2,
    bannerImage: 'https://images.unsplash.com/photo-1455390582262-044cdead277a?w=800&auto=format&fit=crop&q=80',
    description: 'Grammar rules without rote memorization. Master right forms of verbs, transformations, narration, modifier usage, alongside professional composition and report writing skills.',
    tutorName: 'Syed Muntasir',
    tutorEmail: 'syed.muntasir@mentorlagbe.demo',
    approvalStatus: 'approved',
    isActive: true,
    createdAt: new Date('2026-11-06T12:00:00.000Z'),
  },
  {
    seedId: 'seed-tuition-07',
    isSeed: true,
    title: 'HSC ICT (C Programming & HTML/CSS Batch)',
    subject: 'ICT',
    classLevel: 'HSC 1st Year',
    mode: 'Online',
    location: 'Rajshahi',
    monthlyFee: 4200,
    daysPerWeek: 2,
    bannerImage: 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=800&auto=format&fit=crop&q=80',
    description: 'Zero-to-hero ICT batch covering Chapter 3 (Number Systems & Digital Logic), Chapter 4 (Web Design & HTML), and Chapter 5 (C Programming with live coding practice and algorithm debugging).',
    tutorName: 'Mehedi Hasan Niloy',
    tutorEmail: 'mehedi.niloy@mentorlagbe.demo',
    approvalStatus: 'approved',
    isActive: true,
    createdAt: new Date('2026-11-07T15:30:00.000Z'),
  },
  {
    seedId: 'seed-tuition-08',
    isSeed: true,
    title: 'HSC Accounting & Business Studies Masterclass',
    subject: 'Accounting',
    classLevel: 'HSC 2nd Year',
    mode: 'Offline',
    location: 'Banasree, Dhaka',
    monthlyFee: 5000,
    daysPerWeek: 3,
    bannerImage: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=800&auto=format&fit=crop&q=80',
    description: 'Specialized tuition for Commerce students covering Financial Accounting, Cost Accounting, and Management Principles. Practical spreadsheet ledger analysis and board standard problem drills.',
    tutorName: 'Kazi Mahbubur Rahman',
    tutorEmail: 'kazi.mahbub@mentorlagbe.demo',
    approvalStatus: 'approved',
    isActive: true,
    createdAt: new Date('2026-11-08T18:00:00.000Z'),
  },
  {
    seedId: 'seed-tuition-09',
    isSeed: true,
    title: 'Class 8 Junior Mathematics & Geometry Prep',
    subject: 'Mathematics',
    classLevel: 'Class 8',
    mode: 'Offline',
    location: 'Khulna',
    monthlyFee: 3500,
    daysPerWeek: 3,
    bannerImage: 'https://images.unsplash.com/photo-1509228468518-180dd4864904?w=800&auto=format&fit=crop&q=80',
    description: 'Friendly, step-by-step guidance in algebra, arithmetic word problems, and geometric proofs. Ideal for students looking to eliminate math anxiety and develop analytical confidence.',
    tutorName: 'Sadia Sultana',
    tutorEmail: 'sadia.sultana@mentorlagbe.demo',
    approvalStatus: 'approved',
    isActive: true,
    createdAt: new Date('2026-11-09T10:00:00.000Z'),
  },
  {
    seedId: 'seed-tuition-10',
    isSeed: true,
    title: 'O-Level Physics & Chemistry Dual Batch',
    subject: 'Physics',
    classLevel: 'O Level',
    mode: 'Online',
    location: 'Baridhara, Dhaka',
    monthlyFee: 8500,
    daysPerWeek: 3,
    bannerImage: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=800&auto=format&fit=crop&q=80',
    description: 'Curated for Cambridge IGCSE and Edexcel O-Level candidates. Topical past paper solving (Paper 1 MCQs, Paper 2 Theory, Paper 4/6 ATP) with individual exam feedback.',
    tutorName: 'Rezaul Karim Chowdhury',
    tutorEmail: 'rezaul.karim@mentorlagbe.demo',
    approvalStatus: 'approved',
    isActive: true,
    createdAt: new Date('2026-11-10T17:00:00.000Z'),
  },
  {
    seedId: 'seed-tuition-11',
    isSeed: true,
    title: 'HSC Economics (Micro & Macro Concepts)',
    subject: 'Economics',
    classLevel: 'HSC 1st Year',
    mode: 'Online',
    location: 'Mohammadpur, Dhaka',
    monthlyFee: 4000,
    daysPerWeek: 2,
    bannerImage: 'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=800&auto=format&fit=crop&q=80',
    description: 'Clear graphical interpretations of supply-demand equilibrium, market structures, inflation, national income, and fiscal policies. Full preparation for HSC board examinations.',
    tutorName: 'Anika Tabassum',
    tutorEmail: 'anika.tabassum@mentorlagbe.demo',
    approvalStatus: 'approved',
    isActive: true,
    createdAt: new Date('2026-11-11T13:30:00.000Z'),
  },
  {
    seedId: 'seed-tuition-12',
    isSeed: true,
    title: 'Class 10 SSC Bangla 1st & 2nd Paper Comprehensive',
    subject: 'Bangla',
    classLevel: 'Class 10',
    mode: 'Offline',
    location: 'Shantinagar, Dhaka',
    monthlyFee: 3800,
    daysPerWeek: 2,
    bannerImage: 'https://images.unsplash.com/photo-1457369804613-52c61a468e7d?w=800&auto=format&fit=crop&q=80',
    description: 'Analytical reading of prose and poetry for creative question writing, along with deep breakdown of Bangla Byakoron (phonetics, sandhi, samas, karok). Consistent A+ target strategy.',
    tutorName: 'Mahmudul Hasan',
    tutorEmail: 'mahmudul.hasan@mentorlagbe.demo',
    approvalStatus: 'approved',
    isActive: true,
    createdAt: new Date('2026-11-12T11:00:00.000Z'),
  },
];

/**
 * Idempotent seed function.
 * Inserts or updates seed documents identified by `seedId`.
 * Does not overwrite or delete real user data.
 */
export async function seedTuitions() {
  const db = await connectDB();
  const collection = db.collection('tuitions');

  let upsertedCount = 0;
  let modifiedCount = 0;
  let matchedCount = 0;

  for (const item of seedTuitionData) {
    const { seedId, createdAt, ...docData } = item;
    const filter = { seedId };
    const update = {
      $set: {
        ...docData,
        seedId,
      },
      $setOnInsert: {
        createdAt: createdAt || new Date(),
      },
    };

    const res = await collection.updateOne(filter, update, { upsert: true });
    if (res.upsertedCount > 0) {
      upsertedCount++;
    } else if (res.modifiedCount > 0) {
      modifiedCount++;
    } else {
      matchedCount++;
    }
  }

  console.log(`Seeding complete: ${upsertedCount} new, ${modifiedCount} updated, ${matchedCount} unchanged. Total seed items: ${seedTuitionData.length}`);
  return { upsertedCount, modifiedCount, matchedCount, total: seedTuitionData.length };
}

// Standalone CLI execution
if (process.argv[1] && process.argv[1].replace(/\\/g, '/').endsWith('src/seeds/seedTuitions.js')) {
  try {
    await seedTuitions();
  } catch (error) {
    console.error('Seeding execution failed:', error.message);
    process.exit(1);
  } finally {
    await client.close();
  }
}
