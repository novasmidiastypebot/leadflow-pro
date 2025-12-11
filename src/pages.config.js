import Dashboard from './pages/Dashboard';
import Leads from './pages/Leads';
import Products from './pages/Products';
import Team from './pages/Team';
import FormTemplates from './pages/FormTemplates';
import FormBuilder from './pages/FormBuilder';
import FormEmbed from './pages/FormEmbed';
import Settings from './pages/Settings';
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
}

export const pagesConfig = {
    mainPage: "Dashboard",
    Pages: PAGES,
    Layout: __Layout,
};