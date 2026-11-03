import { Data, emptyData, Row, Wedding } from "./models";
import { SERVICE_TEMPLATES } from "./catalogue-templates";
export const DEMO_WEDDING: Wedding = {
  id: "demo-wedding",
  name: "Notre Mariage",
  partner_names: "Yasmine & Zaid · exemple fictif",
  budget_minor: 18000000,
  eur_mad_numerator: 108,
  eur_mad_denominator: 10,
};
export function demoData(): Data {
  const d = emptyData();
  const base = (id: string): Row => ({ id, wedding_id: "demo-wedding" });
  d.ceremonies = [
    {
      ...base("khotoba"),
      name: "Khotoba — الخطوبة",
      date: "2027-04-17",
      budget_minor: 4500000,
    },
    {
      ...base("sdak"),
      name: "Drib Sdak — ضريب الصداق",
      date: "2027-07-24",
      budget_minor: 13500000,
    },
  ];
  d.categories = [
    "Lieu",
    "Traiteur",
    "Makeup",
    "Neggafa",
    "Dfou3",
    "Tenues",
    "Décoration",
  ].map((name, i) => ({
    ...base("cat" + i),
    name,
    criteria:
      i === 0
        ? ["Capacité", "Parking", "Jardin", "Équipements", "Durée"]
        : i === 1
          ? ["Menu", "Service", "Vaisselle", "Dégustation"]
          : ["Déplacement", "Essai", "Personnalisation"],
  }));
  d.service_requirements = [
    {
      ...base("lieu"),
      ceremony_id: "sdak",
      category_id: "cat0",
      name: "Un lieu pour réunir nos familles",
    },
    {
      ...base("repas"),
      ceremony_id: "khotoba",
      category_id: "cat1",
      name: "Le repas de la Khotoba",
    },
    {
      ...base("beaute"),
      ceremony_id: "sdak",
      category_id: "cat2",
      name: "Mise en beauté",
    },
    {
      ...base("neggafa"),
      ceremony_id: "sdak",
      category_id: "cat3",
      name: "Accompagnement et tenues",
    },
  ];
  const groups = [
    [
      "Villa des Oliviers",
      "Riad Lumière",
      "Domaine des Jasmins",
      "Ferme El Bahia",
      "Maison des Roses",
    ],
    ["Saveurs de Fès", "La Table Safran", "Dar Délices", "Maison Amane"],
    ["Atelier Nour", "Beauty by Lina", "Le Studio Rose"],
    ["Maison Zina", "Neggafa Amal", "Lalla Collection"],
  ];
  groups.forEach((names, g) =>
    names.forEach((name, i) => {
      const id = `p${g}${i}`,
        oid = `o${g}${i}`;
      d.providers.push({
        ...base(id),
        name,
        city: ["Marrakech", "Rabat", "Casablanca"][i % 3],
        phone: "",
        whatsapp: "",
        instagram: "",
        website: "",
        address: "Adresse fictive — à renseigner",
        maps_url: "",
      });
      d.provider_offers.push({
        ...base(oid),
        provider_id: id,
        requirement_id: ["lieu", "repas", "beaute", "neggafa"][g],
        name,
        description: "Proposition fictive pour explorer et comparer ensemble.",
        amount_minor:
          (g === 0
            ? 22000 + i * 3500
            : g === 1
              ? 280 + i * 45
              : g === 2
                ? 1800 + i * 400
                : 9000 + i * 1500) * 100,
        currency: "MAD",
        pricing: g === 1 ? "personne" : "forfait",
        status: i === 0 ? "Présélectionné" : "À comparer",
        included:
          g === 0
            ? "Jardin, mobilier et espace des mariés"
            : g === 1
              ? "Menu traditionnel, thé et service"
              : "Accompagnement personnalisé",
        excluded: "Options et déplacement à confirmer",
        conditions: "Acompte et annulation à négocier",
        availability: "À confirmer",
        pros: "Présentation soignée, contact agréable",
        cons: "Visite ou essai à prévoir",
        favorite: i === 0,
        criteria:
          g === 0
            ? {
                Capacité: String(80 + i * 20),
                Parking: "Oui",
                Jardin: i % 2 ? "Non" : "Oui",
                Équipements: "Tables, chaises",
                Durée: "8 heures",
              }
            : {
                Menu: "À personnaliser",
                Service: "Inclus",
                Dégustation: "Sur rendez-vous",
              },
      });
    }),
  );
  d.expenses = [
    {
      ...base("e1"),
      ceremony_id: "sdak",
      booking_id: null,
      provider_id: "p00",
      name: "Réservation du lieu · fictif",
      amount_minor: 2200000,
      currency: "MAD",
      due_on: "2027-06-24",
    },
    {
      ...base("e2"),
      ceremony_id: "khotoba",
      booking_id: null,
      provider_id: "p10",
      name: "Repas pour 40 personnes · fictif",
      amount_minor: 1120000,
      currency: "MAD",
      due_on: "2027-04-10",
    },
  ];
  d.payments = [
    {
      ...base("pay1"),
      expense_id: "e1",
      amount_minor: 500000,
      paid_on: "2026-10-25",
      method: "Virement",
      responsible: "Commun",
      receipt_path: null,
    },
  ];
  d.tasks = [
    "Visiter les lieux présélectionnés",
    "Demander une dégustation",
    "Choisir les tissus du Dfou3",
    "Confirmer les dates avec nos familles",
  ].map((name, i) => ({
    ...base("task" + i),
    ceremony_id: i % 2 ? "khotoba" : "sdak",
    offer_id: null,
    name,
    due_on: "2026-11-" + (12 + i * 4),
    priority: i === 0 ? "Haute" : "Normale",
    responsible: i === 2 ? "Mariée" : "Commun",
    done: false,
  }));
  d.guest_households = ["Famille El Amrani", "Famille Bennani", "Nos amis"].map(
    (name, i) => ({
      ...base("h" + i),
      name,
      side: i === 0 ? "Mariée" : i === 1 ? "Marié" : "Commun",
      phone: "",
      notes: "",
    }),
  );
  d.guests = [
    "Salma El Amrani",
    "Omar El Amrani",
    "Amina Bennani",
    "Youssef Bennani",
    "Lina",
    "Mehdi",
  ].map((name, i) => ({
    ...base("g" + i),
    household_id: "h" + Math.floor(i / 2),
    name,
    is_child: false,
    diet: "",
  }));
  d.ceremony_invitations = d.guests.flatMap((g) =>
    d.ceremonies.map((c) => ({
      ...base(g.id + c.id),
      guest_id: g.id,
      ceremony_id: c.id,
      status: "Confirmée",
      table_name: "",
    })),
  );
  d.gift_sets = [
    {
      ...base("set1"),
      ceremony_id: "sdak",
      name: "Ensemble caftan rose",
      color: "Rose poudré",
    },
    {
      ...base("set2"),
      ceremony_id: "sdak",
      name: "Ensemble vert sauge",
      color: "Sauge",
    },
  ];
  d.gifts = [
    "Tissu rose",
    "Sandales assorties",
    "Sac et parfum",
    "Tyafer de présentation",
    "Tissu sauge",
    "Coffret de dattes",
  ].map((name, i) => ({
    ...base("gift" + i),
    gift_set_id: i < 4 ? "set1" : "set2",
    provider_id: null,
    name,
    quantity: 1,
    amount_minor: (350 + i * 80) * 100,
    currency: "MAD",
    material: "À choisir",
    color: i < 4 ? "Rose" : "Sauge",
    tyafer: i < 4 ? "Plateau 1" : "Plateau 2",
    purchased_on: null,
    delivered: i === 0,
  }));
  d.outfits = [
    {
      ...base("out1"),
      ceremony_id: "khotoba",
      name: "Caftan ivoire",
      fitting_on: "2027-03-20",
      status: "À confectionner",
    },
    {
      ...base("out2"),
      ceremony_id: "sdak",
      name: "Takchita sauge",
      fitting_on: "2027-06-12",
      status: "Inspiration",
    },
  ];
  for (const template of SERVICE_TEMPLATES) {
    const existing = d.categories.find((c) => c.name === template.name);
    if (existing) Object.assign(existing, template);
    else d.categories.push({ ...base("demo-" + template.kind), ...template });
  }
  d.service_requirements.push(
    {
      ...base("demo-hair-need"),
      ceremony_id: "sdak",
      category_id: "demo-hair",
      name: "Coiffure de la mariée",
    },
    {
      ...base("demo-car-need"),
      ceremony_id: "sdak",
      category_id: "demo-vehicle",
      name: "Voiture de cortège",
      selected_offer_id: "demo-car-offer",
    },
  );
  const beauty = d.provider_offers.find((o) => o.id === "o20")!;
  beauty.package_reference = "Forfait beauté fictif";
  d.provider_offers.push({
    ...beauty,
    ...base("demo-hair-offer"),
    requirement_id: "demo-hair-need",
    name: "Atelier Nour · coiffure",
    amount_minor: 120000,
    criteria: {
      "Type de coiffure": "Chignon bas",
      "Essai coiffure": "À prévoir",
      Accessoires: "À choisir",
    },
    package_reference: "Forfait beauté fictif",
  });
  d.providers.push({
    ...base("demo-car-provider"),
    name: "Cortège Atlas · fictif",
    city: "Marrakech",
    phone: "",
    whatsapp: "",
    instagram: "",
    website: "",
    address: "",
    maps_url: "",
  });
  d.provider_offers.push({
    ...beauty,
    ...base("demo-car-offer"),
    requirement_id: "demo-car-need",
    provider_id: "demo-car-provider",
    name: "Berline ivoire · exemple fictif",
    amount_minor: 250000,
    status: "Sélectionné",
    package_reference: "",
    criteria: {
      Marque: "Exemple",
      Modèle: "Berline",
      Couleur: "Ivoire",
      "Chauffeur inclus": "Oui",
      "Prise en charge": "Lieu de préparation",
      Parcours: "Préparation → réception",
      "Heure de départ": "18:00",
      "Heure d’arrivée": "18:30",
    },
  });
  d.trousseau_categories = [
    { ...base("jhaz-linge"), name: "Linge de maison", budget_minor: 300000 },
    { ...base("jhaz-vetements"), name: "Vêtements", budget_minor: 200000 },
  ];
  d.trousseau_sets = [
    {
      ...base("jhaz-set"),
      name: "Ensemble ivoire & sauge",
      notes: "Exemple fictif, à adapter.",
    },
  ];
  d.trousseau_items = [
    {
      ...base("jhaz-item"),
      category_id: "jhaz-linge",
      set_id: "jhaz-set",
      provider_id: null,
      expense_id: null,
      name: "Parure de lit ivoire · fictif",
      description: "Coton, teinte ivoire",
      notes: "À assortir aux serviettes",
      quantity: 1,
      unit_minor: 75000,
      currency: "MAD",
      responsible: "Commun",
      status: "En recherche",
    },
  ];
  d.moodboards = [
    {
      ...base("board-beauty"),
      ceremony_id: "sdak",
      name: "Notre beauté · exemple fictif",
      description: "Nos idées makeup et coiffure",
      theme: "Makeup",
    },
    {
      ...base("board-deco"),
      ceremony_id: "sdak",
      name: "Sauge & ivoire · exemple fictif",
      description: "Une ambiance douce pour nos familles",
      theme: "Décoration",
    },
  ];
  d.inspirations = [
    {
      ...base("idea-beauty"),
      moodboard_id: "board-beauty",
      name: "Un maquillage lumineux",
      description: "Ajoutez vos propres références photo.",
      ceremony_id: "sdak",
      requirement_id: "beaute",
      provider_id: "p20",
      offer_id: "o20",
      outfit_id: null,
      task_id: null,
      theme: "Makeup",
      colors: ["Ivoire", "Rose"],
      tags: ["Lumineux"],
      source_url: "",
      position: 0,
      favorite: false,
      path: null,
    },
  ];
  d.timeline_events = [
    {
      ...base("day-arrival"),
      ceremony_id: "sdak",
      title: "Arrivée des invités · fictif",
      start_minute: 1080,
      end_minute: 1110,
      description: "Prévoir une personne pour accueillir.",
      public_note: "Accueil à l’entrée principale.",
      location: "Lieu de réception",
      responsible: "Famille",
      logistics: "Coordonner les arrivées en privé.",
      status: "Prévu",
      position: 0,
      offer_id: null,
    },
  ];
  return d;
}
