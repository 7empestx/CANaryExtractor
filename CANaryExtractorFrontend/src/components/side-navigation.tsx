import React, { useState } from "react";
import { SideNavigationProps } from "@cloudscape-design/components/side-navigation";
import { Navigation as CommonNavigation } from "../commons";
import { DensityPreferencesDialog } from "./density-preferences";

const navItems: SideNavigationProps["items"] = [
  { type: "link", text: "Dashboard", href: "#/" },
  { type: "divider" },
  {
    type: "link",
    href: "#/density_settings",
    text: "Density settings",
  },
];

export function DashboardSideNavigation() {
  const [dialogVisible, setDialogVisible] = useState(false);
  const onFollowHandler: SideNavigationProps["onFollow"] = (event) => {
    event.preventDefault();
    if (event.detail.href === "#/density_settings") {
      setDialogVisible(true);
    }
  };

  return (
    <>
      <CommonNavigation
        items={navItems}
        activeHref="#/"
        onFollowHandler={onFollowHandler}
      />
      {dialogVisible && (
        <DensityPreferencesDialog onDismiss={() => setDialogVisible(false)} />
      )}
    </>
  );
}
