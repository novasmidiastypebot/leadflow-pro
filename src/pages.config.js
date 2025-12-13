import Dashboard from './pages/Dashboard';
import Leads from './pages/Leads';
import Products from './pages/Products';
import Team from './pages/Team';
import FormTemplates from './pages/FormTemplates';
import FormBuilder from './pages/FormBuilder';
import FormEmbed from './pages/FormEmbed';
import Settings from './pages/Settings';
import Orders from './pages/Orders';
import OrderCreate from './pages/OrderCreate';
import LeadMarketplace from './pages/LeadMarketplace';
import ProductPricing from './pages/ProductPricing';
import AdminClients from './pages/AdminClients';
import AdminUsers from './pages/AdminUsers';
import AdminOrders from './pages/AdminOrders';
import __Layout from './Layout.jsx';


export const PAGES = {
    "Dashboard": Dashboard,
    "Leads": Leads,
    "Products": Products,
    "Team": Team,
    "FormTemplates": FormTemplates,
    "FormBuilder": FormBuilder,
    "FormEmbed": FormEmbed,
    "Settings": Settings,
    "Orders": Orders,
    "OrderCreate": OrderCreate,
    "LeadMarketplace": LeadMarketplace,
    "ProductPricing": ProductPricing,
    "AdminClients": AdminClients,
    "AdminUsers": AdminUsers,
    "AdminOrders": AdminOrders,
}

export const pagesConfig = {
    mainPage: "Dashboard",
    Pages: PAGES,
    Layout: __Layout,
};