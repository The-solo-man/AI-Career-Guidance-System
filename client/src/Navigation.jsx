import { useState } from "react";

import {
    LayoutDashboard,
    Target,
    BookOpen,
    FileText,
    Mic,
    GitCompare,
    TrendingUp,
    GraduationCap,
    BriefcaseBusiness,
    Bot,
    Database,
    BarChart3,
    FileDown,
    Menu,
    X,
    ChevronLeft,
    ChevronRight
} from "lucide-react";

import "./Navigation.css";

function Navigation({ activeSection, setActiveSection }) {

    const [collapsed, setCollapsed] = useState(false);
    const [mobileOpen, setMobileOpen] = useState(false);

    const navItems = [
        {
            id: "dashboard",
            label: "Dashboard",
            icon: LayoutDashboard
        },
        {
            id: "career",
            label: "Career Guidance",
            icon: Target
        },
        {
            id: "skills",
            label: "Skills & Roadmap",
            icon: BookOpen
        },
        {
            id: "resume",
            label: "Resume Analyzer",
            icon: FileText
        },
        {
            id: "interview",
            label: "Interview Simulator",
            icon: Mic
        },
        {
            id: "alignment",
            label: "Career Alignment",
            icon: GitCompare
        },
        {
            id: "progress",
            label: "Progress Tracking",
            icon: TrendingUp
        },
        {
            id: "resources",
            label: "Learning Resources",
            icon: GraduationCap
        },
        {
            id: "jobs",
            label: "Jobs & Projects",
            icon: BriefcaseBusiness
        },
        {
            id: "agent",
            label: "AI Career Agent",
            icon: Bot
        },
        {
            id: "knowledge",
            label: "Knowledge Base",
            icon: Database
        },
        {
            id: "analytics",
            label: "Analytics",
            icon: BarChart3
        },
        {
            id: "report",
            label: "Career Report",
            icon: FileDown
        }
    ];

    const handleNavigation = (id) => {
        setActiveSection(id);
        setMobileOpen(false);
    };

    return (
        <>
            <button
                className="mobile-menu-button"
                onClick={() => setMobileOpen(!mobileOpen)}
            >
                {mobileOpen ? <X /> : <Menu />}
            </button>

            {mobileOpen && (
                <div
                    className="sidebar-overlay"
                    onClick={() => setMobileOpen(false)}
                />
            )}

            <aside
                className={`sidebar 
                    ${collapsed ? "collapsed" : ""}
                    ${mobileOpen ? "mobile-open" : ""}
                `}
            >

                <div className="sidebar-header">

                    <div className="sidebar-brand-icon">
                        <Bot size={25} />
                    </div>

                    {!collapsed && (
                        <div className="sidebar-brand">
                            <h2>Career AI</h2>
                            <span>Guidance System</span>
                        </div>
                    )}

                    <button
                        className="collapse-button"
                        onClick={() => setCollapsed(!collapsed)}
                        title="Collapse sidebar"
                    >
                        {collapsed
                            ? <ChevronRight size={19} />
                            : <ChevronLeft size={19} />
                        }
                    </button>

                </div>

                <div className="sidebar-section-title">
                    {!collapsed && "MAIN MENU"}
                </div>

                <nav className="sidebar-menu">

                    {navItems.map((item) => {

                        const Icon = item.icon;

                        return (
                            <button
                                key={item.id}
                                className={`sidebar-link ${
                                    activeSection === item.id
                                        ? "active"
                                        : ""
                                }`}
                                onClick={() =>
                                    handleNavigation(item.id)
                                }
                                title={collapsed ? item.label : ""}
                            >

                                <Icon size={20} />

                                {!collapsed && (
                                    <span>{item.label}</span>
                                )}

                                {activeSection === item.id && (
                                    <div className="active-indicator" />
                                )}

                            </button>
                        );
                    })}

                </nav>

                {!collapsed && (
                    <div className="sidebar-footer">

                        <div className="footer-icon">
                            <Bot size={21} />
                        </div>

                        <div>
                            <strong>AI Powered</strong>
                            <p>Your career companion</p>
                        </div>

                    </div>
                )}

            </aside>
        </>
    );
}

export default Navigation;