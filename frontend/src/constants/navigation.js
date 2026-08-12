export const NAV_LINKS = [
  { label: "Universities", to: "/universities" },
  { label: "Courses", to: "/courses" },
  { label: "Resources", to: "/resources" },
  { label: "Categories", to: "/categories" },
];

export const MOBILE_NAV = [
  { label: "Home", to: "/", icon: "Home", enabled: true },
  { label: "Search", to: "/resources", icon: "Search", enabled: true },
  { label: "Resources", to: "/resources", icon: "FileText", enabled: true },
  { label: "Community", to: "/community", icon: "Users", enabled: false },
  { label: "Profile", to: "/profile", icon: "User", enabled: true },
];

export const FOOTER_SECTIONS = [
  {
    title: "Platform",
    links: [
      { label: "Home", to: "/" },
      { label: "How it works", to: "/#how-it-works" },
      { label: "Earning (Step 6)", to: null },
      { label: "Premium (Step 7)", to: null },
    ],
  },
  {
    title: "Resources",
    links: [
      { label: "All Resources", to: "/resources" },
      { label: "Question Papers", to: "/resources?category=question-papers" },
      { label: "Notes", to: "/resources?category=notes" },
      { label: "Syllabus", to: "/resources?category=syllabus" },
    ],
  },
  {
    title: "Universities",
    links: [
      { label: "All Universities", to: "/universities" },
      { label: "Courses", to: "/courses" },
      { label: "Categories", to: "/categories" },
    ],
  },
  {
    title: "Support",
    links: [
      { label: "About", to: "/legal/about" },
      { label: "Contact", to: "/legal/contact" },
    ],
  },
  {
    title: "Legal",
    links: [
      { label: "Privacy Policy", to: "/legal/privacy" },
      { label: "Terms & Conditions", to: "/legal/terms" },
      { label: "Refund Policy", to: "/legal/refund" },
      { label: "Copyright Policy", to: "/legal/copyright" },
      { label: "DMCA", to: "/legal/dmca" },
    ],
  },
];

export const HOW_IT_WORKS = [
  {
    icon: "Search",
    title: "Find your university",
    text: "Pick your university, course and semester to reach the exact subject you need.",
  },
  {
    icon: "BookOpen",
    title: "Study the material",
    text: "Browse verified question papers, notes and syllabus curated for your course.",
  },
  {
    icon: "TrendingUp",
    title: "Share and grow",
    text: "Upload your own notes to help juniors and build your academic profile.",
  },
];
