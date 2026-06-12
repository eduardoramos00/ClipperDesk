import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ClipperDesk — The operating system for modern barbershops",
  description:
    "Scheduling, CRM, inventory, commissions and billing — everything your barbershop needs in one place.",
};

const themeScript = `
(function () {
  try {
    var t = localStorage.getItem("theme");
    if (t === "dark" || (!t && window.matchMedia("(prefers-color-scheme: dark)").matches)) {
      document.documentElement.classList.add("dark");
    }
  } catch (e) {}
})();
`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
