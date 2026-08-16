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
    body: [
      "Last Updated: 15 August 2026",
      "CG Student Portal (\"CG Student Portal\", \"we\", \"us\", or \"our\") respects the privacy of individuals who access or use our website, application, and related services (collectively, the \"Platform\").",
      "This Privacy Policy explains how information may be collected, processed, used, disclosed, retained, and protected when you access or use the Platform.",
      "By using the Platform, you acknowledge that you have read and understood this Privacy Policy.",
      "1. Information We May Collect. Depending upon the services and features you use, we may collect or process the following categories of information.",
      "1.1 Account and Registration Information. Where account registration is required, we may collect information such as: Full name; Email address; Mobile number; Login credentials; Educational or account-related information; and other information necessary to provide the requested service.",
      "1.2 Technical and Usage Information. When you access the Platform, certain technical information may be automatically generated or collected, including: IP address; Device type; Browser type and version; Operating system; Approximate usage information; Pages or features accessed; Login and session information; and diagnostic and security-related information.",
      "Such information may be used for security, analytics, troubleshooting, and service improvement.",
      "2. Payment Information. Where the Platform provides paid services, payments may be processed through authorized third-party payment processors.",
      "We may receive transaction-related information such as: Order ID; Payment ID; Transaction status; Payment amount; Payment timestamp; and other information necessary for reconciliation and verification.",
      "We do not intend to store sensitive authentication credentials such as your UPI PIN, banking password, or card PIN.",
      "Payment information may nevertheless be processed by the relevant payment service provider in accordance with its own privacy policy and security practices.",
      "3. How We Use Information. Information may be used for legitimate operational purposes, including: creating and maintaining user accounts; providing requested services; delivering educational content; processing and verifying transactions; providing customer support; communicating service-related notifications; detecting and preventing fraud, abuse, and unauthorized activity; maintaining Platform security; diagnosing technical problems; improving functionality and user experience; conducting analytics and performance monitoring; and complying with applicable legal obligations.",
      "4. Legal and Regulatory Compliance. We may collect, process, preserve, or disclose information where reasonably necessary to comply with applicable law, lawful governmental requests, judicial orders, regulatory requirements, or legitimate legal processes.",
      "We may also take appropriate action where necessary to protect the rights, property, security, or integrity of the Platform, its users, or other persons.",
      "5. Sharing of Information. We do not sell your personal information as a commercial product.",
      "Information may be shared or processed by carefully selected service providers where necessary for operating the Platform, including: hosting and cloud infrastructure providers; payment processors; authentication providers; security providers; analytics providers; communication service providers; and other technology vendors required to operate specific Platform functions.",
      "Such processing may be subject to contractual, technical, or legal safeguards where applicable.",
      "6. Cookies and Similar Technologies. The Platform may use cookies, local storage, session technologies, analytics tools, or similar mechanisms to maintain functionality, authenticate users, improve performance, remember preferences, and understand usage patterns.",
      "You may manage certain cookie settings through your browser or device.",
      "Disabling certain technologies may affect the functionality or availability of particular Platform features.",
      "7. Data Security. We implement reasonable technical and organizational safeguards designed to protect information against unauthorized access, alteration, disclosure, destruction, misuse, or loss.",
      "However, no internet transmission, electronic storage mechanism, or information system can be guaranteed to be completely secure.",
      "Accordingly, we cannot guarantee absolute security of information transmitted to or stored by the Platform.",
      "8. Data Retention. We retain information only for as long as reasonably necessary for the purposes described in this Privacy Policy, including providing services, maintaining records, preventing fraud, resolving disputes, enforcing agreements, and satisfying legal or regulatory requirements.",
      "When information is no longer reasonably required, it may be deleted, anonymized, or securely disposed of, subject to applicable retention obligations.",
      "9. Third-Party Websites. The Platform may contain links to external websites, applications, services, or resources.",
      "We are not responsible for the privacy practices, security, content, or policies of third-party services.",
      "Users should review the applicable privacy policy and terms of any third-party service before providing personal information.",
      "10. Children's Privacy. The Platform is intended primarily for educational use.",
      "We do not knowingly seek to collect personal information from children in circumstances where such collection would violate applicable law.",
      "Where applicable, parents or legal guardians should supervise minors' use of online services and ensure that personal information is shared appropriately.",
      "11. User Rights and Requests. Subject to applicable law, users may have rights concerning their personal information, including rights to request access, correction, deletion, or other applicable forms of data management.",
      "Requests may be submitted through the official CG Student Portal support channel.",
      "We may require reasonable verification before processing a request in order to protect the security and privacy of the relevant account or individual.",
      "12. Data Breach and Security Incidents. In the event of a security incident involving personal information, we may take appropriate measures to investigate, contain, mitigate, and remediate the incident and provide notifications where required by applicable law.",
      "13. Changes to This Privacy Policy. We may amend this Privacy Policy periodically to reflect changes in our services, technology, legal requirements, or privacy practices.",
      "The revised Privacy Policy will be published on the Platform with an updated \"Last Updated\" date.",
      "Your continued use of the Platform following publication of material changes may constitute acknowledgment of the revised policy to the extent permitted by applicable law.",
      "14. Contact Information. For privacy-related questions, requests, complaints, or concerns, please contact:",
      "CG Student Portal",
      "Educational Information and Student Support Platform",
      "Privacy Support Email: [Insert Official Email Address]",
      "Website: [Insert Official Website URL]",
    ],
  },
  terms: {
    title: "Terms & Conditions",
    body: [
      "Welcome to CG STUDENT PORTAL. By accessing or using this website (the \"Service\"), you agree to these Terms & Conditions. If you do not agree, do not use the Service.",
      "Use of the Service: You may use the Service only for lawful purposes and in accordance with these Terms. You agree not to use the Service in any way that harms the Service, its users, or third parties.",
      "Accounts: Certain features require an account. You are responsible for keeping your account credentials secure and for all activity that occurs under your account. Notify us immediately of any unauthorized use.",
      "User content: If you upload or submit content, you grant CG STUDENT PORTAL a non-exclusive, worldwide, royalty-free license to host, use, distribute, and display that content as necessary to operate the Service. Do not upload content you do not have the right to share.",
      "Intellectual property: All website content, branding, and software are owned or licensed by CG STUDENT PORTAL. You may not copy, reproduce, distribute, or create derivative works without permission, except as expressly allowed by these Terms.",
      "Prohibited conduct: Do not attempt to circumvent security, scrape data, reverse-engineer the Site, or otherwise interfere with the Service. Violations may result in suspension or termination.",
      "Disclaimer of warranties: The Service is provided "as is" and "as available" without warranties of any kind. We do not warrant that the Service will be uninterrupted, secure, or error-free.",
      "Limitation of liability: To the maximum extent permitted by law, CG STUDENT PORTAL and its affiliates are not liable for indirect, incidental, special, consequential, or punitive damages arising from your use of the Service.",
      "Termination: We may suspend or terminate access to the Service at any time for violations of these Terms or for operational reasons. Upon termination, your right to use the Service ends.",
      "Changes to Terms: We may modify these Terms from time to time. We will post updates on this page and indicate the date of last revision. Continued use after changes constitutes acceptance.",
      "Governing law: These Terms are governed by the laws of the jurisdiction where CG STUDENT PORTAL operates, without regard to conflict-of-law provisions.",
      "Contact: For questions about these Terms or to report issues, please contact us through the official support channels listed on the site.",
    ],
  },
  refund: {
    title: "Terms & Conditions",
    body: [
      "Last Updated: 15 August 2026. Please read these Terms & Conditions (\"Terms\") carefully before using the CG STUDENT PORTAL website, applications, and related services (collectively, the \"Platform\"). By accessing or using the Platform, you agree to be bound by these Terms.",
      "Purpose: The Platform provides educational information and student support tools, including academic resources, notifications, exam information, results, syllabi, and related services. The Platform aggregates information from public and third-party sources; it is not an official university or government portal unless expressly stated.",
      "Accuracy of information: We make reasonable efforts to ensure information is current and accurate, but we do not guarantee completeness or accuracy. Official notices, schedules, results, fees, and eligibility rules may change without notice; users should confirm critical information with the relevant institution.",
      "Registration and account security: Some features require creating an account. You must provide accurate information and maintain the confidentiality of your credentials. You are responsible for activity occurring under your account and must notify us immediately of unauthorized use.",
      "User content and rights: By submitting content (including uploads, comments, or other materials), you represent that you have the necessary rights to share it. You grant CG STUDENT PORTAL a non-exclusive, worldwide, royalty-free license to use, reproduce, display, and distribute the content as necessary to operate the Platform.",
      "Intellectual property: All original content, branding, software, and site design on the Platform are owned or licensed by CG STUDENT PORTAL. You may not copy, modify, distribute, or create derivative works without our prior written consent, except as expressly permitted by these Terms.",
      "Acceptable use: You must not use the Platform for unlawful purposes, attempt to bypass security, transmit malware, scrape or harvest data, impersonate others, or otherwise interfere with the Platform's operation. Violations may result in suspension or termination of access.",
      "Paid services and payments: Where paid features are offered, applicable fees and payment terms will be disclosed before purchase. Payments are processed by third-party providers; access to paid content may be subject to payment verification and provider confirmations.",
      "Refunds and cancellations: Refund and cancellation terms depend on the specific product or service and will be set out at the point of sale. We will follow provider and payment processor policies where applicable.",
      "Third-party links and services: The Platform may contain links or integrations with third-party services. We are not responsible for third-party content, policies, or practices; your use of such services is subject to their terms.",
      "Disclaimers and limitation of liability: The Platform is provided \"as is\" and \"as available\". To the fullest extent permitted by law, CG STUDENT PORTAL and its affiliates disclaim all warranties and will not be liable for indirect, incidental, special, or consequential damages arising from use of the Platform.",
      "Termination: We may suspend or terminate access to the Platform at our discretion where necessary to protect users or the Platform, or for breaches of these Terms. Provisions that should survive termination (such as intellectual property, disclaimers, and limitations of liability) will remain in effect.",
      "Modifications: We may update these Terms from time to time. Updated Terms will be posted on the Platform with a revised "Last Updated" date. Your continued use after changes indicates acceptance of the revised Terms where permitted by law.",
      "Governing law and disputes: These Terms are governed by the laws of the jurisdiction where CG STUDENT PORTAL is established, subject to mandatory legal provisions. Disputes will be resolved as provided by applicable law.",
      "Contact: For questions, notices, or legal requests concerning these Terms, contact the CG STUDENT PORTAL support team at the official contact email listed on the Platform.",
    ],
  },
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
