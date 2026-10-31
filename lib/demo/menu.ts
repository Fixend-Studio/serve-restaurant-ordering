export type MenuCategory = {
  id: string;
  name: string;
  hint: string;
};

export type MenuItem = {
  id: string;
  categoryId: string;
  name: string;
  description: string;
  price: number;
  image?: string;
  available: boolean;
};

export const restaurant = {
  name: "Mehr",
  slug: "mehr",
  neighborhood: "Clifton, Karachi",
  hours: "Dinner nightly, 7 to 11",
  summary:
    "Contemporary Pakistani cooking. Charcoal, handi, and bread from the tandoor.",
  tables: ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12"],
};

export const categories: MenuCategory[] = [
  { id: "start", name: "To start", hint: "From the fryer and the grill" },
  { id: "mains", name: "Mains", hint: "Handi, rice, and the tandoor" },
  { id: "breads", name: "Breads", hint: "Baked to order" },
  { id: "sweet", name: "Sweet", hint: "A small finish" },
  { id: "drinks", name: "Drinks", hint: "Cold, for the table" },
];

export const menuItems: MenuItem[] = [
  {
    id: "tikka",
    categoryId: "start",
    name: "Chicken tikka",
    description: "Thigh, chilli, and turmeric, grilled over charcoal. Lemon on the side.",
    price: 980,
    image: "/menu/grill.jpg",
    available: true,
  },
  {
    id: "samosa",
    categoryId: "start",
    name: "Samosa",
    description: "Potato and pea, fried to order. Two pieces with coriander chutney.",
    price: 420,
    image: "/menu/samosa.jpg",
    available: true,
  },
  {
    id: "handi",
    categoryId: "mains",
    name: "Chicken handi",
    description: "Tomato, cream, and green chilli. Served in the pot with basmati.",
    price: 1890,
    image: "/menu/curry.jpg",
    available: true,
  },
  {
    id: "biryani",
    categoryId: "mains",
    name: "Sabzi dum biryani",
    description: "Saffron rice layered with vegetables and fried onion. Enough for one.",
    price: 1450,
    image: "/menu/biryani.jpg",
    available: true,
  },
  {
    id: "bhaji",
    categoryId: "mains",
    name: "Pav bhaji",
    description: "Mashed vegetables cooked in butter, with toasted pav, onion, and lime.",
    price: 890,
    image: "/menu/bhaji.jpg",
    available: true,
  },
  {
    id: "chargha",
    categoryId: "mains",
    name: "Lahori chargha",
    description: "A whole bird, spiced and finished in the tandoor. Back on the menu tomorrow.",
    price: 3200,
    available: false,
  },
  {
    id: "naan",
    categoryId: "breads",
    name: "Roghni naan",
    description: "Flaky, glazed with butter, blistered from the tandoor.",
    price: 220,
    image: "/menu/naan.jpg",
    available: true,
  },
  {
    id: "roti",
    categoryId: "breads",
    name: "Tandoori roti",
    description: "Whole wheat, blistered, meant to be eaten at once.",
    price: 90,
    image: "/menu/roti.jpg",
    available: true,
  },
  {
    id: "jamun",
    categoryId: "sweet",
    name: "Gulab jamun",
    description: "Two pieces in a light rose syrup. Warm, if the kitchen can manage it.",
    price: 480,
    image: "/menu/jamun.jpg",
    available: true,
  },
  {
    id: "firni",
    categoryId: "sweet",
    name: "Firni",
    description: "Ground rice, milk, and cardamom, set in a clay bowl.",
    price: 450,
    image: "/menu/firni.jpg",
    available: true,
  },
  {
    id: "lime",
    categoryId: "drinks",
    name: "Fresh lime soda",
    description: "Whole lime, soda, and salt or sugar. Leave a note for which you want.",
    price: 320,
    image: "/menu/lime.jpg",
    available: true,
  },
  {
    id: "mint",
    categoryId: "drinks",
    name: "Iced lemon mint",
    description: "Black tea, lime, and mint over ice.",
    price: 350,
    image: "/menu/tea.jpg",
    available: true,
  },
];

export function getTable(tableNumber: string) {
  const match = restaurant.tables.find((table) => table === tableNumber);
  return match ? { number: match } : null;
}

export function getItem(itemId: string) {
  return menuItems.find((item) => item.id === itemId) ?? null;
}

export function itemsInCategory(categoryId: string) {
  return menuItems.filter((item) => item.categoryId === categoryId);
}
