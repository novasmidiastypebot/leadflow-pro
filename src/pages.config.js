import Dashboard from './pages/Dashboard';
import Leads from './pages/Leads';
import Products from './pages/Products';
import Team from './pages/Team';
import __Layout from './Layout.jsx';


export const PAGES = {
    "Dashboard": Dashboard,
    "Leads": Leads,
    "Products": Products,
    "Team": Team,
}

export const pagesConfig = {
    mainPage: "Dashboard",
    Pages: PAGES,
    Layout: __Layout,
};