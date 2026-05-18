export const DEFAULT_CATEGORIES: Array<{
  name: string;
  type: "expense" | "income";
  color: string;
  icon: string;
  sortOrder: number;
}> = [
  // Expense
  { name: "Housing", type: "expense", color: "#64748b", icon: "🏠", sortOrder: 10 },
  { name: "Utilities", type: "expense", color: "#eab308", icon: "💡", sortOrder: 20 },
  { name: "Groceries", type: "expense", color: "#22c55e", icon: "🛒", sortOrder: 30 },
  { name: "Auto", type: "expense", color: "#f97316", icon: "🚗", sortOrder: 40 },
  { name: "Insurance", type: "expense", color: "#0ea5e9", icon: "🛡️", sortOrder: 50 },
  { name: "Healthcare", type: "expense", color: "#ef4444", icon: "❤️‍🩹", sortOrder: 60 },
  { name: "Dining Out", type: "expense", color: "#fb923c", icon: "🍽️", sortOrder: 70 },
  { name: "Entertainment", type: "expense", color: "#8b5cf6", icon: "🎬", sortOrder: 80 },
  { name: "Subscriptions", type: "expense", color: "#6366f1", icon: "📺", sortOrder: 90 },
  { name: "Personal Care", type: "expense", color: "#ec4899", icon: "💆", sortOrder: 100 },
  { name: "Clothing", type: "expense", color: "#a855f7", icon: "👗", sortOrder: 110 },
  { name: "Savings", type: "expense", color: "#14b8a6", icon: "💰", sortOrder: 120 },
  { name: "Child Support", type: "expense", color: "#f43f5e", icon: "👶", sortOrder: 125 },
  { name: "Debt Payments", type: "expense", color: "#dc2626", icon: "💳", sortOrder: 130 },
  { name: "Miscellaneous", type: "expense", color: "#94a3b8", icon: "📦", sortOrder: 140 },
  // Income
  { name: "Salary", type: "income", color: "#22c55e", icon: "💼", sortOrder: 10 },
  { name: "Freelance", type: "income", color: "#14b8a6", icon: "💻", sortOrder: 20 },
  { name: "Business", type: "income", color: "#0ea5e9", icon: "🏢", sortOrder: 30 },
  { name: "Investments", type: "income", color: "#6366f1", icon: "📈", sortOrder: 40 },
  { name: "Side Income", type: "income", color: "#eab308", icon: "⚡", sortOrder: 50 },
  { name: "Disability", type: "income", color: "#8b5cf6", icon: "♿", sortOrder: 55 },
  { name: "Other Income", type: "income", color: "#64748b", icon: "➕", sortOrder: 60 },
];
