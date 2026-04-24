import { useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useIsMobile } from "@/hooks/use-mobile";

/**
 * Mobile auto-redirect. Mounted once near the top of the app:
 *  - On small viewports, when the user is on `/`, send them to `/m`.
 *  - Never redirect off `/login`, `/signup`, OAuth callbacks, or
 *    routes the user explicitly opened.
 *  - Honors a sessionStorage opt-out so users can stay on desktop view.
 */
export function MobileRedirect() {
  const isMobile = useIsMobile();
  const nav = useNavigate();
  const loc = useLocation();

  useEffect(() => {
    if (!isMobile) return;
    if (loc.pathname !== "/") return;
    if (sessionStorage.getItem("lov_force_desktop") === "1") return;
    nav("/m", { replace: true });
  }, [isMobile, loc.pathname, nav]);

  return null;
}
