"use client";
import { useState } from "react";
import { Sidebar, SidebarBody, SidebarLink } from "./sidebar";
import { LayoutDashboard, Users, ClipboardList, Settings, LogOut, BarChart, BookOpen } from "lucide-react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { MasterAccountToggle } from "./MasterAccountToggle";

export function SidebarDemo() {
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate('/');
  };

  const mainLinks = [
    {
      label: "Dashboard",
      href: "/dashboard",
      icon: (
        <LayoutDashboard className="text-neutral-700 dark:text-neutral-200 h-5 w-5 flex-shrink-0" />
      ),
    },
    {
      label: "Team Members",
      href: "/employees",
      icon: (
        <Users className="text-neutral-700 dark:text-neutral-200 h-5 w-5 flex-shrink-0" />
      ),
    },
    {
      label: "Review Cycles",
      href: "/reviews",
      icon: (
        <ClipboardList className="text-neutral-700 dark:text-neutral-200 h-5 w-5 flex-shrink-0" />
      ),
    },
    {
      label: "Analytics",
      href: "/analytics",
      icon: (
        <BarChart className="text-neutral-700 dark:text-neutral-200 h-5 w-5 flex-shrink-0" />
      ),
    },
  ];

  const [open, setOpen] = useState(false);
  return (
    <div
      className={cn(
        "flex flex-col md:flex-row bg-gray-100 dark:bg-neutral-800 flex-shrink-0"
      )}
    >
      <Sidebar open={open} setOpen={setOpen}>
        <SidebarBody className="justify-between gap-10 p-4">
          <div className="flex flex-col flex-1 overflow-y-auto overflow-x-hidden">
            {open ? <Logo /> : <LogoIcon />}
            <div className="mt-8 flex flex-col gap-2">
              {mainLinks.map((link, idx) => (
                <SidebarLink key={idx} link={link} />
              ))}
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <div className="px-2 py-2">
              <MasterAccountToggle />
            </div>
            <SidebarLink
              link={{
                label: "Methodology",
                href: "/methodology",
                icon: (
                  <BookOpen className="text-neutral-700 dark:text-neutral-200 h-5 w-5 flex-shrink-0" />
                ),
              }}
            />
            <SidebarLink
              link={{
                label: "Settings",
                href: "/account",
                icon: (
                  <Settings className="text-neutral-700 dark:text-neutral-200 h-5 w-5 flex-shrink-0" />
                ),
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
        </SidebarBody>
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