"use client";
import { useState, useEffect } from "react";
import { Sidebar, DesktopSidebar, SidebarLink } from "./sidebar";
import { LayoutDashboard, Users, ClipboardList, Settings, LogOut, BarChart, BookOpen, MessageSquare } from "lucide-react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { useMobileMenu } from "@/components/layout/MainLayout";

interface SidebarDemoProps {
  forceOpen?: boolean;
  sidebarExpanded?: boolean;
  setSidebarExpanded?: (expanded: boolean) => void;
}

export function SidebarDemo({ 
  forceOpen = false, 
  sidebarExpanded = false, 
  setSidebarExpanded 
}: SidebarDemoProps = {}) {
  const navigate = useNavigate();
  const { closeMobileMenu } = useMobileMenu();

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate('/');
    closeMobileMenu();
  };

  const handleLinkClick = (href: string) => {
    navigate(href);
    closeMobileMenu();
  };

  const mainLinks = [
    {
      label: "Dashboard",
      href: "/dashboard",
      icon: (
        <LayoutDashboard className="text-neutral-700 dark:text-neutral-200 h-5 w-5 flex-shrink-0" />
      ),
      onClick: () => handleLinkClick("/dashboard"),
    },
    {
      label: "Team Members",
      href: "/employees",
      icon: (
        <Users className="text-neutral-700 dark:text-neutral-200 h-5 w-5 flex-shrink-0" />
      ),
      onClick: () => handleLinkClick("/employees"),
    },
    {
      label: "Review Cycles",
      href: "/reviews",
      icon: (
        <ClipboardList className="text-neutral-700 dark:text-neutral-200 h-5 w-5 flex-shrink-0" />
      ),
      onClick: () => handleLinkClick("/reviews"),
    },
    {
      label: "Manager Feedback",
      href: "/manager-feedback",
      icon: (
        <MessageSquare className="text-neutral-700 dark:text-neutral-200 h-5 w-5 flex-shrink-0" />
      ),
      onClick: () => handleLinkClick("/manager-feedback"),
    },
    {
      label: "Analytics",
      href: "/analytics",
      icon: (
        <BarChart className="text-neutral-700 dark:text-neutral-200 h-5 w-5 flex-shrink-0" />
      ),
      onClick: () => handleLinkClick("/analytics"),
    },
  ];

  const [open, setOpen] = useState(false);

  // Sync the local open state with the mobile menu expanded state
  useEffect(() => {
    if (forceOpen) {
      setOpen(sidebarExpanded);
    }
  }, [forceOpen, sidebarExpanded]);

  // Handle sidebar state changes for desktop hover behavior
  const handleSetOpen = (value: boolean | ((prevState: boolean) => boolean)) => {
    const newOpen = typeof value === 'function' ? value(open) : value;
    setOpen(newOpen);
    if (setSidebarExpanded && forceOpen) {
      setSidebarExpanded(newOpen);
    }
  };

  return (
    <div
      className={cn(
        "flex flex-col md:flex-row bg-gray-100 dark:bg-neutral-800 flex-shrink-0 h-full"
      )}
    >
      <Sidebar open={open} setOpen={handleSetOpen}>
        {/* Custom sidebar content that shows on mobile when forceOpen is true */}
        <motion.div
          className={cn(
            "h-full px-4 py-4 bg-neutral-100 dark:bg-neutral-800 w-[300px] flex-shrink-0",
            // Show on mobile when forceOpen is true, otherwise hide on mobile
            forceOpen ? "flex flex-col" : "hidden md:flex md:flex-col"
          )}
          animate={{
            width: open ? "300px" : "60px",
          }}
          onMouseEnter={() => !forceOpen && setOpen(true)}
          onMouseLeave={() => !forceOpen && setOpen(false)}
        >
          <div className="flex flex-col flex-1 overflow-y-auto overflow-x-hidden">
            {open ? <Logo /> : <LogoIcon />}
            <div className="mt-8 flex flex-col gap-2">
              {mainLinks.map((link, idx) => (
                <SidebarLink key={idx} link={link} />
              ))}
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <SidebarLink
              link={{
                label: "Methodology",
                href: "/methodology",
                icon: (
                  <BookOpen className="text-neutral-700 dark:text-neutral-200 h-5 w-5 flex-shrink-0" />
                ),
                onClick: () => handleLinkClick("/methodology"),
              }}
            />
            <SidebarLink
              link={{
                label: "Settings",
                href: "/account",
                icon: (
                  <Settings className="text-neutral-700 dark:text-neutral-200 h-5 w-5 flex-shrink-0" />
                ),
                onClick: () => handleLinkClick("/account"),
              }}
            />
            <SidebarLink
              link={{
                label: "Logout",
                href: "#",
                icon: (
                  <LogOut className="text-neutral-700 dark:text-neutral-200 h-5 w-5 flex-shrink-0" />
                ),
                onClick: handleSignOut,
              }}
            />
          </div>
        </motion.div>
      </Sidebar>
    </div>
  );
}

export const Logo = () => {
  return (
    <Link
      to="/dashboard"
      className="font-normal flex space-x-2 items-center text-sm text-black py-1 relative z-20"
    >
      <div className="h-5 w-6 bg-gradient-to-br from-[#D83A0C] via-[#F45D28] to-[#FF7F45] rounded-br-lg rounded-tr-sm rounded-tl-lg rounded-bl-sm flex-shrink-0 relative">
        <span className="absolute inset-0 flex items-center justify-center text-[8px] font-bold text-white">360</span>
      </div>
      <motion.span
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="font-medium text-black dark:text-white whitespace-pre"
      >
        Squad360
      </motion.span>
    </Link>
  );
};

export const LogoIcon = () => {
  return (
    <Link
      to="/dashboard"
      className="font-normal flex space-x-2 items-center text-sm text-black py-1 relative z-20"
    >
      <div className="h-5 w-6 bg-gradient-to-br from-[#D83A0C] via-[#F45D28] to-[#FF7F45] rounded-br-lg rounded-tr-sm rounded-tl-lg rounded-bl-sm flex-shrink-0 relative">
        <span className="absolute inset-0 flex items-center justify-center text-[8px] font-bold text-white">360</span>
      </div>
    </Link>
  );
}; 