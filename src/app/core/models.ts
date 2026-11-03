export type Currency = "MAD" | "EUR";
export interface Row {
  id: string;
  wedding_id: string;
  updated_at?: string;
  created_at?: string;
}
export interface Wedding {
  id: string;
  name: string;
  partner_names: string;
  budget_minor: number;
  eur_mad_numerator: number;
  eur_mad_denominator: number;
  updated_at?: string;
}
export interface Ceremony extends Row {
  name: string;
  date: string | null;
  budget_minor: number;
}
export interface Category extends Row {
  kind?: "makeup" | "hair" | "vehicle" | null;
  parent_name?: string;
  name: string;
  criteria: string[];
}
export interface Requirement extends Row {
  ceremony_id: string;
  category_id: string;
  name: string;
  selected_offer_id?: string | null;
}
export interface Provider extends Row {
  name: string;
  phone: string;
  whatsapp: string;
  instagram: string;
  website: string;
  city: string;
  address: string;
  maps_url: string;
}
export const STATUSES = [
  "À contacter",
  "Contacté",
  "En attente",
  "Devis reçu",
  "À comparer",
  "Présélectionné",
  "Sélectionné",
  "Réservé",
  "Refusé",
] as const;
export interface Offer extends Row {
  package_reference?: string;
  requirement_id: string;
  provider_id: string;
  name: string;
  description: string;
  amount_minor: number;
  currency: Currency;
  pricing: "forfait" | "personne" | "article";
  status: (typeof STATUSES)[number];
  included: string;
  excluded: string;
  conditions: string;
  availability: string;
  pros: string;
  cons: string;
  favorite: boolean;
  criteria: Record<string, string>;
}
export interface Media extends Row {
  path: string;
  thumbnail_path: string | null;
  caption: string;
  position: number;
  is_cover: boolean;
  size_bytes: number;
}
export interface Photo extends Media {
  offer_id: string;
}
export interface Review extends Row {
  offer_id: string;
  user_id: string;
  rating: number;
  comment: string;
}
export interface Booking extends Row {
  offer_id: string;
  booked_on: string;
  notes: string;
}
export interface Expense extends Row {
  ceremony_id: string;
  booking_id: string | null;
  provider_id: string | null;
  name: string;
  amount_minor: number;
  currency: Currency;
  due_on: string | null;
}
export interface Payment extends Row {
  expense_id: string;
  amount_minor: number;
  paid_on: string;
  method: string;
  responsible: string;
  receipt_path: string | null;
}
export interface Household extends Row {
  name: string;
  side: string;
  phone: string;
  notes: string;
}
export interface Guest extends Row {
  household_id: string;
  name: string;
  is_child: boolean;
  diet: string;
}
export interface Invitation extends Row {
  guest_id: string;
  ceremony_id: string;
  status: string;
  table_name: string;
}
export interface Task extends Row {
  ceremony_id: string | null;
  offer_id: string | null;
  name: string;
  due_on: string | null;
  priority: string;
  responsible: string;
  done: boolean;
}
export interface GiftSet extends Row {
  ceremony_id: string;
  name: string;
  color: string;
}
export interface Gift extends Row {
  gift_set_id: string;
  provider_id: string | null;
  name: string;
  quantity: number;
  amount_minor: number;
  currency: Currency;
  material: string;
  color: string;
  tyafer: string;
  purchased_on: string | null;
  delivered: boolean;
}
export interface Outfit extends Row {
  ceremony_id: string;
  name: string;
  fitting_on: string | null;
  status: string;
}
export interface OutfitItem extends Row {
  outfit_id: string;
  name: string;
  amount_minor: number;
}
export interface Inspiration extends Row {
  moodboard_id?: string | null;
  description?: string;
  colors?: string[];
  source_url?: string;
  theme?: string;
  offer_id?: string | null;
  outfit_id?: string | null;
  task_id?: string | null;
  position?: number;
  ceremony_id: string | null;
  requirement_id: string | null;
  provider_id: string | null;
  name: string;
  tags: string[];
  favorite: boolean;
  path: string | null;
}
export interface Attachment extends Media {
  trousseau_item_id?: string | null;
  trousseau_set_id?: string | null;
  gift_id: string | null;
  outfit_id: string | null;
  gift_set_id: string | null;
  inspiration_id: string | null;
}
export type MediaKind =
  | "offer"
  | "gift"
  | "gift_set"
  | "outfit"
  | "inspiration"
  | "trousseau_item"
  | "trousseau_set";
export const JHAZ_STATUSES = [
  "À acheter",
  "En recherche",
  "Commandé",
  "Acheté",
  "Reçu",
  "Préparé",
] as const;
export interface TrousseauCategory extends Row {
  name: string;
  budget_minor: number;
}
export interface TrousseauSet extends Row {
  name: string;
  notes: string;
}
export interface TrousseauItem extends Row {
  category_id: string;
  set_id: string | null;
  provider_id: string | null;
  expense_id: string | null;
  name: string;
  description: string;
  notes: string;
  quantity: number;
  unit_minor: number;
  currency: Currency;
  responsible: string;
  status: (typeof JHAZ_STATUSES)[number];
}
export interface Moodboard extends Row {
  ceremony_id: string | null;
  name: string;
  description: string;
  theme: string;
}
export interface InspirationComment extends Row {
  inspiration_id: string;
  user_id: string;
  body: string;
}
export const TIMELINE_STATUSES = [
  "Prévu",
  "Confirmé",
  "En cours",
  "Terminé",
  "Annulé",
] as const;
export interface TimelineEvent extends Row {
  ceremony_id: string;
  title: string;
  start_minute: number;
  end_minute: number;
  description: string;
  public_note: string;
  location: string;
  responsible: string;
  logistics: string;
  status: (typeof TIMELINE_STATUSES)[number];
  position: number;
  offer_id: string | null;
}
export interface TimelineProvider extends Row {
  event_id: string;
  provider_id: string;
}
export interface Comparison extends Row {
  requirement_id: string;
  name: string;
  weights: Record<string, number>;
}
export interface ComparisonItem extends Row {
  comparison_id: string;
  offer_id: string;
}
export interface Tables {
  trousseau_categories: TrousseauCategory;
  trousseau_sets: TrousseauSet;
  trousseau_items: TrousseauItem;
  moodboards: Moodboard;
  inspiration_comments: InspirationComment;
  timeline_events: TimelineEvent;
  timeline_event_providers: TimelineProvider;
  ceremonies: Ceremony;
  categories: Category;
  service_requirements: Requirement;
  providers: Provider;
  provider_offers: Offer;
  offer_photos: Photo;
  offer_reviews: Review;
  bookings: Booking;
  expenses: Expense;
  payments: Payment;
  guest_households: Household;
  guests: Guest;
  ceremony_invitations: Invitation;
  tasks: Task;
  gift_sets: GiftSet;
  gifts: Gift;
  outfits: Outfit;
  outfit_items: OutfitItem;
  inspirations: Inspiration;
  attachments: Attachment;
  offer_comparisons: Comparison;
  comparison_items: ComparisonItem;
}
export type Table = keyof Tables;
export type Data = { [K in Table]: Tables[K][] };
export const TABLES: Table[] = [
  "trousseau_categories",
  "trousseau_sets",
  "trousseau_items",
  "moodboards",
  "inspiration_comments",
  "timeline_events",
  "timeline_event_providers",
  "ceremonies",
  "categories",
  "service_requirements",
  "providers",
  "provider_offers",
  "offer_photos",
  "offer_reviews",
  "bookings",
  "expenses",
  "payments",
  "guest_households",
  "guests",
  "ceremony_invitations",
  "tasks",
  "gift_sets",
  "gifts",
  "outfits",
  "outfit_items",
  "inspirations",
  "attachments",
  "offer_comparisons",
  "comparison_items",
];
export const emptyData = (): Data => ({
  trousseau_categories: [],
  trousseau_sets: [],
  trousseau_items: [],
  moodboards: [],
  inspiration_comments: [],
  timeline_events: [],
  timeline_event_providers: [],
  ceremonies: [],
  categories: [],
  service_requirements: [],
  providers: [],
  provider_offers: [],
  offer_photos: [],
  offer_reviews: [],
  bookings: [],
  expenses: [],
  payments: [],
  guest_households: [],
  guests: [],
  ceremony_invitations: [],
  tasks: [],
  gift_sets: [],
  gifts: [],
  outfits: [],
  outfit_items: [],
  inspirations: [],
  attachments: [],
  offer_comparisons: [],
  comparison_items: [],
});
