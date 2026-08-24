import type { Metadata } from "next";
import { Manrope, Geist_Mono } from "next/font/google";
import "./globals.css";
import {
  SITE_DOMAIN,
  SITE_EMAIL,
  SITE_GEO,
  SITE_NAME,
  SITE_NAME_RU,
  SITE_URL,
} from "@/lib/site";

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin", "cyrillic"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  icons: {
    icon: [{ url: "/brand/flask-32.png", sizes: "32x32", type: "image/png" }],
    apple: [{ url: "/brand/flask-192.png", sizes: "180x180", type: "image/png" }],
  },
  title: {
    default: `${SITE_NAME_RU} — медтехника и реагенты в Таджикистане | ${SITE_DOMAIN}`,
    template: `%s · ${SITE_NAME} ${SITE_DOMAIN}`,
  },
  description:
    "РЕАГЕНТ (reagent.tj) — поставка медицинского оборудования, лабораторных реагентов и расходных материалов в Таджикистане. Душанбе и регионы. B2B, цена по запросу.",
  applicationName: SITE_NAME,
  authors: [{ name: SITE_NAME, url: SITE_URL }],
  creator: SITE_NAME,
  publisher: SITE_NAME,
  category: "healthcare",
  keywords: [
    "REAGENT",
    "РЕАГЕНТ",
    "reagent.tj",
    "медицинское оборудование Таджикистан",
    "реагенты Душанбе",
    "лабораторные реагенты",
    "ПЦР Таджикистан",
    "медоборудование Душанбе",
    "B2B медицина",
  ],
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  alternates: {
    canonical: `${SITE_URL}/ru`,
    languages: {
      ru: `${SITE_URL}/ru`,
      en: `${SITE_URL}/en`,
      "x-default": `${SITE_URL}/ru`,
    },
  },
  openGraph: {
    type: "website",
    locale: "ru_TJ",
    alternateLocale: ["en_TJ", "tg_TJ"],
    url: SITE_URL,
    siteName: `${SITE_NAME} · ${SITE_DOMAIN}`,
    title: `${SITE_NAME_RU} — медтехника и реагенты в Таджикистане`,
    description:
      "Медицинское оборудование, реагенты и лабораторные решения для клиник и лабораторий Таджикистана. Душанбе и регионы.",
    countryName: SITE_GEO.countryNameEn,
  },
  twitter: {
    card: "summary_large_image",
    title: `${SITE_NAME} · ${SITE_DOMAIN}`,
    description:
      "Medical equipment & lab reagents in Tajikistan. Dushanbe. B2B · price on request.",
  },
  other: {
    "geo.region": "TJ",
    "geo.placename": SITE_GEO.cityRu,
    "geo.position": `${SITE_GEO.lat};${SITE_GEO.lng}`,
    ICBM: `${SITE_GEO.lat}, ${SITE_GEO.lng}`,
    "contact:email": SITE_EMAIL,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ru"
      className={`${manrope.variable} ${geistMono.variable} h-full`}
      style={
        {
          "--font-display": "var(--font-manrope)",
        } as React.CSSProperties
      }
    >
      <body className="min-h-full font-sans antialiased">{children}</body>
    </html>
  );
}
