import AdminClients from './pages/AdminClients';
import AdminOrders from './pages/AdminOrders';
import AdminUsers from './pages/AdminUsers';
import Dashboard from './pages/Dashboard';
import DistributionAdmin from './pages/DistributionAdmin';
import FormBuilder from './pages/FormBuilder';
import FormEmbed from './pages/FormEmbed';
import FormTemplates from './pages/FormTemplates';
import Home from './pages/Home';
import LeadMarketplace from './pages/LeadMarketplace';
import Leads from './pages/Leads';
import OrderCreate from './pages/OrderCreate';
import Orders from './pages/Orders';
import ProductPricing from './pages/ProductPricing';
import Products from './pages/Products';
import Settings from './pages/Settings';
import Team from './pages/Team';
import Documentation from './pages/Documentation';
import __Layout from './Layout.jsx';


export const PAGES = {
    "AdminClients": AdminClients,
    "AdminOrders": AdminOrders,
    "AdminUsers": AdminUsers,
    "Dashboard": Dashboard,
    "DistributionAdmin": DistributionAdmin,
    "FormBuilder": FormBuilder,
    "FormEmbed": FormEmbed,
    "FormTemplates": FormTemplates,
    "Home": Home,
    "LeadMarketplace": LeadMarketplace,
    "Leads": Leads,
    "OrderCreate": OrderCreate,
    "Orders": Orders,
    "ProductPricing": ProductPricing,
    "Products": Products,
    "Settings": Settings,
    "Team": Team,
    "Documentation": Documentation,
}

export const pagesConfig = {
    mainPage: "Dashboard",
    Pages: PAGES,
    Layout: __Layout,
};