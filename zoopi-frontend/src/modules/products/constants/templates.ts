import { 
  ProductFormData, 
  CategoryFormData, 
  SubcategoryFormData, 
  Template 
} from "../types";

export const initialProductFormData: ProductFormData = {
  name: "",
  display_name: "",
  description: "",
  sku: "",
  price: "",
  category_id: "",
  subcategory_id: "",
  type: "simple",
  active: true,
  ncm: "",
  cest: "",
  unit: "un",
  brand: "",
  ean: "",
  cost_price: "",
  profit_margin: "",
  loyalty_points: 0,
  enologist_notes: "",
  featured: false,
  commission: true,
  production_location: "cozinha",
  aparece_delivery: true,
  aparece_garcom: true,
  aparece_totem: true,
  aparece_tablet: true,
  aparece_mesa: true,
  aparece_comanda: true,
  aparece_tv: true,
  aparece_self_service: true,
  display_on_tablet: true,
  composition: "",
  production_weight: "1.0",
  is_weighted: false,
  tax_status: "tributado",
  internal_code: "",
  is_on_sale: false,
  sale_price: "",
  wholesale_price: "",
  wholesale_min_qty: "",
  image_url: null,
  option_group_ids: []
};

export const initialCategoryFormData: CategoryFormData = {
  name: "",
  active: true,
  image_url: null,
  color: null
};

export const initialSubcategoryFormData: SubcategoryFormData = {
  name: "",
  category_id: "",
  active: true
};

export const templates: Template[] = [
  {
    id: "hamburgueria",
    title: "Hamburgueria",
    description: "Estrutura completa com entradas, burgers artesanais, combos e bebidas.",
    categories: [
      {
        name: "Entradas",
        subcategories: [
          {
            name: "Batatas",
            products: [
              { name: "Batata Frita P", price: 15.90, description: "Porção individual de batatas crocantes" },
              { name: "Batata com Cheddar e Bacon", price: 28.90, description: "Batatas fritas com molho cheddar e bacon crocante" }
            ]
          }
        ]
      },
      {
        name: "Burgers",
        subcategories: [
          {
            name: "Clássicos",
            products: [
              { name: "Cheese Burger", price: 22.00, description: "Pão, carne 150g e queijo prato" },
              { name: "Cheese Salada", price: 25.00, description: "Pão, carne 150g, queijo, alface e tomate" }
            ]
          },
          {
            name: "Artesanais",
            products: [
              { name: "Bacon Blast", price: 34.90, description: "Pão brioche, carne 180g, muito bacon e maionese da casa" }
            ]
          }
        ]
      }
    ]
  },
  {
    id: "pizzaria",
    title: "Pizzaria",
    description: "Estrutura ideal para pizzarias com massas, pizzas salgadas, doces e bebidas.",
    categories: [
      {
        name: "Pizzas Salgadas",
        subcategories: [
          {
            name: "Tradicionais",
            products: [
              { name: "Mussarela", price: 45.00, description: "Molho de tomate, mussarela e orégano" },
              { name: "Calabresa", price: 48.00, description: "Molho de tomate, mussarela, calabresa e cebola" }
            ]
          }
        ]
      }
    ]
  }
];