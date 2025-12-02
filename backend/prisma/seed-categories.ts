import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const defaultCategories = [
  {
    name: "automation",
    displayName: "Automation",
    description: "Workflows for automating repetitive tasks",
    color: "#3B82F6",
    icon: "⚡",
  },
  {
    name: "integration",
    displayName: "Integration",
    description: "Connect different services and APIs",
    color: "#10B981",
    icon: "🔗",
  },
  {
    name: "data-processing",
    displayName: "Data Processing",
    description: "Transform and manipulate data",
    color: "#8B5CF6",
    icon: "📊",
  },
  {
    name: "communication",
    displayName: "Communication",
    description: "Send messages, emails, and notifications",
    color: "#F59E0B",
    icon: "💬",
  },
  {
    name: "marketing",
    displayName: "Marketing",
    description: "Marketing automation and campaigns",
    color: "#EF4444",
    icon: "📢",
  },
  {
    name: "crm",
    displayName: "CRM",
    description: "Customer relationship management",
    color: "#06B6D4",
    icon: "👥",
  },
  {
    name: "finance",
    displayName: "Finance",
    description: "Financial data and transactions",
    color: "#84CC16",
    icon: "💰",
  },
  {
    name: "productivity",
    displayName: "Productivity",
    description: "Tools to boost productivity",
    color: "#EC4899",
    icon: "⚡",
  },
  {
    name: "monitoring",
    displayName: "Monitoring",
    description: "Monitor systems and services",
    color: "#F97316",
    icon: "📊",
  },
  {
    name: "backup",
    displayName: "Backup",
    description: "Data backup and synchronization",
    color: "#6366F1",
    icon: "💾",
  },
  {
    name: "social-media",
    displayName: "Social Media",
    description: "Social media management and automation",
    color: "#8B5CF6",
    icon: "📱",
  },
  {
    name: "e-commerce",
    displayName: "E-commerce",
    description: "Online store and sales automation",
    color: "#10B981",
    icon: "🛒",
  },
  {
    name: "analytics",
    displayName: "Analytics",
    description: "Data analysis and reporting",
    color: "#3B82F6",
    icon: "📈",
  },
  {
    name: "development",
    displayName: "Development",
    description: "Development tools and workflows",
    color: "#6B7280",
    icon: "⚙️",
  },
  {
    name: "other",
    displayName: "Other",
    description: "Miscellaneous workflows",
    color: "#9CA3AF",
    icon: "📋",
  },
];

async function seedCategories() {
  console.log("Seeding categories...");

  for (const category of defaultCategories) {
    await prisma.category.upsert({
      where: { name: category.name },
      update: {
        displayName: category.displayName,
        description: category.description,
        color: category.color,
        icon: category.icon,
      },
      create: category,
    });
  }

  console.log("Categories seeded successfully!");
}

seedCategories()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
