import { useParams } from "react-router-dom";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { useSeo } from "@/hooks/useSeo";
import { BRAND } from "@/config/brand";

const PAGES = {
  about: {
    title: "About CG STUDENT PORTAL",
    body: [
      `${BRAND.name} is a student platform being built for universities across Chhattisgarh, starting with Hemchand Yadav Vishwavidyalaya (Durg University).`,
      "This build is Step 1 of the roadmap: branding, design system, database architecture and the public browsing experience. Accounts, uploads, rewards and premium plans are scheduled for later steps and are intentionally not active yet.",
    ],
  },
  contact: {
    title: "Contact",
    body: [
      "A contact form and support inbox will be connected in a later step.",
      "Until then, no contact channel is claimed as live so students are never misled.",
    ],
  },
  privacy: {
    title: "Privacy Policy",
    body: ["Placeholder. The full privacy policy will be published before public launch."],
  },
  terms: {
    title: "Terms & Conditions",
    body: ["Placeholder. Complete terms will be published before public launch."],
  },
  refund: {
    title: "Refund Policy",
    body: ["Placeholder. A refund policy will accompany the payments module (Step 7)."],
  },
  copyright: {
    title: "Copyright Policy",
    body: ["Placeholder. Content ownership rules will accompany the uploads module (Step 4)."],
  },
  dmca: {
    title: "DMCA",
    body: ["Placeholder. A takedown process will accompany the uploads module (Step 4)."],
  },
};

export default function LegalPage() {
  const { page } = useParams();
  const content = PAGES[page] || {
    title: "Page",
    body: ["This page has not been written yet."],
  };

  useSeo({
    title: `${content.title} — ${BRAND.name}`,
    description: content.body[0],
    path: `/legal/${page}`,
  });

  return (
    <AppShell>
      <PageHeader
        title={content.title}
        breadcrumbs={<Breadcrumbs items={[{ label: content.title }]} />}
      />
      <article className="container-page py-14" data-testid={`legal-page-${page}`}>
        <div className="max-w-2xl space-y-5">
          {content.body.map((p) => (
            <p key={p} className="text-sm text-muted md:text-base">
              {p}
            </p>
          ))}
        </div>
      </article>
    </AppShell>
  );
}
