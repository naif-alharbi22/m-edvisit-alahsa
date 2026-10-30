/**
 * Static catalog used by the demo seed. Facility names refer to hospitals in
 * Al-Ahsa; every other detail (prices, doctors, coordinates, ratings) is
 * illustrative demo content, not information published by those facilities.
 */

export interface SeedDoctor {
  name: string;
  nameAr: string;
  specialty: string;
  title: string;
  yearsExp: number;
  languages: string[];
  bio: string;
  bioAr: string;
  consultationFee: number;
}

export interface SeedPackage {
  name: string;
  nameAr: string;
  description: string;
  descriptionAr: string;
  specialty: string;
  price: number;
  duration: string;
  includes: string[];
}

export interface SeedFacility {
  slug: string;
  name: string;
  nameAr: string;
  type: "HOSPITAL" | "CLINIC" | "MEDICAL_CENTER";
  description: string;
  descriptionAr: string;
  address: string;
  phone: string;
  email?: string;
  website?: string;
  baseRating: number;
  specialties: string[];
  accreditations: string[];
  latitude: number;
  longitude: number;
  adminEmail: string;
  adminName: string;
  doctors: SeedDoctor[];
  packages: SeedPackage[];
}

export interface SeedRoomType {
  name: string;
  nameAr: string;
  description: string;
  descriptionAr: string;
  capacity: number;
  bedType: string;
  sizeSqm: number;
  pricePerNight: number;
  totalRooms: number;
  amenities: string[];
  accessible: boolean;
}

export interface SeedHotel {
  slug: string;
  name: string;
  nameAr: string;
  description: string;
  descriptionAr: string;
  address: string;
  phone: string;
  email: string;
  starRating: number;
  baseRating: number;
  amenities: string[];
  latitude: number;
  longitude: number;
  managerEmail: string;
  managerName: string;
  roomTypes: SeedRoomType[];
}

export const FACILITIES: SeedFacility[] = [
  {
    slug: "al-moosa-specialist-hospital",
    name: "Al-Moosa Specialist Hospital",
    nameAr: "مستشفى الموسى التخصصي",
    type: "HOSPITAL",
    description:
      "A leading private hospital in Al-Ahsa offering comprehensive medical services with state-of-the-art technology and internationally trained physicians.",
    descriptionAr: "مستشفى خاص رائد في الأحساء يقدم خدمات طبية شاملة بأحدث التقنيات وأطباء مدربين دولياً.",
    address: "King Fahd Road, Al-Hofuf, Al-Ahsa 36442",
    phone: "+966 13 582 3333",
    email: "international@almoosa.example",
    website: "https://almoosa.example",
    baseRating: 4.7,
    specialties: ["Cardiology", "Orthopedics", "Neurology", "General Surgery", "Oncology", "Urology"],
    accreditations: ["JCI", "CBAHI"],
    latitude: 25.3816,
    longitude: 49.5917,
    adminEmail: "admin.almoosa@medvisit.sa",
    adminName: "Yousef Al-Moosa",
    doctors: [
      {
        name: "Dr. Ahmed Al-Qahtani",
        nameAr: "د. أحمد القحطاني",
        specialty: "Cardiology",
        title: "Consultant Interventional Cardiologist",
        yearsExp: 18,
        languages: ["Arabic", "English"],
        bio: "Interventional cardiologist with extensive experience in cardiac catheterization and stent placement.",
        bioAr: "طبيب قلب تدخلي مع خبرة واسعة في القسطرة القلبية وتركيب الدعامات.",
        consultationFee: 450,
      },
      {
        name: "Dr. Fatima Al-Dossari",
        nameAr: "د. فاطمة الدوسري",
        specialty: "Orthopedics",
        title: "Consultant Orthopedic Surgeon",
        yearsExp: 14,
        languages: ["Arabic", "English", "French"],
        bio: "Orthopedic surgeon specializing in joint replacement and sports medicine.",
        bioAr: "جراحة عظام متخصصة في استبدال المفاصل والطب الرياضي.",
        consultationFee: 400,
      },
      {
        name: "Dr. Khalid Al-Shammari",
        nameAr: "د. خالد الشمري",
        specialty: "Neurology",
        title: "Consultant Neurologist",
        yearsExp: 12,
        languages: ["Arabic", "English"],
        bio: "Neurologist focused on stroke management and neurodegenerative diseases.",
        bioAr: "طبيب أعصاب متخصص في إدارة السكتة الدماغية والأمراض التنكسية العصبية.",
        consultationFee: 420,
      },
      {
        name: "Dr. Mohammed Al-Ghamdi",
        nameAr: "د. محمد الغامدي",
        specialty: "General Surgery",
        title: "Consultant Laparoscopic Surgeon",
        yearsExp: 15,
        languages: ["Arabic", "English"],
        bio: "General and laparoscopic surgeon with expertise in bariatric and colorectal surgery.",
        bioAr: "جراح عام ومناظير مع خبرة في جراحة السمنة والقولون.",
        consultationFee: 380,
      },
      {
        name: "Dr. Reem Al-Otaibi",
        nameAr: "د. ريم العتيبي",
        specialty: "Oncology",
        title: "Consultant Medical Oncologist",
        yearsExp: 11,
        languages: ["Arabic", "English"],
        bio: "Medical oncologist focused on breast and colorectal cancers and survivorship care.",
        bioAr: "طبيبة أورام متخصصة في سرطان الثدي والقولون ورعاية ما بعد العلاج.",
        consultationFee: 500,
      },
    ],
    packages: [
      {
        name: "Cardiac Check-up Package",
        nameAr: "باقة فحص القلب الشامل",
        description:
          "Comprehensive heart health assessment including ECG, echocardiogram, blood tests, and cardiologist consultation.",
        descriptionAr: "تقييم شامل لصحة القلب يشمل تخطيط القلب وتخطيط صدى القلب وتحاليل الدم واستشارة طبيب قلب.",
        specialty: "Cardiology",
        price: 3500,
        duration: "1 Day",
        includes: ["ECG", "Echocardiogram", "Blood Panel", "Doctor Consultation", "Report"],
      },
      {
        name: "Knee Arthroscopy",
        nameAr: "تنظير الركبة",
        description: "Minimally invasive knee arthroscopy with one-night stay and physiotherapy plan.",
        descriptionAr: "تنظير الركبة طفيف التوغل مع إقامة ليلة واحدة وخطة علاج طبيعي.",
        specialty: "Orthopedics",
        price: 18000,
        duration: "2 Days",
        includes: ["Pre-op Assessment", "Surgery", "1-Night Stay", "Physiotherapy Plan", "Follow-up Visit"],
      },
      {
        name: "Bariatric Surgery (Sleeve Gastrectomy)",
        nameAr: "جراحة السمنة (تكميم المعدة)",
        description: "Laparoscopic sleeve gastrectomy including nutrition counseling and 3-night stay.",
        descriptionAr: "تكميم المعدة بالمنظار شامل الاستشارات الغذائية والإقامة ثلاث ليالٍ.",
        specialty: "General Surgery",
        price: 42000,
        duration: "4 Days",
        includes: ["Surgery", "3-Night Stay", "Nutrition Plan", "Medications", "2 Follow-ups"],
      },
      {
        name: "Medical Tourist Welcome Package",
        nameAr: "باقة ترحيب بالسائح الطبي",
        description: "Airport pickup, local SIM card, translator, and medical appointment coordination.",
        descriptionAr: "استقبال من المطار وشريحة اتصال محلية ومترجم وتنسيق المواعيد الطبية.",
        specialty: "General",
        price: 1500,
        duration: "Per Trip",
        includes: ["Airport Transfer", "Local SIM", "Translator", "Appointment Coordination"],
      },
    ],
  },
  {
    slug: "king-fahd-hospital-al-ahsa",
    name: "King Fahd Hospital in Al-Ahsa",
    nameAr: "مستشفى الملك فهد بالأحساء",
    type: "HOSPITAL",
    description:
      "A major government hospital providing advanced medical care, specialized surgeries, and serving as a referral center for the Eastern Province.",
    descriptionAr: "مستشفى حكومي رئيسي يقدم رعاية طبية متقدمة وجراحات متخصصة ويعمل كمركز إحالة للمنطقة الشرقية.",
    address: "Al-Hofuf, Al-Ahsa 31982",
    phone: "+966 13 584 8888",
    baseRating: 4.3,
    specialties: ["Cardiac Surgery", "Nephrology", "Pediatrics", "Obstetrics", "Emergency Medicine", "Internal Medicine"],
    accreditations: ["CBAHI"],
    latitude: 25.3647,
    longitude: 49.5739,
    adminEmail: "admin.kfh@medvisit.sa",
    adminName: "Abdullah Al-Harbi",
    doctors: [
      {
        name: "Dr. Noura Al-Zahrani",
        nameAr: "د. نورة الزهراني",
        specialty: "Pediatrics",
        title: "Consultant Pediatrician",
        yearsExp: 10,
        languages: ["Arabic", "English", "Urdu"],
        bio: "Pediatric specialist with focus on childhood development and infectious diseases.",
        bioAr: "أخصائية طب أطفال مع تركيز على نمو الطفل والأمراض المعدية.",
        consultationFee: 300,
      },
      {
        name: "Dr. Saleh Al-Mulhim",
        nameAr: "د. صالح الملحم",
        specialty: "Cardiac Surgery",
        title: "Consultant Cardiac Surgeon",
        yearsExp: 22,
        languages: ["Arabic", "English"],
        bio: "Cardiac surgeon experienced in coronary bypass and valve repair procedures.",
        bioAr: "جراح قلب ذو خبرة في جراحات تحويل مسار الشريان التاجي وإصلاح الصمامات.",
        consultationFee: 550,
      },
      {
        name: "Dr. Huda Al-Naim",
        nameAr: "د. هدى النعيم",
        specialty: "Nephrology",
        title: "Consultant Nephrologist",
        yearsExp: 13,
        languages: ["Arabic", "English"],
        bio: "Nephrologist caring for chronic kidney disease, dialysis, and transplant follow-up.",
        bioAr: "طبيبة كلى تعتني بأمراض الكلى المزمنة والغسيل الكلوي ومتابعة زراعة الكلى.",
        consultationFee: 350,
      },
      {
        name: "Dr. Mariam Al-Ali",
        nameAr: "د. مريم العلي",
        specialty: "Obstetrics",
        title: "Consultant Obstetrician",
        yearsExp: 16,
        languages: ["Arabic", "English"],
        bio: "Obstetrician specializing in high-risk pregnancies and minimally invasive gynecology.",
        bioAr: "طبيبة نساء وولادة متخصصة في الحمل عالي الخطورة وجراحات النساء طفيفة التوغل.",
        consultationFee: 380,
      },
    ],
    packages: [
      {
        name: "Executive Health Check-up",
        nameAr: "فحص صحي تنفيذي شامل",
        description: "Premium health screening with same-day results and lifestyle recommendations.",
        descriptionAr: "فحص صحي متميز مع نتائج في نفس اليوم وتوصيات لنمط الحياة.",
        specialty: "Internal Medicine",
        price: 4500,
        duration: "1 Day",
        includes: ["Full Blood Panel", "Chest X-Ray", "Ultrasound", "Stress Test", "Doctor Consultation", "Nutrition Plan"],
      },
      {
        name: "Coronary Artery Bypass (CABG)",
        nameAr: "جراحة تحويل مسار الشريان التاجي",
        description: "Complete CABG surgery package including ICU care, 7-night stay and cardiac rehab plan.",
        descriptionAr: "باقة جراحة تحويل مسار الشريان التاجي شاملة العناية المركزة والإقامة سبع ليالٍ وخطة تأهيل قلبي.",
        specialty: "Cardiac Surgery",
        price: 120000,
        duration: "8-10 Days",
        includes: ["Pre-op Work-up", "Surgery", "ICU Care", "7-Night Stay", "Cardiac Rehab Plan"],
      },
      {
        name: "Maternity Care Package",
        nameAr: "باقة رعاية الأمومة",
        description: "Normal delivery package with 2-night private room and newborn screening.",
        descriptionAr: "باقة ولادة طبيعية مع غرفة خاصة لليلتين وفحوصات حديثي الولادة.",
        specialty: "Obstetrics",
        price: 12000,
        duration: "3 Days",
        includes: ["Delivery", "2-Night Private Room", "Newborn Screening", "Lactation Support"],
      },
    ],
  },
  {
    slug: "saad-specialist-hospital-al-ahsa",
    name: "Saad Specialist Hospital",
    nameAr: "مستشفى سعد التخصصي",
    type: "HOSPITAL",
    description:
      "A JCI-accredited hospital known for excellence in cardiac care, orthopedics, and oncology with multilingual staff serving international patients.",
    descriptionAr:
      "مستشفى معتمد من JCI معروف بالتميز في رعاية القلب وجراحة العظام والأورام مع طاقم متعدد اللغات يخدم المرضى الدوليين.",
    address: "Prince Sultan Road, Al-Hofuf, Al-Ahsa 31952",
    phone: "+966 13 587 9999",
    email: "international@saad.example",
    baseRating: 4.5,
    specialties: ["Cardiology", "Orthopedics", "Oncology", "Ophthalmology", "ENT", "Dermatology"],
    accreditations: ["JCI", "CBAHI", "CAP"],
    latitude: 25.3972,
    longitude: 49.6031,
    adminEmail: "admin.saad@medvisit.sa",
    adminName: "Faisal Al-Saad",
    doctors: [
      {
        name: "Dr. Sara Al-Harbi",
        nameAr: "د. سارة الحربي",
        specialty: "Oncology",
        title: "Consultant Medical Oncologist",
        yearsExp: 20,
        languages: ["Arabic", "English", "German"],
        bio: "Medical oncologist with international training in immunotherapy and targeted cancer treatments.",
        bioAr: "طبيبة أورام مع تدريب دولي في العلاج المناعي والعلاجات الموجهة للسرطان.",
        consultationFee: 550,
      },
      {
        name: "Dr. Hassan Al-Mutairi",
        nameAr: "د. حسن المطيري",
        specialty: "Ophthalmology",
        title: "Consultant Ophthalmic Surgeon",
        yearsExp: 16,
        languages: ["Arabic", "English"],
        bio: "Eye surgeon specializing in LASIK, cataract surgery, and retinal treatments.",
        bioAr: "جراح عيون متخصص في الليزك وجراحة الساد وعلاج الشبكية.",
        consultationFee: 350,
      },
      {
        name: "Dr. Aisha Al-Badr",
        nameAr: "د. عائشة البدر",
        specialty: "Dermatology",
        title: "Consultant Dermatologist",
        yearsExp: 11,
        languages: ["Arabic", "English", "French"],
        bio: "Dermatologist with expertise in cosmetic dermatology, laser treatments, and skin cancer screening.",
        bioAr: "طبيبة جلدية متخصصة في الأمراض الجلدية التجميلية وعلاجات الليزر وفحص سرطان الجلد.",
        consultationFee: 320,
      },
      {
        name: "Dr. Omar Al-Rashid",
        nameAr: "د. عمر الراشد",
        specialty: "Cardiology",
        title: "Consultant Cardiologist",
        yearsExp: 17,
        languages: ["Arabic", "English"],
        bio: "Non-invasive cardiologist specializing in heart failure and cardiac imaging.",
        bioAr: "طبيب قلب غير تدخلي متخصص في قصور القلب والتصوير القلبي.",
        consultationFee: 450,
      },
      {
        name: "Dr. Layla Al-Khaldi",
        nameAr: "د. ليلى الخالدي",
        specialty: "ENT",
        title: "Consultant ENT Surgeon",
        yearsExp: 9,
        languages: ["Arabic", "English"],
        bio: "ENT surgeon focused on sinus surgery, cochlear implants, and pediatric ENT.",
        bioAr: "جراحة أنف وأذن وحنجرة متخصصة في جراحة الجيوب الأنفية وزراعة القوقعة وأنف وأذن الأطفال.",
        consultationFee: 330,
      },
    ],
    packages: [
      {
        name: "Comprehensive Cancer Screening",
        nameAr: "فحص شامل للكشف عن السرطان",
        description: "Full-body cancer screening with advanced imaging, tumor markers, and oncologist consultation.",
        descriptionAr: "فحص شامل للكشف عن السرطان بالتصوير المتقدم ودلالات الأورام واستشارة طبيب أورام.",
        specialty: "Oncology",
        price: 6000,
        duration: "2 Days",
        includes: ["CT Scan", "Tumor Markers", "Blood Tests", "Oncologist Review", "Detailed Report"],
      },
      {
        name: "LASIK Eye Surgery",
        nameAr: "عملية الليزك لتصحيح النظر",
        description: "State-of-the-art LASIK vision correction with pre and post-operative care.",
        descriptionAr: "تصحيح النظر بالليزك المتطور مع الرعاية قبل وبعد العملية.",
        specialty: "Ophthalmology",
        price: 8000,
        duration: "1 Day",
        includes: ["Pre-op Assessment", "LASIK Surgery", "Post-op Check", "Eye Drops", "3-Month Follow-up"],
      },
      {
        name: "Cataract Surgery (Premium Lens)",
        nameAr: "جراحة الساد (عدسة متميزة)",
        description: "Phacoemulsification cataract surgery with premium multifocal lens implant.",
        descriptionAr: "جراحة الساد بالموجات فوق الصوتية مع زراعة عدسة متعددة البؤر.",
        specialty: "Ophthalmology",
        price: 14000,
        duration: "1 Day",
        includes: ["Biometry", "Surgery", "Premium Lens", "Post-op Visits"],
      },
    ],
  },
  {
    slug: "al-ahsa-medical-center",
    name: "Al-Ahsa Medical Center",
    nameAr: "مركز الأحساء الطبي",
    type: "MEDICAL_CENTER",
    description:
      "A modern medical center offering specialized outpatient services, diagnostic imaging, and minimally invasive procedures.",
    descriptionAr: "مركز طبي حديث يقدم خدمات العيادات الخارجية المتخصصة والتصوير التشخيصي والإجراءات طفيفة التوغل.",
    address: "Al-Mubarraz, Al-Ahsa 36321",
    phone: "+966 13 585 4444",
    baseRating: 4.1,
    specialties: ["Internal Medicine", "Endocrinology", "Gastroenterology", "Pulmonology", "Rheumatology", "Orthopedics"],
    accreditations: ["CBAHI"],
    latitude: 25.4106,
    longitude: 49.5808,
    adminEmail: "admin.amc@medvisit.sa",
    adminName: "Nasser Al-Mubarak",
    doctors: [
      {
        name: "Dr. Tariq Al-Hamad",
        nameAr: "د. طارق الحمد",
        specialty: "Endocrinology",
        title: "Consultant Endocrinologist",
        yearsExp: 14,
        languages: ["Arabic", "English"],
        bio: "Endocrinologist managing diabetes, thyroid disorders, and metabolic conditions.",
        bioAr: "طبيب غدد صماء يعالج السكري واضطرابات الغدة الدرقية والأمراض الاستقلابية.",
        consultationFee: 300,
      },
      {
        name: "Dr. Amal Al-Jaber",
        nameAr: "د. أمل الجابر",
        specialty: "Gastroenterology",
        title: "Consultant Gastroenterologist",
        yearsExp: 12,
        languages: ["Arabic", "English"],
        bio: "Gastroenterologist performing endoscopy, colonoscopy, and liver disease management.",
        bioAr: "طبيبة جهاز هضمي تجري التنظير الهضمي ومنظار القولون وتعالج أمراض الكبد.",
        consultationFee: 320,
      },
      {
        name: "Dr. Bilal Qureshi",
        nameAr: "د. بلال قريشي",
        specialty: "Pulmonology",
        title: "Consultant Pulmonologist",
        yearsExp: 15,
        languages: ["English", "Urdu", "Arabic"],
        bio: "Pulmonologist specializing in asthma, COPD, and sleep medicine.",
        bioAr: "طبيب صدرية متخصص في الربو والانسداد الرئوي المزمن وطب النوم.",
        consultationFee: 300,
      },
    ],
    packages: [
      {
        name: "Joint Replacement Surgery",
        nameAr: "جراحة استبدال المفاصل",
        description:
          "Complete knee or hip replacement package including surgery, hospital stay, physiotherapy, and follow-up.",
        descriptionAr: "باقة استبدال الركبة أو الورك الكاملة شاملة الجراحة والإقامة والعلاج الطبيعي والمتابعة.",
        specialty: "Orthopedics",
        price: 85000,
        duration: "7-10 Days",
        includes: ["Pre-op Assessment", "Surgery", "5-Day Hospital Stay", "Physiotherapy", "Medications", "Follow-up"],
      },
      {
        name: "Diabetes Care Program",
        nameAr: "برنامج رعاية السكري",
        description: "Three-month diabetes management program with specialist visits and continuous glucose monitoring.",
        descriptionAr: "برنامج إدارة السكري لمدة ثلاثة أشهر مع زيارات اختصاصي ومراقبة مستمرة للسكر.",
        specialty: "Endocrinology",
        price: 5500,
        duration: "3 Months",
        includes: ["3 Specialist Visits", "CGM Sensor", "HbA1c Tests", "Dietitian Sessions"],
      },
      {
        name: "Endoscopy & Colonoscopy",
        nameAr: "التنظير العلوي ومنظار القولون",
        description: "Combined upper endoscopy and colonoscopy under sedation with biopsy if required.",
        descriptionAr: "تنظير علوي ومنظار قولون تحت التخدير مع أخذ خزعة عند الحاجة.",
        specialty: "Gastroenterology",
        price: 4200,
        duration: "1 Day",
        includes: ["Sedation", "Upper Endoscopy", "Colonoscopy", "Biopsy (if needed)", "Report"],
      },
    ],
  },
  {
    slug: "almana-general-hospital-al-ahsa",
    name: "Almana General Hospital",
    nameAr: "مستشفى المانع العام",
    type: "HOSPITAL",
    description:
      "A multi-specialty private hospital with a dedicated international patient office, offering surgical, women's health, and urology services.",
    descriptionAr: "مستشفى خاص متعدد التخصصات بمكتب مخصص للمرضى الدوليين يقدم خدمات الجراحة وصحة المرأة والمسالك البولية.",
    address: "Ain Najm Road, Al-Mubarraz, Al-Ahsa",
    phone: "+966 13 536 2222",
    email: "patients@almana.example",
    baseRating: 4.4,
    specialties: ["Urology", "Obstetrics", "General Surgery", "Pediatrics", "Cardiology", "Dermatology"],
    accreditations: ["CBAHI"],
    latitude: 25.4231,
    longitude: 49.5647,
    adminEmail: "admin.almana@medvisit.sa",
    adminName: "Salman Al-Mana",
    doctors: [
      {
        name: "Dr. Ibrahim Al-Saleh",
        nameAr: "د. إبراهيم الصالح",
        specialty: "Urology",
        title: "Consultant Urologist",
        yearsExp: 19,
        languages: ["Arabic", "English"],
        bio: "Urologist specializing in kidney stone treatment, prostate surgery, and laser lithotripsy.",
        bioAr: "طبيب مسالك بولية متخصص في علاج حصى الكلى وجراحة البروستاتا وتفتيت الحصى بالليزر.",
        consultationFee: 380,
      },
      {
        name: "Dr. Hanan Al-Qassim",
        nameAr: "د. حنان القاسم",
        specialty: "Obstetrics",
        title: "Consultant Obstetrician & Gynecologist",
        yearsExp: 13,
        languages: ["Arabic", "English"],
        bio: "Obstetrician and gynecologist with expertise in fertility and laparoscopic gynecology.",
        bioAr: "طبيبة نساء وولادة ذات خبرة في الخصوبة وجراحات النساء بالمنظار.",
        consultationFee: 360,
      },
      {
        name: "Dr. Waleed Al-Ansari",
        nameAr: "د. وليد الأنصاري",
        specialty: "General Surgery",
        title: "Consultant General Surgeon",
        yearsExp: 21,
        languages: ["Arabic", "English"],
        bio: "General surgeon performing hernia repair, gallbladder, and thyroid surgeries.",
        bioAr: "جراح عام يجري إصلاح الفتق واستئصال المرارة وجراحات الغدة الدرقية.",
        consultationFee: 350,
      },
    ],
    packages: [
      {
        name: "Kidney Stone Laser Treatment",
        nameAr: "تفتيت حصى الكلى بالليزر",
        description: "Ureteroscopic laser lithotripsy with imaging, day-case procedure, and follow-up.",
        descriptionAr: "تفتيت حصى الكلى بالليزر عبر المنظار مع التصوير كإجراء يومي ومتابعة.",
        specialty: "Urology",
        price: 16000,
        duration: "1-2 Days",
        includes: ["CT KUB", "Laser Lithotripsy", "Stent (if needed)", "Follow-up Imaging"],
      },
      {
        name: "Fertility Assessment",
        nameAr: "تقييم الخصوبة",
        description: "Comprehensive fertility assessment for couples with hormone panel and ultrasound.",
        descriptionAr: "تقييم شامل للخصوبة للزوجين مع تحاليل الهرمونات والأشعة الصوتية.",
        specialty: "Obstetrics",
        price: 3800,
        duration: "2 Days",
        includes: ["Hormone Panel", "Pelvic Ultrasound", "Semen Analysis", "Specialist Consultation"],
      },
    ],
  },
  {
    slug: "al-jabr-eye-ent-hospital",
    name: "Al-Jabr Hospital for Eye & ENT",
    nameAr: "مستشفى الجبر للعيون والأنف والأذن والحنجرة",
    type: "CLINIC",
    description:
      "A specialty hospital dedicated to ophthalmology, ENT, and dermatology, known for refractive surgery and pediatric eye care.",
    descriptionAr: "مستشفى تخصصي للعيون والأنف والأذن والحنجرة والجلدية، معروف بجراحات تصحيح النظر وطب عيون الأطفال.",
    address: "Prince Mohammed bin Fahd Road, Al-Hofuf, Al-Ahsa",
    phone: "+966 13 580 7777",
    baseRating: 4.6,
    specialties: ["Ophthalmology", "ENT", "Dermatology"],
    accreditations: ["CBAHI"],
    latitude: 25.3694,
    longitude: 49.6006,
    adminEmail: "admin.aljabr@medvisit.sa",
    adminName: "Majed Al-Jabr",
    doctors: [
      {
        name: "Dr. Yasser Al-Jabr",
        nameAr: "د. ياسر الجبر",
        specialty: "Ophthalmology",
        title: "Consultant Refractive Surgeon",
        yearsExp: 24,
        languages: ["Arabic", "English"],
        bio: "Refractive and corneal surgeon performing LASIK, SMILE, and corneal cross-linking.",
        bioAr: "جراح قرنية وتصحيح نظر يجري الليزك والسمايل وتثبيت القرنية.",
        consultationFee: 400,
      },
      {
        name: "Dr. Dana Al-Hussain",
        nameAr: "د. دانة الحسين",
        specialty: "ENT",
        title: "Consultant Otologist",
        yearsExp: 10,
        languages: ["Arabic", "English"],
        bio: "Otologist treating hearing loss, chronic ear disease, and balance disorders.",
        bioAr: "طبيبة أذن تعالج ضعف السمع وأمراض الأذن المزمنة واضطرابات التوازن.",
        consultationFee: 330,
      },
    ],
    packages: [
      {
        name: "SMILE Vision Correction",
        nameAr: "تصحيح النظر بتقنية سمايل",
        description: "Flapless SMILE laser vision correction for both eyes with complete follow-up.",
        descriptionAr: "تصحيح النظر بتقنية سمايل دون شريحة للعينين مع متابعة كاملة.",
        specialty: "Ophthalmology",
        price: 11000,
        duration: "1 Day",
        includes: ["Topography", "SMILE Surgery (Both Eyes)", "Post-op Kit", "6-Month Follow-up"],
      },
      {
        name: "Sinus Surgery (FESS)",
        nameAr: "جراحة الجيوب الأنفية بالمنظار",
        description: "Functional endoscopic sinus surgery with CT planning and overnight observation.",
        descriptionAr: "جراحة الجيوب الأنفية الوظيفية بالمنظار مع تخطيط بالأشعة المقطعية وملاحظة لليلة.",
        specialty: "ENT",
        price: 15000,
        duration: "2 Days",
        includes: ["CT Sinus", "Surgery", "Overnight Stay", "Follow-up Visits"],
      },
    ],
  },
];

export const HOTELS: SeedHotel[] = [
  {
    slug: "al-hofuf-grand-hotel",
    name: "Al-Hofuf Grand Hotel",
    nameAr: "فندق الهفوف الكبير",
    description:
      "A five-star landmark in central Al-Hofuf with a medical concierge desk, shuttle service to major hospitals, and accessible suites.",
    descriptionAr: "فندق خمس نجوم في قلب الهفوف مع مكتب كونسيرج طبي وخدمة نقل إلى المستشفيات الكبرى وأجنحة مهيأة لذوي الاحتياجات.",
    address: "King Abdullah Road, Al-Hofuf, Al-Ahsa",
    phone: "+966 13 590 1000",
    email: "reservations@hofufgrand.example",
    starRating: 5,
    baseRating: 4.6,
    amenities: ["Free WiFi", "Hospital Shuttle", "Medical Concierge", "Pool", "Spa", "Restaurant", "Room Service", "Parking", "Wheelchair Access"],
    latitude: 25.3789,
    longitude: 49.5872,
    managerEmail: "manager.grand@medvisit.sa",
    managerName: "Rashed Al-Ghanim",
    roomTypes: [
      {
        name: "Deluxe King Room",
        nameAr: "غرفة ديلوكس بسرير كبير",
        description: "Spacious room with king bed, work desk, and city views.",
        descriptionAr: "غرفة واسعة بسرير كبير ومكتب عمل وإطلالة على المدينة.",
        capacity: 2,
        bedType: "King",
        sizeSqm: 38,
        pricePerNight: 780,
        totalRooms: 7,
        amenities: ["Free WiFi", "Minibar", "Smart TV", "Coffee Machine"],
        accessible: false,
      },
      {
        name: "Accessible Recovery Suite",
        nameAr: "جناح التعافي المهيأ",
        description: "Suite with adjustable bed, roll-in shower, and a companion bedroom—ideal after surgery.",
        descriptionAr: "جناح بسرير قابل للتعديل ودش مهيأ وغرفة للمرافق، مثالي بعد العمليات.",
        capacity: 3,
        bedType: "Adjustable + Twin",
        sizeSqm: 65,
        pricePerNight: 1450,
        totalRooms: 4,
        amenities: ["Adjustable Bed", "Roll-in Shower", "Nurse Call", "Kitchenette"],
        accessible: true,
      },
      {
        name: "Family Suite",
        nameAr: "جناح عائلي",
        description: "Two-bedroom suite with living area for families accompanying a patient.",
        descriptionAr: "جناح بغرفتي نوم وصالة معيشة للعائلات المرافقة للمريض.",
        capacity: 5,
        bedType: "King + 2 Twin",
        sizeSqm: 90,
        pricePerNight: 1900,
        totalRooms: 3,
        amenities: ["Living Room", "Kitchenette", "Two Bathrooms", "Smart TV"],
        accessible: false,
      },
    ],
  },
  {
    slug: "oasis-palm-residence",
    name: "Oasis Palm Residence",
    nameAr: "سكن واحة النخيل",
    description:
      "Serviced apartments surrounded by Al-Ahsa's palm groves—perfect for longer treatment stays with fully equipped kitchens.",
    descriptionAr: "شقق فندقية تحيط بها بساتين نخيل الأحساء، مثالية للإقامات العلاجية الطويلة مع مطابخ مجهزة بالكامل.",
    address: "Al-Ruqaiqah District, Al-Hofuf, Al-Ahsa",
    phone: "+966 13 591 2000",
    email: "stay@oasispalm.example",
    starRating: 4,
    baseRating: 4.4,
    amenities: ["Free WiFi", "Kitchen", "Laundry", "Hospital Shuttle", "Parking", "Grocery Delivery"],
    latitude: 25.3921,
    longitude: 49.5964,
    managerEmail: "manager.oasis@medvisit.sa",
    managerName: "Huda Al-Ahmed",
    roomTypes: [
      {
        name: "Studio Apartment",
        nameAr: "شقة استوديو",
        description: "Open-plan studio with kitchenette, ideal for a patient and one companion.",
        descriptionAr: "استوديو مفتوح بمطبخ صغير، مثالي لمريض ومرافق واحد.",
        capacity: 2,
        bedType: "Queen",
        sizeSqm: 42,
        pricePerNight: 420,
        totalRooms: 6,
        amenities: ["Kitchenette", "Washer", "Free WiFi"],
        accessible: false,
      },
      {
        name: "One-Bedroom Apartment",
        nameAr: "شقة بغرفة نوم واحدة",
        description: "Separate bedroom and living room with full kitchen.",
        descriptionAr: "غرفة نوم منفصلة وصالة معيشة مع مطبخ كامل.",
        capacity: 3,
        bedType: "King + Sofa Bed",
        sizeSqm: 68,
        pricePerNight: 590,
        totalRooms: 5,
        amenities: ["Full Kitchen", "Washer", "Balcony", "Free WiFi"],
        accessible: true,
      },
      {
        name: "Two-Bedroom Apartment",
        nameAr: "شقة بغرفتي نوم",
        description: "Family apartment with two bedrooms, dining area, and full kitchen.",
        descriptionAr: "شقة عائلية بغرفتي نوم ومنطقة طعام ومطبخ كامل.",
        capacity: 5,
        bedType: "King + 2 Twin",
        sizeSqm: 105,
        pricePerNight: 820,
        totalRooms: 3,
        amenities: ["Full Kitchen", "Washer & Dryer", "Dining Area", "Free WiFi"],
        accessible: false,
      },
    ],
  },
  {
    slug: "al-mubarraz-suites",
    name: "Al-Mubarraz Suites",
    nameAr: "أجنحة المبرز",
    description: "Modern suites in Al-Mubarraz close to Almana General Hospital and Al-Ahsa Medical Center.",
    descriptionAr: "أجنحة حديثة في المبرز بالقرب من مستشفى المانع العام ومركز الأحساء الطبي.",
    address: "Dhahran Road, Al-Mubarraz, Al-Ahsa",
    phone: "+966 13 592 3000",
    email: "booking@mubarrazsuites.example",
    starRating: 4,
    baseRating: 4.2,
    amenities: ["Free WiFi", "Restaurant", "Gym", "Parking", "Wheelchair Access", "24h Reception"],
    latitude: 25.4168,
    longitude: 49.5721,
    managerEmail: "manager.mubarraz@medvisit.sa",
    managerName: "Fahad Al-Dosari",
    roomTypes: [
      {
        name: "Executive Room",
        nameAr: "غرفة تنفيذية",
        description: "Comfortable executive room with queen bed and lounge chair.",
        descriptionAr: "غرفة تنفيذية مريحة بسرير مزدوج وكرسي استرخاء.",
        capacity: 2,
        bedType: "Queen",
        sizeSqm: 32,
        pricePerNight: 460,
        totalRooms: 6,
        amenities: ["Free WiFi", "Smart TV", "Work Desk"],
        accessible: false,
      },
      {
        name: "Accessible Junior Suite",
        nameAr: "جناح صغير مهيأ",
        description: "Junior suite with wide doorways, grab bars, and roll-in shower.",
        descriptionAr: "جناح صغير بأبواب واسعة ومقابض أمان ودش مهيأ.",
        capacity: 2,
        bedType: "King",
        sizeSqm: 48,
        pricePerNight: 640,
        totalRooms: 3,
        amenities: ["Roll-in Shower", "Grab Bars", "Wide Doorways", "Free WiFi"],
        accessible: true,
      },
    ],
  },
  {
    slug: "jawatha-inn",
    name: "Jawatha Inn",
    nameAr: "نُزل جواثا",
    description: "A friendly, budget-conscious three-star hotel with daily shuttles to Hofuf's hospitals.",
    descriptionAr: "فندق ثلاث نجوم ودود واقتصادي مع رحلات يومية إلى مستشفيات الهفوف.",
    address: "Al-Khaldiyah, Al-Hofuf, Al-Ahsa",
    phone: "+966 13 593 4000",
    email: "hello@jawathainn.example",
    starRating: 3,
    baseRating: 4.0,
    amenities: ["Free WiFi", "Hospital Shuttle", "Breakfast Included", "Parking"],
    latitude: 25.3702,
    longitude: 49.5803,
    managerEmail: "manager.jawatha@medvisit.sa",
    managerName: "Ali Al-Hashem",
    roomTypes: [
      {
        name: "Standard Twin",
        nameAr: "غرفة قياسية بسريرين",
        description: "Simple twin room with breakfast for two.",
        descriptionAr: "غرفة بسيطة بسريرين مع إفطار لشخصين.",
        capacity: 2,
        bedType: "2 Twin",
        sizeSqm: 24,
        pricePerNight: 240,
        totalRooms: 7,
        amenities: ["Free WiFi", "Breakfast", "TV"],
        accessible: false,
      },
      {
        name: "Superior Double",
        nameAr: "غرفة مزدوجة مميزة",
        description: "Larger double room with seating area.",
        descriptionAr: "غرفة مزدوجة أكبر مع منطقة جلوس.",
        capacity: 2,
        bedType: "Double",
        sizeSqm: 28,
        pricePerNight: 310,
        totalRooms: 5,
        amenities: ["Free WiFi", "Breakfast", "Seating Area"],
        accessible: true,
      },
    ],
  },
  {
    slug: "al-qara-boutique-hotel",
    name: "Al-Qara Boutique Hotel",
    nameAr: "فندق القارة البوتيك",
    description:
      "A boutique retreat near Al-Qara Mountain offering calm, wellness-focused stays for recovery and family visits.",
    descriptionAr: "ملاذ بوتيك قرب جبل القارة يوفر إقامات هادئة تركز على الاستجمام للتعافي والزيارات العائلية.",
    address: "Al-Qara Road, Al-Ahsa",
    phone: "+966 13 594 5000",
    email: "reserve@alqara.example",
    starRating: 4,
    baseRating: 4.5,
    amenities: ["Free WiFi", "Wellness Center", "Garden", "Restaurant", "Airport Transfer", "Parking"],
    latitude: 25.4105,
    longitude: 49.6702,
    managerEmail: "manager.qara@medvisit.sa",
    managerName: "Mona Al-Salem",
    roomTypes: [
      {
        name: "Garden Room",
        nameAr: "غرفة الحديقة",
        description: "Quiet room opening onto the palm garden.",
        descriptionAr: "غرفة هادئة تطل على حديقة النخيل.",
        capacity: 2,
        bedType: "King",
        sizeSqm: 34,
        pricePerNight: 560,
        totalRooms: 5,
        amenities: ["Garden Access", "Free WiFi", "Rain Shower"],
        accessible: true,
      },
      {
        name: "Heritage Suite",
        nameAr: "جناح التراث",
        description: "Suite with traditional Ahsa architecture, majlis seating, and private terrace.",
        descriptionAr: "جناح بطراز معماري أحسائي تقليدي ومجلس وتراس خاص.",
        capacity: 4,
        bedType: "King + Sofa Bed",
        sizeSqm: 72,
        pricePerNight: 1150,
        totalRooms: 2,
        amenities: ["Majlis", "Private Terrace", "Bathtub", "Free WiFi"],
        accessible: false,
      },
    ],
  },
];

/** Weighted patient source markets (ISO alpha-2). */
export const NATIONALITY_WEIGHTS: [string, number][] = [
  ["KW", 14], ["AE", 12], ["QA", 9], ["BH", 10], ["OM", 8], ["EG", 7], ["JO", 5], ["YE", 6],
  ["IQ", 5], ["PK", 6], ["IN", 5], ["SD", 3], ["GB", 2], ["US", 2], ["ID", 3], ["NG", 2], ["SA", 6],
];

export const FIRST_NAMES = [
  "Ahmed", "Mohammed", "Abdulrahman", "Omar", "Yusuf", "Hamad", "Khalid", "Ali", "Hassan", "Saeed",
  "Fatima", "Aisha", "Maryam", "Noor", "Sara", "Huda", "Layla", "Reem", "Amal", "Zainab",
  "Imran", "Bilal", "Rahul", "Daniel", "James", "Grace", "Amina", "Ibrahim", "Tariq", "Salma",
];

export const LAST_NAMES = [
  "Al-Sabah", "Al-Mansouri", "Al-Thani", "Al-Khalifa", "Al-Busaidi", "Hassan", "Haddad", "Al-Yamani",
  "Al-Jubouri", "Khan", "Sharma", "Abdelrahman", "Smith", "Okafor", "Wijaya", "Al-Rashed", "Mahmoud",
  "Al-Kandari", "Al-Hammadi", "Al-Marri",
];

export const URGENCY_WEIGHTS: [string, number][] = [
  ["LOW", 40], ["MODERATE", 38], ["HIGH", 18], ["EMERGENCY", 4],
];

export const REPORT_FILES = [
  "blood-test-results.pdf", "mri-lumbar-spine.pdf", "echocardiogram-report.pdf", "ct-chest.png",
  "lipid-panel.jpg", "eye-exam.pdf", "colonoscopy-findings.pdf", "knee-xray.jpg", "thyroid-panel.pdf",
];

export const FACILITY_REVIEW_COMMENTS = [
  "Excellent care and very organized international patient office.",
  "Doctors explained everything clearly. Highly recommended.",
  "Smooth experience from booking to discharge.",
  "Good facility, waiting time could be shorter.",
  "Staff were warm and spoke my language. Thank you!",
  "Professional team and modern equipment.",
];

export const HOTEL_REVIEW_COMMENTS = [
  "Clean rooms and the shuttle to the hospital was very convenient.",
  "Comfortable stay during my recovery, helpful reception team.",
  "Great value for money.",
  "Quiet rooms and kind staff who helped with my wheelchair.",
  "Perfect location for my hospital visits.",
];
