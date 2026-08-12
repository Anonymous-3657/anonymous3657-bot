import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { BottomNav } from "@/components/layout/BottomNav";

/** Global application shell: top nav + content + footer, bottom nav on mobile. */
export const AppShell = ({ children }) => (
  <div className="flex min-h-screen flex-col bg-brand-bg">
    <a
      href="#main"
      className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[60] focus:rounded-lg focus:bg-brand-primary focus:px-4 focus:py-2 focus:text-white"
    >
      Skip to content
    </a>
    <Navbar />
    <main id="main" className="flex-1 pb-20 lg:pb-0">
      {children}
    </main>
    <Footer />
    <BottomNav />
  </div>
);
